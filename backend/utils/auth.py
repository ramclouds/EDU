import os
import uuid
from flask import request, jsonify
from flask.views import MethodView
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timedelta
import logging
import re

bcrypt = Bcrypt()
db = SQLAlchemy()

logger = logging.getLogger(__name__)

# Sliding session expiry for the opaque auth_token issued at login.
# Overridable via TOKEN_EXPIRY_HOURS in the environment. The middleware
# refreshes this on every authenticated request, so an active user stays
# logged in, but an idle/leaked token stops working after this window.
TOKEN_EXPIRY_HOURS = float(os.getenv("TOKEN_EXPIRY_HOURS", "12"))


# ===========================
# PRODUCTION READY ADMIN MODEL
# ===========================
class Admin(db.Model):
    __tablename__ = "admins"

    # ================= PRIMARY =================
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    user_id = db.Column(db.String(50), unique=True, nullable=False, index=True)

    # ================= TENANCY =================
    # Which school this admin belongs to. Nullable for now so existing
    # single-school installs keep working unmigrated; a follow-up data
    # migration should backfill this for every existing row once a
    # School record exists for them (see utils/platform.py).
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True)

    # ================= PERSONAL =================
    first_name = db.Column(db.String(100), nullable=False)
    middle_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100), nullable=False)

    profile_image = db.Column(db.String(255))
    gender = db.Column(
        db.Enum("Male", "Female", "Other", name="admin_gender_enum"),
        nullable=True,
    )

    date_of_birth = db.Column(db.Date)

    blood_group = db.Column(
        db.Enum(
            "A+",
            "A-",
            "B+",
            "B-",
            "AB+",
            "AB-",
            "O+",
            "O-",
            name="admin_blood_group_enum",
        ),
        nullable=True,
    )

    # ================= CONTACT =================
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    mobile = db.Column(db.String(15), unique=True, index=True)
    alternate_mobile = db.Column(db.String(15))
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)

    # ================= ADDRESS =================
    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    state = db.Column(db.String(100))
    country = db.Column(db.String(100), default="India")
    pincode = db.Column(db.String(10))

    # ================= ROLE & ACCESS =================
    role = db.Column(
        db.Enum("admin", "super_admin", name="admin_role_enum"),
        default="admin",
        nullable=False,
    )

    admin_type = db.Column(
        db.Enum(
            "Super Admin",
            "Academic Admin",
            "Library Admin",
            "Accounts Admin",
            "Hostel Admin",
            "HR Admin",
            name="admin_type_enum",
        ),
        nullable=False,
    )
    designation = db.Column(db.String(100))
    department = db.Column(db.String(100))
    permissions = db.Column(db.Text)
    access_level = db.Column(db.String(50), default="Full Control")

    # ================= PROFESSIONAL =================
    qualification = db.Column(db.String(150))
    specialization = db.Column(db.String(100))
    experience_years = db.Column(db.Integer, default=0)

    # ================= EMPLOYMENT =================
    joining_date = db.Column(db.Date)

    employment_type = db.Column(
        db.Enum(
            "Full Time",
            "Part Time",
            "Contract",
            "Temporary",
            name="admin_employment_enum",
        ),
        default="Full Time",
    )
    shift = db.Column(db.String(50))
    salary = db.Column(db.Float)
    # ================= SCHOOL INFO =================
    school_name = db.Column(db.String(150))
    school_code = db.Column(db.String(50))
    board = db.Column(db.String(50))
    established_year = db.Column(db.String(10))
    # ================= SYSTEM CONTROL ================
    users_managed = db.Column(db.Integer, default=0)
    active_sessions = db.Column(db.Integer, default=0)
    modules_enabled = db.Column(db.String(255), default="All")
    # ================= FINANCE =================
    fee_access = db.Column(db.Boolean, default=True)
    discount_authority = db.Column(db.Boolean, default=False)
    revenue_view = db.Column(db.Boolean, default=True)
    # ================= SECURITY =================
    two_factor_enabled = db.Column(db.Boolean, default=False)
    login_alerts = db.Column(db.Boolean, default=True)
    last_login = db.Column(db.DateTime)
    last_password_change = db.Column(db.DateTime)
    # ================= ACTIVITY =================
    logins_30d = db.Column(db.Integer, default=0)
    actions_count = db.Column(db.Integer, default=0)
    last_action = db.Column(db.String(255))
    # ================= MEDICAL =================
    medical_condition = db.Column(db.Text)
    # ================= EMERGENCY =================
    emergency_name = db.Column(db.String(100))
    emergency_relation = db.Column(db.String(50))
    emergency_phone = db.Column(db.String(15))
    # ================= SYSTEM ================
    auth_token = db.Column(db.String(255))
    token_expires_at = db.Column(db.DateTime, nullable=True)
    password = db.Column(db.String(255), nullable=False)
    status = db.Column(
        db.Enum(
            "Active",
            "Inactive",
            "Suspended",
            name="admin_status_enum",
        ),
        default="Active",
        nullable=False,
    )

    is_deleted = db.Column(db.Boolean, default=False)
    created_by = db.Column(db.String(50))
    updated_by = db.Column(db.String(50))
    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # ================= INDEXES =================
    __table_args__ = (
        db.Index("idx_admin_email", "email"),
        db.Index("idx_admin_username", "username"),
        db.Index("idx_admin_admin_id", "admin_id"),
        db.Index("idx_admin_status", "status"),
    )

    # ================= SERIALIZER =================
    def to_dict(self):
        return {
            "id": self.id,
            "admin_id": self.admin_id,
            "user_id": self.user_id,
            "first_name": self.first_name,
            "middle_name": self.middle_name,
            "last_name": self.last_name,
            "profile_image": self.profile_image,
            "email": self.email,
            "mobile": self.mobile,
            "username": self.username,
            "gender": self.gender,
            "date_of_birth": (
                self.date_of_birth.isoformat() if self.date_of_birth else None
            ),
            "blood_group": self.blood_group,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "country": self.country,
            "pincode": self.pincode,
            "role": self.role,
            "admin_type": self.admin_type,
            "designation": self.designation,
            "department": self.department,
            "qualification": self.qualification,
            "specialization": self.specialization,
            "experience_years": self.experience_years,
            "joining_date": (
                self.joining_date.isoformat() if self.joining_date else None
            ),
            "employment_type": self.employment_type,
            "shift": self.shift,
            "salary": self.salary,
            "school_name": self.school_name,
            "school_code": self.school_code,
            "board": self.board,
            "established_year": self.established_year,
            "users_managed": self.users_managed,
            "active_sessions": self.active_sessions,
            "modules_enabled": self.modules_enabled,
            "fee_access": self.fee_access,
            "discount_authority": self.discount_authority,
            "revenue_view": self.revenue_view,
            "two_factor_enabled": self.two_factor_enabled,
            "login_alerts": self.login_alerts,
            "last_login": (self.last_login.isoformat() if self.last_login else None),
            "logins_30d": self.logins_30d,
            "actions_count": self.actions_count,
            "last_action": self.last_action,
            "medical_condition": self.medical_condition,
            "emergency_name": self.emergency_name,
            "emergency_relation": self.emergency_relation,
            "emergency_phone": self.emergency_phone,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), unique=True, nullable=False)
    user_id = db.Column(db.String(20), unique=True, nullable=False)

    # ================= TENANCY ================= (see Admin.school_id)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True)

    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    middle_name = db.Column(db.String(100))
    email = db.Column(db.String(100))
    mobile = db.Column(db.String(15))

    # 👨‍👩‍👧 FAMILY
    father_name = db.Column(db.String(100))
    father_mobile = db.Column(db.String(15))
    father_email = db.Column(db.String(100))

    mother_name = db.Column(db.String(100))
    mother_mobile = db.Column(db.String(15))
    mother_email = db.Column(db.String(100))

    parent_name = db.Column(db.String(100))
    parent_mobile = db.Column(db.String(15))
    parent_email = db.Column(db.String(100))

    # 🚨 EMERGENCY
    emergency_contact_name = db.Column(db.String(100))
    emergency_contact_number = db.Column(db.String(15))
    emergency_contact_relation = db.Column(db.String(50))

    # 👤 PERSONAL
    gender = db.Column(db.Enum("Male", "Female", "Other"))
    date_of_birth = db.Column(db.Date)
    blood_group = db.Column(db.Enum("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"))

    address = db.Column(db.Text)

    # 🎓 ACADEMIC
    admission_date = db.Column(db.Date)
    previous_school = db.Column(db.String(150))

    # 🏥 MEDICAL
    medical_conditions = db.Column(db.Text)
    allergies = db.Column(db.Text)

    # ⚙️ SYSTEM
    role = db.Column(db.Enum("student", "teacher", "admin"), nullable=False)
    password = db.Column(db.String(255), nullable=False)
    status = db.Column(db.Enum("Active", "Inactive"), default="Active")
    auth_token = db.Column(db.String(255))
    token_expires_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Teacher(db.Model):
    __tablename__ = "teachers"

    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.String(50), unique=True, nullable=False)
    user_id = db.Column(db.Integer, nullable=False)

    # ================= TENANCY ================= (see Admin.school_id)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True)

    # 👤 NAME
    first_name = db.Column(db.String(100))
    middle_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))

    # 📞 CONTACT
    email = db.Column(db.String(120), unique=True)
    mobile = db.Column(db.String(15), unique=True)

    # 👤 PERSONAL
    gender = db.Column(db.String(10))
    date_of_birth = db.Column(db.Date)
    blood_group = db.Column(db.String(5))

    # 📍 ADDRESS
    address = db.Column(db.Text)
    city = db.Column(db.String(50))
    state = db.Column(db.String(50))
    pincode = db.Column(db.String(10))

    # 💼 PROFESSIONAL
    designation = db.Column(db.String(100))

    # 🎓 ACADEMIC
    degree = db.Column(db.String(100))
    university = db.Column(db.String(150))
    experience_years = db.Column(db.Integer)
    specialization = db.Column(db.String(100))

    # 🏢 EMPLOYMENT
    joining_date = db.Column(db.Date)
    employment_type = db.Column(db.String(50))
    shift = db.Column(db.String(50))

    # 📊 PERFORMANCE
    total_classes_taken = db.Column(db.Integer, default=0)
    assignments_count = db.Column(db.Integer, default=0)
    rating = db.Column(db.Float, default=0)
    attendance_percentage = db.Column(db.Float, default=0)

    # 🩺 MEDICAL
    medical_condition = db.Column(db.Text)

    # 🚨 EMERGENCY
    emergency_name = db.Column(db.String(100))
    emergency_relation = db.Column(db.String(50))
    emergency_phone = db.Column(db.String(15))

    # ⚙️ SYSTEM
    username = db.Column(db.String(50), unique=True)
    auth_token = db.Column(db.String(255))
    token_expires_at = db.Column(db.DateTime, nullable=True)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum("teacher", "admin"), default="teacher")
    status = db.Column(db.String(20), default="Active")
    last_login = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime)


# ===========================
# LOGIN CLASS
# ===========================
class Login(MethodView):

    def post(self):
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Invalid JSON"}), 400

            identifier = data.get("identifier")  # email or username
            password = data.get("password")
            school_code = (data.get("school_code") or "").strip()

            if not identifier or not password:
                return jsonify({"error": "Email/Username and password required"}), 400

            # ================= SCHOOL RESOLUTION (multi-tenant) =================
            # Local import: utils.platform imports from this module, so a
            # module-level import here would be circular.
            from utils.platform import School

            school = None
            if school_code:
                school = School.query.filter_by(school_code=school_code).first()
                if not school:
                    return jsonify({"error": "Invalid school code"}), 401
                if not school.is_login_allowed():
                    return (
                        jsonify(
                            {
                                "error": (
                                    "This school's account is suspended or its "
                                    "trial/subscription has expired. Contact "
                                    "support to continue."
                                ),
                                "error_code": "SCHOOL_ACCESS_DENIED",
                            }
                        ),
                        403,
                    )
            # If no school_code was sent, we fall back to an unscoped lookup
            # below — kept for installs that haven't been onboarded as a
            # School yet (school_id is still NULL on their rows). Once every
            # school is created via the Developer dashboard, school_code
            # should become a required field here.
            school_filter = {"school_id": school.id} if school else {}

            user = (
                Student.query.filter_by(email=identifier, **school_filter).first()
                or Teacher.query.filter_by(email=identifier, **school_filter).first()
                or Teacher.query.filter_by(
                    username=identifier, **school_filter
                ).first()
                or Admin.query.filter_by(email=identifier, **school_filter).first()
                or Admin.query.filter_by(
                    username=identifier, **school_filter
                ).first()
                or NonTeachingStaff.query.filter_by(
                    email=identifier,
                    is_deleted=False,
                    **school_filter,
                ).first()
                or NonTeachingStaff.query.filter_by(
                    username=identifier,
                    is_deleted=False,
                    **school_filter,
                ).first()
            )

            if not user:
                return jsonify({"error": "User not found"}), 401

            if not bcrypt.check_password_hash(user.password, password):
                return jsonify({"error": "Invalid password"}), 401

            if user.status != "Active":
                return jsonify({"error": "Account inactive"}), 403

            # Load effective RBAC access without changing the existing
            # custom token, dashboard, role, or authentication behaviour.
            rbac_access = None
            dashboard_entry = None
            dashboard_rights = {"can_view": True, "can_write": True}

            try:
                from utils.rolePermissionManagement import (
                    build_user_access,
                    get_home_dashboard_for_user,
                    get_user_dashboard_access,
                )

                if isinstance(user, Admin):
                    rbac_user_type = "admin"

                elif isinstance(user, Teacher):
                    rbac_user_type = "teacher"

                elif isinstance(user, Student):
                    rbac_user_type = "student"

                elif isinstance(user, NonTeachingStaff):
                    rbac_user_type = "staff"

                else:
                    rbac_user_type = str(getattr(user, "role", "") or "").lower()

                rbac_access = build_user_access(rbac_user_type, user.id)

                # The dashboard a user with this role/admin_type is meant
                # to land on, and whether they actually have access to it.
                dashboard_entry = get_home_dashboard_for_user(user)
                dashboard_rights = get_user_dashboard_access(user, dashboard_entry)

            except Exception:
                logger.exception("Unable to load RBAC access during login")

            # ================= DASHBOARD ACCESS GATE =================
            if isinstance(user, Admin) and dashboard_entry is not None:
                if not dashboard_rights.get("can_view"):
                    return (
                        jsonify(
                            {
                                "error": (
                                    "Your account does not have access to the "
                                    f"{dashboard_entry['label']}. Please contact "
                                    "a Super Administrator to request access."
                                ),
                                "error_code": "DASHBOARD_ACCESS_DENIED",
                                "dashboard": dashboard_entry["route"],
                            }
                        ),
                        403,
                    )

            # Generate token only after the dashboard-access check passes,
            # so a denied login never receives a usable session token.
            token = str(uuid.uuid4())
            user.auth_token = token
            user.token_expires_at = datetime.utcnow() + timedelta(
                hours=TOKEN_EXPIRY_HOURS
            )
            db.session.commit()

            # Auto dashboard based on role and admin type
            if dashboard_entry is not None:
                dashboard = dashboard_entry["route"]

            elif user.role == "student":
                dashboard = "/student-dashboard"

            elif user.role == "teacher":
                dashboard = "/teacher-dashboard"

            elif (
                user.role == "super_admin"
                or getattr(user, "admin_type", None) == "Super Admin"
            ):
                dashboard = "/super-admin-dashboard"

            elif getattr(user, "admin_type", None) == "Hostel Admin":
                dashboard = "/hostel-admin-dashboard"

            elif getattr(user, "admin_type", None) == "Library Admin":
                dashboard = "/library-admin-dashboard"

            elif getattr(user, "admin_type", None) == "Accounts Admin":
                dashboard = "/accounts-admin-dashboard"
                
            elif getattr(user, "admin_type", None) == "Academic Admin":
                dashboard = "/academic-admin-dashboard"                

            elif getattr(user, "admin_type", None) == "HR Admin":
                dashboard = "/hr-admin-dashboard"

            elif user.role == "admin":
                dashboard = "/admin-dashboard"

            elif user.role == "staff":
                dashboard = "/staff-dashboard"

            else:
                dashboard = "/"

            try:
                from utils.rolePermissionManagement import (
                    list_dashboard_access_for_user,
                )

                dashboard_access = list_dashboard_access_for_user(user)
            except Exception:
                logger.exception("Unable to load dashboard access during login")
                dashboard_access = []

            return (
                jsonify(
                    {
                        "token": token,
                        "role": user.role,
                        "dashboard": dashboard,
                        "rbac": rbac_access,
                        "dashboard_access": dashboard_access,
                        "user": {
                            "id": user.id,
                            "role": user.role,
                            "user_type": user.role,
                            "admin_type": getattr(user, "admin_type", None),
                            "permissions": getattr(user, "permissions", None),
                            "modules_enabled": getattr(user, "modules_enabled", None),
                            "fee_access": getattr(user, "fee_access", False),
                            "discount_authority": getattr(
                                user,
                                "discount_authority",
                                False,
                            ),
                            "revenue_view": getattr(user, "revenue_view", False),
                            "name": " ".join(
                                filter(
                                    None,
                                    [
                                        getattr(user, "first_name", ""),
                                        getattr(user, "middle_name", ""),
                                        getattr(user, "last_name", ""),
                                    ],
                                )
                            ),
                            "email": user.email,
                        },
                    }
                ),
                200,
            )

        except Exception as e:
            import traceback

            traceback.print_exc()
            return jsonify({"error": "Internal server error"}), 500


class Logout(MethodView):
    """Invalidates the caller's current session token server-side.

    Requires the request to already carry a valid token, then clears it so
    it can never be reused — closing the gap where auth_token had no
    server-side revocation at all. Uses a local import for get_current_user
    (rather than importing auth_middleware at module level) because
    auth_middleware imports from this module — a module-level import here
    would create a circular import.
    """

    def post(self):
        from utils.auth_middleware import get_current_user

        user = get_current_user()
        if user is None:
            return jsonify({"error": "Unauthorized"}), 401

        try:
            user.auth_token = None
            user.token_expires_at = None
            db.session.commit()
            return jsonify({"message": "Logged out"}), 200
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Logout failed")
            return jsonify({"error": "Unable to log out"}), 500


# ==================================
# NON-TEACHING STAFF MODEL
# ==================================
class NonTeachingStaff(db.Model):
    __tablename__ = "non_teaching_staff"

    # ================= PRIMARY =================
    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    staff_id = db.Column(
        db.String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    # ================= TENANCY ================= (see Admin.school_id)
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )

    user_id = db.Column(
        db.String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    # ================= PERSONAL =================
    first_name = db.Column(
        db.String(100),
        nullable=False,
    )

    middle_name = db.Column(
        db.String(100),
        nullable=True,
    )

    last_name = db.Column(
        db.String(100),
        nullable=False,
    )

    profile_image = db.Column(
        db.String(255),
        nullable=True,
    )

    gender = db.Column(
        db.Enum(
            "Male",
            "Female",
            "Other",
            name="non_teaching_staff_gender_enum",
        ),
        nullable=True,
    )

    date_of_birth = db.Column(
        db.Date,
        nullable=True,
    )

    blood_group = db.Column(
        db.Enum(
            "A+",
            "A-",
            "B+",
            "B-",
            "AB+",
            "AB-",
            "O+",
            "O-",
            name="non_teaching_staff_blood_group_enum",
        ),
        nullable=True,
    )

    # ================= CONTACT =================
    email = db.Column(
        db.String(120),
        unique=True,
        nullable=False,
        index=True,
    )

    mobile = db.Column(
        db.String(15),
        unique=True,
        nullable=True,
        index=True,
    )

    alternate_mobile = db.Column(
        db.String(15),
        nullable=True,
    )

    username = db.Column(
        db.String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    # ================= ADDRESS =================
    address = db.Column(
        db.Text,
        nullable=True,
    )

    city = db.Column(
        db.String(100),
        nullable=True,
    )

    state = db.Column(
        db.String(100),
        nullable=True,
    )

    country = db.Column(
        db.String(100),
        nullable=False,
        default="India",
    )

    pincode = db.Column(
        db.String(10),
        nullable=True,
    )

    # ================= EMPLOYMENT =================
    department = db.Column(
        db.String(100),
        nullable=False,
        index=True,
    )

    designation = db.Column(
        db.String(100),
        nullable=False,
    )

    staff_type = db.Column(
        db.Enum(
            "Clerk",
            "Accountant",
            "Librarian",
            "Lab Assistant",
            "Receptionist",
            "Office Assistant",
            "Peon",
            "Security",
            "Driver",
            "Cleaner",
            "Maintenance",
            "Nurse",
            "Counsellor",
            "Other",
            name="non_teaching_staff_type_enum",
        ),
        nullable=False,
        default="Other",
        index=True,
    )

    qualification = db.Column(
        db.String(150),
        nullable=True,
    )

    specialization = db.Column(
        db.String(100),
        nullable=True,
    )

    experience_years = db.Column(
        db.Integer,
        nullable=False,
        default=0,
    )

    joining_date = db.Column(
        db.Date,
        nullable=True,
    )

    employment_type = db.Column(
        db.Enum(
            "Full Time",
            "Part Time",
            "Contract",
            "Temporary",
            name="non_teaching_staff_employment_enum",
        ),
        nullable=False,
        default="Full Time",
    )

    shift = db.Column(
        db.String(50),
        nullable=True,
    )

    salary = db.Column(
        db.Float,
        nullable=True,
    )

    # ================= MEDICAL =================
    medical_condition = db.Column(
        db.Text,
        nullable=True,
    )

    # ================= EMERGENCY =================
    emergency_name = db.Column(
        db.String(100),
        nullable=True,
    )

    emergency_relation = db.Column(
        db.String(50),
        nullable=True,
    )

    emergency_phone = db.Column(
        db.String(15),
        nullable=True,
    )

    # ================= AUTH =================
    role = db.Column(
        db.Enum(
            "staff",
            name="non_teaching_staff_role_enum",
        ),
        nullable=False,
        default="staff",
    )

    password = db.Column(
        db.String(255),
        nullable=False,
    )

    auth_token = db.Column(
        db.String(255),
        nullable=True,
    )
    token_expires_at = db.Column(db.DateTime, nullable=True)

    status = db.Column(
        db.Enum(
            "Active",
            "Inactive",
            "Suspended",
            name="non_teaching_staff_status_enum",
        ),
        nullable=False,
        default="Active",
        index=True,
    )

    last_login = db.Column(
        db.DateTime,
        nullable=True,
    )

    is_deleted = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    created_by = db.Column(
        db.String(50),
        nullable=True,
    )

    updated_by = db.Column(
        db.String(50),
        nullable=True,
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    __table_args__ = (
        db.Index(
            "idx_non_teaching_staff_department_status",
            "department",
            "status",
        ),
        db.Index(
            "idx_non_teaching_staff_deleted",
            "is_deleted",
        ),
    )

    def to_dict(self):
        full_name = " ".join(
            filter(
                None,
                [
                    self.first_name,
                    self.middle_name,
                    self.last_name,
                ],
            )
        )

        return {
            "id": self.id,
            "staff_id": self.staff_id,
            "user_id": self.user_id,
            "name": full_name,
            "first_name": self.first_name,
            "middle_name": self.middle_name,
            "last_name": self.last_name,
            "profile_image": self.profile_image,
            "gender": self.gender,
            "date_of_birth": (
                self.date_of_birth.isoformat() if self.date_of_birth else None
            ),
            "blood_group": self.blood_group,
            "email": self.email,
            "mobile": self.mobile,
            "alternate_mobile": self.alternate_mobile,
            "username": self.username,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "country": self.country,
            "pincode": self.pincode,
            "department": self.department,
            "designation": self.designation,
            "staff_type": self.staff_type,
            "qualification": self.qualification,
            "specialization": self.specialization,
            "experience_years": self.experience_years,
            "joining_date": (
                self.joining_date.isoformat() if self.joining_date else None
            ),
            "employment_type": self.employment_type,
            "shift": self.shift,
            "salary": self.salary,
            "medical_condition": self.medical_condition,
            "emergency_name": self.emergency_name,
            "emergency_relation": self.emergency_relation,
            "emergency_phone": self.emergency_phone,
            "role": self.role,
            "status": self.status,
            "last_login": (self.last_login.isoformat() if self.last_login else None),
            "is_deleted": self.is_deleted,
            "created_at": (self.created_at.isoformat() if self.created_at else None),
            "updated_at": (self.updated_at.isoformat() if self.updated_at else None),
        }


# ===========================
# BUG FIX: auth_middleware.py and rolePermissionManagement.py both do
# `from utils.auth import Staff` wrapped in try/except ImportError, and
# silently fall back to Staff = None if it fails. There was never a
# class literally named "Staff" here (it's "NonTeachingStaff"), so that
# import ALWAYS failed - meaning non-teaching staff could never log in
# (login_required's _find_user_by_token skipped their table entirely)
# and every RBAC permission check for staff users silently evaluated to
# "no access". This alias makes that import succeed.
# ===========================
Staff = NonTeachingStaff


# ===========================
# AUTO ID GENERATORS
# ===========================
def generate_student_id():
    try:
        last_student = Student.query.order_by(Student.id.desc()).first()
        if not last_student or not last_student.student_id:
            return "STU1001"
        last_id = int(last_student.student_id.replace("STU", ""))
        return f"STU{last_id + 1}"
    except Exception as e:
        logger.error(f"Student ID generation failed: {e}")
        return f"STU{int(datetime.utcnow().timestamp())}"


def generate_user_id():
    try:
        last_student = Student.query.order_by(Student.id.desc()).first()
        if not last_student or not last_student.user_id:
            return "USR1001"
        last_id = int(last_student.user_id.replace("USR", ""))
        return f"USR{last_id + 1}"
    except Exception as e:
        logger.error(f"User ID generation failed: {e}")
        return f"USR{int(datetime.utcnow().timestamp())}"


def generate_admin_id():
    try:
        last_admin = Admin.query.order_by(Admin.id.desc()).first()

        if not last_admin or not last_admin.admin_id:
            return "ADM1001"

        last_id = int(last_admin.admin_id.replace("ADM", ""))
        return f"ADM{last_id + 1}"

    except Exception as e:
        logger.error(f"Admin ID generation failed: {e}")
        return f"ADM{int(datetime.utcnow().timestamp())}"


def generate_staff_id():
    try:
        last_staff = NonTeachingStaff.query.order_by(NonTeachingStaff.id.desc()).first()

        if not last_staff or not last_staff.staff_id:
            return "NTS1001"

        numeric_part = int(
            last_staff.staff_id.replace(
                "NTS",
                "",
            )
        )

        return f"NTS{numeric_part + 1}"

    except Exception as error:
        logger.error("Non-teaching staff ID " f"generation failed: {error}")

        return f"NTS{int(datetime.utcnow().timestamp())}"


def generate_staff_user_id():
    try:
        last_staff = NonTeachingStaff.query.order_by(NonTeachingStaff.id.desc()).first()

        if not last_staff or not last_staff.user_id:
            return "STFUSR1001"

        numeric_part = int(
            last_staff.user_id.replace(
                "STFUSR",
                "",
            )
        )

        return f"STFUSR{numeric_part + 1}"

    except Exception as error:
        logger.error("Staff user ID generation failed: " f"{error}")

        return "STFUSR" f"{int(datetime.utcnow().timestamp())}"


# ===========================
# SIGNUP CLASS
# ===========================
class SignUp(MethodView):

    def post(self):
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Invalid JSON payload"}), 400

            email = data.get("email")
            password = data.get("password")
            role = data.get("role")

            if not email or not password or not role:
                return jsonify({"error": "Email, password, and role required"}), 400

            email_regex = r"^[\w\.-]+@[\w\.-]+\.\w+$"
            if not re.match(email_regex, email):
                return jsonify({"error": "Invalid email format"}), 400

            if len(password) < 6:
                return jsonify({"error": "Password must be at least 6 characters"}), 400

            # Check if email exists in correct table
            if role == "student":
                if Student.query.filter_by(email=email).first():
                    return jsonify({"error": "Email already registered"}), 400

            elif role == "teacher":
                if Teacher.query.filter_by(email=email).first():
                    return jsonify({"error": "Email already registered"}), 400

            elif role == "admin":
                if Admin.query.filter_by(email=email).first():
                    return jsonify({"error": "Email already registered"}), 400

            else:
                return jsonify({"error": "Invalid role"}), 400

            hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

            if role == "student":
                student_id = generate_student_id()
                user_id = generate_user_id()

                dob = data.get("date_of_birth")
                admission = data.get("admission_date")
                date_of_birth = (
                    datetime.strptime(dob, "%Y-%m-%d").date() if dob else None
                )
                admission_date = (
                    datetime.strptime(admission, "%Y-%m-%d").date()
                    if admission
                    else None
                )

                new_user = Student(
                    student_id=student_id,
                    user_id=user_id,
                    first_name=data.get("first_name"),
                    last_name=data.get("last_name"),
                    middle_name=data.get("middle_name"),
                    email=email,
                    mobile=data.get("mobile"),
                    father_name=data.get("father_name"),
                    father_mobile=data.get("father_mobile"),
                    mother_name=data.get("mother_name"),
                    mother_mobile=data.get("mother_mobile"),
                    emergency_contact_name=data.get("emergency_contact_name"),
                    emergency_contact_number=data.get("emergency_contact_number"),
                    blood_group=data.get("blood_group"),
                    medical_conditions=data.get("medical_conditions"),
                    allergies=data.get("allergies"),
                    gender=data.get("gender"),
                    date_of_birth=date_of_birth,
                    address=data.get("address"),
                    admission_date=admission_date,
                    role=role,
                    password=hashed_password,
                )

                db.session.add(new_user)
                db.session.commit()
                return (
                    jsonify(
                        {
                            "message": "Student registered successfully",
                            "student_id": student_id,
                            "user_id": user_id,
                        }
                    ),
                    201,
                )

            elif role == "teacher":
                teacher_id = (
                    f"TCH{int(datetime.utcnow().timestamp())}"  # simple auto-id
                )
                user_id = f"USR{int(datetime.utcnow().timestamp())}"

                dob = data.get("date_of_birth")
                date_of_birth = (
                    datetime.strptime(dob, "%Y-%m-%d").date() if dob else None
                )
                joining_date = (
                    datetime.strptime(data.get("joining_date"), "%Y-%m-%d").date()
                    if data.get("joining_date")
                    else None
                )

                new_user = Teacher(
                    teacher_id=teacher_id,
                    user_id=user_id,
                    first_name=data.get("first_name"),
                    middle_name=data.get("middle_name"),
                    last_name=data.get("last_name"),
                    email=email,
                    mobile=data.get("mobile"),
                    gender=data.get("gender"),
                    date_of_birth=date_of_birth,
                    address=data.get("address"),
                    joining_date=joining_date,
                    role=role,
                    password=hashed_password,
                )
                db.session.add(new_user)
                db.session.commit()
                return (
                    jsonify(
                        {
                            "message": "Teacher registered successfully",
                            "teacher_id": teacher_id,
                            "user_id": user_id,
                        }
                    ),
                    201,
                )

            elif role == "admin":
                admin_id = generate_admin_id()
                user_id = generate_user_id()

                dob = data.get("date_of_birth")
                joining = data.get("joining_date")

                date_of_birth = (
                    datetime.strptime(dob, "%Y-%m-%d").date() if dob else None
                )

                joining_date = (
                    datetime.strptime(joining, "%Y-%m-%d").date() if joining else None
                )

                new_user = Admin(
                    admin_id=admin_id,
                    user_id=user_id,
                    first_name=data.get("first_name"),
                    middle_name=data.get("middle_name"),
                    last_name=data.get("last_name"),
                    email=email,
                    mobile=data.get("mobile"),
                    username=data.get("username"),
                    gender=data.get("gender"),
                    date_of_birth=date_of_birth,
                    blood_group=data.get("blood_group"),
                    address=data.get("address"),
                    city=data.get("city"),
                    state=data.get("state"),
                    pincode=data.get("pincode"),
                    admin_type=data.get("admin_type"),
                    designation=data.get("designation"),
                    department=data.get("department"),
                    qualification=data.get("qualification"),
                    specialization=data.get("specialization"),
                    experience_years=data.get("experience_years"),
                    joining_date=joining_date,
                    employment_type=data.get("employment_type"),
                    shift=data.get("shift"),
                    salary=data.get("salary"),
                    medical_condition=data.get("medical_condition"),
                    emergency_name=data.get("emergency_name"),
                    emergency_relation=data.get("emergency_relation"),
                    emergency_phone=data.get("emergency_phone"),
                    role="admin",
                    password=hashed_password,
                )

                db.session.add(new_user)
                db.session.commit()

            return (
                jsonify(
                    {
                        "message": "Admin registered successfully",
                        "admin_id": admin_id,
                        "user_id": user_id,
                    }
                ),
                201,
            )

        except SQLAlchemyError as db_err:
            logger.error(f"Database error: {db_err}")
            db.session.rollback()
            return jsonify({"error": "Database error occurred"}), 500

        except Exception as e:
            logger.exception(f"Signup error: {e}")
            db.session.rollback()
            return jsonify({"error": "Something went wrong"}), 500
