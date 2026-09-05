from flask import request, jsonify
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime

from utils.auth import db, Student, Teacher, Admin
from utils.auth_middleware import login_required

import logging

logger = logging.getLogger(__name__)


# ================= NOTICE MODEL =================
class Notice(db.Model):
    __tablename__ = "announcements"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)

    category = db.Column(
        db.Enum(
            "Academic",
            "Examination",
            "Holiday",
            "Event",
            "General",
        ),
        default="General",
    )

    priority = db.Column(
        db.Enum("High", "Medium", "Low"),
        default="Medium",
    )

    notice_date = db.Column(
        db.Date,
        nullable=False,
    )

    expiry_date = db.Column(db.Date)
    audience = db.Column(
        db.Enum(
            "All",
            "Students",
            "Teachers",
            "Admins",
            "Staff",
        ),
        default="All",
    )

    academic_class_id = db.Column(db.Integer)

    # ✅ CREATED BY ADMIN / TEACHER
    created_by = db.Column(db.Integer)
    created_role = db.Column(
        db.Enum("admin", "teacher"),
        default="admin",
    )

    is_active = db.Column(
        db.Boolean,
        default=True,
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
    )


# ================= READ MODEL =================
class NoticeRead(db.Model):
    __tablename__ = "announcement_reads"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    notice_id = db.Column(
        db.Integer,
        db.ForeignKey("announcements.id"),
    )

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id"),
    )

    teacher_id = db.Column(
        db.Integer,
        db.ForeignKey("teachers.id"),
    )

    admin_id = db.Column(
        db.Integer,
        db.ForeignKey("admins.id"),
    )

    is_read = db.Column(
        db.Boolean,
        default=True,
    )

    read_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
    )


# ================= HELPERS =================
def serialize_notice(n, is_read=False):

    return {
        "id": n.id,
        "title": n.title,
        "description": n.description,
        # BUGFIX: frontend (adminDashboard.js) reads `item.message` when
        # rendering the combined notification/notice list in the bell
        # dropdown. Notices never had a `message` key, so notice text
        # silently disappeared there. Keep both keys so old and new
        # frontend code paths keep working.
        "message": n.description,
        "category": n.category,
        "priority": n.priority,
        "date": n.notice_date.isoformat(),
        "notice_date": n.notice_date.isoformat(),
        "expiry_date": n.expiry_date.isoformat() if n.expiry_date else None,
        "audience": n.audience,
        "academic_class_id": n.academic_class_id,
        "created_by": n.created_by,
        "created_role": n.created_role,
        "is_active": bool(n.is_active),
        "created_at": n.created_at.isoformat() if n.created_at else None,
        "is_read": is_read,
    }


def validate_notice_data(data):

    required_fields = [
        "title",
        "description",
        "notice_date",
    ]

    for field in required_fields:

        if not data.get(field):
            return f"{field} is required"

    return None


# ================= CREATE NOTICE =================
class CreateNoticeAPI(MethodView):

    @login_required
    def post(self):

        try:

            data = request.get_json()

            error = validate_notice_data(data)

            if error:
                return jsonify({"error": error}), 400

            user = request.user

            # ✅ detect creator role
            role_name = user.__class__.__name__

            # 🐛 BUGFIX: previously any logged-in user (including Students)
            # could hit this endpoint and create a notice — it only ever
            # *labeled* the creator, it never actually checked who was
            # allowed to create one. Only Admins/Teachers may publish
            # announcements.
            if role_name not in ("Admin", "Teacher"):
                return (
                    jsonify(
                        {"error": "Only admins or teachers can create announcements"}
                    ),
                    403,
                )

            creator_role = "admin" if role_name == "Admin" else "teacher"

            notice = Notice(
                title=data["title"].strip(),
                description=data["description"].strip(),
                category=data.get(
                    "category",
                    "General",
                ),
                priority=data.get(
                    "priority",
                    "Medium",
                ),
                notice_date=datetime.strptime(
                    data["notice_date"],
                    "%Y-%m-%d",
                ).date(),
                expiry_date=(
                    datetime.strptime(
                        data["expiry_date"],
                        "%Y-%m-%d",
                    ).date()
                    if data.get("expiry_date")
                    else None
                ),
                audience=data.get(
                    "audience",
                    "All",
                ),
                academic_class_id=data.get("academic_class_id"),
                created_by=user.id,
                created_role=creator_role,
            )

            db.session.add(notice)

            db.session.commit()

            return (
                jsonify(
                    {
                        "message": "Notice created successfully",
                        "notice_id": notice.id,
                    }
                ),
                201,
            )

        except ValueError:

            return (
                jsonify({"error": "Invalid date format (YYYY-MM-DD required)"}),
                400,
            )

        except SQLAlchemyError as e:

            db.session.rollback()

            logger.exception(e)

            return (
                jsonify({"error": "Database error"}),
                500,
            )

        except Exception as e:

            db.session.rollback()

            logger.exception(e)

            return (
                jsonify({"error": "Failed to create notice"}),
                500,
            )


# ================= STUDENT NOTICES =================
class StudentNoticeAPI(MethodView):

    @login_required
    def get(self, student_id):

        try:

            page = int(request.args.get("page", 1))

            limit = int(request.args.get("limit", 10))

            query = Notice.query.filter(
                Notice.is_active == True,
                Notice.audience.in_(["All", "Students"]),
            ).order_by(Notice.notice_date.desc())

            pagination = query.paginate(
                page=page,
                per_page=limit,
                error_out=False,
            )

            announcements = pagination.items

            read_ids = {
                r.notice_id
                for r in NoticeRead.query.filter_by(student_id=student_id).all()
            }

            result = [
                serialize_notice(
                    n,
                    n.id in read_ids,
                )
                for n in announcements
            ]

            return (
                jsonify(
                    {
                        "data": result,
                        "pagination": {
                            "page": page,
                            "limit": limit,
                            "total": pagination.total,
                            "pages": pagination.pages,
                        },
                    }
                ),
                200,
            )

        except Exception as e:

            logger.exception(e)

            return (
                jsonify({"error": "Failed to fetch announcements"}),
                500,
            )


# ================= TEACHER NOTICES =================
class TeacherNoticeAPI(MethodView):

    @login_required
    def get(self, teacher_id):

        try:

            page = int(request.args.get("page", 1))

            limit = int(request.args.get("limit", 10))

            query = Notice.query.filter(
                Notice.is_active == True,
                Notice.audience.in_(["All", "Teachers"]),
            ).order_by(Notice.notice_date.desc())

            pagination = query.paginate(
                page=page,
                per_page=limit,
                error_out=False,
            )

            announcements = pagination.items

            read_ids = {
                r.notice_id
                for r in NoticeRead.query.filter_by(teacher_id=teacher_id).all()
            }

            result = [
                serialize_notice(
                    n,
                    n.id in read_ids,
                )
                for n in announcements
            ]

            return (
                jsonify(
                    {
                        "data": result,
                        "pagination": {
                            "page": page,
                            "limit": limit,
                            "total": pagination.total,
                            "pages": pagination.pages,
                        },
                    }
                ),
                200,
            )

        except Exception as e:

            logger.exception(e)

            return (
                jsonify({"error": "Failed to fetch announcements"}),
                500,
            )


# ================= ADMIN NOTICES =================
class AdminNoticeAPI(MethodView):

    @login_required
    def get(self, admin_id):

        try:

            page = int(request.args.get("page", 1))

            limit = int(request.args.get("limit", 10))

            query = Notice.query.filter(
                Notice.is_active == True,
                Notice.audience.in_(["All", "Admins"]),
            ).order_by(Notice.notice_date.desc())

            pagination = query.paginate(
                page=page,
                per_page=limit,
                error_out=False,
            )

            announcements = pagination.items

            read_ids = {
                r.notice_id for r in NoticeRead.query.filter_by(admin_id=admin_id).all()
            }

            result = [
                serialize_notice(
                    n,
                    n.id in read_ids,
                )
                for n in announcements
            ]

            return (
                jsonify(
                    {
                        "data": result,
                        "pagination": {
                            "page": page,
                            "limit": limit,
                            "total": pagination.total,
                            "pages": pagination.pages,
                        },
                    }
                ),
                200,
            )

        except Exception as e:

            logger.exception(e)

            return (
                jsonify({"error": "Failed to fetch announcements"}),
                500,
            )


# ================= MARK NOTICE READ =================
class MarkNoticeReadAPI(MethodView):

    @login_required
    def post(self, notice_id, user_id):

        try:

            user = request.user

            # ================= STUDENT =================
            if user.__class__.__name__ == "Student":

                existing = NoticeRead.query.filter_by(
                    notice_id=notice_id,
                    student_id=user_id,
                ).first()

                if existing:
                    return jsonify({"message": "Already marked"}), 200

                read_entry = NoticeRead(
                    notice_id=notice_id,
                    student_id=user_id,
                )

            # ================= TEACHER =================
            elif user.__class__.__name__ == "Teacher":

                existing = NoticeRead.query.filter_by(
                    notice_id=notice_id,
                    teacher_id=user_id,
                ).first()

                if existing:
                    return jsonify({"message": "Already marked"}), 200

                read_entry = NoticeRead(
                    notice_id=notice_id,
                    teacher_id=user_id,
                )

            # ================= ADMIN =================
            else:

                existing = NoticeRead.query.filter_by(
                    notice_id=notice_id,
                    admin_id=user_id,
                ).first()

                if existing:
                    return jsonify({"message": "Already marked"}), 200

                read_entry = NoticeRead(
                    notice_id=notice_id,
                    admin_id=user_id,
                )

            db.session.add(read_entry)

            db.session.commit()

            return (
                jsonify({"message": "Marked as read"}),
                201,
            )

        except Exception as e:

            db.session.rollback()

            logger.exception(e)

            return (
                jsonify({"error": "Failed"}),
                500,
            )


# ================= UPDATE NOTICE =================
# Was previously missing entirely — the Announcements UI had no way to
# edit a published notice (fix a typo, change priority, extend expiry).
class UpdateNoticeAPI(MethodView):

    @login_required
    def put(self, notice_id):

        try:
            user = request.user

            if user.__class__.__name__ not in ("Admin", "Teacher"):
                return (
                    jsonify(
                        {"error": "Only admins or teachers can edit announcements"}
                    ),
                    403,
                )

            notice = db.session.get(Notice, notice_id)

            if not notice:
                return jsonify({"error": "Notice not found"}), 404

            # Teachers may only edit notices they created themselves.
            if user.__class__.__name__ == "Teacher" and notice.created_by != user.id:
                return (
                    jsonify({"error": "You can only edit your own announcements"}),
                    403,
                )

            data = request.get_json() or {}

            error = validate_notice_data(
                {**serialize_notice(notice), **data}
            )

            if error:
                return jsonify({"error": error}), 400

            if "title" in data:
                notice.title = data["title"].strip()

            if "description" in data:
                notice.description = data["description"].strip()

            if "category" in data:
                notice.category = data["category"]

            if "priority" in data:
                notice.priority = data["priority"]

            if "audience" in data:
                notice.audience = data["audience"]

            if "academic_class_id" in data:
                notice.academic_class_id = data["academic_class_id"]

            if data.get("notice_date"):
                notice.notice_date = datetime.strptime(
                    data["notice_date"], "%Y-%m-%d"
                ).date()

            if "expiry_date" in data:
                notice.expiry_date = (
                    datetime.strptime(data["expiry_date"], "%Y-%m-%d").date()
                    if data.get("expiry_date")
                    else None
                )

            if "is_active" in data:
                notice.is_active = bool(data["is_active"])

            db.session.commit()

            return (
                jsonify(
                    {
                        "message": "Notice updated successfully",
                        "notice": serialize_notice(notice),
                    }
                ),
                200,
            )

        except ValueError:
            return (
                jsonify({"error": "Invalid date format (YYYY-MM-DD required)"}),
                400,
            )

        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"error": "Database error"}), 500

        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"error": "Failed to update notice"}), 500


# ================= DELETE / DEACTIVATE NOTICE =================
# Soft-delete only: sets is_active=False rather than removing the row,
# so existing NoticeRead history isn't orphaned and the notice simply
# stops appearing in Student/Teacher/Admin feeds.
class DeleteNoticeAPI(MethodView):

    @login_required
    def delete(self, notice_id):

        try:
            user = request.user

            if user.__class__.__name__ not in ("Admin", "Teacher"):
                return (
                    jsonify(
                        {"error": "Only admins or teachers can remove announcements"}
                    ),
                    403,
                )

            notice = db.session.get(Notice, notice_id)

            if not notice:
                return jsonify({"error": "Notice not found"}), 404

            if user.__class__.__name__ == "Teacher" and notice.created_by != user.id:
                return (
                    jsonify({"error": "You can only remove your own announcements"}),
                    403,
                )

            notice.is_active = False

            db.session.commit()

            return jsonify({"message": "Notice removed successfully"}), 200

        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"error": "Database error"}), 500

        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"error": "Failed to remove notice"}), 500
