import logging

from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError

from utils.auth import db, Admin, Teacher

try:
    from utils.auth import Staff  # alias for NonTeachingStaff, see utils/auth.py
except ImportError:
    Staff = None

from utils.rolePermissionManagement import permission_required
from utils.tenancy import current_school_id as _current_school_id

logger = logging.getLogger(__name__)


def _full_name(*parts):
    return " ".join(p for p in parts if p) or None


def _teacher_row(teacher):
    return {
        "staff_uid": f"teacher-{teacher.id}",
        "id": teacher.id,
        "record_type": "teacher",
        "category": "Teaching Staff",
        "staff_code": teacher.teacher_id,
        "name": _full_name(
            teacher.first_name, teacher.middle_name, teacher.last_name
        ),
        "first_name": teacher.first_name,
        "last_name": teacher.last_name,
        "email": teacher.email,
        "mobile": teacher.mobile,
        "designation": teacher.designation or "Teacher",
        "department": "Academics",
        "staff_type": None,
        "employment_type": teacher.employment_type,
        "joining_date": (
            teacher.joining_date.isoformat() if teacher.joining_date else None
        ),
        "experience_years": teacher.experience_years,
        "status": teacher.status or "Active",
        "last_login": (
            teacher.last_login.isoformat() if teacher.last_login else None
        ),
    }


def _admin_row(admin):
    return {
        "staff_uid": f"admin-{admin.id}",
        "id": admin.id,
        "record_type": "admin",
        "category": "Admin Staff",
        "staff_code": admin.admin_id,
        "name": _full_name(admin.first_name, admin.middle_name, admin.last_name),
        "first_name": admin.first_name,
        "last_name": admin.last_name,
        "email": admin.email,
        "mobile": admin.mobile,
        "designation": admin.designation or admin.admin_type,
        "department": admin.department or admin.admin_type,
        "staff_type": admin.admin_type,
        "employment_type": admin.employment_type,
        "joining_date": (
            admin.joining_date.isoformat() if admin.joining_date else None
        ),
        "experience_years": admin.experience_years,
        "status": admin.status or "Active",
        "last_login": (
            admin.last_login.isoformat() if admin.last_login else None
        ),
    }


def _staff_row(staff):
    return {
        "staff_uid": f"staff-{staff.id}",
        "id": staff.id,
        "record_type": "staff",
        "category": "Non-Teaching Staff",
        "staff_code": staff.staff_id,
        "name": _full_name(staff.first_name, staff.middle_name, staff.last_name),
        "first_name": staff.first_name,
        "last_name": staff.last_name,
        "email": staff.email,
        "mobile": staff.mobile,
        "designation": staff.designation or staff.staff_type,
        "department": staff.department,
        "staff_type": staff.staff_type,
        "employment_type": staff.employment_type,
        "joining_date": (
            staff.joining_date.isoformat() if staff.joining_date else None
        ),
        "experience_years": staff.experience_years,
        "status": staff.status or "Active",
        "last_login": (
            staff.last_login.isoformat() if staff.last_login else None
        ),
    }


class AdminStaffListAPI(MethodView):
    """
    GET /api/admin/staff

    Query params:
      search   - matches name, staff code, email or mobile across all
                 three tables
      category - "teaching" | "non-teaching" | "admin" | "" (all)
      status   - "Active" | "Inactive" | "Suspended" | "" (all)
    """

    @permission_required("teachers", "view")
    def get(self):
        try:
            search = str(request.args.get("search") or "").strip()
            category = str(request.args.get("category") or "").strip().lower()
            status = str(request.args.get("status") or "").strip()

            rows = []
            school_id = _current_school_id()

            # ---------------- TEACHERS ----------------
            if category in ("", "all", "teaching"):
                query = Teacher.query.filter(Teacher.school_id == school_id)

                if search:
                    like = f"%{search}%"
                    query = query.filter(
                        or_(
                            Teacher.first_name.ilike(like),
                            Teacher.last_name.ilike(like),
                            Teacher.teacher_id.ilike(like),
                            Teacher.email.ilike(like),
                            Teacher.mobile.ilike(like),
                        )
                    )

                if status and status.lower() != "all":
                    query = query.filter(Teacher.status == status)

                rows.extend(_teacher_row(t) for t in query.all())

            # ---------------- NON-TEACHING STAFF ----------------
            if Staff is not None and category in ("", "all", "non-teaching"):
                query = Staff.query.filter(
                    Staff.is_deleted.is_(False), Staff.school_id == school_id
                )

                if search:
                    like = f"%{search}%"
                    query = query.filter(
                        or_(
                            Staff.first_name.ilike(like),
                            Staff.last_name.ilike(like),
                            Staff.staff_id.ilike(like),
                            Staff.email.ilike(like),
                            Staff.mobile.ilike(like),
                        )
                    )

                if status and status.lower() != "all":
                    query = query.filter(Staff.status == status)

                rows.extend(_staff_row(s) for s in query.all())

            # ---------------- ADMINS ----------------
            if category in ("", "all", "admin"):
                query = Admin.query.filter(
                    Admin.is_deleted.is_(False), Admin.school_id == school_id
                )

                if search:
                    like = f"%{search}%"
                    query = query.filter(
                        or_(
                            Admin.first_name.ilike(like),
                            Admin.last_name.ilike(like),
                            Admin.admin_id.ilike(like),
                            Admin.email.ilike(like),
                            Admin.mobile.ilike(like),
                        )
                    )

                if status and status.lower() != "all":
                    query = query.filter(Admin.status == status)

                rows.extend(_admin_row(a) for a in query.all())

            rows.sort(key=lambda r: (r["name"] or "").lower())

            stats = {
                "total": len(rows),
                "teaching": sum(1 for r in rows if r["record_type"] == "teacher"),
                "non_teaching": sum(1 for r in rows if r["record_type"] == "staff"),
                "admin": sum(1 for r in rows if r["record_type"] == "admin"),
                "active": sum(1 for r in rows if r["status"] == "Active"),
                "inactive": sum(1 for r in rows if r["status"] != "Active"),
            }

            return (
                jsonify({"success": True, "staff": rows, "stats": stats}),
                200,
            )

        except SQLAlchemyError as db_err:
            logger.error(f"AdminStaffListAPI db error: {db_err}")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500

        except Exception as e:
            logger.exception(f"AdminStaffListAPI error: {e}")
            return jsonify({"success": False, "error": "Failed to load staff"}), 500
