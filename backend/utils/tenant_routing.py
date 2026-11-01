# Database-per-tenant routing.
#
# Layout:
#   * Platform (tenancy) database  - MYSQL_DSN. Holds only the `schools`
#     registry and `developers` / `developer_audit_logs`.
#   * One database per school      - named by School.database_name, e.g.
#     edu_sch_a1b2c3. Holds that school's users, roles, marks, fees, etc.
#
# A request's tenant comes from its host:
#     https://<tenant_id>.api.<TENANT_BASE_DOMAIN>/y22/rbac/my-access
#     -> tenant_id "apec" -> School.tenant_id = "apec" -> its own DB.
# The API version segment (/y22, /y26) is stripped by WSGI middleware and the
# path is mapped onto the existing /api/... routes.
#
# Every ORM query goes through TenantSession.get_bind(), which picks the
# active tenant's engine. Existing view code therefore needs no per-query
# change: while a tenant is active, Student.query etc. hit that tenant's DB.

import logging
import os
import re
import threading
import time
import uuid
from contextlib import contextmanager

import sqlalchemy as sa
from flask import current_app, g, has_app_context, jsonify, request

from utils.plans import allowed_dashboards, parse_custom
from flask_sqlalchemy.session import Session as FSASession
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session as PlainSession

logger = logging.getLogger(__name__)

API_VERSION_RE = re.compile(r"^/(y\d{2})(/.*)?$")
# Names a school may never take: they are used by the platform itself or are
# commonly abused for look-alike addresses.
RESERVED_TENANT_IDS = {
    "", "api", "login", "www", "app", "admin", "administrator", "mail", "smtp",
    "imap", "pop", "ftp", "ns1", "ns2", "static", "cdn", "assets", "media",
    "support", "help", "billing", "status", "docs", "blog", "dev", "staging",
    "platform", "developer", "developers", "portal", "dashboard", "auth", "sso",
    "oauth", "root", "system", "internal", "vpn", "edge", "secure", "account",
    "accounts", "console", "git", "webmail", "autodiscover",
}
TENANT_ID_RE = re.compile(r"^[a-z][a-z0-9-]{1,38}$")
DB_NAME_RE = re.compile(r"^[a-z0-9_]{1,64}$")

# Tables that live only in the platform database. Everything else is
# per-school. `schools` is in BOTH: the platform registry, plus a copy of
# the school's own row inside its database so that foreign keys from
# admins/students/etc. resolve.
PLATFORM_ONLY_TABLES = {
    "developers", "developer_audit_logs", "school_domains", "school_branding",
    "smtp_settings", "mail_broadcasts", "mail_deliveries", "developer_preferences",
}

_engines = {}
_engines_lock = threading.Lock()


# ----------------------------------------------------------------- session
class TenantSession(FSASession):
    """Flask-SQLAlchemy session that sends queries to the active tenant DB."""

    def get_bind(self, mapper=None, clause=None, bind=None, **kwargs):
        if bind is not None:
            return bind

        if mapper is not None:
            try:
                table = sa.inspect(mapper).local_table.name
            except Exception:
                table = None
            if table in PLATFORM_ONLY_TABLES:
                return super().get_bind(mapper=mapper, clause=clause, **kwargs)

        engine = current_tenant_engine()
        if engine is not None:
            return engine
        return super().get_bind(mapper=mapper, clause=clause, **kwargs)


def current_tenant_engine():
    if not has_app_context():
        return None
    return g.get("tenant_engine")


def current_tenant_school_id():
    if not has_app_context():
        return None
    return g.get("tenant_school_id")


def validate_tenant_id(value):
    """(ok, reason). The tenant ID becomes part of the school's web address."""
    value = (value or "").strip().lower()
    if not TENANT_ID_RE.match(value):
        return False, (
            "Use 2-39 characters: lowercase letters, digits and hyphens, "
            "starting with a letter."
        )
    if value.endswith("-") or "--" in value:
        return False, "Do not end with a hyphen or use two hyphens in a row."
    if value in RESERVED_TENANT_IDS:
        return False, "That name is reserved for the platform. Choose another."
    return True, ""


# ----------------------------------------------------------------- engines
def _platform_url(database=None):
    url = make_url(current_app.config["SQLALCHEMY_DATABASE_URI"])
    return url.set(database=database)


def tenant_engine(database_name):
    """Engine for one school's database (cached, one per school)."""
    if not DB_NAME_RE.match(database_name or ""):
        raise ValueError(f"Invalid tenant database name: {database_name!r}")
    with _engines_lock:
        engine = _engines.get(database_name)
        if engine is None:
            engine = create_engine(
                _platform_url(database_name),
                pool_pre_ping=True,
                pool_recycle=1800,
                pool_size=int(os.getenv("TENANT_POOL_SIZE", "5")),
                max_overflow=int(os.getenv("TENANT_MAX_OVERFLOW", "5")),
            )
            _engines[database_name] = engine
        return engine



# ----------------------------------------------------------------- scopes
def _session():
    from utils.auth import db
    return db.session


@contextmanager
def _bound_to(engine):
    previous = g.get("tenant_engine")
    _session().remove()
    g.tenant_engine = engine
    try:
        yield
    finally:
        _session().remove()
        g.tenant_engine = previous


def platform_scope():
    """Run the block against the platform DB, even inside a tenant request."""
    return _bound_to(None)


def tenant_scope(database_name):
    """Run the block against one school's DB, even from a developer request."""
    return _bound_to(tenant_engine(database_name))


def activate_tenant(school_id, database_name, tenant_id=None):
    """Pin the rest of this request to one school's database."""
    _session().remove()
    g.tenant_engine = tenant_engine(database_name)
    g.tenant_school_id = school_id
    g.tenant_slug = tenant_id


def current_tenant_plan():
    if not has_app_context():
        return ("Trial", [])
    return (g.get("tenant_plan") or "Trial", g.get("tenant_custom") or [])


def current_tenant_slug():
    return g.get("tenant_slug") if has_app_context() else None


# ----------------------------------------------------------------- tokens
# A login token is "<tenant id>~<random>", e.g. "apec~3f2a...". The tenant id
# in front lets any later request find the right school database even when it
# arrives on a shared host (common login page, local development). The token
# itself is still checked against that school's own database, so a token made
# up for another school simply is not found.
TOKEN_SEP = "~"


def new_user_token(tenant_id):
    return f"{tenant_id}{TOKEN_SEP}{uuid.uuid4()}"


def _bearer_token():
    # Bearer header for API clients, otherwise the browser's session cookie.
    from utils.session import DEV_COOKIE, SCHOOL_COOKIE, bearer_token

    return bearer_token() or request.cookies.get(SCHOOL_COOKIE) or request.cookies.get(DEV_COOKIE)


def tenant_id_from_token(token):
    if token and TOKEN_SEP in token:
        candidate = token.split(TOKEN_SEP, 1)[0].strip().lower()
        if TENANT_ID_RE.match(candidate):
            return candidate
    return None


def platform_school_snapshot(school_id):
    """The school's platform record (plan, status, logo...) as a detached object.

    Uses its own short-lived session, so it is safe to call in the middle of a
    request without disturbing the logged-in user's session.
    """
    from utils.auth import db
    from utils.platform import School

    if not school_id:
        return None
    with PlainSession(db.engine, expire_on_commit=False) as plain:
        return plain.get(School, school_id)


def list_login_schools():
    """Active schools that have a database, for the common login page to search."""
    from utils.platform import School

    out = []
    with platform_scope():
        changed = False
        for school in School.query.filter_by(is_archived=False).order_by(School.id).all():
            if school.refresh_status():
                changed = True
            if not school.database_name or not school.tenant_id:
                continue
            out.append({
                "id": school.id,
                "tenant_id": school.tenant_id,
                "name": school.name,
                "school_code": school.school_code,
                "database_name": school.database_name,
                "allowed": school.is_login_allowed(),
            })
        if changed:
            _session().commit()
    return out


# ----------------------------------------------------------------- host / path
def tenant_slug_from_host(host):
    """'apec.api.example.com' -> 'apec' (with TENANT_BASE_DOMAIN=example.com)."""
    base = (os.getenv("TENANT_BASE_DOMAIN") or "").strip().lower().strip(".")
    host = (host or "").split(":")[0].strip().lower()
    if not base or not host.endswith("." + base):
        return None
    labels = host[: -(len(base) + 1)].split(".")
    slug = labels[0] if labels else ""
    if slug in RESERVED_TENANT_IDS:
        return None
    return slug


def school_urls(tenant_id):
    """The addresses a school uses, built from its tenant_id.

    login_url: the school's sign-in page               https://apec.<base>/Login
    api_url:   its API root, with the default version  https://apec.<base>/y26
    Both are None until TENANT_BASE_DOMAIN is set (local development).
    """
    base = (os.getenv("TENANT_BASE_DOMAIN") or "").strip().lower().strip(".")
    if not tenant_id or not base:
        return {"login_url": None, "api_url": None}
    scheme = (os.getenv("TENANT_URL_SCHEME") or "https").strip().lower()
    version = (os.getenv("API_DEFAULT_VERSION") or "y26").strip().lower()
    # Local development only: the dev server port (for example 5173), so the link works.
    port = (os.getenv("TENANT_PUBLIC_PORT") or "").strip()
    suffix = f":{int(port)}" if port.isdigit() else ""
    return {
        "login_url": f"{scheme}://{tenant_id}.{base}{suffix}/Login",
        "api_url": f"{scheme}://{tenant_id}.{base}{suffix}/{version}",
    }


class TenantRoutingMiddleware:
    """Strips /y22-style version prefixes and records the host's tenant.

    Runs before Flask matches routes, so the rewritten path is what routing sees:
      /y22/rbac/my-access      -> /api/rbac/my-access
      /y22/api/login           -> /api/login
      /api/login  (unchanged)  -> /api/login
    """

    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        path = environ.get("PATH_INFO") or "/"
        match = API_VERSION_RE.match(path)
        if match:
            environ["edu.api_version"] = match.group(1)
            rest = match.group(2) or "/"
            if rest != "/" and not (rest == "/api" or rest.startswith("/api/")):
                rest = "/api" + rest
            environ["PATH_INFO"] = rest

        environ["edu.tenant_slug"] = tenant_slug_from_host(environ.get("HTTP_HOST"))
        return self.wsgi_app(environ, start_response)


_cache = {}
_cache_lock = threading.Lock()


def invalidate_tenant_cache():
    """Called after any change to a school, so the change takes effect at once here.
    Other worker processes pick it up within TENANT_CACHE_SECONDS (default 30)."""
    with _cache_lock:
        _cache.clear()


def _cached(key, loader):
    ttl = float(os.getenv("TENANT_CACHE_SECONDS", "30"))
    now = time.monotonic()
    if ttl > 0:
        hit = _cache.get(key)
        if hit and hit[0] > now:
            return hit[1]
    value = loader()
    if ttl > 0:
        with _cache_lock:
            if len(_cache) > 5000:
                _cache.clear()
            _cache[key] = (now + ttl, value)
    return value


def _load_school_info(tenant_id):
    from utils.platform import School

    with platform_scope():
        school = School.query.filter_by(tenant_id=tenant_id).first()
        if school is None or school.is_archived:
            return None
        if school.refresh_status():
            _session().commit()
        return {
            "id": school.id,
            "tenant_id": school.tenant_id,
            "database_name": school.database_name,
            "allowed": school.is_login_allowed(),
            "plan": school.plan,
            "custom_dashboards": school.custom_dashboards,
        }


def _load_domain_tenant(host):
    from utils.platform import School, SchoolDomain

    with platform_scope():
        row = SchoolDomain.query.filter_by(domain=host, verified=True).first()
        if row is None:
            return None
        school = School.query.get(row.school_id)
        return school.tenant_id if school is not None else None


def _is_platform_host(host):
    """Hosts that can never be a school's custom domain."""
    base = (os.getenv("TENANT_BASE_DOMAIN") or "").strip().lower().strip(".")
    if host in ("localhost", "testserver") or re.match(r"^[0-9.]+$", host) or ":" in host:
        return True
    return bool(base) and (host == base or host.endswith("." + base))


def _request_host():
    return (request.host or "").split(":")[0].strip().lower()


EXEMPT_PATHS = {"/", "/healthz", "/readyz"}


def bind_request_tenant():
    """Called from app.before_request. Returns an error response, or None."""
    g.tenant_engine = None
    g.tenant_school_id = None
    g.tenant_slug = None

    path = request.path
    if path in EXEMPT_PATHS or path.startswith("/api/developer"):
        return None  # platform-level request (developer console, health checks)

    # The school comes from: its address (apec.api.<domain>), a verified custom
    # domain (portal.theirschool.edu), or the prefix of the login token.
    host_tenant = request.environ.get("edu.tenant_slug")
    if not host_tenant:
        host = _request_host()
        if host and not _is_platform_host(host):
            host_tenant = _cached(("domain", host), lambda: _load_domain_tenant(host))

    # Sign-in and the public sign-in page choose the school from the address only. A
    # session left over from another school must not block them.
    if path == "/api/login" or path.startswith("/api/public/"):
        token_tenant = None
    else:
        token_tenant = tenant_id_from_token(_bearer_token())
    if host_tenant and token_tenant and host_tenant != token_tenant:
        # a token from one school presented on another school's address
        return jsonify({"error": "Invalid token"}), 401

    slug = host_tenant or token_tenant
    if not slug:
        if path == "/api/login" or path.startswith("/api/school-logo/") or path.startswith("/api/public/"):
            return None  # login finds the school itself; logos are public
        return (
            jsonify({
                "error": "Your session is not linked to a school. Please log in again.",
                "error_code": "TENANT_REQUIRED",
            }),
            401,
        )

    info = _cached(("school", slug), lambda: _load_school_info(slug))
    if info is None:
        return jsonify({
            "error": "No school was found at this web address. Check the address, or contact your school.",
            "error_code": "SCHOOL_NOT_FOUND",
            "address": slug,
        }), 404
    if not info["database_name"]:
        return jsonify({"error": "This school has no database yet"}), 503

    if not info["allowed"] and path != "/api/login" and not path.startswith("/api/public/"):
        return (
            jsonify({
                "error": (
                    "This school's account is suspended or its trial/subscription "
                    "has expired. Contact support to continue."
                ),
                "error_code": "SCHOOL_ACCESS_DENIED",
            }),
            403,
        )

    activate_tenant(info["id"], info["database_name"], slug)
    g.tenant_plan = info.get("plan") or "Trial"
    g.tenant_custom = parse_custom(info.get("custom_dashboards"))

    # Plan check: a dashboard the school's plan does not include cannot be used,
    # even by calling its API directly.
    from utils.plans import dashboard_for_path, upgrade_message
    api_path = path[len("/api/"):] if path.startswith("/api/") else ""
    dashboard = dashboard_for_path(api_path)
    if dashboard and dashboard not in allowed_dashboards(g.tenant_plan, g.tenant_custom):
        return (
            jsonify({
                "error": upgrade_message(dashboard, g.tenant_plan),
                "error_code": "PLAN_UPGRADE_REQUIRED",
                "dashboard": dashboard,
                "plan": g.tenant_plan,
            }),
            402,
        )
    return None


# ----------------------------------------------------------------- schema upkeep
def ensure_tenant_schema(engine, dry_run=False):
    """Bring one school database up to date with the current models.

    Creates missing tables and adds missing columns (nullable or with a default).
    Never drops or changes anything. Indexes and constraints on added columns are
    not created; changes of that kind need a hand-written migration.
    Returns {"created_tables": [...], "added_columns": [...], "skipped": [...]}.
    """
    from utils.auth import db

    tables = [t for t in db.metadata.sorted_tables if t.name not in PLATFORM_ONLY_TABLES]
    inspector = sa.inspect(engine)
    existing = set(inspector.get_table_names())
    result = {"created_tables": [], "added_columns": [], "skipped": []}

    missing = [t for t in tables if t.name not in existing]
    result["created_tables"] = [t.name for t in missing]
    if missing and not dry_run:
        db.metadata.create_all(bind=engine, tables=missing)

    quote = engine.dialect.identifier_preparer.quote
    for table in tables:
        if table.name not in existing:
            continue
        have = {c["name"] for c in inspector.get_columns(table.name)}
        for column in table.columns:
            if column.name in have:
                continue
            label = f"{table.name}.{column.name}"
            if column.primary_key or (not column.nullable and column.server_default is None):
                result["skipped"].append(f"{label} (NOT NULL without a default: migrate by hand)")
                continue
            if not dry_run:
                ddl = sa.schema.CreateColumn(column).compile(dialect=engine.dialect)
                with engine.begin() as conn:
                    conn.execute(sa.text(f"ALTER TABLE {quote(table.name)} ADD COLUMN {ddl}"))
            result["added_columns"].append(label)
    return result


# ----------------------------------------------------------------- provisioning
def create_school_database_schema(school_snapshot):
    """Create a school's database, every tenant table, and its school row copy.

    school_snapshot: dict of every School column. No RBAC seeding and no admin
    here, so migration can bring those across from the old database.
    Idempotent (CREATE ... IF NOT EXISTS, create_all skips existing tables).
    Returns the engine for the new database.
    """
    from utils.auth import db
    from utils.platform import School

    database_name = school_snapshot["database_name"]
    if not DB_NAME_RE.match(database_name or ""):
        raise ValueError(f"Invalid tenant database name: {database_name!r}")

    # 1. create the database (needs CREATE privilege on the MySQL server)
    server = create_engine(_platform_url(None), pool_pre_ping=True)
    try:
        with server.connect() as conn:
            conn.execute(text(
                f"CREATE DATABASE IF NOT EXISTS `{database_name}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            ))
            conn.commit()
    finally:
        server.dispose()

    engine = tenant_engine(database_name)

    # 2. schema: every table except the platform-only ones
    tables = [
        t for t in db.metadata.sorted_tables
        if t.name not in PLATFORM_ONLY_TABLES
    ]
    db.metadata.create_all(bind=engine, tables=tables)

    # 3. copy of this school's own row, so school_id foreign keys resolve
    columns = {c.name for c in School.__table__.columns}
    row = {k: v for k, v in school_snapshot.items() if k in columns}
    with engine.begin() as conn:
        exists = conn.execute(
            School.__table__.select().where(School.__table__.c.id == row["id"])
        ).first()
        if exists is None:
            conn.execute(School.__table__.insert().values(**row))
    return engine


def provision_school_database(school_snapshot, admin_values):
    """New school: schema, RBAC defaults, and its first Super Admin.

    admin_values: kwargs for the first Admin (password already hashed).
    Raises on failure; the caller decides what to undo.
    """
    from utils.auth import Admin, db

    database_name = school_snapshot["database_name"]
    create_school_database_schema(school_snapshot)

    with tenant_scope(database_name):
        from utils.rolePermissionManagement import seed_rbac_defaults
        if not seed_rbac_defaults():
            raise RuntimeError("RBAC defaults could not be seeded")

        admin = Admin(**admin_values)
        _session().add(admin)
        _session().commit()
        admin_username = admin.username

    return {"database_name": database_name, "admin_username": admin_username}


def drop_school_database(database_name):
    """Only for rolling back a failed create. Never exposed as an API."""
    if not DB_NAME_RE.match(database_name or ""):
        return
    with _engines_lock:
        engine = _engines.pop(database_name, None)
    if engine is not None:
        engine.dispose()
    server = create_engine(_platform_url(None), pool_pre_ping=True)
    try:
        with server.connect() as conn:
            conn.execute(text(f"DROP DATABASE IF EXISTS `{database_name}`"))
            conn.commit()
    finally:
        server.dispose()
