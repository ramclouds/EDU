# Platform / multi-tenancy layer

import json
import logging
import re
import secrets
import string
import uuid
from datetime import datetime, timedelta

import math
import os

from flask import current_app, g, jsonify, request
from sqlalchemy import text
from sqlalchemy.engine import make_url
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError

from utils.auth import Admin, Student, Teacher, TOKEN_EXPIRY_HOURS, bcrypt, db
from utils.security import hash_token
from utils.session import wants_token_in_body
from utils.dns_verify import DnsLookupError, DnsUnavailable, lookup_txt
from utils.rate_limit import login_guard
from utils.plans import allowed_dashboards, parse_custom
from utils.tenant_routing import (
    drop_school_database,
    ensure_tenant_schema,
    invalidate_tenant_cache,
    platform_scope,
    provision_school_database,
    school_urls,
    tenant_engine,
    tenant_scope,
    validate_tenant_id,
)

logger = logging.getLogger(__name__)

SCHOOL_PLANS = ("Trial", "Basic", "Pro", "Enterprise", "Custom")


def parse_subscription_end(value):
    """'YYYY-MM-DD' -> end of that day (UTC), or None if invalid or not in the future."""
    if not isinstance(value, str):
        return None
    try:
        day = datetime.strptime(value.strip(), "%Y-%m-%d")
    except ValueError:
        return None
    end = day.replace(hour=23, minute=59, second=59)
    return end if end > datetime.utcnow() else None


# SCHOOL (TENANT)
class School(db.Model):
    __tablename__ = "schools"

    id = db.Column(db.Integer, primary_key=True)

    # Human-entered at login by every user belonging to this school.
    school_code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    # Host label that selects this school: apec.api.<base-domain>  ->  "apec".
    tenant_id = db.Column(db.String(40), unique=True, nullable=True, index=True)
    # Name of this school's database. Derived from TENANT_DB_PREFIX and the
    database_name = db.Column(db.String(64), unique=True, nullable=True, index=True)
    name = db.Column(db.String(200), nullable=False)
    # ISO 3166-1 alpha-2 country or region code, e.g. "IN", "US".
    country = db.Column(db.String(2), nullable=True)
    # Username of the platform developer who created this school.
    created_by = db.Column(db.String(100), nullable=True)

    contact_email = db.Column(db.String(120))
    contact_phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    logo_url = db.Column(db.String(255))

    plan = db.Column(
        db.Enum("Trial", "Basic", "Pro", "Enterprise", "Custom", name="school_plan_enum"),
        default="Trial",
        nullable=False,
    )
    # Dashboards for the "Custom" plan, as a JSON list of dashboard keys.
    custom_dashboards = db.Column(db.Text)
    status = db.Column(
        db.Enum("Trial", "Active", "Suspended", "Expired", name="school_status_enum"),
        default="Trial",
        nullable=False,
    )

    trial_ends_at = db.Column(db.DateTime)
    subscription_ends_at = db.Column(db.DateTime)

    # Soft-delete/archive rather than hard-delete — a school's data
    is_archived = db.Column(db.Boolean, default=False, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def refresh_status(self, now=None):
        # Mark a Trial or Active school as Expired once its date has passed
        now = now or datetime.utcnow()
        if self.is_archived or self.status in ("Suspended", "Expired"):
            return False
        if self.status == "Trial" and self.trial_ends_at and now > self.trial_ends_at:
            self.status = "Expired"
            return True
        if self.status == "Active" and self.subscription_ends_at and now > self.subscription_ends_at:
            self.status = "Expired"
            return True
        return False

    def is_login_allowed(self):
        if self.is_archived or self.status in ("Suspended", "Expired"):
            return False
        if self.status == "Trial" and self.trial_ends_at:
            if datetime.utcnow() > self.trial_ends_at:
                return False
        if self.status == "Active" and self.subscription_ends_at:
            if datetime.utcnow() > self.subscription_ends_at:
                return False
        return True

    def to_dict(self, include_counts=False):
        data = {
            "id": self.id,
            "school_code": self.school_code,
            "tenant_id": self.tenant_id,
            **school_urls(self.tenant_id),
            "database_name": self.database_name,
            "country": self.country,
            "created_by": self.created_by,
            "name": self.name,
            "contact_email": self.contact_email,
            "contact_phone": self.contact_phone,
            "address": self.address,
            "logo_url": self.logo_url,
            "plan": self.plan,
            "status": self.status,
            "custom_dashboards": parse_custom(self.custom_dashboards),
            "plan_dashboards": sorted(allowed_dashboards(self.plan, parse_custom(self.custom_dashboards))),
            "trial_ends_at": (
                self.trial_ends_at.isoformat() if self.trial_ends_at else None
            ),
            "subscription_ends_at": (
                self.subscription_ends_at.isoformat()
                if self.subscription_ends_at
                else None
            ),
            "is_archived": self.is_archived,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_counts:
            data.update(tenant_counts(self))
        return data


def tenant_counts(school):
    """Student and staff counts, read from that school's own database."""
    database_name = school.database_name  # read before leaving the session
    if not database_name:
        return {"student_count": 0, "staff_count": 0}
    with tenant_scope(database_name):
        # Only enrolled (Active) students count toward the plan limit.
        return {
            "student_count": Student.query.filter_by(status="Active").count(),
            "staff_count": Admin.query.count() + Teacher.query.count(),
        }


def platform_totals():
    """(active students, staff) summed over every school database."""
    students = staff = 0
    for school in School.query.filter_by(is_archived=False).all():
        counts = tenant_counts(school)
        students += counts["student_count"]
        staff += counts["staff_count"]
    return students, staff


def refresh_all_schools():
    """Persist any Trial/Active schools whose dates have passed as Expired."""
    changed = False
    for s in School.query.all():
        if s.refresh_status():
            changed = True
    if changed:
        db.session.commit()


def generate_school_code():
    # SCH-XXXXXX, retried until unique. Short enough to type at login,
    alphabet = string.ascii_uppercase + string.digits
    for _ in range(20):
        code = "SCH-" + "".join(secrets.choice(alphabet) for _ in range(6))
        if not School.query.filter_by(school_code=code).first():
            return code
    raise RuntimeError("Could not generate a unique school code")


# DEVELOPER (PLATFORM OWNER)
class Developer(db.Model):
    # The platform owner / product seller — you. Not tied to any

    __tablename__ = "developers"

    id = db.Column(db.Integer, primary_key=True)
    developer_id = db.Column(db.String(50), unique=True, nullable=False)

    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100))

    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    password = db.Column(db.String(255), nullable=False)

    auth_token = db.Column(db.String(255))
    token_expires_at = db.Column(db.DateTime)
    # Two-factor sign-in (authenticator app). Secret is stored; the last accepted step
    # stops a code being used twice.
    totp_secret = db.Column(db.String(64))
    totp_enabled = db.Column(db.Boolean, nullable=False, default=False, server_default="0")
    totp_last_counter = db.Column(db.Integer)

    status = db.Column(
        db.Enum("Active", "Inactive", name="developer_status_enum"),
        default="Active",
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "developer_id": self.developer_id,
            "name": f"{self.first_name} {self.last_name or ''}".strip(),
            "email": self.email,
            "username": self.username,
            "status": self.status,
        }


def developer_required(view_func):
    # Auth guard for platform-owner-only endpoints. Deliberately

    from functools import wraps

    @wraps(view_func)
    def wrapper(*args, **kwargs):
        from utils.session import DEV_COOKIE, DEV_CSRF_COOKIE, DEV_CSRF_HEADER, bearer_token, csrf_passes

        token = bearer_token()
        from_cookie = False
        if not token:
            token = request.cookies.get(DEV_COOKIE)
            from_cookie = bool(token)
        if not token:
            return jsonify({"error": "Missing authentication token"}), 401

        dev = Developer.query.filter_by(auth_token=hash_token(token)).first()
        if dev is None:
            return jsonify({"error": "Invalid token"}), 401

        if dev.token_expires_at and datetime.utcnow() > dev.token_expires_at:
            dev.auth_token = None
            dev.token_expires_at = None
            db.session.commit()
            return jsonify({"error": "Session expired, please log in again"}), 401

        if dev.status != "Active":
            return jsonify({"error": "Account inactive"}), 403

        if from_cookie and not csrf_passes(DEV_CSRF_COOKIE, DEV_CSRF_HEADER):
            return jsonify({"error": "Security check failed. Reload the page and try again.", "error_code": "CSRF"}), 403

        dev.token_expires_at = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS)
        db.session.commit()

        request.developer = dev
        # Plain copies: switching school databases detaches ORM objects.
        request.developer_id = dev.id
        request.developer_username = dev.username
        return view_func(*args, **kwargs)

    return wrapper


class DeveloperLogin(MethodView):
    def post(self):
        return login_guard("dev", self._post)

    def _post(self):
        data = request.get_json(silent=True) or {}
        identifier = (data.get("username") or data.get("email") or "").strip()
        password = data.get("password") or ""

        if not identifier or not password:
            return jsonify({"error": "Username/email and password are required"}), 400

        dev = Developer.query.filter(
            (Developer.username == identifier) | (Developer.email == identifier)
        ).first()

        if not dev or not bcrypt.check_password_hash(dev.password, password):
            return jsonify({"error": "Invalid credentials"}), 401

        if dev.status != "Active":
            return jsonify({"error": "Account inactive"}), 403

        if dev.totp_enabled:
            # Password is right; the authenticator code is still needed.
            return jsonify({"requires_2fa": True, "challenge": _two_factor_challenge(dev)}), 200

        return _start_developer_session(dev)


def _two_factor_challenge(dev):
    """A short-lived token proving the password step passed. It grants no access by itself."""
    from itsdangerous import URLSafeTimedSerializer

    serializer = URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt="developer-2fa")
    return serializer.dumps({"dev": dev.id})


def _read_two_factor_challenge(challenge):
    from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

    serializer = URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt="developer-2fa")
    try:
        return serializer.loads(challenge, max_age=300).get("dev")
    except (BadSignature, SignatureExpired):
        return None


def _start_developer_session(dev):
    try:
        token = str(uuid.uuid4())
        g.pending_session = ("developer", token)
        dev.auth_token = hash_token(token)
        dev.token_expires_at = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS)
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        logger.exception("Developer login failed")
        return jsonify({"error": "Internal server error"}), 500

    return (
        jsonify({**({"token": token} if wants_token_in_body() else {}), "developer": dev.to_dict()}),
        200,
    )


class DeveloperLoginTwoFactorAPI(MethodView):
    """Second sign-in step: the authenticator code, after the password was accepted."""

    def post(self):
        return login_guard("dev", self._post)

    def _post(self):
        from utils.totp import verify

        data = request.get_json(silent=True) or {}
        dev_id = _read_two_factor_challenge(str(data.get("challenge") or ""))
        dev = Developer.query.get(dev_id) if dev_id else None
        if dev is None or not dev.totp_enabled or dev.status != "Active":
            return jsonify({"error": "Sign-in timed out. Enter your password again."}), 401

        step = verify(dev.totp_secret, data.get("code"), last_counter=dev.totp_last_counter)
        if step is None:
            return jsonify({"error": "That code is not right. Check your authenticator app."}), 401
        dev.totp_last_counter = step
        db.session.commit()
        return _start_developer_session(dev)


class DeveloperTwoFactorAPI(MethodView):
    """Status, and turning two-factor sign-in on or off for the signed-in platform owner."""

    decorators = [developer_required]

    def get(self):
        dev = request.developer
        return jsonify({"enabled": bool(dev.totp_enabled)}), 200

    def post(self):
        """Start setup: returns a new secret to add to the authenticator app."""
        from utils.totp import new_secret, provisioning_uri

        dev = request.developer
        if dev.totp_enabled:
            return jsonify({"error": "Two-factor sign-in is already on"}), 400
        dev.totp_secret = new_secret()
        dev.totp_last_counter = None
        db.session.commit()
        return jsonify({
            "secret": dev.totp_secret,
            "uri": provisioning_uri(dev.totp_secret, dev.username or dev.email or "platform-owner"),
        }), 200

    def put(self):
        """Confirm setup with a code from the app. Turns two-factor sign-in on."""
        from utils.totp import verify

        dev = request.developer
        if dev.totp_enabled:
            return jsonify({"error": "Two-factor sign-in is already on"}), 400
        step = verify(dev.totp_secret, (request.get_json(silent=True) or {}).get("code"))
        if step is None:
            return jsonify({"error": "That code is not right. Check your authenticator app."}), 400
        dev.totp_enabled = True
        dev.totp_last_counter = step
        db.session.commit()
        return jsonify({"message": "Two-factor sign-in is on", "enabled": True}), 200

    def delete(self):
        """Turn it off. Needs the current password and a current code."""
        from utils.totp import verify

        dev = request.developer
        data = request.get_json(silent=True) or {}
        if not bcrypt.check_password_hash(dev.password, data.get("password") or ""):
            return jsonify({"error": "Your password is not correct"}), 403
        if not dev.totp_enabled or verify(dev.totp_secret, data.get("code"), last_counter=dev.totp_last_counter) is None:
            return jsonify({"error": "That code is not right"}), 403
        dev.totp_enabled = False
        dev.totp_secret = None
        dev.totp_last_counter = None
        db.session.commit()
        return jsonify({"message": "Two-factor sign-in is off", "enabled": False}), 200

class DeveloperLogout(MethodView):
    decorators = [developer_required]

    def post(self):
        dev = request.developer
        try:
            dev.auth_token = None
            g.pending_clear = "developer"
            dev.token_expires_at = None
            db.session.commit()
            return jsonify({"message": "Logged out"}), 200
        except SQLAlchemyError:
            db.session.rollback()
            return jsonify({"error": "Unable to log out"}), 500


# SCHOOL MANAGEMENT (Developer-only)
class SchoolListCreateAPI(MethodView):
    decorators = [developer_required]

    def get(self):
        refresh_all_schools()
        schools = School.query.order_by(School.created_at.desc()).all()
        return jsonify([s.to_dict(include_counts=True) for s in schools]), 200

    def post(self):
        # Creates a school, provisions its own database, and creates its first
        # Super Admin inside that database.
        data = request.get_json(silent=True) or {}

        name = (data.get("name") or "").strip()
        contact_email = (data.get("contact_email") or "").strip()
        admin_first_name = (data.get("admin_first_name") or "").strip()
        admin_last_name = (data.get("admin_last_name") or "").strip()
        admin_email = (data.get("admin_email") or contact_email).strip()
        admin_password = data.get("admin_password") or ""
        tenant_id = (data.get("tenant_id") or data.get("subdomain") or _slugify(name)).strip().lower()

        missing = [
            field
            for field, val in [
                ("name", name),
                ("admin_first_name", admin_first_name),
                ("admin_email", admin_email),
                ("admin_password", admin_password),
            ]
            if not val
        ]
        if missing:
            return (
                jsonify({"error": f"Missing required fields: {', '.join(missing)}"}),
                400,
            )
        if len(admin_password) < 8:
            return jsonify({"error": "admin_password must be at least 8 characters"}), 400
        tenant_ok, tenant_reason = validate_tenant_id(tenant_id)
        if not tenant_ok:
            return jsonify({"error": f"Tenant ID: {tenant_reason}"}), 400
        if School.query.filter_by(tenant_id=tenant_id).first():
            return jsonify({"error": "That tenant ID is already taken"}), 409

        country = (data.get("country") or "").strip().upper() or None
        if country and not re.match(r"^[A-Z]{2}$", country):
            return jsonify({"error": "country must be a 2-letter code such as IN or US"}), 400

        plan = data.get("plan", "Trial")
        if plan not in SCHOOL_PLANS:
            return jsonify({"error": "plan must be one of: " + ", ".join(SCHOOL_PLANS)}), 400

        school = School(
            school_code=generate_school_code(),
            tenant_id=tenant_id,
            name=name,
            contact_email=contact_email or None,
            country=country,
            created_by=getattr(request, "developer_username", None),
            contact_phone=data.get("contact_phone"),
            address=data.get("address"),
            plan=plan,
            status="Trial" if plan == "Trial" else "Active",
            custom_dashboards=json.dumps(parse_custom(json.dumps(data.get("custom_dashboards") or []))),
            trial_ends_at=(
                datetime.utcnow() + timedelta(days=14) if plan == "Trial" else None
            ),
        )
        school.database_name = tenant_database_name(school.school_code)

        try:
            db.session.add(school)
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("School registry insert failed")
            return jsonify({"error": "Internal server error"}), 500

        # Snapshot every column now, while the object is still attached.
        snapshot = {c.name: getattr(school, c.name) for c in School.__table__.columns}

        admin_username = admin_email.split("@")[0] + "_" + school.school_code[-4:]
        admin_values = dict(
            admin_id=f"ADM-{school.school_code}",
            user_id=str(uuid.uuid4())[:8],
            first_name=admin_first_name,
            last_name=admin_last_name,
            email=admin_email,
            username=admin_username,
            password=bcrypt.generate_password_hash(admin_password).decode("utf-8"),
            school_id=snapshot["id"],
            role="super_admin",
            admin_type="Super Admin",
            status="Active",
        )

        try:
            provisioned = provision_school_database(snapshot, admin_values)
        except Exception:
            logger.exception("School database provisioning failed for %s", snapshot["school_code"])
            drop_school_database(snapshot["database_name"])
            with platform_scope():
                School.query.filter_by(id=snapshot["id"]).delete()
                _session_commit()
            return jsonify({"error": "Could not create the school's database. Nothing was saved."}), 500

        with platform_scope():
            school = School.query.get(snapshot["id"])
            audit("school.create", school=school, detail=f"plan={plan} db={provisioned['database_name']}")
            school_dict = school.to_dict()

        return (
            jsonify(
                {
                    "message": "School created",
                    "school": school_dict,
                    "admin_login": {
                        "school_code": school_dict["school_code"],
                        "tenant_id": tenant_id,
                        **school_urls(tenant_id),
                        "username": provisioned["admin_username"],
                        "email": admin_email,
                    },
                }
            ),
            201,
        )


def _slugify(value):
    cleaned = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    return cleaned[:39]


def _session_commit():
    db.session.commit()


class SchoolDetailAPI(MethodView):
    decorators = [developer_required]

    def get(self, school_id):
        school = School.query.get(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404
        if school.refresh_status():
            db.session.commit()
        return jsonify(school_detail(school)), 200

    def put(self, school_id):
        school = School.query.get(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404

        data = request.get_json(silent=True) or {}
        for field in [
            "name",
            "contact_email",
            "contact_phone",
            "address",
            "logo_url",
        ]:
            if field in data:
                setattr(school, field, data[field])

        try:
            db.session.commit()
            audit("school.update", school=school, detail=", ".join(sorted(k for k in data.keys() if k in {"name","contact_email","contact_phone","address","logo_url"})))
            return jsonify({"message": "School updated", "school": school.to_dict()}), 200
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("School update failed")
            return jsonify({"error": "Internal server error"}), 500


class SchoolStatusAPI(MethodView):
    # Suspend / reactivate / archive a school. Split from the general

    decorators = [developer_required]

    def post(self, school_id):
        school = School.query.get(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404

        data = request.get_json(silent=True) or {}
        action = data.get("action")

        if action not in ("suspend", "reactivate", "archive", "activate"):
            return jsonify({"error": "action must be one of: suspend, reactivate, archive, activate"}), 400

        now = datetime.utcnow()
        if action == "suspend":
            school.status = "Suspended"
        elif action == "archive":
            school.is_archived = True
            school.status = "Suspended"
        elif action == "reactivate":
            # Restore the status the school can legitimately have. A school
            if school.subscription_ends_at:
                if now > school.subscription_ends_at:
                    return jsonify({"error": "The subscription ended on %s. Activate a subscription with a future end date instead." % school.subscription_ends_at.date().isoformat()}), 400
                school.status = "Active"
            elif school.trial_ends_at and now <= school.trial_ends_at:
                school.status = "Trial"
            else:
                return jsonify({"error": "The trial has ended. Extend the trial or activate a subscription."}), 400
            school.is_archived = False
        elif action == "activate":
            end = parse_subscription_end(data.get("subscription_ends_at"))
            if end is None:
                return jsonify({"error": "subscription_ends_at must be a date (YYYY-MM-DD) in the future"}), 400
            plan = data.get("plan") or school.plan
            if plan not in SCHOOL_PLANS:
                return jsonify({"error": "plan must be one of: " + ", ".join(SCHOOL_PLANS)}), 400
            school.plan = plan
            school.subscription_ends_at = end
            school.status = "Active"
            school.is_archived = False

        try:
            db.session.commit()
            audit(f"school.{action}", school=school, detail=(f"plan={school.plan} ends={school.subscription_ends_at.date().isoformat()}" if action == "activate" else None))
            logger.info(
                "School %s (%s) -> %s by developer_id=%s",
                school.school_code,
                school.id,
                action,
                getattr(request.developer, "developer_id", "?"),
            )
            return jsonify({"message": f"School {action}d", "school": school.to_dict()}), 200
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("School status change failed")
            return jsonify({"error": "Internal server error"}), 500


class PlatformStatsAPI(MethodView):
    decorators = [developer_required]

    def get(self):
        refresh_all_schools()
        total_schools = School.query.filter_by(is_archived=False).count()
        expired_schools = School.query.filter_by(status="Expired").count()
        active_schools = School.query.filter_by(status="Active").count()
        trial_schools = School.query.filter_by(status="Trial").count()
        suspended_schools = School.query.filter_by(status="Suspended").count()
        total_students, total_staff = platform_totals()

        return (
            jsonify(
                {
                    "total_schools": total_schools,
                    "active_schools": active_schools,
                    "trial_schools": trial_schools,
                    "suspended_schools": suspended_schools,
                    "expired_schools": expired_schools,
                    "total_students": total_students,
                    "total_staff": total_staff,
                }
            ),
            200,
        )


# DEVELOPER AUDIT LOG
class SchoolDomain(db.Model):
    """A custom web address (portal.theirschool.edu) a school wants to use.

    Platform database only. It works once ownership is proven by a DNS TXT record.
    """
    __tablename__ = "school_domains"

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True
    )
    domain = db.Column(db.String(253), unique=True, nullable=False)
    verification_token = db.Column(db.String(64), nullable=False)
    verified = db.Column(db.Boolean, nullable=False, default=False)
    verified_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class DeveloperAuditLog(db.Model):
    __tablename__ = "developer_audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    developer_id = db.Column(db.Integer, index=True)
    developer_username = db.Column(db.String(50))
    action = db.Column(db.String(60), nullable=False, index=True)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True)
    school_name = db.Column(db.String(200))
    detail = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "developer": self.developer_username,
            "action": self.action,
            "school_id": self.school_id,
            "school_name": self.school_name,
            "detail": self.detail,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


def audit(action, school=None, detail=None):
    # Record a developer action. Never raises: an audit failure must not
    try:
        entry = DeveloperAuditLog(
            developer_id=getattr(request, "developer_id", None),
            developer_username=getattr(request, "developer_username", None),
            action=action,
            school_id=getattr(school, "id", None),
            school_name=getattr(school, "name", None),
            detail=detail,
        )
        db.session.add(entry)
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        logger.exception("Failed to write developer audit entry: %s", action)
    finally:
        invalidate_tenant_cache()


def tenant_database_name(school_code):
    """e.g. TENANT_DB_PREFIX=edu, code SCH-A1B2C3 -> edu_sch_a1b2c3."""
    prefix = (os.getenv("TENANT_DB_PREFIX") or "edu").strip().lower()
    suffix = school_code.lower().replace("-", "_")
    return f"{prefix}_{suffix}"[:64]


def school_detail(school):
    """The full view of one school for the developer's detail panel."""
    from utils.Notifications import ActivityLog  # local: avoids import cycle

    data = school.to_dict(include_counts=True)

    database_name, school_pk = school.database_name, school.id
    if database_name:
        with tenant_scope(database_name):
            admins = Admin.query.filter_by(school_id=school_pk, is_deleted=False).all()
            admin_rows = [
                {
                    "id": a.id,
                    "name": f"{a.first_name or ''} {a.last_name or ''}".strip(),
                    "username": a.username,
                    "email": a.email,
                    "admin_type": a.admin_type,
                    "role": a.role,
                    "status": a.status,
                }
                for a in admins
            ]
            activity_count = ActivityLog.query.count()
    else:
        admin_rows, activity_count = [], 0
    data["admins"] = admin_rows

    now = datetime.utcnow()
    # Round UP: a trial that ends in 13 days and 23 hours still has 14 days
    if school.status == "Trial" and school.trial_ends_at:
        remaining = (school.trial_ends_at - now).total_seconds()
        data["trial_days_left"] = max(0, math.ceil(remaining / 86400))
    else:
        data["trial_days_left"] = None
    data["login_allowed"] = school.is_login_allowed()

    data["recent_activity_count"] = activity_count
    return data


class PlatformInfoAPI(MethodView):
    # Where this deployment's database lives, and whether it answers

    decorators = [developer_required]

    def get(self):
        uri = current_app.config.get("SQLALCHEMY_DATABASE_URI") or ""
        students_total, staff_total = platform_totals()
        try:
            url = make_url(uri)
            database = {
                "engine": url.get_backend_name(),
                "name": url.database,
                "host": url.host,
                "port": url.port,
                "user": url.username,
                "dsn": url.render_as_string(hide_password=True),
            }
        except Exception:
            database = {"engine": None, "name": None, "host": None, "port": None,
                        "user": None, "dsn": "unparseable"}

        try:
            db.session.execute(text("SELECT 1"))
            database["reachable"] = True
        except SQLAlchemyError:
            db.session.rollback()
            database["reachable"] = False

        return jsonify({
            "database": database,
            "tenant_db_prefix": (os.getenv("TENANT_DB_PREFIX") or "edu").strip().lower(),
            "app": {
                "env": os.getenv("FLASK_ENV", "development"),
                "token_expiry_hours": TOKEN_EXPIRY_HOURS,
                "cors_origins": os.getenv("CORS_ORIGINS", "http://localhost:5173"),
            },
            "totals": {
                "schools": School.query.count(),
                "developers": Developer.query.count(),
                "students": students_total,
                "staff": staff_total,
            },
        }), 200


class SchoolActivityAPI(MethodView):
    decorators = [developer_required]

    def get(self, school_id):
        from utils.Notifications import ActivityLog  # local: avoids import cycle

        school = School.query.get(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404
        limit = min(max(int(request.args.get("limit", 50)), 1), 200)
        database_name = school.database_name
        if not database_name:
            return jsonify({"success": True, "activity": []}), 200
        with tenant_scope(database_name):
            rows = (
                ActivityLog.query
                .order_by(ActivityLog.created_at.desc())
                .limit(limit)
                .all()
            )
        return jsonify({"success": True, "activity": [
            {
                "id": r.id,
                "role": r.role,
                "action": r.action,
                "description": r.description,
                "time": r.created_at.isoformat() if r.created_at else None,
            } for r in rows
        ]}), 200


class ExtendTrialAPI(MethodView):
    decorators = [developer_required]

    def post(self, school_id):
        school = School.query.get(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404
        data = request.get_json(silent=True) or {}
        try:
            days = int(data.get("days"))
        except (TypeError, ValueError):
            return jsonify({"error": "days must be a whole number"}), 400
        if not 1 <= days <= 365:
            return jsonify({"error": "days must be between 1 and 365"}), 400

        if school.subscription_ends_at and school.status == "Expired":
            return jsonify({"error": "This school's subscription has ended. Activate a subscription instead of extending the trial."}), 400
        now = datetime.utcnow()
        base = school.trial_ends_at if school.trial_ends_at and school.trial_ends_at > now else now
        school.trial_ends_at = base + timedelta(days=days)
        if school.status == "Expired":
            school.status = "Trial"
        try:
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            return jsonify({"error": "Internal server error"}), 500
        audit("school.extend_trial", school=school, detail=f"+{days} days")
        return jsonify({"message": f"Trial extended by {days} days", "school": school_detail(school)}), 200


class ResetAdminPasswordAPI(MethodView):
    # Support action: set a new password for one of a school's admins

    decorators = [developer_required]

    def post(self, school_id):
        school = School.query.get(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404
        data = request.get_json(silent=True) or {}
        new_password = data.get("new_password") or ""
        if len(new_password) < 8:
            return jsonify({"error": "new_password must be at least 8 characters"}), 400
        database_name, school_pk = school.database_name, school.id
        if not database_name:
            return jsonify({"error": "This school has no database yet"}), 503
        with tenant_scope(database_name):
            admin = Admin.query.filter_by(id=data.get("admin_id"), school_id=school_pk).first()
            if not admin:
                return jsonify({"error": "Admin not found in this school"}), 404

            admin.password = bcrypt.generate_password_hash(new_password).decode("utf-8")
            admin.auth_token = None
            admin.token_expires_at = None
            try:
                db.session.commit()
            except SQLAlchemyError:
                db.session.rollback()
                return jsonify({"error": "Internal server error"}), 500
            admin_username = admin.username
        audit("school.reset_admin_password", school=school, detail=f"admin={admin_username}")
        return jsonify({"message": "Password reset. The admin has been signed out everywhere."}), 200


class DeveloperAuditAPI(MethodView):
    decorators = [developer_required]

    def get(self):
        limit = min(max(int(request.args.get("limit", 100)), 1), 500)
        school_id = request.args.get("school_id", type=int)
        query = DeveloperAuditLog.query
        if school_id:
            query = query.filter_by(school_id=school_id)
        rows = query.order_by(DeveloperAuditLog.created_at.desc()).limit(limit).all()
        return jsonify({"success": True, "entries": [r.to_dict() for r in rows]}), 200



# ====================== tenant creation helpers (developer console) ======================
class TenantCheckAPI(MethodView):
    """Is this initial domain name (tenant ID) free? Used by the create-school wizard."""

    decorators = [developer_required]

    def get(self):
        tenant_id = (request.args.get("tenant_id") or "").strip().lower()
        ok, reason = validate_tenant_id(tenant_id)
        if ok and School.query.filter_by(tenant_id=tenant_id).first():
            ok, reason = False, "That name is already taken."
        payload = {"tenant_id": tenant_id, "available": ok, "reason": reason}
        if ok:
            payload.update(school_urls(tenant_id))
        return jsonify(payload), 200


# ====================== custom domains ======================
DOMAIN_RE = re.compile(r"^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$")
MAX_DOMAINS_PER_SCHOOL = 5


def _domain_payload(row, school):
    login_url = school_urls(school.tenant_id).get("login_url") or ""
    return {
        "id": row.id,
        "domain": row.domain,
        "verified": bool(row.verified),
        "verified_at": row.verified_at.isoformat() if row.verified_at else None,
        # What the school must publish in DNS:
        "txt_name": f"_edu-verify.{row.domain}",
        "txt_value": f"edu-verify={row.verification_token}",
        "cname_name": row.domain,
        # the host only (no scheme, no path): DNS points a name at a host, not a page
        "cname_target": login_url.split("://", 1)[-1].split("/", 1)[0] or None,
    }


class SchoolDomainsAPI(MethodView):
    decorators = [developer_required]

    def get(self, school_id):
        school = School.query.get(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404
        rows = SchoolDomain.query.filter_by(school_id=school_id).order_by(SchoolDomain.id).all()
        return jsonify({"domains": [_domain_payload(r, school) for r in rows]}), 200

    def post(self, school_id):
        school = School.query.get(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404

        data = request.get_json(silent=True) or {}
        domain = (data.get("domain") or "").strip().lower().rstrip(".")
        domain = re.sub(r"^https?://", "", domain).split("/")[0]
        if not DOMAIN_RE.match(domain):
            return jsonify({"error": "Enter a domain such as portal.yourschool.edu"}), 400

        base = (os.getenv("TENANT_BASE_DOMAIN") or "").strip().lower().strip(".")
        if base and (domain == base or domain.endswith("." + base)):
            return jsonify({"error": f"Domains under {base} belong to the platform"}), 400
        if SchoolDomain.query.filter_by(domain=domain).first():
            return jsonify({"error": "That domain is already registered"}), 409
        if SchoolDomain.query.filter_by(school_id=school_id).count() >= MAX_DOMAINS_PER_SCHOOL:
            return jsonify({"error": f"At most {MAX_DOMAINS_PER_SCHOOL} custom domains per school"}), 400

        row = SchoolDomain(
            school_id=school_id, domain=domain, verification_token=secrets.token_hex(16)
        )
        try:
            db.session.add(row)
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Custom domain insert failed")
            return jsonify({"error": "Internal server error"}), 500
        payload = _domain_payload(row, school)
        audit("domain.add", school=school, detail=domain)
        return jsonify({"message": "Domain added. Publish the DNS records, then verify.", "domain": payload}), 201


class SchoolDomainDetailAPI(MethodView):
    decorators = [developer_required]

    def delete(self, school_id, domain_id):
        school = School.query.get(school_id)
        row = SchoolDomain.query.filter_by(id=domain_id, school_id=school_id).first()
        if not school or not row:
            return jsonify({"error": "Domain not found"}), 404
        name = row.domain
        try:
            db.session.delete(row)
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Custom domain delete failed")
            return jsonify({"error": "Internal server error"}), 500
        audit("domain.remove", school=school, detail=name)
        return jsonify({"message": "Domain removed"}), 200


class SchoolDomainVerifyAPI(MethodView):
    decorators = [developer_required]

    def post(self, school_id, domain_id):
        school = School.query.get(school_id)
        row = SchoolDomain.query.filter_by(id=domain_id, school_id=school_id).first()
        if not school or not row:
            return jsonify({"error": "Domain not found"}), 404
        if row.verified:
            return jsonify({"verified": True, "message": "Already verified", "domain": _domain_payload(row, school)}), 200

        expected = f"edu-verify={row.verification_token}"
        try:
            found = lookup_txt(f"_edu-verify.{row.domain}")
        except DnsUnavailable:
            return jsonify({"error": "DNS checking is not available on this server (install dnspython)"}), 503
        except DnsLookupError:
            return jsonify({"error": "The DNS lookup failed. Try again in a moment."}), 502

        if expected not in [v.strip() for v in found]:
            return (
                jsonify({
                    "verified": False,
                    "message": (
                        "The TXT record was not found yet. DNS changes can take a while "
                        "to spread. Check the record name and value, then try again."
                    ),
                    "domain": _domain_payload(row, school),
                }),
                200,
            )

        try:
            row.verified = True
            row.verified_at = datetime.utcnow()
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Custom domain verify failed")
            return jsonify({"error": "Internal server error"}), 500
        payload = _domain_payload(row, school)
        audit("domain.verify", school=school, detail=row.domain)
        return jsonify({"verified": True, "message": "Domain verified", "domain": payload}), 200


# ====================== school database health and upkeep ======================
class SchoolDatabaseAPI(MethodView):
    decorators = [developer_required]

    def get(self, school_id):
        """Is the school's database reachable, and is its structure up to date?"""
        school = School.query.get(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404
        name = school.database_name
        info = {"database_name": name, "reachable": False, "up_to_date": None, "pending": None}
        if not name:
            info["error"] = "This school has no database yet"
            return jsonify(info), 200
        try:
            engine = tenant_engine(name)
            pending = ensure_tenant_schema(engine, dry_run=True)
            info.update(
                reachable=True,
                pending=pending,
                up_to_date=not pending["created_tables"] and not pending["added_columns"],
            )
        except Exception:
            logger.exception("Database check failed for %s", name)
            info["error"] = "The school's database could not be reached"
        return jsonify(info), 200

    def post(self, school_id):
        """Bring the school's database structure up to date (adds, never removes)."""
        school = School.query.get(school_id)
        if not school or not school.database_name:
            return jsonify({"error": "School not found"}), 404
        name = school.database_name
        try:
            result = ensure_tenant_schema(tenant_engine(name))
            with tenant_scope(name):
                from utils.rolePermissionManagement import seed_rbac_defaults
                seed_rbac_defaults()
        except Exception:
            logger.exception("Database upkeep failed for %s", name)
            return jsonify({"error": "The update failed. Nothing was removed."}), 500
        audit(
            "school.database_update",
            school=school,
            detail=f"tables+{len(result['created_tables'])} columns+{len(result['added_columns'])}",
        )
        return jsonify({"message": "Database is up to date", "result": result}), 200


class SchoolPlanAPI(MethodView):
    """Platform owner sets the plan and, for Custom, the dashboards the school may use."""

    decorators = [developer_required]

    def put(self, school_id):
        from utils.plans import ALL_DASHBOARDS, DASHBOARD_LABELS, PLAN_DASHBOARDS
        from utils.tenant_routing import invalidate_tenant_cache

        school = School.query.get(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404
        data = request.get_json(silent=True) or {}
        plan = data.get("plan")
        if plan not in SCHOOL_PLANS:
            return jsonify({"error": "Choose a plan: " + ", ".join(SCHOOL_PLANS)}), 400
        custom = data.get("custom_dashboards") or []
        if plan == "Custom":
            unknown = [d for d in custom if d not in DASHBOARD_LABELS]
            if unknown:
                return jsonify({"error": f"Unknown dashboards: {', '.join(unknown)}"}), 400
            if not custom:
                return jsonify({"error": "A custom plan needs at least one dashboard."}), 400
        try:
            school.plan = plan
            school.custom_dashboards = json.dumps(sorted(set(custom))) if plan == "Custom" else None
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            return jsonify({"error": "Internal server error"}), 500
        invalidate_tenant_cache()
        summary = (
            "custom: " + ", ".join(sorted(custom)) if plan == "Custom"
            else f"{plan}: " + ", ".join(sorted(PLAN_DASHBOARDS.get(plan, ALL_DASHBOARDS)))
        )
        audit("school.plan_change", school=school, detail=summary)
        return jsonify({"message": f"Plan set to {plan}", "school": school.to_dict()}), 200
