"""Settings that matter once the app is on the internet behind HTTPS and a proxy."""
import logging
import os
import re
import uuid

from flask import g, jsonify, request
from sqlalchemy import text

logger = logging.getLogger(__name__)


def tenant_cors_origins():
    """Anchored patterns for every school's own addresses, from TENANT_BASE_DOMAIN.

    Matches https://<tenant>.login.<base>, https://<tenant>.api.<base>, and the
    platform hosts login.<base>, api.<base> and <base>. Anchored at both ends, so
    https://x.login.<base>.evil.com is NOT allowed.
    """
    base = (os.getenv("TENANT_BASE_DOMAIN") or "").strip().lower().strip(".")
    if not base:
        return []
    scheme = (os.getenv("TENANT_URL_SCHEME") or "https").strip().lower()
    b = re.escape(base)
    port = r"(:\d{1,5})?"  # local development uses a port, for example :5173
    return [
        re.compile(rf"^{scheme}://[a-z][a-z0-9-]{{1,38}}\.(login|api)\.{b}{port}$"),
        re.compile(rf"^{scheme}://[a-z][a-z0-9-]{{1,38}}\.{b}{port}$"),  # single address per school
        re.compile(rf"^{scheme}://((login|api)\.)?{b}{port}$"),
    ]


WEAK_SECRETS = {"dev-only-insecure-secret", "change-me", "changeme", "secret"}


def check_production_config(app, is_production):
    """Refuse to start in production with settings that would break or expose it."""
    if not is_production:
        return
    problems = []
    secret = app.config.get("SECRET_KEY") or ""
    if secret in WEAK_SECRETS or len(secret) < 32:
        problems.append("APP_SECRET_KEY must be a random value of at least 32 characters")
    if not (os.getenv("TENANT_BASE_DOMAIN") or "").strip():
        problems.append("TENANT_BASE_DOMAIN is not set (school addresses would not work)")
    if (os.getenv("TENANT_URL_SCHEME") or "https").strip().lower() != "https":
        problems.append("TENANT_URL_SCHEME must be https in production")
    if (os.getenv("SMTP_ALLOW_LOCAL") or "false").strip().lower() in ("1", "true", "yes"):
        problems.append("SMTP_ALLOW_LOCAL must be false in production (it allows unencrypted and local mail servers)")
    if (os.getenv("TENANT_PUBLIC_PORT") or "").strip():
        problems.append("TENANT_PUBLIC_PORT is a development setting: leave it empty in production")
    if os.getenv("RATE_LIMIT_ENABLED", "true").strip().lower() in ("0", "false", "no"):
        logger.warning("RATE_LIMIT_ENABLED is off: logins are not protected from guessing")
    from utils.rate_limit import using_shared_store
    if not using_shared_store():
        logger.warning(
            "REDIS_URL is not set (or Redis is unreachable): login protection counts per process. "
            "Set REDIS_URL so every worker shares the limit."
        )
    if not os.getenv("TRUSTED_PROXY_COUNT"):
        logger.warning(
            "TRUSTED_PROXY_COUNT is not set. Behind nginx or a load balancer, set it "
            "(usually 1) so the real host, scheme and client address are used."
        )
    if problems:
        raise RuntimeError("Unsafe production configuration: " + "; ".join(problems))


def init_production(app, db, is_production):
    check_production_config(app, is_production)

    # Real host / scheme / client address when behind a proxy. Applied last so it
    # runs first, before the tenant is read from the host.
    try:
        hops = int(os.getenv("TRUSTED_PROXY_COUNT", "0"))
    except ValueError:
        hops = 0
    if hops > 0:
        from werkzeug.middleware.proxy_fix import ProxyFix
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=hops, x_proto=hops, x_host=hops)

    @app.before_request
    def _request_id():
        g.request_id = (request.headers.get("X-Request-ID") or "")[:64] or uuid.uuid4().hex

    @app.after_request
    def _security_headers(response):
        from utils.session import apply_pending_session_cookies

        max_age = int(float(os.getenv("TOKEN_EXPIRY_HOURS", "12")) * 3600)
        response = apply_pending_session_cookies(response, max_age)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        if request.is_secure:
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        if request.path.startswith("/api/") and "Cache-Control" not in response.headers:
            response.headers["Cache-Control"] = "no-store"
        # API and file responses are never rendered as a page. A file served from here cannot
        # run script, load anything, or be framed.
        if request.path.startswith(("/api/", "/Assignment_Files/", "/Submitted_Assignments/")):
            response.headers.setdefault(
                "Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
            )
        response.headers["X-Request-ID"] = g.get("request_id", "")
        return response

    @app.get("/healthz")
    def healthz():
        # Liveness: the process is up. Never touches a database.
        return jsonify({"status": "ok"}), 200

    @app.get("/readyz")
    def readyz():
        # Readiness: the platform database answers.
        try:
            with db.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
        except Exception:
            logger.exception("Readiness check failed")
            return jsonify({"status": "unavailable"}), 503
        return jsonify({"status": "ready"}), 200
