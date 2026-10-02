from flask import request, jsonify
from flask.views import MethodView
from sqlalchemy import or_, func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from utils.auth import db
from utils.rolePermissionManagement import permission_required


def _current_school_id():
    return getattr(getattr(request, "user", None), "school_id", None)


class Subject(db.Model):
    __tablename__ = "subjects"

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )
    subject_code = db.Column(db.String(20))
    subject_name = db.Column(db.String(100), nullable=False)
    subject_type = db.Column(db.String(20), nullable=False, server_default="Core")
    status = db.Column(db.String(20), nullable=False, server_default="Active")
    created_at = db.Column(db.DateTime, server_default=func.now())

    __table_args__ = (
        db.UniqueConstraint(
            "school_id", "subject_code", name="uq_school_subject_code"
        ),
        db.UniqueConstraint(
            "school_id", "subject_name", name="uq_school_subject_name"
        ),
    )


def subject_to_dict(subject):
    return {
        "id": subject.id,
        "subject_code": subject.subject_code,
        "subject_name": subject.subject_name,
        "subject_type": getattr(subject, "subject_type", "Core"),
        "status": getattr(subject, "status", "Active"),
        "created_at": subject.created_at.isoformat() if subject.created_at else None,
    }


def clean_text(value):
    return str(value or "").strip()


class AdminSubjectsAPI(MethodView):
    @permission_required("academic", "view")
    def get(self):
        try:
            search = clean_text(request.args.get("search"))
            subject_type = clean_text(request.args.get("type"))
            status = clean_text(request.args.get("status"))

            query = Subject.query.filter(Subject.school_id == _current_school_id())

            if search:
                like = f"%{search}%"
                query = query.filter(
                    or_(
                        Subject.subject_name.ilike(like),
                        Subject.subject_code.ilike(like),
                    )
                )

            if (
                subject_type
                and subject_type.lower() != "all"
                and hasattr(Subject, "subject_type")
            ):
                query = query.filter(Subject.subject_type == subject_type)

            if status and status.lower() != "all" and hasattr(Subject, "status"):
                query = query.filter(Subject.status == status)

            subjects = query.order_by(Subject.subject_name.asc()).all()

            total = Subject.query.filter(
                Subject.school_id == _current_school_id()
            ).count()
            active = (
                Subject.query.filter(
                    Subject.school_id == _current_school_id(),
                    Subject.status == "Active",
                ).count()
                if hasattr(Subject, "status")
                else total
            )
            inactive = (
                Subject.query.filter(
                    Subject.school_id == _current_school_id(),
                    Subject.status == "Inactive",
                ).count()
                if hasattr(Subject, "status")
                else 0
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "subjects": [subject_to_dict(s) for s in subjects],
                        "stats": {
                            "total": total,
                            "active": active,
                            "inactive": inactive,
                        },
                    }
                ),
                200,
            )

        except Exception as e:
            return jsonify({"success": False, "error": "Internal server error"}), 500

    @permission_required("academic", "create")
    def post(self):
        try:
            data = request.get_json(silent=True) or {}

            subject_name = clean_text(data.get("subject_name"))
            subject_code = clean_text(data.get("subject_code")).upper()

            if not subject_name:
                return (
                    jsonify({"success": False, "error": "Subject name is required"}),
                    400,
                )

            if not subject_code:
                return (
                    jsonify({"success": False, "error": "Subject code is required"}),
                    400,
                )

            duplicate = Subject.query.filter(
                Subject.school_id == _current_school_id(),
                or_(
                    func.lower(Subject.subject_name) == subject_name.lower(),
                    func.lower(Subject.subject_code) == subject_code.lower(),
                ),
            ).first()

            if duplicate:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Subject name or code already exists",
                        }
                    ),
                    409,
                )

            subject = Subject(
                subject_name=subject_name,
                subject_code=subject_code,
                school_id=_current_school_id(),
            )

            if hasattr(Subject, "subject_type"):
                subject.subject_type = clean_text(data.get("subject_type")) or "Core"

            if hasattr(Subject, "status"):
                subject.status = clean_text(data.get("status")) or "Active"

            db.session.add(subject)
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Subject created successfully",
                        "subject": subject_to_dict(subject),
                    }
                ),
                201,
            )

        except IntegrityError:
            db.session.rollback()
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Subject name or code already exists",
                    }
                ),
                409,
            )

        except SQLAlchemyError:
            db.session.rollback()
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Database error while creating subject",
                    }
                ),
                500,
            )

        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "error": "Internal server error"}), 500


class AdminSubjectDetailAPI(MethodView):
    @permission_required("academic", "view")
    def get(self, subject_id):
        subject = Subject.query.filter_by(
            id=subject_id, school_id=_current_school_id()
        ).first()

        if not subject:
            return jsonify({"success": False, "error": "Subject not found"}), 404

        return (
            jsonify(
                {
                    "success": True,
                    "subject": subject_to_dict(subject),
                }
            ),
            200,
        )

    @permission_required("academic", "edit")
    def put(self, subject_id):
        try:
            school_id = _current_school_id()
            subject = Subject.query.filter_by(
                id=subject_id, school_id=school_id
            ).first()

            if not subject:
                return jsonify({"success": False, "error": "Subject not found"}), 404

            data = request.get_json(silent=True) or {}

            subject_name = clean_text(data.get("subject_name"))
            subject_code = clean_text(data.get("subject_code")).upper()

            if not subject_name:
                return (
                    jsonify({"success": False, "error": "Subject name is required"}),
                    400,
                )

            if not subject_code:
                return (
                    jsonify({"success": False, "error": "Subject code is required"}),
                    400,
                )

            duplicate = Subject.query.filter(
                Subject.school_id == school_id,
                Subject.id != subject_id,
                or_(
                    func.lower(Subject.subject_name) == subject_name.lower(),
                    func.lower(Subject.subject_code) == subject_code.lower(),
                ),
            ).first()

            if duplicate:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Subject name or code already exists",
                        }
                    ),
                    409,
                )

            subject.subject_name = subject_name
            subject.subject_code = subject_code

            if hasattr(Subject, "subject_type"):
                subject.subject_type = clean_text(data.get("subject_type")) or "Core"

            if hasattr(Subject, "status"):
                subject.status = clean_text(data.get("status")) or "Active"

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Subject updated successfully",
                        "subject": subject_to_dict(subject),
                    }
                ),
                200,
            )

        except IntegrityError:
            db.session.rollback()
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Subject name or code already exists",
                    }
                ),
                409,
            )

        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "error": "Internal server error"}), 500

    @permission_required("academic", "delete")
    def delete(self, subject_id):
        try:
            subject = Subject.query.filter_by(
                id=subject_id, school_id=_current_school_id()
            ).first()

            if not subject:
                return jsonify({"success": False, "error": "Subject not found"}), 404

            db.session.delete(subject)
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Subject deleted successfully",
                    }
                ),
                200,
            )

        except IntegrityError:
            db.session.rollback()
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "This subject is already used in timetable/results. Delete related records first or use inactive status.",
                    }
                ),
                409,
            )

        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "error": "Internal server error"}), 500
