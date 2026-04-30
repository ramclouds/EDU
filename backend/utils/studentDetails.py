import bcrypt
import logging
from sqlalchemy import or_
from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError
from utils.auth import db, Student
from utils.auth_middleware import login_required

logger = logging.getLogger(__name__)


# MODELS
class StudentAcademicRecord(db.Model):
    __tablename__ = "student_academic_records"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer)
    academic_class_id = db.Column(db.Integer)
    roll_number = db.Column(db.Integer)
    is_current = db.Column(db.Boolean)


class AcademicClass(db.Model):
    __tablename__ = "academic_classes"

    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.Integer)
    division_id = db.Column(db.Integer)
    section_id = db.Column(db.Integer)


class Batch(db.Model):
    __tablename__ = "batches"

    id = db.Column(db.Integer, primary_key=True)
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime)
    batch_name = db.Column(db.String(20))


class Division(db.Model):
    __tablename__ = "divisions"

    id = db.Column(db.Integer, primary_key=True)
    division_name = db.Column(db.String(20))


class Section(db.Model):
    __tablename__ = "sections"

    id = db.Column(db.Integer, primary_key=True)
    section_name = db.Column(db.String(10))


# API
class StudentDetails(MethodView):
    @login_required
    def get(self, id):
        try:
            # VALIDATION
            try:
                id = int(id)
                if id <= 0:
                    return jsonify({"error": "Invalid student id"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Student id must be an integer"}), 400

            student = Student.query.get(id)

            if not student:
                return jsonify({"error": "Student not found"}), 404

            response = {
                "id": student.id,
                "student_id": student.student_id,
                "first_name": student.first_name,
                "last_name": student.last_name,
                "middle_name": student.middle_name,
                "email": student.email,
                "mobile": student.mobile,
                # 👨‍👩‍👧 FAMILY
                "father_name": student.father_name,
                "father_mobile": student.father_mobile,
                "father_email": student.father_email,
                "mother_name": student.mother_name,
                "mother_mobile": student.mother_mobile,
                "mother_email": student.mother_email,
                "parent_name": student.parent_name,
                "parent_mobile": student.parent_mobile,
                "parent_email": student.parent_email,
                # 🚨 EMERGENCY
                "emergency_contact_name": student.emergency_contact_name,
                "emergency_contact_number": student.emergency_contact_number,
                "emergency_contact_relation": student.emergency_contact_relation,
                # 👤 PERSONAL
                "gender": student.gender,
                "date_of_birth": (
                    str(student.date_of_birth) if student.date_of_birth else None
                ),
                "blood_group": student.blood_group,
                "address": student.address,
                # 🎓 ACADEMIC
                "admission_date": (
                    str(student.admission_date) if student.admission_date else None
                ),
                "previous_school": student.previous_school,
                # 🏥 MEDICAL
                "medical_conditions": student.medical_conditions,
                "allergies": student.allergies,
                "status": student.status,
                # CLASS INFO
                "batch_name": None,
                "division_name": None,
                "section_name": None,
                "roll_number": None,
            }

            record = StudentAcademicRecord.query.filter_by(
                student_id=student.id, is_current=True
            ).first()

            if record:
                academic = AcademicClass.query.get(record.academic_class_id)

                if academic:
                    batch = Batch.query.get(academic.batch_id)
                    division = Division.query.get(academic.division_id)
                    section = Section.query.get(academic.section_id)

                    response.update(
                        {
                            "batch_name": batch.batch_name if batch else None,
                            "division_name": (
                                division.division_name if division else None
                            ),
                            "section_name": section.section_name if section else None,
                            "roll_number": record.roll_number,
                        }
                    )

            return jsonify(response), 200

        except Exception as e:
            logger.exception(f"StudentDetails error: {e}")
            return jsonify({"error": "Something went wrong"}), 500


class UpdateStudentProfile(MethodView):
    @login_required
    def put(self, id):
        try:
            # VALIDATION
            try:
                id = int(id)
                if id <= 0:
                    return jsonify({"error": "Invalid student id"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Student id must be an integer"}), 400

            student = Student.query.get(id)

            if not student:
                return jsonify({"error": "Student not found"}), 404

            data = request.get_json()

            if not data:
                return jsonify({"error": "Invalid JSON payload"}), 400

            # ================= DUPLICATE CHECK =================
            new_email = data.get("email")
            new_mobile = data.get("mobile")

            if new_email or new_mobile:
                existing_user = Student.query.filter(
                    Student.id != student.id,
                    or_(
                        Student.email == new_email if new_email else False,
                        Student.mobile == new_mobile if new_mobile else False,
                    ),
                ).first()

                if existing_user:
                    if new_email and existing_user.email == new_email:
                        return jsonify({"error": "Email already in use"}), 400
                    if new_mobile and existing_user.mobile == new_mobile:
                        return jsonify({"error": "Mobile number already in use"}), 400

            # ================= SAFE UPDATE =================
            # BASIC
            student.first_name = data.get("first_name", student.first_name)
            student.last_name = data.get("last_name", student.last_name)
            student.middle_name = data.get("middle_name", student.middle_name)
            student.date_of_birth = data.get("date_of_birth", student.date_of_birth)
            student.mobile = data.get("mobile", student.mobile)
            student.gender = data.get("gender", student.gender)
            student.email = data.get("email", student.email)
            student.address = data.get("address", student.address)

            # FAMILY
            student.father_name = data.get("father_name", student.father_name)
            student.father_mobile = data.get("father_mobile", student.father_mobile)
            student.father_email = data.get("father_email", student.father_email)

            student.mother_name = data.get("mother_name", student.mother_name)
            student.mother_mobile = data.get("mother_mobile", student.mother_mobile)
            student.mother_email = data.get("mother_email", student.mother_email)

            student.parent_name = data.get("parent_name", student.parent_name)
            student.parent_mobile = data.get("parent_mobile", student.parent_mobile)
            student.parent_email = data.get("parent_email", student.parent_email)

            # EMERGENCY
            student.emergency_contact_name = data.get(
                "emergency_contact_name", student.emergency_contact_name
            )
            student.emergency_contact_number = data.get(
                "emergency_contact_number", student.emergency_contact_number
            )
            student.emergency_contact_relation = data.get(
                "emergency_contact_relation", student.emergency_contact_relation
            )

            # PERSONAL
            student.blood_group = data.get("blood_group", student.blood_group)

            # ACADEMIC
            student.previous_school = data.get(
                "previous_school", student.previous_school
            )

            # MEDICAL
            student.medical_conditions = data.get(
                "medical_conditions", student.medical_conditions
            )
            student.allergies = data.get("allergies", student.allergies)

            db.session.commit()

            return jsonify({"message": "Profile updated successfully"}), 200

        except SQLAlchemyError as db_err:
            logger.error(f"Database error: {db_err}")
            db.session.rollback()
            return jsonify({"error": "Database error occurred"}), 500

        except Exception as e:
            logger.exception(f"UpdateStudentProfile error: {e}")
            return jsonify({"error": "Something went wrong"}), 500


class ChangePassword(MethodView):
    @login_required
    def put(self, id):
        try:
            # ================= VALIDATION =================
            try:
                id = int(id)
                if id <= 0:
                    return jsonify({"error": "Invalid student id"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Invalid student id"}), 400

            student = Student.query.get(id)

            if not student:
                return jsonify({"error": "Student not found"}), 404

            data = request.get_json(silent=True)

            if not data:
                return jsonify({"error": "Invalid JSON payload"}), 400

            current_password = data.get("current_password")
            new_password = data.get("new_password")
            confirm_password = data.get("confirm_password")

            # ================= REQUIRED FIELDS =================
            if not all([current_password, new_password, confirm_password]):
                return jsonify({"error": "All fields are required"}), 400

            # ================= PASSWORD EXISTS =================
            if not student.password:
                return jsonify({"error": "Password not set"}), 400

            # ================= CHECK CURRENT PASSWORD (bcrypt) =================
            try:
                stored_password = student.password.encode("utf-8")
            except Exception:
                return jsonify({"error": "Invalid password format"}), 400

            if not bcrypt.checkpw(current_password.encode("utf-8"), stored_password):
                return jsonify({"error": "Current password is incorrect"}), 400

            # ================= MATCH CHECK =================
            if new_password != confirm_password:
                return jsonify({"error": "Passwords do not match"}), 400

            # ================= PASSWORD STRENGTH =================
            if len(new_password) < 8:
                return jsonify({"error": "Password must be at least 8 characters"}), 400

            # Prevent reuse
            if bcrypt.checkpw(new_password.encode("utf-8"), stored_password):
                return (
                    jsonify(
                        {"error": "New password cannot be same as current password"}
                    ),
                    400,
                )

            # ================= SAVE NEW PASSWORD =================
            hashed = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())

            student.password = hashed.decode("utf-8")

            db.session.commit()

            logger.info(f"Password changed for student_id={student.id}")

            return jsonify({"message": "Password changed successfully"}), 200

        except SQLAlchemyError as db_err:
            logger.error(f"Database error: {db_err}")
            db.session.rollback()
            return jsonify({"error": "Database error occurred"}), 500

        except Exception as e:
            logger.exception(f"ChangePassword error: {e}")
            return jsonify({"error": "Something went wrong"}), 500
