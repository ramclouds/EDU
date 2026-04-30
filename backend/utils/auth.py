import uuid
from flask import request, jsonify
from flask.views import MethodView
from flask_jwt_extended import create_access_token
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
import logging
import re

bcrypt = Bcrypt()
db = SQLAlchemy()

logger = logging.getLogger(__name__)

# ===========================
# MODELS
# ===========================


class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), unique=True, nullable=False)
    user_id = db.Column(db.String(20), unique=True, nullable=False)

    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    middle_name = db.Column(db.String(100))
    email = db.Column(db.String(100))
    mobile = db.Column(db.String(15))

    # 👨‍👩‍👧 FAMILY
    father_name = db.Column(db.String(100))
    father_mobile = db.Column(db.String(15))
    father_email = db.Column(db.String(100))

    mother_name = db.Column(db.String(100))
    mother_mobile = db.Column(db.String(15))
    mother_email = db.Column(db.String(100))

    parent_name = db.Column(db.String(100))
    parent_mobile = db.Column(db.String(15))
    parent_email = db.Column(db.String(100))

    # 🚨 EMERGENCY
    emergency_contact_name = db.Column(db.String(100))
    emergency_contact_number = db.Column(db.String(15))
    emergency_contact_relation = db.Column(db.String(50))

    # 👤 PERSONAL
    gender = db.Column(db.Enum("Male", "Female", "Other"))
    date_of_birth = db.Column(db.Date)
    blood_group = db.Column(db.Enum("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"))

    address = db.Column(db.Text)

    # 🎓 ACADEMIC
    admission_date = db.Column(db.Date)
    previous_school = db.Column(db.String(150))

    # 🏥 MEDICAL
    medical_conditions = db.Column(db.Text)
    allergies = db.Column(db.Text)

    # ⚙️ SYSTEM
    role = db.Column(db.Enum("student", "teacher", "admin"), nullable=False)
    password = db.Column(db.String(255), nullable=False)
    status = db.Column(db.Enum("Active", "Inactive"), default="Active")
    auth_token = db.Column(db.String(255))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Teacher(db.Model):
    __tablename__ = "teachers"

    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.String(50), unique=True, nullable=False)
    user_id = db.Column(db.Integer, nullable=False)

    # 👤 NAME
    first_name = db.Column(db.String(100))
    middle_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))

    # 📞 CONTACT
    email = db.Column(db.String(120), unique=True)
    mobile = db.Column(db.String(15), unique=True)

    # 👤 PERSONAL
    gender = db.Column(db.String(10))
    date_of_birth = db.Column(db.Date)
    blood_group = db.Column(db.String(5))

    # 📍 ADDRESS
    address = db.Column(db.Text)
    city = db.Column(db.String(50))
    state = db.Column(db.String(50))
    pincode = db.Column(db.String(10))

    # 💼 PROFESSIONAL
    designation = db.Column(db.String(100))

    # 🎓 ACADEMIC
    degree = db.Column(db.String(100))
    university = db.Column(db.String(150))
    experience_years = db.Column(db.Integer)
    specialization = db.Column(db.String(100))

    # 🏢 EMPLOYMENT
    joining_date = db.Column(db.Date)
    employment_type = db.Column(db.String(50))
    shift = db.Column(db.String(50))

    # 📊 PERFORMANCE
    total_classes_taken = db.Column(db.Integer, default=0)
    assignments_count = db.Column(db.Integer, default=0)
    rating = db.Column(db.Float, default=0)
    attendance_percentage = db.Column(db.Float, default=0)

    # 🩺 MEDICAL
    medical_condition = db.Column(db.Text)

    # 🚨 EMERGENCY
    emergency_name = db.Column(db.String(100))
    emergency_relation = db.Column(db.String(50))
    emergency_phone = db.Column(db.String(15))

    # ⚙️ SYSTEM
    username = db.Column(db.String(50), unique=True)
    auth_token = db.Column(db.String(255))
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum("teacher", "admin"), default="teacher")
    status = db.Column(db.String(20), default="Active")
    last_login = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime)


# ===========================
# LOGIN CLASS
# ===========================
class Login(MethodView):

    def post(self):
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Invalid JSON"}), 400

            identifier = data.get("identifier")  # email or username
            password = data.get("password")

            if not identifier or not password:
                return jsonify({"error": "Email/Username and password required"}), 400

            # ---------------------------------
            # Find user automatically
            # checks:
            # Student email
            # Teacher email
            # Teacher username
            # Admin (stored in students table with role=admin)
            # ---------------------------------

            user = (
                Student.query.filter_by(email=identifier).first()
                or Teacher.query.filter_by(email=identifier).first()
                or Teacher.query.filter_by(username=identifier).first()
            )

            if not user:
                return jsonify({"error": "User not found"}), 401

            if not bcrypt.check_password_hash(user.password, password):
                return jsonify({"error": "Invalid password"}), 401

            if user.status != "Active":
                return jsonify({"error": "Account inactive"}), 403

            # Generate token
            token = str(uuid.uuid4())
            user.auth_token = token
            db.session.commit()

            # Auto dashboard based on role
            if user.role == "student":
                dashboard = "student_dashboard"
            elif user.role == "teacher":
                dashboard = "teacher_dashboard"
            elif user.role == "admin":
                dashboard = "admin_dashboard"
            else:
                dashboard = "dashboard"

            return (
                jsonify(
                    {
                        "token": token,
                        "role": user.role,
                        "dashboard": dashboard,
                        "user": {
                            "id": user.id,
                            "name": " ".join(
                                filter(
                                    None,
                                    [
                                        getattr(user, "first_name", ""),
                                        getattr(user, "middle_name", ""),
                                        getattr(user, "last_name", ""),
                                    ],
                                )
                            ),
                            "email": user.email,
                        },
                    }
                ),
                200,
            )

        except Exception as e:
            import traceback

            traceback.print_exc()
            return jsonify({"error": str(e)}), 500


# ===========================
# AUTO ID GENERATORS
# ===========================
def generate_student_id():
    try:
        last_student = Student.query.order_by(Student.id.desc()).first()
        if not last_student or not last_student.student_id:
            return "STU1001"
        last_id = int(last_student.student_id.replace("STU", ""))
        return f"STU{last_id + 1}"
    except Exception as e:
        logger.error(f"Student ID generation failed: {e}")
        return f"STU{int(datetime.utcnow().timestamp())}"


def generate_user_id():
    try:
        last_student = Student.query.order_by(Student.id.desc()).first()
        if not last_student or not last_student.user_id:
            return "USR1001"
        last_id = int(last_student.user_id.replace("USR", ""))
        return f"USR{last_id + 1}"
    except Exception as e:
        logger.error(f"User ID generation failed: {e}")
        return f"USR{int(datetime.utcnow().timestamp())}"


# ===========================
# SIGNUP CLASS
# ===========================
class SignUp(MethodView):

    def post(self):
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Invalid JSON payload"}), 400

            email = data.get("email")
            password = data.get("password")
            role = data.get("role")

            if not email or not password or not role:
                return jsonify({"error": "Email, password, and role required"}), 400

            email_regex = r"^[\w\.-]+@[\w\.-]+\.\w+$"
            if not re.match(email_regex, email):
                return jsonify({"error": "Invalid email format"}), 400

            if len(password) < 6:
                return jsonify({"error": "Password must be at least 6 characters"}), 400

            # Check if email exists in correct table
            if role == "student" or role == "admin":
                if Student.query.filter_by(email=email).first():
                    return jsonify({"error": "Email already registered"}), 400
            elif role == "teacher":
                if Teacher.query.filter_by(email=email).first():
                    return jsonify({"error": "Email already registered"}), 400
            else:
                return jsonify({"error": "Invalid role"}), 400

            hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

            if role == "student" or role == "admin":
                student_id = generate_student_id()
                user_id = generate_user_id()

                dob = data.get("date_of_birth")
                admission = data.get("admission_date")
                date_of_birth = (
                    datetime.strptime(dob, "%Y-%m-%d").date() if dob else None
                )
                admission_date = (
                    datetime.strptime(admission, "%Y-%m-%d").date()
                    if admission
                    else None
                )

                new_user = Student(
                    student_id=student_id,
                    user_id=user_id,
                    first_name=data.get("first_name"),
                    last_name=data.get("last_name"),
                    middle_name=data.get("middle_name"),
                    email=email,
                    mobile=data.get("mobile"),
                    father_name=data.get("father_name"),
                    father_mobile=data.get("father_mobile"),
                    mother_name=data.get("mother_name"),
                    mother_mobile=data.get("mother_mobile"),
                    emergency_contact_name=data.get("emergency_contact_name"),
                    emergency_contact_number=data.get("emergency_contact_number"),
                    blood_group=data.get("blood_group"),
                    medical_conditions=data.get("medical_conditions"),
                    allergies=data.get("allergies"),
                    gender=data.get("gender"),
                    date_of_birth=date_of_birth,
                    address=data.get("address"),
                    admission_date=admission_date,
                    role=role,
                    password=hashed_password,
                )

                db.session.add(new_user)
                db.session.commit()
                return (
                    jsonify(
                        {
                            "message": "Student registered successfully",
                            "student_id": student_id,
                            "user_id": user_id,
                        }
                    ),
                    201,
                )

            elif role == "teacher":
                teacher_id = (
                    f"TCH{int(datetime.utcnow().timestamp())}"  # simple auto-id
                )
                user_id = f"USR{int(datetime.utcnow().timestamp())}"

                dob = data.get("date_of_birth")
                date_of_birth = (
                    datetime.strptime(dob, "%Y-%m-%d").date() if dob else None
                )
                joining_date = (
                    datetime.strptime(data.get("joining_date"), "%Y-%m-%d").date()
                    if data.get("joining_date")
                    else None
                )

                new_user = Teacher(
                    teacher_id=teacher_id,
                    user_id=user_id,
                    first_name=data.get("first_name"),
                    middle_name=data.get("middle_name"),
                    last_name=data.get("last_name"),
                    email=email,
                    mobile=data.get("mobile"),
                    gender=data.get("gender"),
                    date_of_birth=date_of_birth,
                    address=data.get("address"),
                    joining_date=joining_date,
                    role=role,
                    password=hashed_password,
                )
                db.session.add(new_user)
                db.session.commit()
                return (
                    jsonify(
                        {
                            "message": "Teacher registered successfully",
                            "teacher_id": teacher_id,
                            "user_id": user_id,
                        }
                    ),
                    201,
                )

        except SQLAlchemyError as db_err:
            logger.error(f"Database error: {db_err}")
            db.session.rollback()
            return jsonify({"error": "Database error occurred"}), 500

        except Exception as e:
            logger.exception(f"Signup error: {e}")
            return jsonify({"error": "Something went wrong"}), 500
