import logging

from flask import jsonify
from flask.views import MethodView

from utils.auth import db, Teacher, Student
from utils.auth_middleware import login_required

from utils.teacherDetails import TeacherClass
from utils.studentDetails import (
    StudentAcademicRecord,
    AcademicClass,
    Division,
    Section,
)

from utils.examResult import Subject

logger = logging.getLogger(__name__)


class TeacherMyClasses(MethodView):

    @login_required
    def get(self, teacher_id):

        try:
            teacher_id = int(teacher_id)

            teacher = Teacher.query.get(teacher_id)

            if not teacher:
                return jsonify({"error": "Teacher not found"}), 404

            # ===============================
            # FETCH ASSIGNED CLASSES
            # ===============================
            teacher_classes = TeacherClass.query.filter_by(
                teacher_id=teacher_id
            ).all()

            response = []

            for tc in teacher_classes:

                academic = AcademicClass.query.get(tc.academic_class_id)

                if not academic:
                    continue

                division = Division.query.get(academic.division_id)
                section = Section.query.get(academic.section_id)

                subject = Subject.query.get(tc.subject_id)

                class_name = ""

                if division and section:
                    class_name = (
                        f"{division.division_name}-{section.section_name}"
                    )

                # ===============================
                # FETCH STUDENTS
                # ===============================
                records = StudentAcademicRecord.query.filter_by(
                    academic_class_id=academic.id,
                    is_current=True
                ).all()

                students = []

                for record in records:

                    student = Student.query.get(record.student_id)

                    if not student:
                        continue

                    students.append({
                        "id": student.id,
                        "student_id": student.student_id,
                        "full_name": " ".join(filter(None, [
                            student.first_name,
                            student.middle_name,
                            student.last_name
                        ])),
                        "roll_number": record.roll_number,
                        "mobile": student.mobile,
                        "parent_name": student.parent_name,
                        "status": student.status,
                        "gender": student.gender,
                        "date_of_birth": (
                            str(student.date_of_birth)
                            if student.date_of_birth
                            else None
                        ),
                        "blood_group": student.blood_group,
                        "email": student.email,
                        "address": student.address,
                        "father_name": student.father_name,
                        "mother_name": student.mother_name,
                        "parent_mobile": student.parent_mobile,
                        "medical_conditions": student.medical_conditions,
                        "allergies": student.allergies,
                    })

                response.append({
                    "teacher_class_id": tc.id,
                    "class_id": academic.id,
                    "class_name": class_name,
                    "subject_name": (
                        subject.subject_name
                        if subject
                        else None
                    ),
                    "total_students": len(students),
                    "students": students
                })

            return jsonify(response), 200

        except Exception as e:
            logger.exception(e)
            return jsonify({
                "error": "Something went wrong"
            }), 500