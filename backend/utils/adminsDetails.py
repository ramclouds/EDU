import logging
from datetime import datetime

import bcrypt
from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError

from utils.auth import Admin, db
from utils.auth_middleware import login_required

logger = logging.getLogger(__name__)


# DASHBOARD PERMISSIONS
DASHBOARD_PERMISSIONS = {
    "Super Admin": "all-dashboards",
    "Academic Admin": "academic-admin-dashboard",
    "HR Admin": "hr-admin-dashboard",
    "Hostel Admin": "hostel-admin-dashboard",
    "Library Admin": "library-admin-dashboard",
    "Accounts Admin": "accounts-admin-dashboard",
}


# DASHBOARD CONFIGURATION
ADMIN_TYPE_CONFIG = {
    "Super Admin": {
        "dashboard_type": "super-admin-dashboard",
        "dashboard_route": "/super-admin-dashboard",
        "permission": "all-dashboards",
    },
    "Academic Admin": {
        "dashboard_type": "academic-Mgmt-dashboard",
        "dashboard_route": "/academic-admin-dashboard",
        "permission": "academic-admin-dashboard",
    },
    "HR Admin": {
        "dashboard_type": "hr-Mgmt-dashboard",
        "dashboard_route": "/hr-admin-dashboard",
        "permission": "hr-admin-dashboard",
    },
    "Hostel Admin": {
        "dashboard_type": "hostels-Mgmt-dashboard",
        "dashboard_route": "/hostel-admin-dashboard",
        "permission": "hostel-admin-dashboard",
    },
    "Library Admin": {
        "dashboard_type": "library-Mgmt-dashboard",
        "dashboard_route": "/library-admin-dashboard",
        "permission": "library-admin-dashboard",
    },
    "Accounts Admin": {
        "dashboard_type": "accounts-Mgmt-dashboard",
        "dashboard_route": "/accounts-admin-dashboard",
        "permission": "accounts-admin-dashboard",
    },
}


# AVAILABLE RIGHTS
AVAILABLE_RIGHTS = {
    "read",
    "write",
    "edit",
    "delete",
}
DEFAULT_ADMIN_RIGHTS = [
    "read",
    "write",
    "edit",
]
SUPER_ADMIN_RIGHTS = [
    "read",
    "write",
    "edit",
    "delete",
]


# NORMALIZATION HELPERS
def normalize_list(value):
    """
    Convert comma-separated string, JSON-like list, tuple or set
    into a clean list of strings.
    """

    if value is None:
        return []

    if isinstance(value, (list, tuple, set)):
        return [str(item).strip() for item in value if str(item).strip()]

    string_value = str(value).strip()

    if not string_value:
        return []

    if string_value.lower() in {"none", "null"}:
        return []

    return [item.strip() for item in string_value.split(",") if item.strip()]


def normalize_permissions(value):
    """
    Convert permission values to lowercase and remove duplicates.
    """

    permissions = []

    for item in normalize_list(value):
        permission = item.lower()

        if permission not in permissions:
            permissions.append(permission)

    return permissions


def normalize_rights(value):
    """
    Return only supported action rights.
    """

    rights = []

    for item in normalize_list(value):
        right = item.lower()

        if right in AVAILABLE_RIGHTS and right not in rights:
            rights.append(right)

    return rights


def list_to_csv(values):
    """
    Convert a list into a comma-separated database value.
    """

    return ",".join(str(item).strip() for item in values if str(item).strip())


# ADMIN TYPE HELPERS
def is_super_admin(admin):
    return (
        str(admin.role or "").strip().lower() == "super_admin"
        or str(admin.admin_type or "").strip() == "Super Admin"
    )


def get_admin_config(admin_type):
    return ADMIN_TYPE_CONFIG.get(str(admin_type or "").strip())


def get_expected_dashboard_permission(admin_type):
    config = get_admin_config(admin_type)

    if not config:
        return None

    return config["permission"]


# ACCESS RESOLVER
def _rbac_dashboard_rights(admin, config):
    """
    Ask the real RBAC system (Role & Permission Management) whether this
    admin currently has view/write access to their own dashboard.
    Returns None if RBAC lookup isn't available, so callers can fall
    back to the legacy CSV-based fields.
    """

    if not config:
        return None

    try:
        from utils.rolePermissionManagement import (
            get_dashboard_entry_for_admin_type,
            get_user_dashboard_access,
        )

        entry = get_dashboard_entry_for_admin_type(admin.admin_type)

        if not entry:
            return None

        return get_user_dashboard_access(admin, entry)
    except Exception:
        logger.exception("Unable to resolve RBAC dashboard access for admin")
        return None


def _rbac_all_dashboard_access(admin):
    """
    Every dashboard (key/label/route/can_view/can_write) this admin
    currently has *view* access to via RBAC - not just the one dashboard
    tied to their admin_type.

    BUG FIX: a Super Admin can grant an admin extra dashboards beyond
    their own via Role & Permission Management (e.g. a Library Admin
    who is *also* given Hostel Dashboard access). resolve_admin_access()
    used to only ever resolve the admin's own home dashboard, so that
    second grant never showed up in the admin's profile/table and the
    corresponding sidebar link never appeared on their own dashboard.

    Returns None if RBAC lookup isn't available (caller falls back to
    legacy behavior for that admin).
    """

    try:
        from utils.rolePermissionManagement import list_dashboard_access_for_user

        return list_dashboard_access_for_user(admin)
    except Exception:
        logger.exception("Unable to resolve full RBAC dashboard list for admin")
        return None


def resolve_admin_access(admin):
    """
    Build dashboard access and CRUD rights for an admin.

    This is now a thin wrapper: the source of truth for "can this admin
    open this dashboard, and can they edit or only view it" is the RBAC
    Role & Permission Management system (see rolePermissionManagement.py
    / DASHBOARD_REGISTRY). Legacy `permissions` / `modules_enabled` /
    `access_level` columns on the Admin row are only used as a fallback
    when no RBAC role/module mapping exists yet for that admin_type.

    permissions:
        Contains dashboard permission only.
        Example: hr-admin-dashboard

    access_level:
        Contains operation rights.
        Example: read,write,edit
    """

    admin_type = str(admin.admin_type or "").strip()

    if is_super_admin(admin):
        return {
            "dashboard_type": "super-admin-dashboard",
            "dashboard_route": "/super-admin-dashboard",
            "dashboard_permissions": [DASHBOARD_PERMISSIONS["Super Admin"]],
            "permissions": [DASHBOARD_PERMISSIONS["Super Admin"]],
            "modules": ["*"],
            "allowed_modules": ["*"],
            "dashboard_access": (_rbac_all_dashboard_access(admin) or []),
            "rights": SUPER_ADMIN_RIGHTS,
            "can_read": True,
            "can_write": True,
            "can_edit": True,
            "can_delete": True,
            "is_super_admin": True,
            "is_academic_admin": False,
            "is_hr_admin": False,
            "is_hostel_admin": False,
            "is_library_admin": False,
            "is_accounts_admin": False,
        }

    config = get_admin_config(admin_type)
    stored_permissions = normalize_permissions(admin.permissions)
    stored_modules = normalize_permissions(admin.modules_enabled)
    stored_rights = normalize_rights(admin.access_level)

    if config:
        expected_permission = config["permission"]

        dashboard_permissions = [expected_permission]

        for permission in stored_permissions:
            if (
                permission in DASHBOARD_PERMISSIONS.values()
                and permission not in dashboard_permissions
            ):
                dashboard_permissions.append(permission)

        allowed_modules = [expected_permission]

        for module in stored_modules:
            if (
                module in DASHBOARD_PERMISSIONS.values()
                and module not in allowed_modules
            ):
                allowed_modules.append(module)

        rbac_rights = _rbac_dashboard_rights(admin, config)

        if rbac_rights is not None:
            can_read = rbac_rights["can_view"]
            can_write_flag = rbac_rights["can_write"]
            rights = ["read"] + (["write", "edit", "delete"] if can_write_flag else [])
            # A dashboard the admin has no view access to should not be
            # reported as "assigned" - keeps nav/redirect logic honest.
            if not can_read:
                dashboard_permissions = []
                allowed_modules = []
        else:
            can_read = "read" in stored_rights
            can_write_flag = "write" in stored_rights
            rights = stored_rights

        # BUG FIX: merge in every OTHER dashboard RBAC says this admin
        # can view (e.g. Super Admin additionally granted this Library
        # Admin access to the Hostel Dashboard too). Without this, only
        # the admin's own home dashboard ever showed up here, no matter
        # what extra access was granted in Role & Permission Management.
        rbac_all_access = _rbac_all_dashboard_access(admin)

        dashboard_access_detail = rbac_all_access or []

        for entry in dashboard_access_detail:
            if entry["key"] not in dashboard_permissions:
                dashboard_permissions.append(entry["key"])

            if entry["key"] not in allowed_modules:
                allowed_modules.append(entry["key"])

        return {
            "dashboard_type": config["dashboard_type"],
            "dashboard_route": config["dashboard_route"],
            "dashboard_permissions": dashboard_permissions,
            "permissions": dashboard_permissions,
            "modules": allowed_modules,
            "allowed_modules": allowed_modules,
            "dashboard_access": dashboard_access_detail,
            "rights": rights,
            "can_read": can_read,
            "can_write": can_write_flag,
            "can_edit": can_write_flag,
            "can_delete": can_write_flag,
            "is_super_admin": False,
            "is_academic_admin": (admin_type == "Academic Admin"),
            "is_hr_admin": (admin_type == "HR Admin"),
            "is_hostel_admin": (admin_type == "Hostel Admin"),
            "is_library_admin": (admin_type == "Library Admin"),
            "is_accounts_admin": (admin_type == "Accounts Admin"),
        }

    fallback_permissions = []

    for permission in stored_permissions:
        if (
            permission in DASHBOARD_PERMISSIONS.values()
            and permission not in fallback_permissions
        ):
            fallback_permissions.append(permission)

    for module in stored_modules:
        if (
            module in DASHBOARD_PERMISSIONS.values()
            and module not in fallback_permissions
        ):
            fallback_permissions.append(module)

    return {
        "dashboard_type": "admin-dashboard",
        "dashboard_route": "/admin-dashboard",
        "dashboard_permissions": fallback_permissions,
        "permissions": fallback_permissions,
        "modules": fallback_permissions,
        "allowed_modules": fallback_permissions,
        "dashboard_access": [],
        "rights": stored_rights,
        "can_read": "read" in stored_rights,
        "can_write": "write" in stored_rights,
        "can_edit": "edit" in stored_rights,
        "can_delete": "delete" in stored_rights,
        "is_super_admin": False,
        "is_academic_admin": False,
        "is_hr_admin": False,
        "is_hostel_admin": False,
        "is_library_admin": False,
        "is_accounts_admin": False,
    }


# PERMISSION CHECK HELPERS
def admin_has_right(admin, right):
    """
    Check whether an admin has a given CRUD right.
    """

    if is_super_admin(admin):
        return True

    normalized_right = str(right or "").strip().lower()

    if normalized_right not in AVAILABLE_RIGHTS:
        return False

    return normalized_right in normalize_rights(admin.access_level)


def admin_has_dashboard_permission(admin, permission):
    """
    Check whether an admin can access a dashboard.
    """

    if is_super_admin(admin):
        return True

    normalized_permission = str(permission or "").strip().lower()

    access = resolve_admin_access(admin)

    return normalized_permission in access["dashboard_permissions"]


# PROFILE SERIALIZER
def admin_to_dict(admin):
    access = resolve_admin_access(admin)

    return {
        # Primary
        "id": admin.id,
        "admin_id": admin.admin_id,
        "user_id": admin.user_id,
        # Personal
        "first_name": admin.first_name,
        "middle_name": admin.middle_name,
        "last_name": admin.last_name,
        "profile_image": admin.profile_image,
        "gender": admin.gender,
        "date_of_birth": (
            admin.date_of_birth.isoformat() if admin.date_of_birth else None
        ),
        "blood_group": admin.blood_group,
        # Contact
        "email": admin.email,
        "mobile": admin.mobile,
        "alternate_mobile": admin.alternate_mobile,
        "username": admin.username,
        # Address
        "address": admin.address,
        "city": admin.city,
        "state": admin.state,
        "country": admin.country,
        "pincode": admin.pincode,
        # Role and access
        "role": admin.role,
        "admin_type": admin.admin_type,
        "designation": admin.designation,
        "department": admin.department,
        "permissions": admin.permissions,
        "access_level": admin.access_level,
        "modules_enabled": admin.modules_enabled,
        # Resolved dashboard access
        "dashboard_type": access["dashboard_type"],
        "dashboard_route": access["dashboard_route"],
        "dashboard_permissions": access["dashboard_permissions"],
        "allowed_modules": access["allowed_modules"],
        "modules": access["modules"],
        "dashboard_access": access["dashboard_access"],
        "rights": access["rights"],
        # Resolved rights
        "can_read": access["can_read"],
        "can_write": access["can_write"],
        "can_edit": access["can_edit"],
        "can_delete": access["can_delete"],
        # Admin type flags
        "is_super_admin": access["is_super_admin"],
        "is_academic_admin": access["is_academic_admin"],
        "is_hr_admin": access["is_hr_admin"],
        "is_hostel_admin": access["is_hostel_admin"],
        "is_library_admin": access["is_library_admin"],
        "is_accounts_admin": access["is_accounts_admin"],
        # Professional
        "qualification": admin.qualification,
        "specialization": admin.specialization,
        "experience_years": admin.experience_years,
        # Employment
        "joining_date": (
            admin.joining_date.isoformat() if admin.joining_date else None
        ),
        "employment_type": admin.employment_type,
        "shift": admin.shift,
        "salary": admin.salary,
        # School information
        "school_name": admin.school_name,
        "school_code": admin.school_code,
        "board": admin.board,
        "established_year": admin.established_year,
        # System control
        "users_managed": admin.users_managed,
        "active_sessions": admin.active_sessions,
        # Finance
        "fee_access": admin.fee_access,
        "discount_authority": (admin.discount_authority),
        "revenue_view": admin.revenue_view,
        # Security
        "two_factor_enabled": (admin.two_factor_enabled),
        "login_alerts": admin.login_alerts,
        "last_login": (admin.last_login.isoformat() if admin.last_login else None),
        "last_password_change": (
            admin.last_password_change.isoformat()
            if admin.last_password_change
            else None
        ),
        # Activity
        "logins_30d": admin.logins_30d,
        "actions_count": admin.actions_count,
        "last_action": admin.last_action,
        # Medical
        "medical_condition": admin.medical_condition,
        # Emergency
        "emergency_name": admin.emergency_name,
        "emergency_relation": admin.emergency_relation,
        "emergency_phone": admin.emergency_phone,
        # Status
        "status": admin.status,
        "created_by": admin.created_by,
        "updated_by": admin.updated_by,
        "created_at": (admin.created_at.isoformat() if admin.created_at else None),
        "updated_at": (admin.updated_at.isoformat() if admin.updated_at else None),
    }


# REQUEST HELPERS
def parse_date(date_value):
    """
    Safely parse YYYY-MM-DD values.
    """

    if not date_value:
        return None

    if hasattr(date_value, "year"):
        return date_value

    try:
        return datetime.strptime(
            str(date_value),
            "%Y-%m-%d",
        ).date()

    except (TypeError, ValueError):
        return None


def normalize_admin_access_fields(data, existing_admin=None):
    """
    Normalize permissions and access_level before saving.

    For known admin types:
    - permissions becomes the dashboard permission
    - modules_enabled becomes the dashboard permission
    - access_level contains CRUD rights
    """

    normalized_data = dict(data or {})

    admin_type = str(
        normalized_data.get(
            "admin_type",
            getattr(existing_admin, "admin_type", ""),
        )
        or ""
    ).strip()

    role = (
        str(
            normalized_data.get(
                "role",
                getattr(existing_admin, "role", "admin"),
            )
            or "admin"
        )
        .strip()
        .lower()
    )

    is_super = role == "super_admin" or admin_type == "Super Admin"

    if is_super:
        normalized_data["role"] = "super_admin"
        normalized_data["admin_type"] = "Super Admin"
        normalized_data["permissions"] = DASHBOARD_PERMISSIONS["Super Admin"]
        normalized_data["modules_enabled"] = "*"
        normalized_data["access_level"] = list_to_csv(SUPER_ADMIN_RIGHTS)

        return normalized_data

    config = get_admin_config(admin_type)

    if config:
        normalized_data["role"] = "admin"
        normalized_data["permissions"] = config["permission"]
        normalized_data["modules_enabled"] = config["permission"]

    raw_rights = normalized_data.get(
        "access_level",
        getattr(existing_admin, "access_level", ""),
    )

    rights = normalize_rights(raw_rights)

    if not rights and existing_admin is None:
        rights = DEFAULT_ADMIN_RIGHTS

    normalized_data["access_level"] = list_to_csv(rights)

    return normalized_data


# ADMIN PROFILE
class AdminDetails(MethodView):

    @login_required
    def get(self, id):
        try:
            admin_id = int(id)

            if admin_id <= 0:
                return jsonify({"error": "Invalid admin id"}), 400

            admin = Admin.query.filter_by(
                id=admin_id,
                is_deleted=False,
            ).first()

            if not admin:
                return jsonify({"error": "Admin not found"}), 404

            return jsonify(admin_to_dict(admin)), 200

        except (TypeError, ValueError):
            return jsonify({"error": "Admin id must be integer"}), 400

        except SQLAlchemyError as db_error:
            logger.exception(
                "Database error while loading admin: %s",
                db_error,
            )

            return jsonify({"error": "Database error"}), 500

        except Exception as error:
            logger.exception(
                "Unexpected admin profile error: %s",
                error,
            )

            return jsonify({"error": "Something went wrong"}), 500


# UPDATE ADMIN PROFILE
class UpdateAdminProfile(MethodView):

    @login_required
    def put(self, id):
        try:
            admin_id = int(id)

            if admin_id <= 0:
                return jsonify({"error": "Invalid admin id"}), 400

            admin = Admin.query.filter_by(
                id=admin_id,
                is_deleted=False,
            ).first()

            if not admin:
                return jsonify({"error": "Admin not found"}), 404

            request_data = request.get_json(silent=True)

            if not request_data:
                return jsonify({"error": "Invalid JSON"}), 400

            data = normalize_admin_access_fields(
                request_data,
                existing_admin=admin,
            )

            # UNIQUE FIELD CHECKS
            new_email = data.get("email")
            new_mobile = data.get("mobile")
            new_username = data.get("username")

            duplicate_conditions = []

            if new_email:
                duplicate_conditions.append(Admin.email == new_email)

            if new_mobile:
                duplicate_conditions.append(Admin.mobile == new_mobile)

            if new_username:
                duplicate_conditions.append(Admin.username == new_username)

            existing_admin = None

            if duplicate_conditions:
                existing_admin = Admin.query.filter(
                    Admin.id != admin_id,
                    Admin.is_deleted.is_(False),
                    or_(*duplicate_conditions),
                ).first()

            if existing_admin:
                if new_email and existing_admin.email == new_email:
                    return jsonify({"error": "Email already exists"}), 400

                if new_mobile and existing_admin.mobile == new_mobile:
                    return jsonify({"error": "Mobile already exists"}), 400

                if new_username and existing_admin.username == new_username:
                    return jsonify({"error": "Username already exists"}), 400

            # ALLOWED PROFILE FIELDS
            allowed_fields = [
                # Personal
                "first_name",
                "middle_name",
                "last_name",
                "profile_image",
                "gender",
                "blood_group",
                # Contact
                "email",
                "mobile",
                "alternate_mobile",
                "username",
                # Address
                "address",
                "city",
                "state",
                "country",
                "pincode",
                # Role
                "role",
                "admin_type",
                "designation",
                "department",
                "permissions",
                "access_level",
                # Professional
                "qualification",
                "specialization",
                "experience_years",
                # Employment
                "employment_type",
                "shift",
                "salary",
                # School
                "school_name",
                "school_code",
                "board",
                "established_year",
                # System control
                "users_managed",
                "active_sessions",
                "modules_enabled",
                # Finance
                "fee_access",
                "discount_authority",
                "revenue_view",
                # Security
                "two_factor_enabled",
                "login_alerts",
                # Activity
                "logins_30d",
                "actions_count",
                "last_action",
                # Medical
                "medical_condition",
                # Emergency
                "emergency_name",
                "emergency_relation",
                "emergency_phone",
                # System
                "status",
                "updated_by",
            ]

            for field in allowed_fields:
                if field in data:
                    setattr(
                        admin,
                        field,
                        data.get(field),
                    )

            # DATE FIELDS
            if "date_of_birth" in data:
                parsed_dob = parse_date(data.get("date_of_birth"))

                if data.get("date_of_birth") and parsed_dob is None:
                    return (
                        jsonify(
                            {
                                "error": (
                                    "Invalid date_of_birth format. " "Use YYYY-MM-DD"
                                )
                            }
                        ),
                        400,
                    )

                admin.date_of_birth = parsed_dob

            if "joining_date" in data:
                parsed_joining_date = parse_date(data.get("joining_date"))

                if data.get("joining_date") and parsed_joining_date is None:
                    return (
                        jsonify(
                            {
                                "error": (
                                    "Invalid joining_date format. " "Use YYYY-MM-DD"
                                )
                            }
                        ),
                        400,
                    )

                admin.joining_date = parsed_joining_date

            admin.updated_at = datetime.utcnow()

            db.session.commit()

            return (
                jsonify(
                    {
                        "message": ("Admin profile updated successfully"),
                        "admin": admin_to_dict(admin),
                    }
                ),
                200,
            )

        except (TypeError, ValueError):
            db.session.rollback()

            return jsonify({"error": "Admin id must be integer"}), 400

        except SQLAlchemyError as db_error:
            db.session.rollback()

            logger.exception(
                "Database error while updating admin: %s",
                db_error,
            )

            return jsonify({"error": "Database error"}), 500

        except Exception as error:
            db.session.rollback()

            logger.exception(
                "Unexpected update admin error: %s",
                error,
            )

            return jsonify({"error": "Something went wrong"}), 500


# CHANGE ADMIN PASSWORD
class ChangeAdminPassword(MethodView):

    @login_required
    def put(self, id):
        try:
            admin_id = int(id)

            if admin_id <= 0:
                return jsonify({"error": "Invalid admin id"}), 400

            admin = Admin.query.filter_by(
                id=admin_id,
                is_deleted=False,
            ).first()

            if not admin:
                return jsonify({"error": "Admin not found"}), 404

            data = request.get_json(silent=True)

            if not data:
                return jsonify({"error": "Invalid JSON"}), 400

            current_password = str(data.get("current_password", ""))

            new_password = str(data.get("new_password", ""))

            confirm_password = str(data.get("confirm_password", ""))

            if not all(
                [
                    current_password,
                    new_password,
                    confirm_password,
                ]
            ):
                return jsonify({"error": ("All password fields are required")}), 400

            if new_password != confirm_password:
                return jsonify({"error": "Passwords do not match"}), 400

            if len(new_password) < 8:
                return (
                    jsonify({"error": ("Password must be at least " "8 characters")}),
                    400,
                )

            if current_password == new_password:
                return (
                    jsonify(
                        {
                            "error": (
                                "New password must be different "
                                "from current password"
                            )
                        }
                    ),
                    400,
                )

            stored_password = (admin.password or "").encode("utf-8")

            password_matches = False

            try:
                password_matches = bcrypt.checkpw(
                    current_password.encode("utf-8"),
                    stored_password,
                )

            except (ValueError, TypeError):
                password_matches = False

            if not password_matches:
                return jsonify({"error": ("Current password incorrect")}), 400

            hashed_password = bcrypt.hashpw(
                new_password.encode("utf-8"),
                bcrypt.gensalt(),
            )

            admin.password = hashed_password.decode("utf-8")
            admin.last_password_change = datetime.utcnow()
            admin.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({"message": ("Password updated successfully")}), 200

        except (TypeError, ValueError):
            db.session.rollback()

            return jsonify({"error": "Admin id must be integer"}), 400

        except SQLAlchemyError as db_error:
            db.session.rollback()

            logger.exception(
                "Database error while changing password: %s",
                db_error,
            )

            return jsonify({"error": "Database error"}), 500

        except Exception as error:
            db.session.rollback()

            logger.exception(
                "Unexpected password change error: %s",
                error,
            )

            return jsonify({"error": "Something went wrong"}), 500
