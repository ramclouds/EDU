from flask import request, jsonify
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
from utils.auth import db, Student
from utils.auth_middleware import login_required
import logging

logger = logging.getLogger(__name__)


# NOTICE MODEL
class Notice(db.Model):
    __tablename__ = "announcements"

    id = db.Column(db.Integer, primary_key=True)

    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)

    category = db.Column(
        db.Enum("Academic", "Examination", "Holiday", "Event", "General"),
        default="General",
    )

    priority = db.Column(db.Enum("High", "Medium", "Low"), default="Medium")

    notice_date = db.Column(db.Date, nullable=False)
    expiry_date = db.Column(db.Date)

    audience = db.Column(db.Enum("All", "Students", "Teachers", "Staff"), default="All")

    academic_class_id = db.Column(db.Integer)

    created_by = db.Column(db.Integer, db.ForeignKey("students.id"))
    is_active = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class NoticeRead(db.Model):
    __tablename__ = "announcement_reads"

    id = db.Column(db.Integer, primary_key=True)
    notice_id = db.Column(db.Integer, db.ForeignKey("announcements.id"))
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"))
    teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id"))  # ✅ ADD THIS
    is_read = db.Column(db.Boolean, default=True)
    read_at = db.Column(db.DateTime, default=datetime.utcnow)


# HELPERS
def serialize_notice(n, is_read=False):
    return {
        "id": n.id,
        "title": n.title,
        "description": n.description,
        "category": n.category,
        "priority": n.priority,
        "date": n.notice_date.isoformat(),
        "is_read": is_read,
    }


def validate_notice_data(data):
    required_fields = ["title", "description", "notice_date"]
    for field in required_fields:
        if not data.get(field):
            return f"{field} is required"
    return None


# CREATE NOTICE (ADMIN/TEACHER)
class CreateNoticeAPI(MethodView):
    @login_required
    def post(self):
        try:
            data = request.get_json()

            # Validation
            error = validate_notice_data(data)
            if error:
                return jsonify({"error": error}), 400

            notice = Notice(
                title=data["title"].strip(),
                description=data["description"].strip(),
                category=data.get("category", "General"),
                priority=data.get("priority", "Medium"),
                notice_date=datetime.strptime(data["notice_date"], "%Y-%m-%d").date(),
                expiry_date=(
                    datetime.strptime(data["expiry_date"], "%Y-%m-%d").date()
                    if data.get("expiry_date")
                    else None
                ),
                audience=data.get("audience", "All"),
                academic_class_id=data.get("academic_class_id"),
                created_by=data.get("created_by"),
            )

            db.session.add(notice)
            db.session.commit()

            return (
                jsonify(
                    {"message": "Notice created successfully", "notice_id": notice.id}
                ),
                201,
            )

        except ValueError:
            return jsonify({"error": "Invalid date format (YYYY-MM-DD required)"}), 400

        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"error": "Database error"}), 500

        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"error": "Failed to create notice"}), 500


# GET STUDENT NOTICES
class StudentNoticeAPI(MethodView):
    @login_required
    def get(self, student_id):
        try:
            today = datetime.utcnow().date()

            # Pagination
            page = int(request.args.get("page", 1))
            limit = int(request.args.get("limit", 10))

            # Filters
            category = request.args.get("category")
            priority = request.args.get("priority")

            query = Notice.query.filter(
                Notice.is_active == True, Notice.audience.in_(["All", "Students"])
            )

            if category:
                query = query.filter(Notice.category == category)

            if priority:
                query = query.filter(Notice.priority == priority)

            query = query.order_by(Notice.notice_date.desc())

            pagination = query.paginate(page=page, per_page=limit, error_out=False)

            announcements = pagination.items

            # Fetch read announcements
            read_ids = {
                r.notice_id
                for r in NoticeRead.query.filter_by(student_id=student_id).all()
            }

            result = [serialize_notice(n, n.id in read_ids) for n in announcements]

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
            return jsonify({"error": "Failed to fetch announcements"}), 500


# ================= GET TEACHER NOTICES =================
class TeacherNoticeAPI(MethodView):
    @login_required
    def get(self, teacher_id):
        try:
            page = int(request.args.get("page", 1))
            limit = int(request.args.get("limit", 10))

            query = Notice.query.filter(
                Notice.is_active == True, Notice.audience.in_(["All", "Teachers"])
            ).order_by(Notice.notice_date.desc())

            pagination = query.paginate(page=page, per_page=limit, error_out=False)
            announcements = pagination.items

            # ✅ FIX: fetch read by teacher_id
            read_ids = {
                r.notice_id
                for r in NoticeRead.query.filter_by(teacher_id=teacher_id).all()
            }

            result = [serialize_notice(n, n.id in read_ids) for n in announcements]

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
            return jsonify({"error": "Failed to fetch announcements"}), 500


# MARK NOTICE AS READ
class MarkNoticeReadAPI(MethodView):
    @login_required
    def post(self, notice_id, user_id):
        try:
            user = request.user

            if hasattr(user, "student_id") or user.__class__.__name__ == "Student":
                existing = NoticeRead.query.filter_by(
                    notice_id=notice_id, student_id=user_id
                ).first()

                if existing:
                    return jsonify({"message": "Already marked"}), 200

                read_entry = NoticeRead(notice_id=notice_id, student_id=user_id)

            else:
                existing = NoticeRead.query.filter_by(
                    notice_id=notice_id, teacher_id=user_id
                ).first()

                if existing:
                    return jsonify({"message": "Already marked"}), 200

                read_entry = NoticeRead(notice_id=notice_id, teacher_id=user_id)

            db.session.add(read_entry)
            db.session.commit()

            return jsonify({"message": "Marked as read"}), 201

        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"error": "Failed"}), 500
