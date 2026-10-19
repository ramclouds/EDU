# Platform / multi-tenancy layer

import logging
import secrets
import string
import uuid
from datetime import datetime, timedelta

import math
import os

from flask import current_app, jsonify, request
from sqlalchemy import text
from sqlalchemy.engine import make_url
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError

from utils.auth import Admin, Student, Teacher, TOKEN_EXPIRY_HOURS, bcrypt, db

logger = logging.getLogger(__name__)

SCHOOL_PLANS = ("Trial", "Basic", "Pro", "Enterprise")


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
    # Name of this school's database. Derived from TENANT_DB_PREFIX and the
    database_name = db.Column(db.String(64), unique=True, nullable=True, index=True)
    name = db.Column(db.String(200), nullable=False)

    contact_email = db.Column(db.String(120))
    contact_phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    logo_url = db.Column(db.String(255))

    plan = db.Column(
        db.Enum("Trial", "Basic", "Pro", "Enterprise", name="school_plan_enum"),
        default="Trial",
        nullable=False,
    )
    status = db.Column(
        db.Enum("Trial", "Active", "Suspended", "Expired", name="school_status_enum"),
        default="Trial",
        nullable=False,
    )

    # Usage limits — enforced at enrollment time (Phase 2), tracked here
    max_students = db.Column(db.Integer, default=200)
    max_staff = db.Column(db.Integer, default=30)

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
            "database_name": self.database_name,
            "name": self.name,
            "contact_email": self.contact_email,
            "contact_phone": self.contact_phone,
            "address": self.address,
            "logo_url": self.logo_url,
            "plan": self.plan,
            "status": self.status,
            "max_students": self.max_students,
            "max_staff": self.max_staff,
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
            # Only enrolled (Active) students count toward the plan limit.
            data["student_count"] = Student.query.filter_by(
                school_id=self.id, status="Active"
            ).count()
            data["staff_count"] = (
                Admin.query.filter_by(school_id=self.id).count()
                + Teacher.query.filter_by(school_id=self.id).count()
            )
        return data


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
        auth_header = request.headers.get("Authorization", "")
        token = (
            auth_header.split(" ", 1)[1]
            if auth_header.startswith("Bearer ")
            else None
        )
        if not token:
            return jsonify({"error": "Missing authentication token"}), 401

        dev = Developer.query.filter_by(auth_token=token).first()
        if dev is None:
            return jsonify({"error": "Invalid token"}), 401

        if dev.token_expires_at and datetime.utcnow() > dev.token_expires_at:
            dev.auth_token = None
            dev.token_expires_at = None
            db.session.commit()
            return jsonify({"error": "Session expired, please log in again"}), 401

        if dev.status != "Active":
            return jsonify({"error": "Account inactive"}), 403

        dev.token_expires_at = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS)
        db.session.commit()

        request.developer = dev
        return view_func(*args, **kwargs)

    return wrapper


class DeveloperLogin(MethodView):
    def post(self):
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

        try:
            dev.auth_token = str(uuid.uuid4())
            dev.token_expires_at = datetime.utcnow() + timedelta(
                hours=TOKEN_EXPIRY_HOURS
            )
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Developer login failed")
            return jsonify({"error": "Internal server error"}), 500

        return (
            jsonify({"token": dev.auth_token, "developer": dev.to_dict()}),
            200,
        )


class DeveloperLogout(MethodView):
    decorators = [developer_required]

    def post(self):
        dev = request.developer
        try:
            dev.auth_token = None
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
        # Creates a school AND its first Super Admin in one step, so
        data = request.get_json(silent=True) or {}

        name = (data.get("name") or "").strip()
        contact_email = (data.get("contact_email") or "").strip()
        admin_first_name = (data.get("admin_first_name") or "").strip()
        admin_last_name = (data.get("admin_last_name") or "").strip()
        admin_email = (data.get("admin_email") or contact_email).strip()
        admin_password = data.get("admin_password") or ""

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

        if Admin.query.filter_by(email=admin_email).first():
            return jsonify({"error": "Admin email already in use"}), 409

        try:
            school = School(
                school_code=generate_school_code(),
                name=name,
                contact_email=contact_email or None,
                contact_phone=data.get("contact_phone"),
                address=data.get("address"),
                plan=data.get("plan", "Trial"),
                status="Trial" if data.get("plan", "Trial") == "Trial" else "Active",
                max_students=data.get("max_students", 200),
                max_staff=data.get("max_staff", 30),
                trial_ends_at=(
                    datetime.utcnow() + timedelta(days=14)
                    if data.get("plan", "Trial") == "Trial"
                    else None
                ),
            )
            school.database_name = tenant_database_name(school.school_code)
            db.session.add(school)
            db.session.flush()  # get school.id before creating the admin

            admin_username = admin_email.split("@")[0] + "_" + school.school_code[-4:]
            first_admin = Admin(
                admin_id=f"ADM-{school.school_code}",
                user_id=str(uuid.uuid4())[:8],
                first_name=admin_first_name,
                last_name=admin_last_name,
                email=admin_email,
                username=admin_username,
                password=bcrypt.generate_password_hash(admin_password).decode(
                    "utf-8"
                ),
                school_id=school.id,
                # The auto-created first admin is that school's Super
                role="super_admin",
                admin_type="Super Admin",
                status="Active",
            )
            db.session.add(first_admin)
            db.session.commit()
            audit("school.create", school=school, detail=f"plan={school.plan}")

            return (
                jsonify(
                    {
                        "message": "School created",
                        "school": school.to_dict(),
                        "admin_login": {
                            "school_code": school.school_code,
                            "username": admin_username,
                            "email": admin_email,
                        },
                    }
                ),
                201,
            )
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("School creation failed")
            return jsonify({"error": "Internal server error"}), 500


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
            "plan",
            "max_students",
            "max_staff",
        ]:
            if field in data:
                setattr(school, field, data[field])

        try:
            db.session.commit()
            audit("school.update", school=school, detail=", ".join(sorted(k for k in data.keys() if k in {"name","contact_email","contact_phone","address","logo_url","plan","max_students","max_staff"})))
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
        total_students = Student.query.filter_by(status="Active").count()
        total_staff = Admin.query.count() + Teacher.query.count()

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
        dev = getattr(request, "developer", None)
        entry = DeveloperAuditLog(
            developer_id=getattr(dev, "id", None),
            developer_username=getattr(dev, "username", None),
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


def tenant_database_name(school_code):
    """e.g. TENANT_DB_PREFIX=edu, code SCH-A1B2C3 -> edu_sch_a1b2c3."""
    prefix = (os.getenv("TENANT_DB_PREFIX") or "edu").strip().lower()
    suffix = school_code.lower().replace("-", "_")
    return f"{prefix}_{suffix}"[:64]


def school_detail(school):
    """The full view of one school for the developer's detail panel."""
    from utils.Notifications import ActivityLog  # local: avoids import cycle

    data = school.to_dict(include_counts=True)

    admins = Admin.query.filter_by(school_id=school.id, is_deleted=False).all()
    data["admins"] = [
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

    now = datetime.utcnow()
    # Round UP: a trial that ends in 13 days and 23 hours still has 14 days
    if school.status == "Trial" and school.trial_ends_at:
        remaining = (school.trial_ends_at - now).total_seconds()
        data["trial_days_left"] = max(0, math.ceil(remaining / 86400))
    else:
        data["trial_days_left"] = None
    data["login_allowed"] = school.is_login_allowed()

    students_used = data.get("student_count") or 0
    staff_used = data.get("staff_count") or 0
    data["usage"] = {
        "students_pct": round(100 * students_used / school.max_students, 1) if school.max_students else None,
        "staff_pct": round(100 * staff_used / school.max_staff, 1) if school.max_staff else None,
    }
    data["near_student_limit"] = bool(
        school.max_students and students_used >= 0.9 * school.max_students
    )

    data["recent_activity_count"] = ActivityLog.query.filter_by(school_id=school.id).count()
    return data


class PlatformInfoAPI(MethodView):
    # Where this deployment's database lives, and whether it answers

    decorators = [developer_required]

    def get(self):
        uri = current_app.config.get("SQLALCHEMY_DATABASE_URI") or ""
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
                "students": Student.query.count(),
                "staff": Admin.query.count() + Teacher.query.count(),
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
        rows = (
            ActivityLog.query.filter_by(school_id=school.id)
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
        admin = Admin.query.filter_by(id=data.get("admin_id"), school_id=school.id).first()
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
        audit("school.reset_admin_password", school=school, detail=f"admin={admin.username}")
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

