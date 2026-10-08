import logging
import re
from datetime import datetime, timezone
from functools import wraps

from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy import UniqueConstraint, and_, false, or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from utils.auth import Admin, Student, Teacher, db

try:
    from utils.auth import Staff
except ImportError:
    Staff = None
from utils.auth_middleware import get_current_user, login_required

logger = logging.getLogger(__name__)


# CONFIGURATION
VALID_USER_TYPES = {"admin", "teacher", "student", "staff", "all"}
VALID_ACTIONS = ("view", "create", "edit", "delete")

DEFAULT_MODULES = [
    {
        "code": "dashboard",
        "name": "Dashboard",
        "category": "Main",
        "sort_order": 10,
    },
    {
        "code": "students",
        "name": "Students",
        "category": "Academics",
        "sort_order": 20,
    },
    {
        "code": "teachers",
        "name": "Teachers",
        "category": "Academics",
        "sort_order": 30,
    },
    {
        "code": "admissions",
        "name": "Admissions",
        "category": "Academics",
        "sort_order": 40,
    },
    {
        "code": "attendance",
        "name": "Attendance",
        "category": "Academics",
        "sort_order": 50,
    },
    {
        "code": "timetable",
        "name": "Timetable",
        "category": "Academics",
        "sort_order": 60,
    },
    {
        "code": "exams",
        "name": "Exams and Results",
        "category": "Academics",
        "sort_order": 70,
    },
    {
        "code": "fees",
        "name": "Fees",
        "category": "Finance",
        "sort_order": 80,
    },
    {
        "code": "accounts",
        "name": "Accounts",
        "category": "Finance",
        "sort_order": 90,
    },
    {
        "code": "library",
        "name": "Library",
        "category": "Administration",
        "sort_order": 100,
    },
    {
        "code": "academic",
        "name": "Academic Administration",
        "category": "Academics",
        "sort_order": 15,
    },
    {
        "code": "hostel",
        "name": "Hostel",
        "category": "Administration",
        "sort_order": 110,
    },
    {
        "code": "hr",
        "name": "HR",
        "category": "Administration",
        "sort_order": 120,
    },
    {
        "code": "reports",
        "name": "Reports",
        "category": "Reports",
        "sort_order": 130,
    },
    {
        "code": "settings",
        "name": "Settings",
        "category": "System",
        "sort_order": 140,
    },
    {
        "code": "roles",
        "name": "Roles and Permissions",
        "category": "System",
        "sort_order": 150,
    },
    {
        "code": "activity-logs",
        "name": "Activity Logs",
        "category": "System",
        "sort_order": 160,
    },
]

DEFAULT_ROLES = [
    {
        "name": "Super Administrator",
        "code": "super-admin",
        "description": "Complete system access.",
        "user_type": "admin",
        "is_system": True,
        "allow_all": True,
    },
    {
        "name": "Academic Administrator",
        "code": "academic-admin",
        "description": "Academic administration access.",
        "user_type": "admin",
        "is_system": True,
        "modules": [
            "dashboard",
            # "academic" is the academic-admin-dashboard's own
            # DASHBOARD_REGISTRY module_code — without it here, an
            # Academic Admin with this role assigned gets 403
            # DASHBOARD_ACCESS_DENIED on their own dashboard the moment
            # any role is assigned (the owner_admin_type fallback in
            # get_user_dashboard_access only applies when NO role is
            # assigned yet). Every other admin type's default role
            # already includes its own module_code (library/accounts/
            # hostel/hr) — this was the one left out.
            "academic",
            "students",
            "teachers",
            "admissions",
            "attendance",
            "timetable",
            "exams",
            "reports",
        ],
    },
    {
        "name": "HR Administrator",
        "code": "hr-admin",
        "description": "Human resources administration access.",
        "user_type": "admin",
        "is_system": True,
        "modules": [
            "dashboard",
            "teachers",
            "hr",
            "reports",
        ],
    },
    {
        "name": "Hostel Administrator",
        "code": "hostel-admin",
        "description": "Hostel administration access.",
        "user_type": "admin",
        "is_system": True,
        "modules": [
            "dashboard",
            "students",
            "hostel",
            "reports",
        ],
    },
    {
        "name": "Library Administrator",
        "code": "library-admin",
        "description": "Library administration access.",
        "user_type": "admin",
        "is_system": True,
        "modules": [
            "dashboard",
            "students",
            "teachers",
            "library",
            "reports",
        ],
    },
    {
        "name": "Accounts Administrator",
        "code": "accounts-admin",
        "description": "Fees and accounts access.",
        "user_type": "admin",
        "is_system": True,
        "modules": [
            "dashboard",
            "students",
            # "teachers" doubles as the staff-directory module: it's what
            # gates the combined teaching + non-teaching + admin staff
            # list the Accounts dashboard's Staff section needs for
            # payroll/salary work (see staffDirectory.AdminStaffListAPI).
            "teachers",
            "fees",
            "accounts",
            "reports",
        ],
    },
    {
        "name": "Teacher",
        "code": "teacher",
        "description": "Standard teacher access.",
        "user_type": "teacher",
        "is_system": True,
        "modules": [
            "dashboard",
            "students",
            "attendance",
            "timetable",
            "exams",
            "reports",
        ],
    },
    {
        "name": "Student",
        "code": "student",
        "description": "Standard student access.",
        "user_type": "student",
        "is_system": True,
        "modules": [
            "dashboard",
            "attendance",
            "timetable",
            "exams",
            "fees",
            "library",
        ],
    },
    {
        "name": "Staff",
        "code": "staff",
        "description": "Standard non-teaching staff access.",
        "user_type": "staff",
        "is_system": True,
        "modules": [
            "dashboard",
            "attendance",
            "hr",
            "reports",
        ],
    },
]

DASHBOARD_REGISTRY = [
    {
        "key": "super-admin-dashboard",
        "label": "Super Admin Dashboard",
        "route": "/super-admin-dashboard",
        "module_code": None,
        "owner_admin_type": "Super Admin",
        "super_admin_only": True,
    },
    {
        "key": "library-admin-dashboard",
        "label": "Library Dashboard",
        "route": "/library-admin-dashboard",
        "module_code": "library",
        "owner_admin_type": "Library Admin",
    },
    {
        "key": "academic-admin-dashboard",
        "label": "Academic Dashboard",
        "route": "/academic-admin-dashboard",
        "module_code": "academic",
        "owner_admin_type": "Academic Admin",
    },
    {
        "key": "accounts-admin-dashboard",
        "label": "Accounts Dashboard",
        "route": "/accounts-admin-dashboard",
        "module_code": "accounts",
        "owner_admin_type": "Accounts Admin",
    },
    {
        "key": "hostel-admin-dashboard",
        "label": "Hostel Dashboard",
        "route": "/hostel-admin-dashboard",
        "module_code": "hostel",
        "owner_admin_type": "Hostel Admin",
    },
    {
        "key": "hr-admin-dashboard",
        "label": "HR Dashboard",
        "route": "/hr-admin-dashboard",
        "module_code": "hr",
        "owner_admin_type": "HR Admin",
    },
    {
        "key": "teacher-dashboard",
        "label": "Teacher Dashboard",
        "route": "/teacher-dashboard",
        "module_code": None,
        "restricted_user_type": "teacher",
    },
    {
        "key": "student-dashboard",
        "label": "Student Dashboard",
        "route": "/student-dashboard",
        "module_code": None,
        "restricted_user_type": "student",
    },
]

DASHBOARD_BY_KEY = {entry["key"]: entry for entry in DASHBOARD_REGISTRY}
DASHBOARD_BY_ADMIN_TYPE = {
    entry["owner_admin_type"]: entry
    for entry in DASHBOARD_REGISTRY
    if entry.get("owner_admin_type")
}


def get_dashboard_entry_for_admin_type(admin_type):
    """Return the dashboard registry entry owned by a given admin_type."""

    return DASHBOARD_BY_ADMIN_TYPE.get(str(admin_type or "").strip())


def _dashboard_rights_from_actions(action_map):
    action_map = action_map or {}

    can_view = bool(action_map.get("view"))
    can_write = bool(
        action_map.get("create") or action_map.get("edit") or action_map.get("delete")
    )

    return {"can_view": can_view, "can_write": can_write}


def get_user_dashboard_access(user, dashboard_entry):
    """
    Resolve {can_view, can_write} for one dashboard entry for a given
    logged-in user (Admin / Teacher / Student / Staff instance).
    """

    if not dashboard_entry:
        return {"can_view": False, "can_write": False}

    restricted_user_type = dashboard_entry.get("restricted_user_type")

    if restricted_user_type == "student":
        allowed = isinstance(user, Student)
        return {"can_view": allowed, "can_write": allowed}

    if restricted_user_type == "teacher":
        allowed = isinstance(user, Teacher)
        return {"can_view": allowed, "can_write": allowed}

    # From here on, only admins/staff are ever eligible.
    if not isinstance(user, Admin) and not (
        Staff is not None and isinstance(user, Staff)
    ):
        return {"can_view": False, "can_write": False}

    if dashboard_entry.get("super_admin_only"):
        allowed = is_super_admin_user(user)
        return {"can_view": allowed, "can_write": allowed}

    if is_super_admin_user(user):
        return {"can_view": True, "can_write": True}

    module_code = dashboard_entry.get("module_code")

    if not module_code:
        return {"can_view": False, "can_write": False}

    if isinstance(user, Admin):
        user_type = "admin"
    else:
        user_type = "staff"

    access = build_user_access(user_type, getattr(user, "id", None))

    if not access:
        return {"can_view": False, "can_write": False}

    # BUG FIX: a brand-new admin has no RBACUserRole row yet (nobody has
    # opened Role & Permission Management for them). Previously this was
    # indistinguishable from "explicitly assigned a role with zero
    # permissions", so a legitimate admin_type owner (e.g. Academic Admin)
    # could never log in to their own dashboard until a Super Admin
    # manually assigned them a role - see the DASHBOARD_ACCESS_DENIED
    # gate in Login.post(). If there's no role assignment at all AND
    # this admin_type owns this dashboard, grant baseline access instead
    # of locking the account out of its own dashboard.
    if access["role"] is None and dashboard_entry.get("owner_admin_type") == getattr(
        user, "admin_type", None
    ):
        return {"can_view": True, "can_write": True}

    return _dashboard_rights_from_actions(
        access["effective_permissions"].get(module_code)
    )


def list_dashboard_access_for_user(user):
    """
    Return every dashboard the user may see, each with can_view /
    can_write flags - used to drive the login redirect, ProtectedRoute
    guard and the sidebar navigation on the frontend.
    """

    results = []

    for entry in DASHBOARD_REGISTRY:
        rights = get_user_dashboard_access(user, entry)

        if not rights["can_view"]:
            continue

        results.append(
            {
                "key": entry["key"],
                "label": entry["label"],
                "route": entry["route"],
                "can_view": rights["can_view"],
                "can_write": rights["can_write"],
            }
        )

    return results


def get_home_dashboard_for_user(user):
    """
    Resolve the dashboard a user should land on right after login,
    based on their role/admin_type - independent of whether they
    actually have access to it (callers must still check access).
    """

    if isinstance(user, Student):
        return DASHBOARD_BY_KEY["student-dashboard"]

    if isinstance(user, Teacher):
        return DASHBOARD_BY_KEY["teacher-dashboard"]

    if isinstance(user, Admin):
        if is_super_admin_user(user):
            return DASHBOARD_BY_KEY["super-admin-dashboard"]

        return get_dashboard_entry_for_admin_type(getattr(user, "admin_type", None))

    return None


# DATABASE MODELS
class RBACModule(db.Model):
    __tablename__ = "rbac_modules"

    id = db.Column(db.Integer, primary_key=True)

    code = db.Column(
        db.String(100),
        unique=True,
        nullable=False,
        index=True,
    )

    name = db.Column(
        db.String(150),
        nullable=False,
    )

    category = db.Column(
        db.String(100),
        nullable=False,
        default="General",
    )

    description = db.Column(db.String(255))

    sort_order = db.Column(
        db.Integer,
        nullable=False,
        default=0,
    )

    is_active = db.Column(
        db.Boolean,
        nullable=False,
        default=True,
        index=True,
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

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "category": self.category,
            "description": self.description,
            "sort_order": self.sort_order,
            "is_active": self.is_active,
        }


class RBACRole(db.Model):
    __tablename__ = "rbac_roles"

    id = db.Column(db.Integer, primary_key=True)

    # NULL = a system default role, shared as a template across every
    # school (e.g. "academic-admin", seeded by seed_rbac_defaults()).
    # A real value = a custom role a school created for itself, visible
    # and usable only by that school. `code` was globally unique before
    # this, which would have blocked two different schools from both
    # having a custom role coded "department-head" — uniqueness for
    # custom roles is now enforced at the application level (see
    # RBACRoleListCreateAPI) as (school_id, code) instead of a single
    # global DB constraint, since the 6 system roles still need to stay
    # globally unique among themselves (school_id IS NULL for all of
    # them, so a DB-level composite unique index wouldn't reliably catch
    # collisions there under standard SQL NULL semantics).
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )

    name = db.Column(
        db.String(120),
        nullable=False,
    )

    code = db.Column(
        db.String(100),
        nullable=False,
        index=True,
    )

    description = db.Column(db.String(500))

    user_type = db.Column(
        db.String(20),
        nullable=False,
        default="admin",
        index=True,
    )

    is_system = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
    )

    is_active = db.Column(
        db.Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    created_by = db.Column(db.String(100))
    updated_by = db.Column(db.String(100))

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

    permissions = db.relationship(
        "RBACRolePermission",
        back_populates="role",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    assignments = db.relationship(
        "RBACUserRole",
        back_populates="role",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )


class RBACRolePermission(db.Model):
    __tablename__ = "rbac_role_permissions"

    id = db.Column(db.Integer, primary_key=True)

    role_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "rbac_roles.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    module_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "rbac_modules.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    can_view = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
    )

    can_create = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
    )

    can_edit = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
    )

    can_delete = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
    )

    role = db.relationship(
        "RBACRole",
        back_populates="permissions",
    )

    module = db.relationship(
        "RBACModule",
        lazy="joined",
    )

    __table_args__ = (
        UniqueConstraint(
            "role_id",
            "module_id",
            name="uq_rbac_role_module",
        ),
    )


class RBACUserRole(db.Model):
    __tablename__ = "rbac_user_roles"

    id = db.Column(db.Integer, primary_key=True)

    user_type = db.Column(
        db.String(20),
        nullable=False,
        index=True,
    )

    user_id = db.Column(
        db.Integer,
        nullable=False,
        index=True,
    )

    role_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "rbac_roles.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    assigned_by = db.Column(db.String(100))

    assigned_at = db.Column(
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

    role = db.relationship(
        "RBACRole",
        back_populates="assignments",
        lazy="joined",
    )

    __table_args__ = (
        UniqueConstraint(
            "user_type",
            "user_id",
            name="uq_rbac_user_role",
        ),
    )


class RBACUserPermissionOverride(db.Model):
    __tablename__ = "rbac_user_permission_overrides"

    id = db.Column(db.Integer, primary_key=True)

    user_type = db.Column(
        db.String(20),
        nullable=False,
        index=True,
    )

    user_id = db.Column(
        db.Integer,
        nullable=False,
        index=True,
    )

    module_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "rbac_modules.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    can_view = db.Column(db.Boolean, nullable=True)
    can_create = db.Column(db.Boolean, nullable=True)
    can_edit = db.Column(db.Boolean, nullable=True)
    can_delete = db.Column(db.Boolean, nullable=True)

    is_temporary = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    expires_at = db.Column(
        db.DateTime,
        nullable=True,
        index=True,
    )

    access_reason = db.Column(db.String(500), nullable=True)
    updated_by = db.Column(db.String(100))
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

    module = db.relationship(
        "RBACModule",
        lazy="joined",
    )

    __table_args__ = (
        UniqueConstraint(
            "user_type",
            "user_id",
            "module_id",
            name="uq_rbac_user_module_override",
        ),
    )


class RBACAuditLog(db.Model):
    __tablename__ = "rbac_audit_logs"

    id = db.Column(db.Integer, primary_key=True)

    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )

    actor_type = db.Column(db.String(20))
    actor_id = db.Column(db.Integer)

    action = db.Column(
        db.String(100),
        nullable=False,
        index=True,
    )

    entity_type = db.Column(
        db.String(50),
        nullable=False,
    )

    entity_id = db.Column(db.String(100))

    details = db.Column(db.JSON)

    ip_address = db.Column(db.String(64))
    user_agent = db.Column(db.String(500))

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True,
    )


# VALIDATION AND NORMALIZATION
def normalize_code(value):
    value = str(value or "").strip().lower()
    value = re.sub(r"[^a-z0-9_-]+", "-", value)
    value = re.sub(r"-+", "-", value)
    return value.strip("-")


def normalize_user_type(value):
    value = str(value or "").strip().lower()

    if value not in VALID_USER_TYPES:
        return None

    return value


def parse_boolean(value, default=False):
    if isinstance(value, bool):
        return value

    if value is None:
        return default

    return str(value).strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def parse_iso_datetime(value):
    if value in {None, ""}:
        return None

    try:
        parsed = datetime.fromisoformat(str(value).strip().replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("Invalid expiry date and time") from exc

    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)

    return parsed


def is_override_active(override, now=None):
    if not override:
        return False

    if not bool(getattr(override, "is_temporary", False)):
        return True

    expires_at = getattr(override, "expires_at", None)
    return bool(expires_at and expires_at > (now or datetime.utcnow()))


def normalize_override_value(value):
    if value is None:
        return None

    if isinstance(value, bool):
        return value

    string_value = str(value).strip().lower()

    if string_value in {"inherit", "role", "null", "none", ""}:
        return None

    if string_value in {"true", "1", "allow", "yes"}:
        return True

    if string_value in {"false", "0", "deny", "no"}:
        return False

    raise ValueError("Permission override must be true, false or null")


def get_actor_identity():
    actor = get_current_user()

    if not actor:
        return {
            "type": None,
            "id": None,
            "key": None,
        }

    if isinstance(actor, Admin):
        actor_type = "admin"
    elif isinstance(actor, Teacher):
        actor_type = "teacher"
    elif isinstance(actor, Student):
        actor_type = "student"
    elif Staff is not None and isinstance(actor, Staff):
        actor_type = "staff"
    else:
        actor_type = "unknown"

    actor_id = getattr(actor, "id", None)

    return {
        "type": actor_type,
        "id": actor_id,
        "key": f"{actor_type}:{actor_id}",
    }


def is_super_admin_user(user):
    if not isinstance(user, Admin):
        return False

    return (
        str(getattr(user, "role", "") or "").strip().lower() == "super_admin"
        or str(getattr(user, "admin_type", "") or "").strip().lower() == "super admin"
    )


def super_admin_required(function):
    @wraps(function)
    @login_required
    def wrapper(*args, **kwargs):
        current_user = get_current_user()

        if not is_super_admin_user(current_user):
            return (
                jsonify(
                    {
                        "error": (
                            "Only a Super Administrator can "
                            "manage roles and permissions"
                        )
                    }
                ),
                403,
            )

        return function(*args, **kwargs)

    return wrapper


def _current_school_id():
    return getattr(getattr(request, "user", None), "school_id", None)


def write_audit_log(
    action,
    entity_type,
    entity_id=None,
    details=None,
):
    actor = get_actor_identity()

    log = RBACAuditLog(
        school_id=getattr(getattr(request, "user", None), "school_id", None),
        actor_type=actor["type"],
        actor_id=actor["id"],
        action=action,
        entity_type=entity_type,
        entity_id=(str(entity_id) if entity_id is not None else None),
        details=details or {},
        ip_address=request.headers.get(
            "X-Forwarded-For",
            request.remote_addr,
        ),
        user_agent=request.headers.get("User-Agent"),
    )

    db.session.add(log)


# USER HELPERS
def get_user_model(user_type):
    mapping = {
        "admin": Admin,
        "teacher": Teacher,
        "student": Student,
    }

    if Staff is not None:
        mapping["staff"] = Staff

    return mapping.get(user_type)


def get_user(user_type, user_id):
    model = get_user_model(user_type)

    if not model:
        return None

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None

    return model.query.get(user_id)


def get_user_name(user):
    parts = [
        getattr(user, "first_name", None),
        getattr(user, "middle_name", None),
        getattr(user, "last_name", None),
    ]

    name = " ".join(str(part).strip() for part in parts if part).strip()

    return (
        name
        or getattr(user, "username", None)
        or getattr(user, "email", None)
        or f"User {getattr(user, 'id', '')}"
    )


def serialize_basic_user(user_type, user):
    assignment = RBACUserRole.query.filter_by(
        user_type=user_type,
        user_id=user.id,
    ).first()

    overrides = RBACUserPermissionOverride.query.filter_by(
        user_type=user_type,
        user_id=user.id,
    ).all()

    active_overrides = [
        override for override in overrides if is_override_active(override)
    ]
    temporary_overrides = [
        override
        for override in active_overrides
        if override.is_temporary and override.expires_at
    ]

    nearest_expiry = min(
        (override.expires_at for override in temporary_overrides),
        default=None,
    )

    role = assignment.role if assignment else None

    return {
        "id": user.id,
        "user_key": f"{user_type}:{user.id}",
        "user_type": user_type,
        "name": get_user_name(user),
        "email": getattr(user, "email", None),
        "mobile": getattr(user, "mobile", None),
        "username": getattr(user, "username", None),
        "status": getattr(user, "status", None),
        "profile_image": getattr(user, "profile_image", None),
        "role_id": role.id if role else None,
        "role_name": role.name if role else "No Role",
        "role": serialize_role(role) if role else None,
        "has_overrides": len(active_overrides) > 0,
        "override_count": len(active_overrides),
        "is_temporary": len(temporary_overrides) > 0,
        "expires_at": nearest_expiry.isoformat() if nearest_expiry else None,
    }


# PERMISSION SERIALIZATION
def empty_action_map(default=False):
    return {
        "view": default,
        "create": default,
        "edit": default,
        "delete": default,
    }


def serialize_role_permissions(role):
    permission_map = {}

    for role_permission in role.permissions:
        module_code = role_permission.module.code

        permission_map[module_code] = {
            "view": bool(role_permission.can_view),
            "create": bool(role_permission.can_create),
            "edit": bool(role_permission.can_edit),
            "delete": bool(role_permission.can_delete),
        }

    return permission_map


def serialize_role(role):
    if not role:
        return None

    assigned_users = RBACUserRole.query.filter_by(
        role_id=role.id,
    ).count()

    return {
        "id": role.id,
        "name": role.name,
        "code": role.code,
        "description": role.description,
        "user_type": role.user_type,
        "is_system": role.is_system,
        "is_active": role.is_active,
        "assigned_users": assigned_users,
        "permissions": serialize_role_permissions(role),
        "created_at": (role.created_at.isoformat() if role.created_at else None),
        "updated_at": (role.updated_at.isoformat() if role.updated_at else None),
    }


def build_user_access(user_type, user_id):
    user = get_user(user_type, user_id)

    if not user:
        return None

    modules = (
        RBACModule.query.filter_by(is_active=True)
        .order_by(RBACModule.sort_order.asc(), RBACModule.name.asc())
        .all()
    )

    assignment = RBACUserRole.query.filter_by(
        user_type=user_type,
        user_id=user.id,
    ).first()

    role = assignment.role if assignment else None
    role_permissions = {module.code: empty_action_map(False) for module in modules}

    if role:
        role_permissions.update(serialize_role_permissions(role))

    stored_overrides = RBACUserPermissionOverride.query.filter_by(
        user_type=user_type,
        user_id=user.id,
    ).all()

    now = datetime.utcnow()
    active_overrides = [
        override for override in stored_overrides if is_override_active(override, now)
    ]

    override_permissions = {
        override.module.code: {
            "view": override.can_view,
            "create": override.can_create,
            "edit": override.can_edit,
            "delete": override.can_delete,
        }
        for override in active_overrides
    }

    temporary_overrides = [
        override
        for override in active_overrides
        if override.is_temporary and override.expires_at
    ]

    nearest_expiry = min(
        (override.expires_at for override in temporary_overrides),
        default=None,
    )

    reasons = [
        override.access_reason.strip()
        for override in temporary_overrides
        if override.access_reason and override.access_reason.strip()
    ]

    # A Super Admin always passes user_has_permission()/permission_required
    # below regardless of role or module — that check short-circuits on
    # is_super_admin_user() before it ever looks at effective_permissions.
    # But effective_permissions is also what the FRONTEND reads (straight
    # out of localStorage) to decide whether to show a module as
    # read-only, with no equivalent is-super-admin check of its own. Any
    # Super Admin without an explicit role/override granting a module
    # full marks — e.g. the very first Super Admin created by the
    # Developer's school-onboarding flow, who gets no RBACUserRole at
    # all — would see every OTHER dashboard's "Read-only access" banner,
    # even though the backend would actually have allowed the write.
    # Keep them consistent by granting every module here too.
    is_super_admin = is_super_admin_user(user)

    effective_permissions = {}

    for module in modules:
        module_code = module.code

        if is_super_admin:
            effective_permissions[module_code] = empty_action_map(True)
            continue

        base = role_permissions.get(module_code, empty_action_map(False))
        override = override_permissions.get(module_code, {})

        effective_permissions[module_code] = {
            action: (
                base.get(action, False)
                if override.get(action) is None
                else bool(override.get(action))
            )
            for action in VALID_ACTIONS
        }

    return {
        "user": serialize_basic_user(user_type, user),
        "role": serialize_role(role),
        "role_permissions": role_permissions,
        "override_permissions": override_permissions,
        "effective_permissions": effective_permissions,
        "has_overrides": len(active_overrides) > 0,
        "is_temporary": len(temporary_overrides) > 0,
        "expires_at": nearest_expiry.isoformat() if nearest_expiry else None,
        "access_reason": reasons[0] if reasons else "",
        "expired_override_count": len(stored_overrides) - len(active_overrides),
    }


# RUNTIME PERMISSION CHECK
def user_has_permission(
    user,
    module_code,
    action="view",
):
    module_code = normalize_code(module_code)
    action = str(action or "").strip().lower()

    if action not in VALID_ACTIONS:
        return False

    if is_super_admin_user(user):
        return True

    if isinstance(user, Admin):
        user_type = "admin"
    elif isinstance(user, Teacher):
        user_type = "teacher"
    elif isinstance(user, Student):
        user_type = "student"
    elif Staff is not None and isinstance(user, Staff):
        user_type = "staff"
    else:
        return False

    access = build_user_access(
        user_type,
        getattr(user, "id", None),
    )

    if not access:
        return False

    return bool(access["effective_permissions"].get(module_code, {}).get(action, False))


def permission_required(module_code, action="view"):
    def decorator(function):
        @wraps(function)
        @login_required
        def wrapper(*args, **kwargs):
            current_user = get_current_user()

            if not user_has_permission(
                current_user,
                module_code,
                action,
            ):
                return (
                    jsonify(
                        {
                            "error": "Permission denied",
                            "required_permission": {
                                "module": module_code,
                                "action": action,
                            },
                        }
                    ),
                    403,
                )

            return function(*args, **kwargs)

        return wrapper

    return decorator


# DATABASE SEED
def seed_rbac_defaults():
    """
    Run once after db.create_all() or through a Flask CLI command.
    Safe to execute repeatedly.
    """

    try:
        module_lookup = {}

        for module_data in DEFAULT_MODULES:
            module = RBACModule.query.filter_by(code=module_data["code"]).first()

            if not module:
                module = RBACModule(**module_data)
                db.session.add(module)
                db.session.flush()
            else:
                module.name = module_data["name"]
                module.category = module_data["category"]
                module.sort_order = module_data["sort_order"]
                module.is_active = True

            module_lookup[module.code] = module

        for role_data in DEFAULT_ROLES:
            role = RBACRole.query.filter_by(
                code=role_data["code"], school_id=None
            ).first()

            if not role:
                role = RBACRole(
                    name=role_data["name"],
                    code=role_data["code"],
                    description=role_data["description"],
                    user_type=role_data["user_type"],
                    is_system=role_data.get(
                        "is_system",
                        True,
                    ),
                    is_active=True,
                )

                db.session.add(role)
                db.session.flush()

            role.name = role_data["name"]
            role.description = role_data["description"]
            role.user_type = role_data["user_type"]
            role.is_system = role_data.get("is_system", True)

            allowed_modules = set(
                module_lookup.keys()
                if role_data.get("allow_all")
                else role_data.get("modules", [])
            )

            for module_code, module in module_lookup.items():
                permission = RBACRolePermission.query.filter_by(
                    role_id=role.id,
                    module_id=module.id,
                ).first()

                enabled = module_code in allowed_modules

                if not permission:
                    permission = RBACRolePermission(
                        role_id=role.id,
                        module_id=module.id,
                    )
                    db.session.add(permission)

                permission.can_view = enabled
                permission.can_create = enabled
                permission.can_edit = enabled
                permission.can_delete = enabled

        db.session.commit()

        return True

    except Exception:
        db.session.rollback()
        logger.exception("Failed to seed RBAC defaults")
        return False


# BOOTSTRAP API
class RBACBootstrapAPI(MethodView):
    decorators = [super_admin_required]

    def get(self):
        try:
            # Self-heal older/production databases where RBAC tables exist but
            # default module rows were never inserted. This is safe to repeat.
            if RBACModule.query.count() == 0:
                seeded = seed_rbac_defaults()
                if not seeded:
                    return (
                        jsonify(
                            {
                                "error": "RBAC default modules could not be initialized",
                                "modules": [],
                                "roles": [],
                            }
                        ),
                        500,
                    )

            modules = (
                RBACModule.query.filter_by(is_active=True)
                .order_by(
                    RBACModule.sort_order.asc(),
                    RBACModule.name.asc(),
                )
                .all()
            )

            roles = (
                RBACRole.query.filter(_visible_roles_filter())
                .order_by(
                    RBACRole.is_system.desc(),
                    RBACRole.name.asc(),
                )
                .all()
            )

            school_id = _current_school_id()

            total_users = (
                Admin.query.filter_by(is_deleted=False, school_id=school_id).count()
                + Teacher.query.filter_by(school_id=school_id).count()
                + Student.query.filter_by(school_id=school_id).count()
                + (
                    Staff.query.filter_by(school_id=school_id).count()
                    if Staff is not None
                    else 0
                )
            )

            now = datetime.utcnow()

            active_override_filter = or_(
                RBACUserPermissionOverride.is_temporary.is_(False),
                RBACUserPermissionOverride.expires_at > now,
            )

            # Overrides are keyed by (user_type, user_id) with no school
            # column of their own, so scope them through the users they
            # point at rather than counting every school's overrides.
            my_users_filter = _override_belongs_to_my_school()

            users_with_overrides = (
                RBACUserPermissionOverride.query.filter(
                    active_override_filter, my_users_filter
                )
                .with_entities(
                    RBACUserPermissionOverride.user_type,
                    RBACUserPermissionOverride.user_id,
                )
                .distinct()
                .count()
            )

            temporary_access_users = (
                RBACUserPermissionOverride.query.filter(
                    RBACUserPermissionOverride.is_temporary.is_(True),
                    RBACUserPermissionOverride.expires_at > now,
                    my_users_filter,
                )
                .with_entities(
                    RBACUserPermissionOverride.user_type,
                    RBACUserPermissionOverride.user_id,
                )
                .distinct()
                .count()
            )

            return (
                jsonify(
                    {
                        "modules": [module.to_dict() for module in modules],
                        "roles": [serialize_role(role) for role in roles],
                        "stats": {
                            "total_roles": len(roles),
                            "active_roles": sum(1 for role in roles if role.is_active),
                            "total_users": total_users,
                            "users_with_overrides": users_with_overrides,
                            "temporary_access_users": temporary_access_users,
                        },
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            db.session.rollback()
            logger.exception(
                "RBAC bootstrap failed - RBAC tables may not exist yet. "
                "Run db.create_all()/migrations, then seed_rbac_defaults()."
            )
            return (
                jsonify(
                    {
                        "error": (
                            "RBAC tables are not set up correctly. Please run "
                            "database migrations and seed RBAC defaults."
                        ),
                        "modules": [],
                        "roles": [],
                    }
                ),
                500,
            )

        except Exception:
            db.session.rollback()
            logger.exception("Unexpected error loading RBAC bootstrap data")
            return (
                jsonify(
                    {
                        "error": "Failed to load role and permission data",
                        "modules": [],
                        "roles": [],
                    }
                ),
                500,
            )


# ROLE CRUD API
def _override_belongs_to_my_school():
    """SQL condition: this override row targets a user in the caller's
    school. Built per user_type because the override table is
    polymorphic (user_type + user_id, no FK)."""
    school_id = _current_school_id()
    clauses = []

    for user_type in ("admin", "teacher", "student", "staff"):
        model = get_user_model(user_type)

        if not model:
            continue

        clauses.append(
            and_(
                RBACUserPermissionOverride.user_type == user_type,
                RBACUserPermissionOverride.user_id.in_(
                    db.session.query(model.id).filter(model.school_id == school_id)
                ),
            )
        )

    return or_(*clauses) if clauses else false()


def _visible_roles_filter():
    """System default roles (school_id IS NULL) plus this school's own
    custom roles — never another school's custom roles."""
    return or_(
        RBACRole.school_id.is_(None),
        RBACRole.school_id == _current_school_id(),
    )


class RBACRoleListAPI(MethodView):
    decorators = [super_admin_required]

    def get(self):
        query = RBACRole.query.filter(_visible_roles_filter())

        user_type = normalize_user_type(request.args.get("user_type"))

        if user_type and user_type != "all":
            query = query.filter(
                or_(
                    RBACRole.user_type == user_type,
                    RBACRole.user_type == "all",
                )
            )

        roles = query.order_by(
            RBACRole.is_system.desc(),
            RBACRole.name.asc(),
        ).all()

        return (
            jsonify({"roles": [serialize_role(role) for role in roles]}),
            200,
        )

    def post(self):
        data = request.get_json(silent=True) or {}

        name = str(data.get("name") or "").strip()
        code = normalize_code(data.get("code"))
        description = str(data.get("description") or "").strip()

        user_type = normalize_user_type(data.get("user_type"))

        if not name:
            return jsonify({"error": "Role name is required"}), 400

        if not code:
            return jsonify({"error": "Role code is required"}), 400

        if not user_type:
            return jsonify({"error": "Invalid user type"}), 400

        # A code can't collide with a system role or with one of THIS
        # school's own custom roles — another school's custom role with
        # the same code is irrelevant and must not block creation.
        if RBACRole.query.filter(
            RBACRole.code == code, _visible_roles_filter()
        ).first():
            return jsonify({"error": "Role code already exists"}), 409

        actor = get_actor_identity()

        role = RBACRole(
            school_id=_current_school_id(),
            name=name,
            code=code,
            description=description,
            user_type=user_type,
            is_system=False,
            is_active=parse_boolean(
                data.get("is_active"),
                True,
            ),
            created_by=actor["key"],
            updated_by=actor["key"],
        )

        try:
            db.session.add(role)
            db.session.flush()

            modules = RBACModule.query.filter_by(is_active=True).all()

            for module in modules:
                db.session.add(
                    RBACRolePermission(
                        role_id=role.id,
                        module_id=module.id,
                        can_view=False,
                        can_create=False,
                        can_edit=False,
                        can_delete=False,
                    )
                )

            write_audit_log(
                "role.created",
                "role",
                role.id,
                {
                    "name": role.name,
                    "code": role.code,
                    "user_type": role.user_type,
                },
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "message": "Role created successfully",
                        "role": serialize_role(role),
                    }
                ),
                201,
            )

        except IntegrityError:
            db.session.rollback()
            return jsonify({"error": "Role already exists"}), 409

        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Failed to create RBAC role")
            return jsonify({"error": "Database error"}), 500


def _get_visible_role(role_id):
    """A role this school may see: a system role or its own custom role."""
    return RBACRole.query.filter(
        RBACRole.id == role_id, _visible_roles_filter()
    ).first()


def _role_is_editable(role):
    """System roles (school_id NULL) are shared by every school, so a
    school-level Super Admin must never be able to edit or delete them —
    doing so would silently change permissions for every other school
    using that role. Only a role owned by the caller's own school is
    editable. For a legacy single-school install (caller school_id is
    None), system roles ARE effectively that install's own, since
    nothing else shares them — None == None keeps that working."""
    return role.school_id == _current_school_id()


_SYSTEM_ROLE_READONLY_ERROR = (
    "This is a platform-managed system role shared by all schools and "
    "cannot be modified. Create a custom role instead."
)


class RBACRoleDetailAPI(MethodView):
    decorators = [super_admin_required]

    def get(self, role_id):
        role = _get_visible_role(role_id)

        if not role:
            return jsonify({"error": "Role not found"}), 404

        return jsonify({"role": serialize_role(role)}), 200

    def put(self, role_id):
        role = _get_visible_role(role_id)

        if not role:
            return jsonify({"error": "Role not found"}), 404

        if not _role_is_editable(role):
            return jsonify({"error": _SYSTEM_ROLE_READONLY_ERROR}), 403

        data = request.get_json(silent=True) or {}

        name = str(data.get("name", role.name) or "").strip()

        code = normalize_code(data.get("code", role.code))

        user_type = normalize_user_type(data.get("user_type", role.user_type))

        if not name:
            return jsonify({"error": "Role name is required"}), 400

        if not code:
            return jsonify({"error": "Role code is required"}), 400

        if not user_type:
            return jsonify({"error": "Invalid user type"}), 400

        duplicate = RBACRole.query.filter(
            RBACRole.code == code,
            RBACRole.id != role.id,
            _visible_roles_filter(),
        ).first()

        if duplicate:
            return jsonify({"error": "Role code already exists"}), 409

        if role.is_system and code != role.code:
            return (
                jsonify({"error": ("System role code cannot be changed")}),
                400,
            )

        actor = get_actor_identity()

        role.name = name
        role.code = code
        role.description = str(
            data.get(
                "description",
                role.description or "",
            )
            or ""
        ).strip()

        role.user_type = user_type
        role.is_active = parse_boolean(
            data.get("is_active"),
            role.is_active,
        )
        role.updated_by = actor["key"]

        try:
            write_audit_log(
                "role.updated",
                "role",
                role.id,
                {
                    "name": role.name,
                    "code": role.code,
                    "user_type": role.user_type,
                    "is_active": role.is_active,
                },
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "message": "Role updated successfully",
                        "role": serialize_role(role),
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Failed to update RBAC role")
            return jsonify({"error": "Database error"}), 500

    def delete(self, role_id):
        role = _get_visible_role(role_id)

        if not role:
            return jsonify({"error": "Role not found"}), 404

        if not _role_is_editable(role):
            return jsonify({"error": _SYSTEM_ROLE_READONLY_ERROR}), 403

        if role.is_system:
            return (
                jsonify(
                    {
                        "error": (
                            "System roles cannot be deleted. "
                            "Disable the role instead."
                        )
                    }
                ),
                400,
            )

        assignments = RBACUserRole.query.filter_by(role_id=role.id).all()
        assigned_users = len(assignments)

        try:

            for assignment in assignments:
                db.session.delete(assignment)

            role_data = {
                "name": role.name,
                "code": role.code,
            }

            write_audit_log(
                "role.deleted",
                "role",
                role.id,
                role_data,
            )

            db.session.delete(role)
            db.session.commit()

            return (
                jsonify(
                    {
                        "message": "Role deleted successfully",
                        "unassigned_users": assigned_users,
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Failed to delete RBAC role")
            return jsonify({"error": "Database error"}), 500


# ROLE PERMISSION API
class RBACRolePermissionAPI(MethodView):
    decorators = [super_admin_required]

    def put(self, role_id):
        role = _get_visible_role(role_id)

        if not role:
            return jsonify({"error": "Role not found"}), 404

        # Editing a shared system role's permission matrix would change
        # what every school's admins can do at once (and
        # seed_rbac_defaults() would silently revert it on the next
        # restart) — only a school's own custom roles are editable here.
        if not _role_is_editable(role):
            return jsonify({"error": _SYSTEM_ROLE_READONLY_ERROR}), 403

        data = request.get_json(silent=True) or {}
        permissions = data.get("permissions")

        if not isinstance(permissions, dict):
            return (
                jsonify(
                    {"error": ("permissions must be an object " "keyed by module code")}
                ),
                400,
            )

        modules = RBACModule.query.filter_by(is_active=True).all()
        module_lookup = {module.code: module for module in modules}
        unknown_modules = set(permissions.keys()) - set(module_lookup.keys())

        if unknown_modules:
            return (
                jsonify(
                    {
                        "error": "Unknown module codes",
                        "modules": sorted(unknown_modules),
                    }
                ),
                400,
            )

        try:
            for module_code, module in module_lookup.items():
                action_data = permissions.get(
                    module_code,
                    {},
                )

                if not isinstance(action_data, dict):
                    action_data = {}

                permission = RBACRolePermission.query.filter_by(
                    role_id=role.id,
                    module_id=module.id,
                ).first()

                if not permission:
                    permission = RBACRolePermission(
                        role_id=role.id,
                        module_id=module.id,
                    )
                    db.session.add(permission)

                permission.can_view = parse_boolean(
                    action_data.get("view"),
                    False,
                )

                permission.can_create = parse_boolean(
                    action_data.get("create"),
                    False,
                )

                permission.can_edit = parse_boolean(
                    action_data.get("edit"),
                    False,
                )

                permission.can_delete = parse_boolean(
                    action_data.get("delete"),
                    False,
                )

                if (
                    permission.can_create
                    or permission.can_edit
                    or permission.can_delete
                ):
                    permission.can_view = True

            actor = get_actor_identity()
            role.updated_by = actor["key"]
            role.updated_at = datetime.utcnow()

            write_audit_log(
                "role.permissions_updated",
                "role",
                role.id,
                {
                    "role_code": role.code,
                    "permissions": permissions,
                },
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "message": ("Role permissions updated successfully"),
                        "role": serialize_role(role),
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Failed to update role permissions")
            return jsonify({"error": "Database error"}), 500


# USER LIST API
def _get_user_in_my_school(user_type, user_id):
    """Look up a user by (type, id), but only if they belong to the
    caller's own school. Every endpoint below that takes a user_type +
    user_id from the URL used to trust it blindly, so a Super Admin
    from one school could read or change role assignments and
    permission overrides for any user at any other school just by
    guessing an id. Returns None (-> caller should 404, not 403, so it
    doesn't reveal that the id exists elsewhere) when not found or in
    a different school."""
    model = get_user_model(user_type)

    if not model:
        return None

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None

    return model.query.filter_by(
        id=user_id, school_id=_current_school_id()
    ).first()


class RBACUserListAPI(MethodView):
    decorators = [super_admin_required]

    def get(self):
        requested_user_type = normalize_user_type(request.args.get("user_type", "all"))

        if not requested_user_type:
            return jsonify({"error": "Invalid user type"}), 400

        search = str(request.args.get("search") or "").strip()
        status = str(request.args.get("status") or "").strip()
        normalized_status = status.lower()
        role_id = request.args.get("role_id")

        if role_id:
            try:
                role_id = int(role_id)
            except (TypeError, ValueError):
                return jsonify({"error": "Invalid role id"}), 400

        user_types = (
            ["admin", "teacher", "student", "staff"]
            if requested_user_type == "all"
            else [requested_user_type]
        )

        serialized_users = []

        for user_type in user_types:
            model = get_user_model(user_type)

            # Staff is optional in some installations. Skip only the missing
            # optional model while still returning Admin/Teacher/Student rows.
            if not model:
                continue

            query = model.query.filter(model.school_id == _current_school_id())

            if user_type == "admin" and hasattr(model, "is_deleted"):
                query = query.filter(Admin.is_deleted.is_(False))

            if search:
                pattern = f"%{search}%"
                searchable_columns = []

                for field_name in [
                    "first_name",
                    "middle_name",
                    "last_name",
                    "email",
                    "mobile",
                    "username",
                    "admin_id",
                    "teacher_id",
                    "student_id",
                    "staff_id",
                    "user_id",
                ]:
                    column = getattr(model, field_name, None)
                    if column is not None:
                        searchable_columns.append(column.ilike(pattern))

                if searchable_columns:
                    query = query.filter(or_(*searchable_columns))

            if normalized_status in {"active", "inactive"} and hasattr(model, "status"):
                query = query.filter(model.status == normalized_status.capitalize())

            if role_id:
                assigned_user_ids = db.session.query(RBACUserRole.user_id).filter(
                    RBACUserRole.user_type == user_type,
                    RBACUserRole.role_id == role_id,
                )
                query = query.filter(model.id.in_(assigned_user_ids))

            users = (
                query.order_by(getattr(model, "first_name", model.id).asc())
                .limit(500)
                .all()
            )

            serialized_users.extend(
                serialize_basic_user(user_type, user) for user in users
            )

        serialized_users.sort(
            key=lambda item: (
                str(item.get("name") or "").lower(),
                str(item.get("user_type") or ""),
                int(item.get("id") or 0),
            )
        )

        if normalized_status == "temporary":
            serialized_users = [
                user for user in serialized_users if user["is_temporary"]
            ]
        elif normalized_status == "override":
            serialized_users = [
                user for user in serialized_users if user["has_overrides"]
            ]

        return (
            jsonify(
                {
                    "users": serialized_users,
                    "count": len(serialized_users),
                    "stats": {
                        "total_users": len(serialized_users),
                        "users_with_overrides": sum(
                            1 for user in serialized_users if user["has_overrides"]
                        ),
                        "temporary_access_users": sum(
                            1 for user in serialized_users if user["is_temporary"]
                        ),
                    },
                }
            ),
            200,
        )


# USER ACCESS API
class RBACUserAccessAPI(MethodView):
    decorators = [super_admin_required]

    def get(self, user_type, user_id):
        user_type = normalize_user_type(user_type)

        if not user_type or user_type == "all":
            return jsonify({"error": "Invalid user type"}), 400

        if not _get_user_in_my_school(user_type, user_id):
            return jsonify({"error": "User not found"}), 404

        access = build_user_access(
            user_type,
            user_id,
        )

        if not access:
            return jsonify({"error": "User not found"}), 404

        return jsonify(access), 200


class RBACUserRoleAPI(MethodView):
    decorators = [super_admin_required]

    def put(self, user_type, user_id):
        user_type = normalize_user_type(user_type)

        if not user_type or user_type == "all":
            return jsonify({"error": "Invalid user type"}), 400

        user = _get_user_in_my_school(user_type, user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json(silent=True) or {}
        role_id = data.get("role_id")

        assignment = RBACUserRole.query.filter_by(
            user_type=user_type,
            user_id=user.id,
        ).first()

        actor = get_actor_identity()

        try:
            if role_id in {None, "", 0, "0"}:
                if assignment:
                    db.session.delete(assignment)

                write_audit_log(
                    "user.role_removed",
                    "user",
                    f"{user_type}:{user.id}",
                    {
                        "user_name": get_user_name(user),
                    },
                )

            else:
                try:
                    role_id = int(role_id)
                except (TypeError, ValueError):
                    return jsonify({"error": "Invalid role id"}), 400

                role = _get_visible_role(role_id)

                if not role:
                    return jsonify({"error": "Role not found"}), 404

                if not role.is_active:
                    return jsonify({"error": "Role is inactive"}), 400

                if role.user_type not in {user_type, "all"}:
                    return (
                        jsonify(
                            {
                                "error": (
                                    "This role cannot be assigned " f"to a {user_type}"
                                )
                            }
                        ),
                        400,
                    )

                if not assignment:
                    assignment = RBACUserRole(
                        user_type=user_type,
                        user_id=user.id,
                        role_id=role.id,
                        assigned_by=actor["key"],
                    )

                    db.session.add(assignment)
                else:
                    assignment.role_id = role.id
                    assignment.assigned_by = actor["key"]
                    assignment.updated_at = datetime.utcnow()

                write_audit_log(
                    "user.role_assigned",
                    "user",
                    f"{user_type}:{user.id}",
                    {
                        "user_name": get_user_name(user),
                        "role_id": role.id,
                        "role_code": role.code,
                    },
                )

            db.session.commit()

            access = build_user_access(
                user_type,
                user.id,
            )

            return (
                jsonify(
                    {
                        **access,
                        "message": "User role updated successfully",
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Failed to assign role")
            return jsonify({"error": "Database error"}), 500


class RBACUserOverrideAPI(MethodView):
    decorators = [super_admin_required]

    def put(self, user_type, user_id):
        user_type = normalize_user_type(user_type)

        if not user_type or user_type == "all":
            return jsonify({"error": "Invalid user type"}), 400

        user = _get_user_in_my_school(user_type, user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json(silent=True) or {}
        permissions = data.get("permissions")

        if not isinstance(permissions, dict):
            return (
                jsonify(
                    {"error": "permissions must be an object keyed by module code"}
                ),
                400,
            )

        is_temporary = parse_boolean(data.get("is_temporary"), False)
        access_reason = str(data.get("reason") or "").strip()

        try:
            expires_at = parse_iso_datetime(data.get("expires_at"))
        except ValueError as validation_error:
            return jsonify({"error": str(validation_error)}), 400

        if is_temporary:
            if not expires_at:
                return jsonify({"error": "Expiry date and time are required"}), 400
            if expires_at <= datetime.utcnow():
                return jsonify({"error": "Expiry must be a future date and time"}), 400
        else:
            expires_at = None
            access_reason = ""

        modules = RBACModule.query.filter_by(is_active=True).all()
        module_lookup = {module.code: module for module in modules}
        unknown_modules = set(permissions.keys()) - set(module_lookup.keys())

        if unknown_modules:
            return (
                jsonify(
                    {
                        "error": "Unknown module codes",
                        "modules": sorted(unknown_modules),
                    }
                ),
                400,
            )

        actor = get_actor_identity()

        try:
            existing_overrides = {
                override.module_id: override
                for override in RBACUserPermissionOverride.query.filter_by(
                    user_type=user_type,
                    user_id=user.id,
                ).all()
            }

            for module_code, module in module_lookup.items():
                module_permissions = permissions.get(module_code)

                if not isinstance(module_permissions, dict):
                    module_permissions = {}

                normalized = {
                    action: normalize_override_value(module_permissions.get(action))
                    for action in VALID_ACTIONS
                }

                has_override = any(value is not None for value in normalized.values())
                override = existing_overrides.get(module.id)

                if not has_override:
                    if override:
                        db.session.delete(override)
                    continue

                if not override:
                    override = RBACUserPermissionOverride(
                        user_type=user_type,
                        user_id=user.id,
                        module_id=module.id,
                    )
                    db.session.add(override)

                override.can_view = normalized["view"]
                override.can_create = normalized["create"]
                override.can_edit = normalized["edit"]
                override.can_delete = normalized["delete"]
                override.is_temporary = is_temporary
                override.expires_at = expires_at
                override.access_reason = access_reason or None
                override.updated_by = actor["key"]

            write_audit_log(
                "user.permissions_overridden",
                "user",
                f"{user_type}:{user.id}",
                {
                    "user_name": get_user_name(user),
                    "permissions": permissions,
                    "is_temporary": is_temporary,
                    "expires_at": expires_at.isoformat() if expires_at else None,
                    "reason": access_reason,
                },
            )

            db.session.commit()
            access = build_user_access(user_type, user.id)

            return (
                jsonify(
                    {
                        **access,
                        "message": "User permission overrides updated",
                    }
                ),
                200,
            )

        except ValueError as validation_error:
            db.session.rollback()
            return jsonify({"error": str(validation_error)}), 400

        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Failed to update user permission overrides")
            return jsonify({"error": "Database error"}), 500

    def delete(self, user_type, user_id):
        user_type = normalize_user_type(user_type)

        if not user_type or user_type == "all":
            return jsonify({"error": "Invalid user type"}), 400

        user = _get_user_in_my_school(user_type, user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        try:
            RBACUserPermissionOverride.query.filter_by(
                user_type=user_type,
                user_id=user.id,
            ).delete(synchronize_session=False)

            write_audit_log(
                "user.permissions_reset",
                "user",
                f"{user_type}:{user.id}",
                {
                    "user_name": get_user_name(user),
                },
            )

            db.session.commit()

            access = build_user_access(
                user_type,
                user.id,
            )

            return (
                jsonify(
                    {
                        **access,
                        "message": ("User permissions reset to base role"),
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Failed to reset user permission overrides")
            return jsonify({"error": "Database error"}), 500


# CURRENT USER ACCESS API
class MyRBACAccessAPI(MethodView):
    decorators = [login_required]

    def get(self):
        current_user = get_current_user()

        if isinstance(current_user, Admin):
            user_type = "admin"
        elif isinstance(current_user, Teacher):
            user_type = "teacher"
        elif isinstance(current_user, Student):
            user_type = "student"
        elif Staff is not None and isinstance(current_user, Staff):
            user_type = "staff"
        else:
            return jsonify({"error": "Unknown user type"}), 400

        if is_super_admin_user(current_user):
            modules = RBACModule.query.filter_by(is_active=True).all()

            effective_permissions = {
                module.code: empty_action_map(True) for module in modules
            }

            return (
                jsonify(
                    {
                        "is_super_admin": True,
                        "effective_permissions": (effective_permissions),
                    }
                ),
                200,
            )

        access = build_user_access(
            user_type,
            current_user.id,
        )

        if not access:
            return jsonify({"error": "Access not configured"}), 404

        return jsonify(access), 200


# CURRENT USER DASHBOARD ACCESS API
class MyDashboardAccessAPI(MethodView):

    decorators = [login_required]

    def get(self):
        current_user = get_current_user()

        home = get_home_dashboard_for_user(current_user)

        return (
            jsonify(
                {
                    "dashboards": list_dashboard_access_for_user(current_user),
                    "home_dashboard": home["key"] if home else None,
                    "home_route": home["route"] if home else None,
                    "is_super_admin": is_super_admin_user(current_user),
                }
            ),
            200,
        )
