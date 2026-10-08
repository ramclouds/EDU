import logging
from flask import jsonify
from flask.views import MethodView

from utils.auth import db, Teacher, Student, Admin
from utils.auth_middleware import login_required
from utils.teacherDetails import TeacherClass
from utils.studentDetails import (
    StudentAcademicRecord,
    AcademicClass,
    Batch,
    Division,
    Section,
)
from utils.subjects import Subject

logger = logging.getLogger(__name__)


def build_student_payload(student, record):
    return {
        "id": student.id,
        "student_id": student.student_id,
        "full_name": " ".join(
            filter(
                None,
                [
                    student.first_name,
                    student.middle_name,
                    student.last_name,
                ],
            )
        ),
        "roll_number": record.roll_number,
        "mobile": student.mobile,
        "parent_name": student.parent_name,
        "parent_mobile": student.parent_mobile,
        "status": student.status,
        "gender": student.gender,
        "date_of_birth": str(student.date_of_birth) if student.date_of_birth else None,
        "blood_group": student.blood_group,
        "email": student.email,
        "address": student.address,
        "father_name": student.father_name,
        "mother_name": student.mother_name,
        "medical_conditions": student.medical_conditions,
        "allergies": student.allergies,
    }


def build_class_payload(academic, subject=None, teacher_class_id=None):
    batch = Batch.query.get(academic.batch_id)
    division = Division.query.get(academic.division_id)
    section = Section.query.get(academic.section_id)

    division_name = division.division_name if division else None
    section_name = section.section_name if section else None
    batch_name = batch.batch_name if batch else None

    class_name = (
        f"{division_name}-{section_name}"
        if division_name and section_name
        else f"Class {academic.id}"
    )

    records = (
        StudentAcademicRecord.query.filter_by(
            academic_class_id=academic.id,
            is_current=True,
        )
        .order_by(
            StudentAcademicRecord.roll_number.is_(None),
            StudentAcademicRecord.roll_number.asc(),
        )
        .all()
    )

    students = []
    for record in records:
        student = Student.query.get(record.student_id)
        if student:
            students.append(build_student_payload(student, record))

    return {
        "teacher_class_id": teacher_class_id or f"admin-class-{academic.id}",
        "class_id": academic.id,
        "academic_class_id": academic.id,
        "batch_id": academic.batch_id,
        "division_id": academic.division_id,
        "section_id": academic.section_id,
        "batch_name": batch_name,
        "division_name": division_name,
        "section_name": section_name,
        "class_name": class_name,
        "display_name": class_name,
        "subject_name": subject.subject_name if subject else "All Subjects",
        "total_students": len(students),
        "students": students,
    }


class MyClasses(MethodView):
    @login_required
    def get(self, role=None, user_id=None):
        if role is None or user_id is None:
            return (
                jsonify(
                    {
                        "error": "Missing role/user_id. Use /api/my-classes/<role>/<user_id>"
                    }
                ),
                400,
            )

        try:
            role = str(role).lower().strip()
            user_id = int(user_id)

            # ================= ADMIN: SHOW ALL CLASSES =================
            if role == "admin":
                admin = Admin.query.get(user_id)
                if not admin:
                    return jsonify({"error": "Admin not found"}), 404

                academic_classes = AcademicClass.query.order_by(
                    AcademicClass.batch_id.asc(),
                    AcademicClass.division_id.asc(),
                    AcademicClass.section_id.asc(),
                ).all()

                response = [
                    build_class_payload(academic) for academic in academic_classes
                ]

                return jsonify(response), 200

            # ================= TEACHER: ONLY ASSIGNED CLASSES =================
            if role == "teacher":
                teacher = Teacher.query.get(user_id)
                if not teacher:
                    return jsonify({"error": "Teacher not found"}), 404

                teacher_classes = TeacherClass.query.filter_by(teacher_id=user_id).all()

                response = []

                for tc in teacher_classes:
                    academic_class_id = getattr(
                        tc, "academic_class_id", None
                    ) or getattr(tc, "class_id", None)

                    if not academic_class_id:
                        continue

                    academic = AcademicClass.query.get(academic_class_id)
                    if not academic:
                        continue

                    subject_id = getattr(tc, "subject_id", None)
                    subject = Subject.query.get(subject_id) if subject_id else None

                    response.append(
                        build_class_payload(
                            academic=academic,
                            subject=subject,
                            teacher_class_id=getattr(tc, "id", None),
                        )
                    )

                return jsonify(response), 200

            return jsonify({"error": "Invalid role"}), 400

        except ValueError:
            return jsonify({"error": "Invalid user id"}), 400

        except Exception as e:
            logger.exception("MyClasses API failed")
            return jsonify({"error": "Internal server error"}), 500


# Backward compatible old teacher route
class TeacherMyClasses(MethodView):
    @login_required
    def get(self, teacher_id):
        return MyClasses().get("teacher", teacher_id)
