from utils.auth import db
from utils.auth_middleware import login_required, get_current_user
from utils.studentDetails import (
    Student,
    StudentAcademicRecord,
    AcademicClass,
    Division,
    Batch,
    Section,
)
from utils.Notifications import Notification, ActivityLog, create_notification
from utils.teacherDetails import Teacher
from flask import request, jsonify
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


# Teacher
class TeacherLeave(db.Model):
    __tablename__ = "teacher_leaves"

    id = db.Column(db.Integer, primary_key=True)

    teacher_id = db.Column(
        db.Integer, db.ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False
    )

    leave_type = db.Column(db.Enum("CL", "SL"), nullable=False)
    from_date = db.Column(db.Date, nullable=False)
    to_date = db.Column(db.Date, nullable=False)
    total_days = db.Column(db.Integer, nullable=False)

    reason = db.Column(db.Text)

    status = db.Column(db.Enum("Pending", "Approved", "Rejected"), default="Pending")

    applied_at = db.Column(db.DateTime, default=datetime.utcnow)
    approved_at = db.Column(db.DateTime)
    rejected_at = db.Column(db.DateTime)

    approved_by = db.Column(db.Integer)


class TeacherLeaveBalance(db.Model):
    __tablename__ = "teacher_leave_balance"

    id = db.Column(db.Integer, primary_key=True)

    teacher_id = db.Column(
        db.Integer, db.ForeignKey("teachers.id", ondelete="CASCADE"), unique=True
    )

    casual_leave = db.Column(db.Integer, default=10)
    sick_leave = db.Column(db.Integer, default=8)
    used_leave = db.Column(db.Integer, default=0)


# Student
class StudentLeave(db.Model):
    __tablename__ = "student_leaves"

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(
        db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )

    leave_type = db.Column(db.Enum("Sick", "Casual", "Emergency"), default="Casual")

    from_date = db.Column(db.Date, nullable=False)
    to_date = db.Column(db.Date, nullable=False)

    total_days = db.Column(db.Integer, nullable=False)

    reason = db.Column(db.Text)

    status = db.Column(db.Enum("Pending", "Approved", "Rejected"), default="Pending")

    applied_at = db.Column(db.DateTime, default=datetime.utcnow)

    approved_at = db.Column(db.DateTime)
    rejected_at = db.Column(db.DateTime)

    approved_by = db.Column(db.Integer)


# APPLY LEAVE
# Teacher
class ApplyLeave(MethodView):

    @login_required
    def post(self):
        try:
            data = request.get_json()

            if not data:
                return jsonify({"error": "Invalid JSON payload"}), 400

            current_user = get_current_user()

            # 🔒 ROLE CHECK
            if current_user.role != "teacher":
                return jsonify({"error": "Only teachers can apply"}), 403

            teacher_id = current_user.id

            leave_type = data.get("leave_type")
            from_date_str = data.get("from_date")
            to_date_str = data.get("to_date")
            reason = data.get("reason", "").strip()

            if not all([leave_type, from_date_str, to_date_str]):
                return jsonify({"error": "All fields required"}), 400

            if leave_type not in ["CL", "SL"]:
                return jsonify({"error": "Invalid leave type"}), 400

            from_date = datetime.strptime(from_date_str, "%Y-%m-%d").date()
            to_date = datetime.strptime(to_date_str, "%Y-%m-%d").date()

            if from_date > to_date:
                return jsonify({"error": "Invalid date range"}), 400

            total_days = (to_date - from_date).days + 1

            # 🔥 OVERLAP CHECK
            overlap = TeacherLeave.query.filter(
                TeacherLeave.teacher_id == teacher_id,
                TeacherLeave.status != "Rejected",
                TeacherLeave.from_date <= to_date,
                TeacherLeave.to_date >= from_date,
            ).first()

            if overlap:
                return jsonify({"error": "Leave overlap detected"}), 409

            leave = TeacherLeave(
                teacher_id=teacher_id,
                leave_type=leave_type,
                from_date=from_date,
                to_date=to_date,
                total_days=total_days,
                reason=reason,
            )

            db.session.add(leave)
            db.session.commit()

            return jsonify({"message": "Leave applied successfully"}), 201

        except Exception:
            db.session.rollback()
            logger.exception("Apply leave failed")
            return jsonify({"error": "Something went wrong"}), 500


# Student
class ApplyStudentLeave(MethodView):

    @login_required
    def post(self):
        try:
            data = request.get_json()
            current_user = get_current_user()

            if current_user.role != "student":
                return jsonify({"error": "Only students can apply"}), 403

            if not data.get("from_date") or not data.get("to_date"):
                return jsonify({"error": "Dates required"}), 400

            student_id = current_user.id

            from_date = datetime.strptime(data["from_date"], "%Y-%m-%d").date()
            to_date = datetime.strptime(data["to_date"], "%Y-%m-%d").date()
            leave_type = data.get("leave_type", "Casual")
            reason = data.get("reason", "")

            if from_date > to_date:
                return jsonify({"error": "Invalid date range"}), 400

            total_days = (to_date - from_date).days + 1

            # 🔥 OVERLAP CHECK
            overlap = StudentLeave.query.filter(
                StudentLeave.student_id == student_id,
                StudentLeave.status != "Rejected",
                StudentLeave.from_date <= to_date,
                StudentLeave.to_date >= from_date,
            ).first()

            if overlap:
                return jsonify({"error": "Leave overlap detected"}), 409

            leave = StudentLeave(
                student_id=student_id,
                leave_type=leave_type,
                from_date=from_date,
                to_date=to_date,
                total_days=total_days,
                reason=reason,
            )

            db.session.add(leave)
            db.session.flush()  # ✅ ensure leave.id is available

            # 🔔 GET STUDENT NAME
            student = Student.query.get(student_id)
            student_name = (
                f"{student.first_name} {student.last_name}"
                if student
                else f"ID {student_id}"
            )

            # 🔔 FIND CLASS TEACHERS
            record = StudentAcademicRecord.query.filter_by(
                student_id=student_id, is_current=True
            ).first()

            teachers = Teacher.query.all()

            # 🔁 FALLBACK (IMPORTANT)
            if not teachers:
                teachers = Teacher.query.all()

            # 🔔 CREATE NOTIFICATIONS
            for t in teachers:
                create_notification(
                    user_id=t.id,
                    role="teacher",
                    title="New Leave Request",
                    message=f"{student_name} applied leave from {from_date} to {to_date}",
                    type="leave",
                    student_id=student_id,
                    leave_id=leave.id,
                )

            db.session.commit()

            return jsonify({"message": "Leave applied successfully"}), 201

        except Exception:
            db.session.rollback()
            logger.exception("Student leave apply failed")
            return jsonify({"error": "Something went wrong"}), 500


# ===========================
# LEAVE HISTORY
# ===========================
# Teacher
class TeacherLeaveHistory(MethodView):

    @login_required
    def get(self):
        try:
            current_user = get_current_user()
            teacher_id = current_user.id

            leaves = (
                TeacherLeave.query.filter_by(teacher_id=teacher_id)
                .order_by(TeacherLeave.applied_at.desc())
                .all()
            )

            return (
                jsonify(
                    {
                        "count": len(leaves),
                        "leaves": [
                            {
                                "id": l.id,
                                "type": l.leave_type,
                                "from": l.from_date.strftime("%Y-%m-%d"),
                                "to": l.to_date.strftime("%Y-%m-%d"),
                                "days": l.total_days,
                                "status": l.status,
                                "reason": l.reason,
                                "applied_at": l.applied_at.strftime("%Y-%m-%d %H:%M"),
                            }
                            for l in leaves
                        ],
                    }
                ),
                200,
            )

        except Exception:
            logger.exception("Fetch leave history failed")
            return jsonify({"error": "Failed to fetch leave history"}), 500


# Student
class StudentLeaveHistory(MethodView):

    @login_required
    def get(self):
        try:
            current_user = get_current_user()

            if current_user.role != "student":
                return jsonify({"error": "Unauthorized"}), 403

            leaves = (
                StudentLeave.query.filter_by(student_id=current_user.id)
                .order_by(StudentLeave.applied_at.desc())
                .all()
            )

            return jsonify(
                [
                    {
                        "id": l.id,
                        "type": l.leave_type,
                        "from": l.from_date.strftime("%Y-%m-%d"),
                        "to": l.to_date.strftime("%Y-%m-%d"),
                        "days": l.total_days,
                        "status": l.status,
                        "reason": l.reason,
                        # ✅ APPLIED DATE
                        "applied_at": (
                            l.applied_at.strftime("%Y-%m-%d %H:%M")
                            if l.applied_at
                            else None
                        ),
                        # ✅ APPROVAL / REJECTION DATES
                        "approved_at": (
                            l.approved_at.strftime("%Y-%m-%d %H:%M")
                            if l.approved_at
                            else None
                        ),
                        "rejected_at": (
                            l.rejected_at.strftime("%Y-%m-%d %H:%M")
                            if l.rejected_at
                            else None
                        ),
                    }
                    for l in leaves
                ]
            )

        except Exception:
            logger.exception("Fetch student leave history failed")
            return jsonify({"error": "Failed"}), 500


# DELETE API (Student Leave)
class DeleteStudentLeave(MethodView):

    @login_required
    def delete(self, leave_id):
        try:
            current_user = get_current_user()

            if current_user.role != "student":
                return jsonify({"error": "Only students can delete leave"}), 403

            leave = StudentLeave.query.filter_by(
                id=leave_id, student_id=current_user.id
            ).first()

            if not leave:
                return jsonify({"error": "Leave not found"}), 404

            # 🔒 ONLY PENDING CAN BE DELETED
            if leave.status != "Pending":
                return jsonify({"error": "Only pending leaves can be deleted"}), 400

            db.session.delete(leave)
            db.session.commit()

            return jsonify({"message": "Leave deleted successfully"}), 200

        except Exception:
            db.session.rollback()
            logger.exception("Delete leave failed")
            return jsonify({"error": "Failed to delete leave"}), 500


# ===========================
# LEAVE BALANCE API
# ===========================


class TeacherLeaveBalanceAPI(MethodView):

    @login_required
    def get(self):
        try:
            current_user = get_current_user()
            teacher_id = current_user.id

            balance = TeacherLeaveBalance.query.filter_by(teacher_id=teacher_id).first()

            # 🔥 AUTO CREATE BALANCE
            if not balance:
                balance = TeacherLeaveBalance(teacher_id=teacher_id)
                db.session.add(balance)
                db.session.commit()

            return (
                jsonify(
                    {
                        "casual_leave": balance.casual_leave,
                        "sick_leave": balance.sick_leave,
                        "used_leave": balance.used_leave,
                    }
                ),
                200,
            )

        except Exception:
            logger.exception("Balance fetch failed")
            return jsonify({"error": "Failed to fetch balance"}), 500


# APPROVE / REJECT LEAVE (ADMIN)
# Student- ADMIN / TEACHER APPROVE STUDENT LEAVE
class UpdateStudentLeaveStatus(MethodView):

    @login_required
    def post(self, leave_id):
        try:
            current_user = get_current_user()

            # 🔒 ROLE CHECK
            if current_user.role not in ["admin", "teacher"]:
                return jsonify({"error": "Unauthorized"}), 403

            data = request.get_json()
            status = data.get("status")

            if status not in ["Approved", "Rejected"]:
                return jsonify({"error": "Invalid status"}), 400

            leave = StudentLeave.query.get(leave_id)

            if not leave:
                return jsonify({"error": "Leave not found"}), 404

            if leave.status != "Pending":
                return jsonify({"error": "Already processed"}), 400

            # ✅ UPDATE STATUS
            leave.status = status
            leave.approved_by = current_user.id

            if status == "Approved":
                leave.approved_at = datetime.utcnow()
            else:
                leave.rejected_at = datetime.utcnow()

            # =====================================================
            # 🔥 FETCH STUDENT + CLASS DETAILS (MAIN FEATURE)
            # =====================================================
            student = Student.query.get(leave.student_id)

            student_name = "Unknown Student"
            batch_name = ""
            division_name = ""
            section_name = ""

            if student:
                student_name = f"{student.first_name} {student.last_name}"

                record = StudentAcademicRecord.query.filter_by(
                    student_id=student.id, is_current=True
                ).first()

                if record:
                    academic = AcademicClass.query.get(record.academic_class_id)

                    if academic:
                        batch = Batch.query.get(academic.batch_id)
                        division = Division.query.get(academic.division_id)
                        section = Section.query.get(academic.section_id)

                        batch_name = batch.batch_name if batch else ""
                        division_name = division.division_name if division else ""
                        section_name = section.section_name if section else ""

            # =====================================================
            # 🧾 ACTIVITY LOG (ENHANCED)
            # =====================================================
            db.session.add(
                ActivityLog(
                    user_id=current_user.id,
                    role=current_user.role,
                    action=f"{status}_STUDENT_LEAVE",
                    description=(
                        f"{current_user.role.upper()} {status} leave of "
                        f"{student_name} "
                        f"({batch_name} - {division_name} - {section_name}) | "
                        f"{leave.from_date} → {leave.to_date}"
                    ),
                )
            )

            # =====================================================
            # 🔔 OPTIONAL: NOTIFY STUDENT
            # =====================================================
            create_notification(
                user_id=leave.student_id,
                role="student",
                title=f"Leave {status}",
                message=f"Your leave ({leave.from_date} → {leave.to_date}) has been {status.lower()}",
                type="leave",
                student_id=leave.student_id,
                leave_id=leave.id,
            )

            db.session.commit()

            return jsonify({"message": f"Leave {status} successfully"}), 200

        except Exception:
            db.session.rollback()
            logger.exception("Student leave update failed")
            return jsonify({"error": "Failed"}), 500


# Teacher
class UpdateLeaveStatus(MethodView):

    @login_required
    def post(self, leave_id):
        try:
            current_user = get_current_user()

            # 🔒 ONLY ADMIN
            if current_user.role != "admin":
                return jsonify({"error": "Only admin can approve teacher leave"}), 403

            data = request.get_json()
            status = data.get("status")

            if status not in ["Approved", "Rejected"]:
                return jsonify({"error": "Invalid status"}), 400

            leave = TeacherLeave.query.get(leave_id)

            if not leave:
                return jsonify({"error": "Leave not found"}), 404

            if leave.status != "Pending":
                return jsonify({"error": "Already processed"}), 400

            balance = TeacherLeaveBalance.query.filter_by(
                teacher_id=leave.teacher_id
            ).first()

            if not balance:
                balance = TeacherLeaveBalance(teacher_id=leave.teacher_id)
                db.session.add(balance)

            # ✅ APPROVE
            if status == "Approved":

                if leave.leave_type == "CL" and balance.casual_leave < leave.total_days:
                    return jsonify({"error": "Insufficient Casual Leave"}), 400

                if leave.leave_type == "SL" and balance.sick_leave < leave.total_days:
                    return jsonify({"error": "Insufficient Sick Leave"}), 400

                leave.status = "Approved"
                leave.approved_at = datetime.utcnow()
                leave.approved_by = current_user.id

                if leave.leave_type == "CL":
                    balance.casual_leave -= leave.total_days
                else:
                    balance.sick_leave -= leave.total_days

                balance.used_leave += leave.total_days

            # ❌ REJECT
            else:
                leave.status = "Rejected"
                leave.rejected_at = datetime.utcnow()
                leave.approved_by = current_user.id

            # 🧾 ACTIVITY LOG
            db.session.add(
                ActivityLog(
                    user_id=current_user.id,
                    role="admin",
                    action=f"{leave.status}_TEACHER_LEAVE",
                    description=f"Leave ID {leave.id} {leave.status}",
                )
            )

            db.session.commit()  # ✅ CRITICAL FIX

            return jsonify({"message": f"Leave {leave.status} successfully"}), 200

        except Exception:
            db.session.rollback()
            logger.exception("Leave update failed")
            return jsonify({"error": "Failed to update leave"}), 500


class AllStudentLeaves(MethodView):

    @login_required
    def get(self):
        current_user = get_current_user()

        if current_user.role not in ["teacher", "admin"]:
            return jsonify({"error": "Unauthorized"}), 403

        leaves = StudentLeave.query.order_by(StudentLeave.applied_at.desc()).all()

        result = []

        for l in leaves:
            student = Student.query.get(l.student_id)

            student_name = None
            division_name = None
            batch_name = None
            section_name = None

            if student:
                student_name = f"{student.first_name} {student.last_name}"

                # 🔥 GET CLASS DETAILS
                record = StudentAcademicRecord.query.filter_by(
                    student_id=student.id, is_current=True
                ).first()

                if record:
                    academic = AcademicClass.query.get(record.academic_class_id)

                    if academic:
                        batch = Batch.query.get(academic.batch_id)
                        division = Division.query.get(academic.division_id)
                        section = Section.query.get(academic.section_id)

                        batch_name = batch.batch_name if batch else None
                        division_name = division.division_name if division else None
                        section_name = section.section_name if section else None

            result.append(
                {
                    "id": l.id,
                    "student_id": l.student_id,
                    "student_name": student_name,
                    "type": l.leave_type,
                    "from": l.from_date.strftime("%Y-%m-%d"),
                    "to": l.to_date.strftime("%Y-%m-%d"),
                    "days": l.total_days,
                    "reason": l.reason,
                    "status": l.status,
                    "batch": batch_name,
                    "division": division_name,
                    "section": section_name,
                }
            )

        return jsonify(result)
