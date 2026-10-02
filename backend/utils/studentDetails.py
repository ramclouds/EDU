import bcrypt
import logging
from sqlalchemy import or_
from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError
from utils.auth import db, Student
from utils.auth_middleware import login_required
from utils.rolePermissionManagement import permission_required

logger = logging.getLogger(__name__)


def _current_school_id():
    return getattr(getattr(request, "user", None), "school_id", None)


# MODELS
class StudentAcademicRecord(db.Model):
    __tablename__ = "student_academic_records"

    id = db.Column(db.Integer, primary_key=True)

    # Denormalized (see AcademicClass.school_id's comment) — set from the
    # enrolling admin, not derived via join.
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )

    student_id = db.Column(
        db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )

    academic_class_id = db.Column(
        db.Integer,
        db.ForeignKey("academic_classes.id", ondelete="CASCADE"),
        nullable=False,
    )

    roll_number = db.Column(db.Integer)
    is_current = db.Column(db.Boolean, default=True)


class AcademicClass(db.Model):
    __tablename__ = "academic_classes"

    id = db.Column(db.Integer, primary_key=True)

    # Denormalized copy of the owning Batch/Division/Section's school_id
    # (set from the request's current admin, not derived via join) so
    # every query here can filter by school_id directly instead of
    # joining through batches every time.
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )

    batch_id = db.Column(
        db.Integer, db.ForeignKey("batches.id", ondelete="CASCADE"), nullable=False
    )

    division_id = db.Column(
        db.Integer, db.ForeignKey("divisions.id", ondelete="CASCADE"), nullable=False
    )

    section_id = db.Column(
        db.Integer, db.ForeignKey("sections.id", ondelete="CASCADE"), nullable=False
    )

    __table_args__ = (
        db.UniqueConstraint(
            "batch_id", "division_id", "section_id", name="uq_batch_division_section"
        ),
    )


class Batch(db.Model):
    __tablename__ = "batches"

    id = db.Column(db.Integer, primary_key=True)

    # ================= TENANCY ================= (see Admin.school_id
    # in utils/auth.py). batch_name was globally unique before this,
    # which meant two different schools could never both have a
    # "2024-2025" batch — changed to unique-per-school below.
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )

    batch_name = db.Column(db.String(20), nullable=False)
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    # Marks the school's active academic year. Only one Batch should have
    # this set to True at a time - enforced in application code (see
    # AdminBatchSetCurrentAPI in utils/academic.py), not at the DB level.
    # Migration for the existing `batches` table:
    #   ALTER TABLE batches ADD COLUMN is_current BOOLEAN NOT NULL DEFAULT FALSE;
    is_current = db.Column(db.Boolean, nullable=False, server_default="0")
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp())

    __table_args__ = (
        db.UniqueConstraint("school_id", "batch_name", name="uq_school_batch_name"),
    )


class Division(db.Model):
    __tablename__ = "divisions"

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )
    division_name = db.Column(db.String(20), nullable=False)

    __table_args__ = (
        db.UniqueConstraint(
            "school_id", "division_name", name="uq_school_division_name"
        ),
    )


class Section(db.Model):
    __tablename__ = "sections"

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )
    section_name = db.Column(db.String(10), nullable=False)

    __table_args__ = (
        db.UniqueConstraint("school_id", "section_name", name="uq_school_section_name"),
    )


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

            # SECURITY: this had no authorization check at all beyond a
            # valid token of ANY kind — any logged-in student, teacher,
            # or admin from ANY school could edit ANY student's profile
            # by passing an arbitrary id. The route (/api/student/update/
            # <id>) is a self-service endpoint, so restrict it to the
            # student editing their own record.
            caller = getattr(request, "user", None)
            if not isinstance(caller, Student) or caller.id != id:
                return jsonify({"error": "Forbidden"}), 403

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
            db.session.rollback()
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
            db.session.rollback()
            return jsonify({"error": "Something went wrong"}), 500


# ============================================================
# STUDENT ROSTER (Academic Admin's Students section)
# ============================================================
def _student_summary(
    student, record=None, academic=None, division=None, section=None, batch=None
):
    return {
        "id": student.id,
        "student_id": student.student_id,
        "first_name": student.first_name,
        "middle_name": student.middle_name,
        "last_name": student.last_name,
        "email": student.email,
        "mobile": student.mobile,
        "gender": student.gender,
        "status": student.status,
        "admission_date": (
            student.admission_date.isoformat() if student.admission_date else None
        ),
        "academic_class_id": academic.id if academic else None,
        "batch_name": batch.batch_name if batch else None,
        "division_name": division.division_name if division else None,
        "section_name": section.section_name if section else None,
        "roll_number": record.roll_number if record else None,
    }


class AdminStudentsListAPI(MethodView):
    """
    Roster for the Academic Admin's Students section. Lists every
    student together with their current class (if assigned), and
    supports searching by name/student ID/mobile plus filtering by
    class or "unassigned" (enrolled account but no current class
    record - shouldn't normally happen, but worth surfacing rather
    than silently hiding).
    """

    # BUG FIX: this was gated on the "academic" module, but neither the
    # Academic Admin nor the Accounts Admin default role is granted
    # "academic" (they're granted the "students" module - see
    # DEFAULT_ROLES in rolePermissionManagement.py). That meant this
    # roster endpoint 403'd for every non-super-admin caller. "students"
    # is the correct module for a student roster.
    @permission_required("students", "view")
    def get(self):
        try:
            search = str(request.args.get("search") or "").strip()
            academic_class_id = request.args.get("academic_class_id", type=int)
            status = str(request.args.get("status") or "").strip()
            unassigned_only = (
                str(request.args.get("unassigned") or "").lower() == "true"
            )

            query = Student.query.filter(Student.school_id == _current_school_id())

            if search:
                like = f"%{search}%"
                query = query.filter(
                    or_(
                        Student.first_name.ilike(like),
                        Student.last_name.ilike(like),
                        Student.student_id.ilike(like),
                        Student.mobile.ilike(like),
                        Student.email.ilike(like),
                    )
                )

            if status and status.lower() != "all":
                query = query.filter(Student.status == status)

            students = query.order_by(Student.first_name.asc()).all()

            student_ids = [s.id for s in students]

            records = (
                StudentAcademicRecord.query.filter(
                    StudentAcademicRecord.student_id.in_(student_ids),
                    StudentAcademicRecord.is_current == True,
                ).all()
                if student_ids
                else []
            )
            record_by_student = {r.student_id: r for r in records}

            class_ids = list({r.academic_class_id for r in records})
            academics = (
                AcademicClass.query.filter(AcademicClass.id.in_(class_ids)).all()
                if class_ids
                else []
            )
            academic_by_id = {a.id: a for a in academics}

            division_ids = list({a.division_id for a in academics})
            section_ids = list({a.section_id for a in academics})
            batch_ids = list({a.batch_id for a in academics})

            divisions_by_id = (
                {
                    d.id: d
                    for d in Division.query.filter(Division.id.in_(division_ids)).all()
                }
                if division_ids
                else {}
            )
            sections_by_id = (
                {
                    s.id: s
                    for s in Section.query.filter(Section.id.in_(section_ids)).all()
                }
                if section_ids
                else {}
            )
            batches_by_id = (
                {b.id: b for b in Batch.query.filter(Batch.id.in_(batch_ids)).all()}
                if batch_ids
                else {}
            )

            rows = []
            unassigned_count = 0

            for student in students:
                record = record_by_student.get(student.id)
                academic = (
                    academic_by_id.get(record.academic_class_id) if record else None
                )
                division = (
                    divisions_by_id.get(academic.division_id) if academic else None
                )
                section = sections_by_id.get(academic.section_id) if academic else None
                batch = batches_by_id.get(academic.batch_id) if academic else None

                if not academic:
                    unassigned_count += 1

                if academic_class_id and (
                    not academic or academic.id != academic_class_id
                ):
                    continue

                if unassigned_only and academic:
                    continue

                rows.append(
                    _student_summary(
                        student, record, academic, division, section, batch
                    )
                )

            return (
                jsonify(
                    {
                        "success": True,
                        "students": rows,
                        "stats": {
                            "total": len(students),
                            "active": sum(1 for s in students if s.status == "Active"),
                            "inactive": sum(
                                1 for s in students if s.status != "Active"
                            ),
                            "unassigned": unassigned_count,
                        },
                    }
                ),
                200,
            )

        except Exception as e:
            logger.exception(f"AdminStudentsListAPI error: {e}")
            return jsonify({"success": False, "error": "Failed to load students"}), 500
