import logging
from datetime import datetime
from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import or_
import bcrypt
from utils.studentDetails import AcademicClass, Batch, Division, Section
from utils.examResult import Subject
from utils.auth import db, Teacher
from utils.auth_middleware import login_required

logger = logging.getLogger(__name__)


# ================= TEACHER CLASS MAPPING =================
class TeacherClass(db.Model):
    __tablename__ = "teacher_classes"

    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(
        db.Integer, db.ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False
    )
    academic_class_id = db.Column(
        db.Integer,
        db.ForeignKey("academic_classes.id", ondelete="CASCADE"),
        nullable=False,
    )
    subject_id = db.Column(
        db.Integer, db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False
    )

    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())


# ================= TEACHER PROFILE =================
class TeacherDetails(MethodView):

    @login_required
    def get(self, id):
        try:
            id = int(id)
            if id <= 0:
                return jsonify({"error": "Invalid teacher id"}), 400

            teacher = Teacher.query.get(id)
            if not teacher:
                return jsonify({"error": "Teacher not found"}), 404

            # ✅ Fetch assigned classes
            classes = TeacherClass.query.filter_by(teacher_id=id).all()

            class_data = []

            for c in classes:
                academic = AcademicClass.query.get(c.academic_class_id)

                class_name = None

                if academic:
                    division = Division.query.get(academic.division_id)
                    section = Section.query.get(academic.section_id)

                    if division and section:
                        class_name = f"{division.division_name} {section.section_name}"

                subject = Subject.query.get(c.subject_id)

                class_data.append(
                    {
                        "class_name": class_name,
                        "subject_name": subject.subject_name if subject else None,
                    }
                )

            return (
                jsonify(
                    {
                        "id": teacher.id,
                        "teacher_id": teacher.teacher_id,
                        "first_name": teacher.first_name,
                        "middle_name": teacher.middle_name,
                        "last_name": teacher.last_name,
                        # 👤 PERSONAL
                        "gender": teacher.gender,
                        "date_of_birth": (
                            str(teacher.date_of_birth)
                            if teacher.date_of_birth
                            else None
                        ),
                        "blood_group": teacher.blood_group,
                        # 📞 CONTACT
                        "email": teacher.email,
                        "mobile": teacher.mobile,
                        # 📍 ADDRESS
                        "address": teacher.address,
                        "city": teacher.city,
                        "state": teacher.state,
                        "pincode": teacher.pincode,
                        # 💼 PROFESSIONAL
                        "designation": teacher.designation,
                        # 🎓 ACADEMIC
                        "degree": teacher.degree,
                        "university": teacher.university,
                        "experience_years": teacher.experience_years,
                        "specialization": teacher.specialization,
                        # 🏢 EMPLOYMENT
                        "joining_date": (
                            str(teacher.joining_date) if teacher.joining_date else None
                        ),
                        "employment_type": teacher.employment_type,
                        "shift": teacher.shift,
                        # 📊 PERFORMANCE
                        "total_classes_taken": teacher.total_classes_taken,
                        "assignments_count": teacher.assignments_count,
                        "rating": teacher.rating,
                        "attendance_percentage": teacher.attendance_percentage,
                        # 🩺 MEDICAL
                        "medical_condition": teacher.medical_condition,
                        # 🚨 EMERGENCY
                        "emergency_name": teacher.emergency_name,
                        "emergency_relation": teacher.emergency_relation,
                        "emergency_phone": teacher.emergency_phone,
                        # ⚙️ SYSTEM
                        "username": teacher.username,
                        "status": teacher.status,
                        "last_login": (
                            str(teacher.last_login) if teacher.last_login else None
                        ),
                        # 📚 CLASSES
                        "classes": class_data,
                    }
                ),
                200,
            )

        except ValueError:
            return jsonify({"error": "Teacher id must be integer"}), 400

        except SQLAlchemyError as db_err:
            logger.error(db_err)
            db.session.rollback()
            return jsonify({"error": "Database error"}), 500

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Something went wrong"}), 500


# ================= UPDATE TEACHER PROFILE =================
class UpdateTeacherProfile(MethodView):

    @login_required
    def put(self, id):
        try:
            id = int(id)
            if id <= 0:
                return jsonify({"error": "Invalid teacher id"}), 400

            teacher = Teacher.query.get(id)
            if not teacher:
                return jsonify({"error": "Teacher not found"}), 404

            data = request.get_json()
            if not data:
                return jsonify({"error": "Invalid JSON"}), 400

            new_email = data.get("email")
            new_mobile = data.get("mobile")

            # ✅ Duplicate check
            if new_email or new_mobile:
                existing = Teacher.query.filter(
                    Teacher.id != id,
                    or_(
                        Teacher.email == new_email if new_email else False,
                        Teacher.mobile == new_mobile if new_mobile else False,
                    ),
                ).first()

                if existing:
                    if new_email and existing.email == new_email:
                        return jsonify({"error": "Email already exists"}), 400
                    if new_mobile and existing.mobile == new_mobile:
                        return jsonify({"error": "Mobile already exists"}), 400

            # ✅ Date parsing helper
            def parse_date(value):
                try:
                    return (
                        datetime.strptime(value, "%Y-%m-%d").date() if value else None
                    )
                except:
                    return None

            # ✅ Safe updates
            teacher.first_name = data.get("first_name", teacher.first_name)
            teacher.middle_name = data.get("middle_name", teacher.middle_name)
            teacher.last_name = data.get("last_name", teacher.last_name)
            teacher.mobile = new_mobile if new_mobile else teacher.mobile
            teacher.email = new_email if new_email else teacher.email
            teacher.role = data.get("role", teacher.role)

            teacher.gender = data.get("gender", teacher.gender)
            teacher.blood_group = data.get("blood_group", teacher.blood_group)

            teacher.address = data.get("address", teacher.address)
            teacher.city = data.get("city", teacher.city)
            teacher.state = data.get("state", teacher.state)
            teacher.pincode = data.get("pincode", teacher.pincode)

            teacher.designation = data.get("designation", teacher.designation)

            teacher.degree = data.get("degree", teacher.degree)
            teacher.university = data.get("university", teacher.university)
            teacher.experience_years = data.get(
                "experience_years", teacher.experience_years
            )
            teacher.specialization = data.get("specialization", teacher.specialization)

            teacher.employment_type = data.get(
                "employment_type", teacher.employment_type
            )
            teacher.shift = data.get("shift", teacher.shift)

            teacher.medical_condition = data.get(
                "medical_condition", teacher.medical_condition
            )

            teacher.emergency_name = data.get("emergency_name", teacher.emergency_name)
            teacher.emergency_relation = data.get(
                "emergency_relation", teacher.emergency_relation
            )
            teacher.emergency_phone = data.get(
                "emergency_phone", teacher.emergency_phone
            )

            teacher.username = data.get("username", teacher.username)
            teacher.status = data.get("status", teacher.status)

            # ✅ Proper date conversion
            if "date_of_birth" in data:
                teacher.date_of_birth = parse_date(data.get("date_of_birth"))

            if "joining_date" in data:
                teacher.joining_date = parse_date(data.get("joining_date"))

            db.session.commit()

            return jsonify({"message": "Teacher profile updated successfully"}), 200

        except ValueError:
            return jsonify({"error": "Teacher id must be integer"}), 400

        except SQLAlchemyError as db_err:
            logger.error(db_err)
            db.session.rollback()
            return jsonify({"error": "Database error"}), 500

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Something went wrong"}), 500


class ChangeTeacherPassword(MethodView):

    @login_required
    def put(self, id):
        try:
            id = int(id)

            teacher = Teacher.query.get(id)
            if not teacher:
                return jsonify({"error": "Teacher not found"}), 404

            data = request.get_json()

            current_password = data.get("current_password")
            new_password = data.get("new_password")
            confirm_password = data.get("confirm_password")

            if not all([current_password, new_password, confirm_password]):
                return jsonify({"error": "All fields required"}), 400

            # ✅ CHECK CURRENT PASSWORD
            if not bcrypt.checkpw(
                current_password.encode("utf-8"), teacher.password.encode("utf-8")
            ):
                return jsonify({"error": "Current password incorrect"}), 400

            # ✅ MATCH CHECK
            if new_password != confirm_password:
                return jsonify({"error": "Passwords do not match"}), 400

            # ✅ LENGTH CHECK
            if len(new_password) < 8:
                return jsonify({"error": "Min 8 characters required"}), 400

            # ✅ HASH + SAVE
            hashed = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())
            teacher.password = hashed.decode("utf-8")

            db.session.commit()

            return jsonify({"message": "Password updated"}), 200

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Something went wrong"}), 500
