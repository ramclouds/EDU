"""
Platform / multi-tenancy layer.

Introduces the concept of a School (tenant) and a Developer (platform
owner — you, the person selling this to multiple schools). Every school
gets a unique `school_code` that its own Admins/Teachers/Students/Staff
use to log in, so the same running instance of this app can serve many
schools while keeping their data apart.

This is Phase 1 of the multi-tenancy retrofit: it establishes the School
entity, the Developer role, and school_id on the identity tables
(Admin/Teacher/Student/NonTeachingStaff) — the layer that gates who can
log into which school. It deliberately does NOT yet touch the ~70
remaining domain tables (classes, attendance, exams, library, hostel,
payroll, timetable, notifications, RBAC roles, ...) — those still need
school_id added and every query scoped by it, table-by-table, as a
follow-up. Until that's done, a school's *identity/login* is isolated,
but records in those other tables are not yet — do not treat this as
complete tenant isolation.
"""

import logging
import secrets
import string
import uuid
from datetime import datetime, timedelta

from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError

from utils.auth import Admin, Student, Teacher, TOKEN_EXPIRY_HOURS, bcrypt, db

logger = logging.getLogger(__name__)


# =========================================================
# SCHOOL (TENANT)
# =========================================================
class School(db.Model):
    __tablename__ = "schools"

    id = db.Column(db.Integer, primary_key=True)

    # Human-entered at login by every user belonging to this school.
    school_code = db.Column(db.String(20), unique=True, nullable=False, index=True)
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
    # so plan upgrades are just a number change.
    max_students = db.Column(db.Integer, default=200)
    max_staff = db.Column(db.Integer, default=30)

    trial_ends_at = db.Column(db.DateTime)
    subscription_ends_at = db.Column(db.DateTime)

    # Soft-delete/archive rather than hard-delete — a school's data
    # (and its customer relationship) is too costly to lose to a
    # misclick.
    is_archived = db.Column(db.Boolean, default=False, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def is_login_allowed(self):
        if self.is_archived or self.status == "Suspended":
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
            data["student_count"] = Student.query.filter_by(
                school_id=self.id
            ).count()
            data["staff_count"] = (
                Admin.query.filter_by(school_id=self.id).count()
                + Teacher.query.filter_by(school_id=self.id).count()
            )
        return data


def generate_school_code():
    """SCH-XXXXXX, retried until unique. Short enough to type at login,
    long enough (36^6 ≈ 2.2B combinations) that codes aren't guessable."""
    alphabet = string.ascii_uppercase + string.digits
    for _ in range(20):
        code = "SCH-" + "".join(secrets.choice(alphabet) for _ in range(6))
        if not School.query.filter_by(school_code=code).first():
            return code
    raise RuntimeError("Could not generate a unique school code")


# =========================================================
# DEVELOPER (PLATFORM OWNER)
# =========================================================
class Developer(db.Model):
    """The platform owner / product seller — you. Not tied to any
    school; sits above the whole RBAC system, which is itself scoped
    per-school. Deliberately a separate table/login from Admin so a
    school's own Super Admin can never accidentally end up with
    platform-wide reach."""

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
    """Auth guard for platform-owner-only endpoints. Deliberately
    separate from utils.auth_middleware.login_required, which resolves
    Admin/Teacher/Student/Staff — a Developer token must never satisfy a
    school-scoped endpoint, and vice versa."""

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


# =========================================================
# SCHOOL MANAGEMENT (Developer-only)
# =========================================================
class SchoolListCreateAPI(MethodView):
    decorators = [developer_required]

    def get(self):
        schools = School.query.order_by(School.created_at.desc()).all()
        return jsonify([s.to_dict(include_counts=True) for s in schools]), 200

    def post(self):
        """Creates a school AND its first Super Admin in one step, so
        onboarding a paying customer needs no manual DB work — you get
        a school_code + that admin's login to hand to the customer."""
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
                # Admin — full access to set up the rest of their staff.
                # admin_type has no column default and is NOT NULL, so
                # this must be set explicitly or the insert fails.
                role="super_admin",
                admin_type="Super Admin",
                status="Active",
            )
            db.session.add(first_admin)
            db.session.commit()

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
        return jsonify(school.to_dict(include_counts=True)), 200

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
            return jsonify({"message": "School updated", "school": school.to_dict()}), 200
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("School update failed")
            return jsonify({"error": "Internal server error"}), 500


class SchoolStatusAPI(MethodView):
    """Suspend / reactivate / archive a school. Split from the general
    update endpoint since this is the single most consequential action
    a Developer can take (it locks every user at that school out) and
    deserves its own explicit, auditable action."""

    decorators = [developer_required]

    def post(self, school_id):
        school = School.query.get(school_id)
        if not school:
            return jsonify({"error": "School not found"}), 404

        data = request.get_json(silent=True) or {}
        action = data.get("action")

        if action not in ("suspend", "reactivate", "archive"):
            return (
                jsonify(
                    {"error": "action must be one of: suspend, reactivate, archive"}
                ),
                400,
            )

        if action == "suspend":
            school.status = "Suspended"
        elif action == "reactivate":
            school.status = "Active"
            school.is_archived = False
        elif action == "archive":
            school.is_archived = True
            school.status = "Suspended"

        try:
            db.session.commit()
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
        total_schools = School.query.filter_by(is_archived=False).count()
        active_schools = School.query.filter_by(status="Active").count()
        trial_schools = School.query.filter_by(status="Trial").count()
        suspended_schools = School.query.filter_by(status="Suspended").count()
        total_students = Student.query.count()
        total_staff = Admin.query.count() + Teacher.query.count()

        return (
            jsonify(
                {
                    "total_schools": total_schools,
                    "active_schools": active_schools,
                    "trial_schools": trial_schools,
                    "suspended_schools": suspended_schools,
                    "total_students": total_students,
                    "total_staff": total_staff,
                }
            ),
            200,
        )
