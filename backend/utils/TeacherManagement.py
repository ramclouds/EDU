import logging
from datetime import datetime
from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError

from utils.auth import db, bcrypt, Teacher
from utils.auth_middleware import login_required
from utils.rolePermissionManagement import permission_required
from utils.teacherDetails import TeacherClass
from utils.studentDetails import AcademicClass, Batch, Division, Section
from utils.subjects import Subject
from utils.tenancy import current_school_id as _current_school_id

logger = logging.getLogger(__name__)


def parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except Exception:
        return None


def next_teacher_id():
    last = Teacher.query.order_by(Teacher.id.desc()).first()
    if not last or not last.teacher_id:
        return "TCH1001"
    try:
        return f"TCH{int(last.teacher_id.replace('TCH', '')) + 1}"
    except Exception:
        return f"TCH{int(datetime.utcnow().timestamp())}"


def teacher_name(t):
    return " ".join(filter(None, [t.first_name, t.middle_name, t.last_name]))


def serialize_assignment(row):
    academic = AcademicClass.query.get(row.academic_class_id)
    subject = Subject.query.get(row.subject_id)

    batch = Batch.query.get(academic.batch_id) if academic else None
    division = Division.query.get(academic.division_id) if academic else None
    section = Section.query.get(academic.section_id) if academic else None

    return {
        "id": row.id,
        "academic_class_id": row.academic_class_id,
        "subject_id": row.subject_id,
        "batch_name": batch.batch_name if batch else None,
        "division_name": division.division_name if division else None,
        "section_name": section.section_name if section else None,
        "class_name": (
            f"{division.division_name}-{section.section_name}"
            if division and section
            else None
        ),
        "subject_name": subject.subject_name if subject else None,
    }


def serialize_teacher(t, include_assignments=True):
    data = {
        "id": t.id,
        "teacher_id": t.teacher_id,
        "user_id": t.user_id,
        "first_name": t.first_name,
        "middle_name": t.middle_name,
        "last_name": t.last_name,
        "full_name": teacher_name(t),
        "email": t.email,
        "mobile": t.mobile,
        "username": t.username,
        "gender": t.gender,
        "date_of_birth": t.date_of_birth.isoformat() if t.date_of_birth else None,
        "blood_group": t.blood_group,
        "address": t.address,
        "city": t.city,
        "state": t.state,
        "pincode": t.pincode,
        "designation": t.designation,
        "degree": t.degree,
        "university": t.university,
        "experience_years": t.experience_years,
        "specialization": t.specialization,
        "joining_date": t.joining_date.isoformat() if t.joining_date else None,
        "employment_type": t.employment_type,
        "shift": t.shift,
        "medical_condition": t.medical_condition,
        "emergency_name": t.emergency_name,
        "emergency_relation": t.emergency_relation,
        "emergency_phone": t.emergency_phone,
        "role": t.role,
        "status": t.status,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }

    if include_assignments:
        rows = TeacherClass.query.filter_by(teacher_id=t.id).all()
        data["assignments"] = [serialize_assignment(r) for r in rows]

    return data


def replace_teacher_assignments(teacher_id, assignments, school_id):
    TeacherClass.query.filter_by(teacher_id=teacher_id).delete()

    for item in assignments or []:
        academic_class_id = item.get("academic_class_id")
        subject_id = item.get("subject_id")

        if not academic_class_id or not subject_id:
            continue

        if not AcademicClass.query.filter_by(
            id=academic_class_id, school_id=school_id
        ).first():
            raise ValueError(f"Invalid academic_class_id: {academic_class_id}")

        if not Subject.query.filter_by(id=subject_id, school_id=school_id).first():
            raise ValueError(f"Invalid subject_id: {subject_id}")

        db.session.add(
            TeacherClass(
                teacher_id=teacher_id,
                academic_class_id=academic_class_id,
                subject_id=subject_id,
            )
        )


class AdminTeacherOptionsAPI(MethodView):
    @permission_required("academic", "view")
    def get(self):
        try:
            school_id = _current_school_id()
            academic_classes = []
            for ac in AcademicClass.query.filter_by(school_id=school_id).all():
                batch = Batch.query.get(ac.batch_id)
                division = Division.query.get(ac.division_id)
                section = Section.query.get(ac.section_id)

                academic_classes.append(
                    {
                        "id": ac.id,
                        "batch_id": ac.batch_id,
                        "division_id": ac.division_id,
                        "section_id": ac.section_id,
                        "batch_name": batch.batch_name if batch else None,
                        "division_name": division.division_name if division else None,
                        "section_name": section.section_name if section else None,
                        "display_name": (
                            f"{division.division_name}-{section.section_name}"
                            if division and section
                            else f"Class {ac.id}"
                        ),
                    }
                )

            return (
                jsonify(
                    {
                        "academic_classes": academic_classes,
                        "subjects": [
                            {"id": s.id, "subject_name": s.subject_name}
                            for s in Subject.query.filter_by(school_id=school_id)
                            .order_by(Subject.subject_name.asc())
                            .all()
                        ],
                        "batches": [
                            {"id": b.id, "batch_name": b.batch_name}
                            for b in Batch.query.filter_by(school_id=school_id)
                            .order_by(Batch.batch_name.asc())
                            .all()
                        ],
                        "divisions": [
                            {"id": d.id, "division_name": d.division_name}
                            for d in Division.query.filter_by(school_id=school_id)
                            .order_by(Division.division_name.asc())
                            .all()
                        ],
                        "sections": [
                            {"id": s.id, "section_name": s.section_name}
                            for s in Section.query.filter_by(school_id=school_id)
                            .order_by(Section.section_name.asc())
                            .all()
                        ],
                    }
                ),
                200,
            )

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to load teacher options"}), 500


class AdminTeachersAPI(MethodView):
    @permission_required("academic", "view")
    def get(self):
        try:
            q = request.args.get("q", "").strip()
            status = request.args.get("status", "").strip()
            school_id = _current_school_id()

            query = Teacher.query.filter(Teacher.school_id == school_id)

            if q:
                like = f"%{q}%"
                query = query.filter(
                    or_(
                        Teacher.first_name.ilike(like),
                        Teacher.middle_name.ilike(like),
                        Teacher.last_name.ilike(like),
                        Teacher.email.ilike(like),
                        Teacher.mobile.ilike(like),
                        Teacher.teacher_id.ilike(like),
                        Teacher.username.ilike(like),
                    )
                )

            if status:
                query = query.filter(Teacher.status == status)

            teachers = query.order_by(Teacher.id.desc()).all()

            return (
                jsonify(
                    {
                        "teachers": [serialize_teacher(t) for t in teachers],
                        "total": len(teachers),
                        "stats": {
                            "total": Teacher.query.filter(
                                Teacher.school_id == school_id
                            ).count(),
                            "active": Teacher.query.filter(
                                Teacher.school_id == school_id,
                                Teacher.status == "Active",
                            ).count(),
                            "inactive": Teacher.query.filter(
                                Teacher.school_id == school_id,
                                Teacher.status != "Active",
                            ).count(),
                        },
                    }
                ),
                200,
            )

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to load teachers"}), 500

    @permission_required("academic", "create")
    def post(self):
        try:
            data = request.get_json() or {}

            if not data.get("first_name") or not data.get("last_name"):
                return jsonify({"error": "First name and last name required"}), 400

            if not data.get("email"):
                return jsonify({"error": "Email required"}), 400

            if Teacher.query.filter_by(email=data["email"]).first():
                return jsonify({"error": "Email already exists"}), 400

            if (
                data.get("mobile")
                and Teacher.query.filter_by(mobile=data["mobile"]).first()
            ):
                return jsonify({"error": "Mobile already exists"}), 400

            teacher_id = data.get("teacher_id") or next_teacher_id()
            username = data.get("username") or teacher_id.lower()
            password = data.get("password") or "Teacher@123"
            school_id = _current_school_id()

            if Teacher.query.filter_by(username=username).first():
                return jsonify({"error": "Username already exists"}), 400

            teacher = Teacher(
                teacher_id=teacher_id,
                user_id=int(datetime.utcnow().timestamp()),
                school_id=school_id,
                first_name=data.get("first_name"),
                middle_name=data.get("middle_name"),
                last_name=data.get("last_name"),
                email=data.get("email"),
                mobile=data.get("mobile"),
                username=username,
                gender=data.get("gender"),
                date_of_birth=parse_date(data.get("date_of_birth")),
                blood_group=data.get("blood_group"),
                address=data.get("address"),
                city=data.get("city"),
                state=data.get("state"),
                pincode=data.get("pincode"),
                designation=data.get("designation"),
                degree=data.get("degree"),
                university=data.get("university"),
                experience_years=data.get("experience_years") or 0,
                specialization=data.get("specialization"),
                joining_date=parse_date(data.get("joining_date")),
                employment_type=data.get("employment_type"),
                shift=data.get("shift"),
                medical_condition=data.get("medical_condition"),
                emergency_name=data.get("emergency_name"),
                emergency_relation=data.get("emergency_relation"),
                emergency_phone=data.get("emergency_phone"),
                role="teacher",
                status=data.get("status") or "Active",
                password=bcrypt.generate_password_hash(password).decode("utf-8"),
                created_at=datetime.utcnow(),
            )

            db.session.add(teacher)
            db.session.flush()

            replace_teacher_assignments(
                teacher.id, data.get("assignments", []), school_id
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "message": "Teacher created successfully",
                        "teacher": serialize_teacher(teacher),
                        "default_password": (
                            password if not data.get("password") else None
                        ),
                    }
                ),
                201,
            )

        except ValueError as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 400

        except SQLAlchemyError as e:
            logger.exception(e)
            db.session.rollback()
            return jsonify({"error": "Database error"}), 500

        except Exception as e:
            logger.exception(e)
            db.session.rollback()
            return jsonify({"error": "Failed to create teacher"}), 500


class AdminTeacherDetailAPI(MethodView):
    @permission_required("academic", "view")
    def get(self, teacher_id):
        teacher = Teacher.query.filter_by(
            id=teacher_id, school_id=_current_school_id()
        ).first()
        if not teacher:
            return jsonify({"error": "Teacher not found"}), 404
        return jsonify({"teacher": serialize_teacher(teacher)}), 200

    @permission_required("academic", "edit")
    def put(self, teacher_id):
        try:
            school_id = _current_school_id()
            teacher = Teacher.query.filter_by(
                id=teacher_id, school_id=school_id
            ).first()
            if not teacher:
                return jsonify({"error": "Teacher not found"}), 404

            data = request.get_json() or {}

            new_email = data.get("email")
            new_mobile = data.get("mobile")
            new_username = data.get("username")

            if new_email:
                exists = Teacher.query.filter(
                    Teacher.id != teacher_id, Teacher.email == new_email
                ).first()
                if exists:
                    return jsonify({"error": "Email already exists"}), 400

            if new_mobile:
                exists = Teacher.query.filter(
                    Teacher.id != teacher_id, Teacher.mobile == new_mobile
                ).first()
                if exists:
                    return jsonify({"error": "Mobile already exists"}), 400

            if new_username:
                exists = Teacher.query.filter(
                    Teacher.id != teacher_id, Teacher.username == new_username
                ).first()
                if exists:
                    return jsonify({"error": "Username already exists"}), 400

            for field in [
                "first_name",
                "middle_name",
                "last_name",
                "email",
                "mobile",
                "username",
                "gender",
                "blood_group",
                "address",
                "city",
                "state",
                "pincode",
                "designation",
                "degree",
                "university",
                "experience_years",
                "specialization",
                "employment_type",
                "shift",
                "medical_condition",
                "emergency_name",
                "emergency_relation",
                "emergency_phone",
                "status",
            ]:
                if field in data:
                    setattr(teacher, field, data.get(field))

            if "date_of_birth" in data:
                teacher.date_of_birth = parse_date(data.get("date_of_birth"))

            if "joining_date" in data:
                teacher.joining_date = parse_date(data.get("joining_date"))

            if "password" in data and data.get("password"):
                teacher.password = bcrypt.generate_password_hash(
                    data["password"]
                ).decode("utf-8")

            if "assignments" in data:
                replace_teacher_assignments(
                    teacher.id, data.get("assignments", []), school_id
                )

            db.session.commit()

            return (
                jsonify(
                    {
                        "message": "Teacher updated successfully",
                        "teacher": serialize_teacher(teacher),
                    }
                ),
                200,
            )

        except ValueError as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 400

        except SQLAlchemyError as e:
            logger.exception(e)
            db.session.rollback()
            return jsonify({"error": "Database error"}), 500

        except Exception as e:
            logger.exception(e)
            db.session.rollback()
            return jsonify({"error": "Failed to update teacher"}), 500

    @permission_required("academic", "delete")
    def delete(self, teacher_id):
        try:
            teacher = Teacher.query.filter_by(
                id=teacher_id, school_id=_current_school_id()
            ).first()
            if not teacher:
                return jsonify({"error": "Teacher not found"}), 404

            TeacherClass.query.filter_by(teacher_id=teacher_id).delete()
            db.session.delete(teacher)
            db.session.commit()

            return jsonify({"message": "Teacher deleted successfully"}), 200

        except Exception as e:
            logger.exception(e)
            db.session.rollback()
            return jsonify({"error": "Failed to delete teacher"}), 500


class AdminTeacherAssignmentsAPI(MethodView):
    @permission_required("academic", "edit")
    def put(self, teacher_id):
        try:
            school_id = _current_school_id()
            teacher = Teacher.query.filter_by(
                id=teacher_id, school_id=school_id
            ).first()
            if not teacher:
                return jsonify({"error": "Teacher not found"}), 404

            data = request.get_json() or {}
            replace_teacher_assignments(
                teacher_id, data.get("assignments", []), school_id
            )
            db.session.commit()

            return (
                jsonify(
                    {
                        "message": "Teacher assignments updated successfully",
                        "teacher": serialize_teacher(teacher),
                    }
                ),
                200,
            )

        except ValueError as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 400

        except Exception as e:
            logger.exception(e)
            db.session.rollback()
            return jsonify({"error": "Failed to update assignments"}), 500


class AdminTeacherPasswordAPI(MethodView):
    @permission_required("academic", "edit")
    def put(self, teacher_id):
        try:
            teacher = Teacher.query.filter_by(
                id=teacher_id, school_id=_current_school_id()
            ).first()
            if not teacher:
                return jsonify({"error": "Teacher not found"}), 404

            data = request.get_json() or {}
            password = data.get("password")

            if not password or len(password) < 6:
                return jsonify({"error": "Password must be at least 6 characters"}), 400

            teacher.password = bcrypt.generate_password_hash(password).decode("utf-8")
            db.session.commit()

            return jsonify({"message": "Teacher password reset successfully"}), 200

        except Exception as e:
            logger.exception(e)
            db.session.rollback()
            return jsonify({"error": "Failed to reset password"}), 500


class AdminTeacherStatusAPI(MethodView):
    @permission_required("academic", "edit")
    def put(self, teacher_id):
        try:
            teacher = Teacher.query.filter_by(
                id=teacher_id, school_id=_current_school_id()
            ).first()
            if not teacher:
                return jsonify({"error": "Teacher not found"}), 404

            data = request.get_json() or {}
            status = data.get("status")

            if status not in ["Active", "Inactive", "Suspended"]:
                return jsonify({"error": "Invalid status"}), 400

            teacher.status = status
            db.session.commit()

            return (
                jsonify(
                    {
                        "message": "Teacher status updated successfully",
                        "teacher": serialize_teacher(teacher),
                    }
                ),
                200,
            )

        except Exception as e:
            logger.exception(e)
            db.session.rollback()
            return jsonify({"error": "Failed to update status"}), 500
