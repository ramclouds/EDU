import logging
from datetime import date, datetime

from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError

from utils.auth import (
    db,
    Student,
    bcrypt,
    generate_student_id,
    generate_user_id,
)
from utils.rolePermissionManagement import permission_required
from utils.studentDetails import (
    AcademicClass,
    Batch,
    Division,
    Section,
    StudentAcademicRecord,
)

logger = logging.getLogger(__name__)


def _current_school_id():
    return getattr(getattr(request, "user", None), "school_id", None)


class StudentEnrollmentOptionsAPI(MethodView):
    """
    Feeds the "Enroll Student" form's Batch/Division/Section/Class
    dropdowns.

    BUG FIX: this used to auto-create a batch plus a hardcoded set of
    divisions ("1st".."10th") and sections ("A".."D") on every single
    GET request - a read request silently writing to the database, and
    worse, injecting made-up grade/section names that could collide
    with whatever the school actually configured via Academic Setup
    (Divisions & Sections / Academic Years). This now only reads
    what's already been configured there. If nothing has been set up
    yet, the frontend shows a clear "set up Academic Setup first"
    prompt instead of silently fabricating data.
    """

    @permission_required("academic", "view")
    def get(self):
        try:
            school_id = _current_school_id()

            batches = Batch.query.filter(Batch.school_id == school_id).order_by(
                Batch.is_current.desc(), Batch.batch_name.desc()
            ).all()
            divisions = Division.query.filter(
                Division.school_id == school_id
            ).order_by(Division.division_name.asc()).all()
            sections = Section.query.filter(
                Section.school_id == school_id
            ).order_by(Section.section_name.asc()).all()

            academic_classes = (
                db.session.query(
                    AcademicClass.id.label("academic_class_id"),
                    AcademicClass.batch_id,
                    AcademicClass.division_id,
                    AcademicClass.section_id,
                    Batch.batch_name,
                    Division.division_name,
                    Section.section_name,
                )
                .join(Batch, Batch.id == AcademicClass.batch_id)
                .join(Division, Division.id == AcademicClass.division_id)
                .join(Section, Section.id == AcademicClass.section_id)
                .filter(AcademicClass.school_id == school_id)
                .order_by(Batch.batch_name.desc(), Division.id.asc(), Section.id.asc())
                .all()
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "batches": [
                            {
                                "id": b.id,
                                "batch_name": b.batch_name,
                                "is_current": bool(b.is_current),
                            }
                            for b in batches
                        ],
                        "divisions": [
                            {"id": d.id, "division_name": d.division_name}
                            for d in divisions
                        ],
                        "sections": [
                            {"id": s.id, "section_name": s.section_name}
                            for s in sections
                        ],
                        "academic_classes": [
                            {
                                "id": row.academic_class_id,
                                "academic_class_id": row.academic_class_id,
                                "batch_id": row.batch_id,
                                "batch_name": row.batch_name,
                                "division_id": row.division_id,
                                "division_name": row.division_name,
                                "section_id": row.section_id,
                                "section_name": row.section_name,
                                "display_name": f"{row.division_name} {row.section_name} ({row.batch_name})",
                            }
                            for row in academic_classes
                        ],
                    }
                ),
                200,
            )

        except Exception as e:
            logger.exception(e)
            return jsonify({"success": False, "error": "Internal server error"}), 500


class StudentEnrollmentPreviewAPI(MethodView):
    @permission_required("academic", "view")
    def get(self):
        try:
            academic_class_id = request.args.get("academic_class_id", type=int)

            next_roll_number = ""

            if academic_class_id:
                # Confirm the class actually belongs to this school before
                # using it for anything — otherwise a crafted request could
                # probe another school's roll-number sequence.
                owned_class = AcademicClass.query.filter_by(
                    id=academic_class_id, school_id=_current_school_id()
                ).first()

                if not owned_class:
                    return (
                        jsonify({"success": False, "error": "Class not found"}),
                        404,
                    )

                last_record = (
                    StudentAcademicRecord.query.filter_by(
                        academic_class_id=academic_class_id,
                        is_current=True,
                    )
                    .order_by(StudentAcademicRecord.roll_number.desc())
                    .first()
                )

                next_roll_number = (
                    (last_record.roll_number or 0) + 1 if last_record else 1
                )

            return (
                jsonify(
                    {
                        "success": True,
                        "student_id": generate_student_id(),
                        "user_id": generate_user_id(),
                        "roll_number": next_roll_number,
                    }
                ),
                200,
            )

        except Exception as e:
            logger.exception(e)
            return jsonify({"success": False, "error": "Internal server error"}), 500


class EnrollStudentAPI(MethodView):
    @permission_required("academic", "create")
    def post(self):
        try:
            data = request.get_json(silent=True)

            if not data:
                return jsonify({"success": False, "error": "Invalid JSON payload"}), 400

            required_fields = [
                "first_name",
                "last_name",
                "mobile",
                "academic_class_id",
                "student_id",
                "user_id",
            ]

            missing = [field for field in required_fields if not data.get(field)]

            if missing:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": f"Missing required fields: {', '.join(missing)}",
                        }
                    ),
                    400,
                )

            school_id = _current_school_id()

            owned_class = AcademicClass.query.filter_by(
                id=data.get("academic_class_id"), school_id=school_id
            ).first()
            if not owned_class:
                return (
                    jsonify({"success": False, "error": "Selected class not found"}),
                    404,
                )

            mobile = str(data["mobile"]).strip()
            email = data.get("email")
            student_code = str(data.get("student_id")).strip()
            user_code = str(data.get("user_id")).strip()

            duplicate = Student.query.filter(
                (Student.mobile == mobile)
                | (Student.email == email if email else False)
                | (Student.student_id == student_code)
                | (Student.user_id == user_code)
            ).first()

            if duplicate:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Student already exists with email/mobile/student ID/user ID",
                        }
                    ),
                    409,
                )

            default_password = data.get("password") or f"{mobile[-4:]}@School"

            hashed_password = bcrypt.generate_password_hash(default_password).decode(
                "utf-8"
            )

            admission_date = data.get("admission_date")
            date_of_birth = data.get("date_of_birth")

            student = Student(
                student_id=student_code,
                user_id=user_code,
                school_id=school_id,
                first_name=data.get("first_name"),
                middle_name=data.get("middle_name"),
                last_name=data.get("last_name"),
                email=email,
                mobile=mobile,
                password=hashed_password,
                role="student",
                gender=data.get("gender"),
                date_of_birth=(
                    datetime.strptime(date_of_birth, "%Y-%m-%d").date()
                    if date_of_birth
                    else None
                ),
                blood_group=data.get("blood_group"),
                address=data.get("address"),
                father_name=data.get("father_name"),
                father_mobile=data.get("father_mobile"),
                father_email=data.get("father_email"),
                mother_name=data.get("mother_name"),
                mother_mobile=data.get("mother_mobile"),
                mother_email=data.get("mother_email"),
                parent_name=data.get("parent_name"),
                parent_mobile=data.get("parent_mobile"),
                parent_email=data.get("parent_email"),
                emergency_contact_name=data.get("emergency_contact_name"),
                emergency_contact_number=data.get("emergency_contact_number"),
                emergency_contact_relation=data.get("emergency_contact_relation"),
                previous_school=data.get("previous_school"),
                medical_conditions=data.get("medical_conditions"),
                allergies=data.get("allergies"),
                admission_date=(
                    datetime.strptime(admission_date, "%Y-%m-%d").date()
                    if admission_date
                    else datetime.utcnow().date()
                ),
                status=data.get("status", "Active"),
            )

            db.session.add(student)
            db.session.flush()

            academic_record = StudentAcademicRecord(
                student_id=student.id,
                academic_class_id=data.get("academic_class_id"),
                roll_number=data.get("roll_number"),
                is_current=True,
                school_id=school_id,
            )

            db.session.add(academic_record)
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Student enrolled successfully",
                        "student": {
                            "id": student.id,
                            "student_id": student.student_id,
                            "user_id": student.user_id,
                            "password": default_password,
                        },
                        "next_preview": {
                            "student_id": generate_student_id(),
                            "user_id": generate_user_id(),
                        },
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"success": False, "error": "Database error"}), 500

        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"success": False, "error": "Internal server error"}), 500


class StudentPromotionAPI(MethodView):
    @permission_required("academic", "edit")
    def post(self):
        try:
            data = request.get_json(silent=True)

            if not data:
                return jsonify({"success": False, "error": "Invalid payload"}), 400

            promotion_type = data.get("promotion_type")

            valid_types = [
                "single_student",
                "bulk_students",
                "whole_class",
            ]

            if promotion_type not in valid_types:
                return (
                    jsonify({"success": False, "error": "Invalid promotion type"}),
                    400,
                )

            promoted_count = 0
            school_id = _current_school_id()

            if promotion_type == "single_student":
                student_id = data.get("student_id")
                target_class_id = data.get("target_class_id")
                target_roll_number = data.get("roll_number")

                if not student_id or not target_class_id:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": "student_id and target_class_id required",
                            }
                        ),
                        400,
                    )

                if not AcademicClass.query.filter_by(
                    id=target_class_id, school_id=school_id
                ).first():
                    return (
                        jsonify({"success": False, "error": "Target class not found"}),
                        404,
                    )

                current_record = StudentAcademicRecord.query.filter_by(
                    student_id=student_id,
                    school_id=school_id,
                    is_current=True,
                ).first()

                if not current_record:
                    return (
                        jsonify(
                            {"success": False, "error": "Academic record not found"}
                        ),
                        404,
                    )

                current_record.is_current = False

                db.session.add(
                    StudentAcademicRecord(
                        student_id=student_id,
                        academic_class_id=target_class_id,
                        roll_number=target_roll_number,
                        is_current=True,
                        school_id=school_id,
                    )
                )

                promoted_count = 1

            elif promotion_type == "bulk_students":
                student_ids = data.get("student_ids", [])
                target_class_id = data.get("target_class_id")

                if not student_ids or not target_class_id:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": "student_ids and target_class_id required",
                            }
                        ),
                        400,
                    )

                if not AcademicClass.query.filter_by(
                    id=target_class_id, school_id=school_id
                ).first():
                    return (
                        jsonify({"success": False, "error": "Target class not found"}),
                        404,
                    )

                records = StudentAcademicRecord.query.filter(
                    StudentAcademicRecord.student_id.in_(student_ids),
                    StudentAcademicRecord.school_id == school_id,
                    StudentAcademicRecord.is_current == True,
                ).all()

                for record in records:
                    record.is_current = False

                    db.session.add(
                        StudentAcademicRecord(
                            student_id=record.student_id,
                            academic_class_id=target_class_id,
                            roll_number=record.roll_number,
                            is_current=True,
                            school_id=school_id,
                        )
                    )

                    promoted_count += 1

            elif promotion_type == "whole_class":
                source_class_id = data.get("source_class_id")
                target_class_id = data.get("target_class_id")

                if not source_class_id or not target_class_id:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": "source_class_id and target_class_id required",
                            }
                        ),
                        400,
                    )

                if not AcademicClass.query.filter_by(
                    id=source_class_id, school_id=school_id
                ).first():
                    return (
                        jsonify({"success": False, "error": "Source class not found"}),
                        404,
                    )
                if not AcademicClass.query.filter_by(
                    id=target_class_id, school_id=school_id
                ).first():
                    return (
                        jsonify({"success": False, "error": "Target class not found"}),
                        404,
                    )

                students = StudentAcademicRecord.query.filter_by(
                    academic_class_id=source_class_id,
                    school_id=school_id,
                    is_current=True,
                ).all()

                if not students:
                    return (
                        jsonify({"success": False, "error": "No students found"}),
                        404,
                    )

                for record in students:
                    record.is_current = False

                    db.session.add(
                        StudentAcademicRecord(
                            student_id=record.student_id,
                            academic_class_id=target_class_id,
                            roll_number=record.roll_number,
                            is_current=True,
                            school_id=school_id,
                        )
                    )

                    promoted_count += 1

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": f"{promoted_count} students promoted successfully",
                        "promoted_count": promoted_count,
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"success": False, "error": "Database error"}), 500

        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"success": False, "error": "Internal server error"}), 500
