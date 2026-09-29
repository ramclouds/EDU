from flask import jsonify, send_file, request
from flask.views import MethodView
from sqlalchemy import func, extract, case, and_, or_
from sqlalchemy.exc import SQLAlchemyError
from math import ceil
from sqlalchemy.orm import joinedload
from utils.auth import db, Student
from utils.auth_middleware import login_required, get_current_user
from utils.rolePermissionManagement import permission_required
from utils.studentDetails import StudentAcademicRecord, AcademicClass, Division, Section
from utils.teacherDetails import TeacherClass
from datetime import datetime
import calendar
import io
import logging
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter, A4, landscape
from reportlab.lib import colors
from utils.teacherDetails import Teacher

logger = logging.getLogger(__name__)


class TeacherAttendance(db.Model):
    __tablename__ = "teacher_attendance"

    id = db.Column(db.Integer, primary_key=True)

    teacher_id = db.Column(
        db.Integer,
        db.ForeignKey("teachers.id", ondelete="CASCADE"),
        nullable=False,
    )

    attendance_date = db.Column(db.Date, nullable=False)

    status = db.Column(
        db.Enum("Present", "Absent", "Late"),
        nullable=False,
        default="Present",
    )

    reason = db.Column(db.String(255))
    marked_by_role = db.Column(
        db.Enum("Teacher", "Admin"),
        nullable=False,
        default="Admin",
    )

    marked_by_user_id = db.Column(
        db.Integer,
        nullable=True,
    )

    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now(),
    )
    created_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
    )

    __table_args__ = (
        db.UniqueConstraint(
            "teacher_id",
            "attendance_date",
            name="unique_teacher_attendance",
        ),
    )


class AttendanceSession(db.Model):
    __tablename__ = "attendance_sessions"

    id = db.Column(db.Integer, primary_key=True)
    academic_class_id = db.Column(
        db.Integer, db.ForeignKey("academic_classes.id"), nullable=False
    )
    session_date = db.Column(db.Date, nullable=False)
    teacher_id = db.Column(
        db.Integer,
        db.ForeignKey("teachers.id"),
        nullable=True,
    )

    marked_by_role = db.Column(
        db.Enum("Teacher", "Admin"),
        nullable=False,
        default="Teacher",
    )

    marked_by_user_id = db.Column(
        db.Integer,
        nullable=True,
    )

    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now(),
    )
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    __table_args__ = (
        db.UniqueConstraint(
            "academic_class_id",
            "session_date",
            name="uq_attendance_session",
        ),
    )


class AttendanceAudit(db.Model):

    __tablename__ = "attendance_audit"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    attendance_record_id = db.Column(
        db.Integer,
        nullable=False,
    )

    old_status = db.Column(
        db.String(20),
    )

    new_status = db.Column(
        db.String(20),
    )

    changed_by_role = db.Column(
        db.String(20),
    )

    changed_by_user_id = db.Column(
        db.Integer,
    )

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
    )


class AttendanceRecord(db.Model):
    __tablename__ = "attendance_records"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(
        db.Integer,
        db.ForeignKey("attendance_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    student_id = db.Column(
        db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    status = db.Column(db.Enum("Present", "Absent", "Late"), nullable=False)
    remarks = db.Column(
        db.Text,
        nullable=True,
    )
    marked_by_role = db.Column(
        db.Enum("Teacher", "Admin"),
        nullable=False,
        default="Teacher",
    )

    marked_by_user_id = db.Column(
        db.Integer,
        nullable=True,
    )

    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now(),
    )
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    session = db.relationship("AttendanceSession", backref="attendance_records")
    __table_args__ = (
        db.UniqueConstraint("session_id", "student_id", name="unique_student_session"),
    )


# =========================================================
# STUDENT ATTENDANCE SUMMARY API
# =========================================================
class StudentAttendanceAPI(MethodView):

    @login_required
    def get(self, student_id):
        try:

            student_id = int(student_id)
            # TOTAL
            total = (
                db.session.query(func.count(AttendanceRecord.id))
                .filter(AttendanceRecord.student_id == student_id)
                .scalar()
                or 0
            )

            # PRESENT
            present = (
                db.session.query(func.count(AttendanceRecord.id))
                .filter(
                    AttendanceRecord.student_id == student_id,
                    AttendanceRecord.status == "Present",
                )
                .scalar()
                or 0
            )

            # ABSENT
            absent = (
                db.session.query(func.count(AttendanceRecord.id))
                .filter(
                    AttendanceRecord.student_id == student_id,
                    AttendanceRecord.status == "Absent",
                )
                .scalar()
                or 0
            )

            # LATE
            late = (
                db.session.query(func.count(AttendanceRecord.id))
                .filter(
                    AttendanceRecord.student_id == student_id,
                    AttendanceRecord.status == "Late",
                )
                .scalar()
                or 0
            )

            attendance_percent = round((present / total) * 100, 2) if total else 0

            # MONTHLY STATS
            monthly_data = (
                db.session.query(
                    extract("month", AttendanceSession.session_date).label("month"),
                    func.count(AttendanceRecord.id).label("total"),
                    func.sum(
                        case((AttendanceRecord.status == "Present", 1), else_=0)
                    ).label("present"),
                )
                .join(
                    AttendanceSession,
                    AttendanceRecord.session_id == AttendanceSession.id,
                )
                .filter(AttendanceRecord.student_id == student_id)
                .group_by("month")
                .all()
            )

            monthly = []

            for row in monthly_data:

                total_month = row.total or 0
                present_month = row.present or 0

                percent = (
                    round((present_month / total_month) * 100, 2) if total_month else 0
                )

                monthly.append({"month": int(row.month), "percentage": percent})

            # RECENT RECORDS
            records_query = (
                db.session.query(AttendanceRecord, AttendanceSession)
                .join(
                    AttendanceSession,
                    AttendanceRecord.session_id == AttendanceSession.id,
                )
                .filter(AttendanceRecord.student_id == student_id)
                .order_by(AttendanceSession.session_date.desc())
                .limit(10)
                .all()
            )

            records = []

            for attendance, session in records_query:

                records.append(
                    {
                        "date": session.session_date.strftime("%d %b %Y"),
                        "day": session.session_date.strftime("%A"),
                        "status": attendance.status,
                        "remarks": attendance.remarks or "-",
                    }
                )

            return (
                jsonify(
                    {
                        "summary": {
                            "attendance_percent": attendance_percent,
                            "present": present,
                            "absent": absent,
                            "late": late,
                        },
                        "monthly": monthly,
                        "records": records,
                    }
                ),
                200,
            )

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Something went wrong"}), 500


# =========================================================
# TEACHER ASSIGNED CLASSES
# =========================================================
class TeacherAssignedClassesAPI(MethodView):

    @login_required
    def get(self, teacher_id):

        try:

            teacher_id = int(teacher_id)
            mappings = TeacherClass.query.filter_by(teacher_id=teacher_id).all()
            result = []

            for m in mappings:

                academic = AcademicClass.query.get(m.academic_class_id)

                if academic:
                    division = Division.query.get(academic.division_id)
                    section = Section.query.get(academic.section_id)
                    result.append(
                        {
                            "academic_class_id": academic.id,
                            "class_name": (
                                f"{division.division_name} " f"{section.section_name}"
                                if division and section
                                else None
                            ),
                        }
                    )

            return jsonify(result), 200

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Something went wrong"}), 500


# =========================================================
# STUDENTS BY CLASS
# =========================================================
class StudentsByClassAPI(MethodView):

    @login_required
    def get(self, academic_class_id):

        try:
            academic_class_id = int(academic_class_id)
            academic_class = AcademicClass.query.get(academic_class_id)
            division = None
            section = None
            class_label = None

            if academic_class:
                division = Division.query.get(academic_class.division_id)
                section = Section.query.get(academic_class.section_id)
                if division and section:
                    class_label = f"{division.division_name}-" f"{section.section_name}"

            records = StudentAcademicRecord.query.filter_by(
                academic_class_id=academic_class_id, is_current=True
            ).all()

            students = []
            for r in records:
                student = Student.query.get(r.student_id)
                if student:
                    students.append(
                        {
                            "student_id": student.id,
                            "name": f"{student.first_name} " f"{student.last_name}",
                            "roll_number": r.roll_number,
                            "class_label": class_label,
                        }
                    )

            return jsonify(students), 200

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Something went wrong"}), 500


# =========================================================
# MARK ATTENDANCE API
# =========================================================
class AttendanceMarkAPI(MethodView):
    @login_required
    def post(self):

        try:
            current_user = get_current_user()
            if not current_user:
                return jsonify({"error": "Unauthorized"}), 401

            data = request.get_json(silent=True)
            if not data:
                return jsonify({"error": "JSON body required"}), 400

            academic_class_id = data.get("academic_class_id")
            teacher_id = data.get("teacher_id")
            date = data.get("date")

            attendance_list = data.get("attendance", [])

            if not academic_class_id:
                return jsonify({"error": "academic_class_id required"}), 400

            if not date:
                return jsonify({"error": "date required"}), 400

            session_date = datetime.strptime(date, "%Y-%m-%d").date()

            # CHECK SESSION
            session = AttendanceSession.query.filter(
                AttendanceSession.academic_class_id == academic_class_id,
                AttendanceSession.session_date == session_date,
            ).first()

            # CREATE SESSION
            if not session:

                session = AttendanceSession(
                    academic_class_id=academic_class_id,
                    session_date=session_date,
                    teacher_id=teacher_id,
                )

                try:

                    db.session.add(session)
                    db.session.flush()

                except SQLAlchemyError:

                    db.session.rollback()
                    session = AttendanceSession.query.filter(
                        AttendanceSession.academic_class_id == academic_class_id,
                        AttendanceSession.session_date == session_date,
                    ).first()

                    if not session:
                        raise

            session.marked_by_role = (
                "Admin" if current_user.__class__.__name__ == "Admin" else "Teacher"
            )

            session.marked_by_user_id = current_user.id

            # SAVE RECORDS
            for item in attendance_list:

                student_id = item.get("student_id")
                status = item.get("status")
                remarks = item.get("remarks")

                existing = AttendanceRecord.query.filter_by(
                    session_id=session.id, student_id=student_id
                ).first()

                if existing:

                    existing.status = status
                    existing.remarks = remarks
                    existing.marked_by_role = "Teacher"
                    existing.marked_by_user_id = teacher_id

                else:

                    db.session.add(
                        AttendanceRecord(
                            session_id=session.id,
                            student_id=student_id,
                            status=status,
                            remarks=remarks,
                            marked_by_role="Teacher",
                            marked_by_user_id=teacher_id,
                        )
                    )

            db.session.commit()

            return (
                jsonify(
                    {
                        "message": "Attendance saved successfully",
                        "session_id": session.id,
                    }
                ),
                200,
            )

        except Exception as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"error": str(e)}), 500


# =========================================================
# GET ATTENDANCE BY DATE
# =========================================================
class GetAttendanceByDateAPI(MethodView):
    @login_required
    def get(self):
        try:
            academic_class_id = request.args.get("academic_class_id")
            date = request.args.get("date")
            date_obj = datetime.strptime(date, "%Y-%m-%d").date()
            session = AttendanceSession.query.filter_by(
                academic_class_id=academic_class_id,
                session_date=date_obj,
            ).first()

            if not session:
                return jsonify({}), 200

            records = AttendanceRecord.query.filter_by(session_id=session.id).all()
            result = {}

            for r in records:
                result[r.student_id] = {
                    "status": r.status,
                    "remarks": r.remarks,
                    "marked_by": getattr(
                        r,
                        "marked_by_role",
                        "Teacher",
                    ),
                    "updated_at": (
                        r.updated_at.strftime("%d %b %Y %I:%M %p")
                        if getattr(
                            r,
                            "updated_at",
                            None,
                        )
                        else None
                    ),
                }
            return jsonify(result), 200

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Something went wrong"}), 500


# =========================================================
# PDF DOWNLOAD API
# =========================================================
class DownloadAttendancePDF(MethodView):

    @login_required
    def get(self, student_id):

        try:

            student_id = int(student_id)

            records = (
                db.session.query(AttendanceRecord, AttendanceSession)
                .join(
                    AttendanceSession,
                    AttendanceRecord.session_id == AttendanceSession.id,
                )
                .filter(AttendanceRecord.student_id == student_id)
                .order_by(AttendanceSession.session_date.desc())
                .all()
            )

            if not records:
                return jsonify({"error": "No attendance records found"}), 404

            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer)
            data = [["Date", "Day", "Status", "Remarks"]]

            for attendance, session in records:

                data.append(
                    [
                        session.session_date.strftime("%d-%m-%Y"),
                        session.session_date.strftime("%A"),
                        session.period_no or "-",
                        attendance.status,
                        attendance.remarks or "-",
                    ]
                )

            table = Table(data)
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ]
                )
            )

            doc.build([table])

            buffer.seek(0)

            return send_file(
                buffer,
                as_attachment=True,
                download_name=f"attendance_report_{student_id}.pdf",
                mimetype="application/pdf",
            )

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Something went wrong"}), 500


# =========================================================
# DOWNLOAD MONTHLY ATTENDANCE REPORT (TEACHER SIDE)
# =========================================================
class DownloadTeacherAttendanceReportAPI(MethodView):

    @login_required
    def get(self):

        try:

            # =====================================================
            # QUERY PARAMS
            # =====================================================

            academic_class_id = request.args.get("academic_class_id", type=int)

            subject_id = request.args.get("subject_id", type=int)

            month = request.args.get("month", type=int)

            year = request.args.get("year", type=int)

            teacher_id = request.args.get("teacher_id", type=int)

            # =====================================================
            # VALIDATION
            # =====================================================

            if not academic_class_id:
                return jsonify({"error": "academic_class_id required"}), 400

            if not subject_id:
                return jsonify({"error": "subject_id required"}), 400

            if not month:
                return jsonify({"error": "month required"}), 400

            if not year:
                return jsonify({"error": "year required"}), 400

            # =====================================================
            # FETCH CLASS + SUBJECT
            # =====================================================

            academic_class = AcademicClass.query.get(academic_class_id)

            if not academic_class:
                return jsonify({"error": "Class not found"}), 404

            division = Division.query.get(academic_class.division_id)

            section = Section.query.get(academic_class.section_id)

            class_name = f"{division.division_name} " f"{section.section_name}"

            # =====================================================
            # FETCH SESSIONS
            # =====================================================

            sessions = (
                AttendanceSession.query.filter(
                    AttendanceSession.academic_class_id == academic_class_id,
                    AttendanceSession.subject_id == subject_id,
                    AttendanceSession.teacher_id == teacher_id,
                    and_(
                        db.extract("month", AttendanceSession.session_date) == month,
                        db.extract("year", AttendanceSession.session_date) == year,
                    ),
                )
                .order_by(AttendanceSession.session_date.asc())
                .all()
            )

            if not sessions:
                return jsonify({"error": "No attendance found"}), 404

            session_ids = [s.id for s in sessions]

            # =====================================================
            # FETCH RECORDS
            # =====================================================

            records = (
                db.session.query(AttendanceRecord, AttendanceSession, Student)
                .join(
                    AttendanceSession,
                    AttendanceRecord.session_id == AttendanceSession.id,
                )
                .join(Student, AttendanceRecord.student_id == Student.id)
                .filter(AttendanceRecord.session_id.in_(session_ids))
                .order_by(AttendanceSession.session_date.asc())
                .all()
            )

            # =====================================================
            # GENERATE PDF
            # =====================================================

            buffer = io.BytesIO()

            doc = SimpleDocTemplate(
                buffer,
                pagesize=landscape(A4),
                rightMargin=20,
                leftMargin=20,
                topMargin=20,
                bottomMargin=20,
            )

            styles = getSampleStyleSheet()

            elements = []

            # =====================================================
            # HEADER
            # =====================================================

            title = Paragraph(
                f"""
                <b>Attendance Report</b><br/>
                Class: {class_name}<br/>
                Month: {calendar.month_name[month]} {year}
                """,
                styles["Title"],
            )

            elements.append(title)
            elements.append(Spacer(1, 20))

            # =====================================================
            # TABLE
            # =====================================================

            data = [["Date", "Roll No", "Student Name", "Status", "Remarks"]]

            for attendance, session, student in records:

                student_record = StudentAcademicRecord.query.filter_by(
                    student_id=student.id,
                    academic_class_id=academic_class_id,
                    is_current=True,
                ).first()

                roll_number = student_record.roll_number if student_record else "-"

                data.append(
                    [
                        session.session_date.strftime("%d-%m-%Y"),
                        session.period_no or "-",
                        roll_number,
                        f"{student.first_name} " f"{student.last_name}",
                        attendance.status,
                        attendance.remarks or "-",
                    ]
                )

            table = Table(data, repeatRows=1)

            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("GRID", (0, 0), (-1, -1), 1, colors.black),
                        ("FONTSIZE", (0, 0), (-1, -1), 9),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                        ("BACKGROUND", (0, 1), (-1, -1), colors.whitesmoke),
                    ]
                )
            )

            elements.append(table)

            # =====================================================
            # BUILD PDF
            # =====================================================

            doc.build(elements)

            buffer.seek(0)

            filename = f"attendance_" f"{class_name}_" f"{month}_{year}.pdf"

            return send_file(
                buffer,
                as_attachment=True,
                download_name=filename,
                mimetype="application/pdf",
            )

        except Exception as e:

            logger.exception(e)

            return jsonify({"error": "Failed to generate report"}), 500


# =========================================================
# ATTENDANCE FILTER OPTIONS API
# =========================================================
class AttendanceFilterOptionsAPI(MethodView):

    @permission_required("academic", "view")
    def get(self):

        try:

            classes = (
                db.session.query(
                    AcademicClass.id,
                    Division.division_name,
                    Section.section_name,
                )
                .join(
                    Division,
                    Division.id == AcademicClass.division_id,
                )
                .join(
                    Section,
                    Section.id == AcademicClass.section_id,
                )
                .order_by(
                    Division.division_name,
                    Section.section_name,
                )
                .all()
            )

            class_list = []
            divisions = []

            for cls in classes:

                class_list.append(
                    {
                        "id": cls.id,
                        "class_name": (f"{cls.division_name} " f"{cls.section_name}"),
                        "division": cls.division_name,
                        "section": cls.section_name,
                    }
                )

                if cls.division_name not in divisions:
                    divisions.append(cls.division_name)

            return (
                jsonify(
                    {
                        "classes": class_list,
                        "divisions": divisions,
                    }
                ),
                200,
            )

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to load filters"}), 500


# =========================================================
# ADMIN ATTENDANCE STATS API
# =========================================================
class AdminAttendanceStatsAPI(MethodView):

    @permission_required("academic", "view")
    def get(self):

        try:

            role = request.args.get("role", "students")
            date = request.args.get("date")

            if not date:
                return jsonify({"error": "date required"}), 400

            attendance_date = datetime.strptime(date, "%Y-%m-%d").date()

            # =====================================================
            # STUDENT ATTENDANCE
            # =====================================================

            if role == "students":

                query = (
                    db.session.query(AttendanceRecord)
                    .join(
                        AttendanceSession,
                        AttendanceRecord.session_id == AttendanceSession.id,
                    )
                    .filter(AttendanceSession.session_date == attendance_date)
                )

                total = query.count()

                present = query.filter(AttendanceRecord.status == "Present").count()

                absent = query.filter(AttendanceRecord.status == "Absent").count()

                late = query.filter(AttendanceRecord.status == "Late").count()

                percentage = round((present / total) * 100, 2) if total else 0

                return (
                    jsonify(
                        {
                            "present": present,
                            "absent": absent,
                            "late": late,
                            "total": total,
                            "percentage": percentage,
                        }
                    ),
                    200,
                )

            # =====================================================
            # TEACHER ATTENDANCE
            # =====================================================

            teacher_query = TeacherAttendance.query.filter(
                TeacherAttendance.attendance_date == attendance_date
            )

            total = teacher_query.count()
            present = teacher_query.filter(
                TeacherAttendance.status == "Present"
            ).count()

            absent = teacher_query.filter(TeacherAttendance.status == "Absent").count()
            late = teacher_query.filter(TeacherAttendance.status == "Late").count()
            percentage = round((present / total) * 100, 2) if total else 0

            return (
                jsonify(
                    {
                        "present": present,
                        "absent": absent,
                        "late": late,
                        "total": total,
                        "percentage": percentage,
                    }
                ),
                200,
            )

        except Exception as e:

            logger.exception(e)

            return jsonify({"error": "Failed to fetch attendance stats"}), 500


# =========================================================
# ADMIN ATTENDANCE LIST API
# =========================================================
class AdminAttendanceListAPI(MethodView):

    @permission_required("academic", "view")
    def get(self):

        try:

            role = request.args.get("role", "students")
            search = request.args.get("search", "").strip()
            date = request.args.get("date")
            status = request.args.get("status")
            class_id = request.args.get("class_id", type=int)
            division = request.args.get("division")
            page = request.args.get("page", 1, type=int)
            limit = request.args.get("limit", 20, type=int)

            if page < 1:
                page = 1

            if limit > 100:
                limit = 100

            offset = (page - 1) * limit

            # =====================================================
            # STUDENTS
            # =====================================================

            if role == "students":

                if not date:
                    return jsonify({"error": "date required"}), 400

                attendance_date = datetime.strptime(date, "%Y-%m-%d").date()

                query = (
                    db.session.query(
                        Student.id.label("student_id"),
                        Student.first_name,
                        Student.last_name,
                        StudentAcademicRecord.roll_number,
                        AcademicClass.id.label("class_id"),
                        Division.division_name,
                        Section.section_name,
                        AttendanceSession.id.label("session_id"),
                        AttendanceRecord.id.label("record_id"),
                        AttendanceRecord.status,
                        AttendanceRecord.remarks,
                    )
                    .select_from(Student)
                    .join(
                        StudentAcademicRecord,
                        and_(
                            StudentAcademicRecord.student_id == Student.id,
                            StudentAcademicRecord.is_current.is_(True),
                        ),
                    )
                    .join(
                        AcademicClass,
                        AcademicClass.id == StudentAcademicRecord.academic_class_id,
                    )
                    .join(
                        Division,
                        Division.id == AcademicClass.division_id,
                    )
                    .join(
                        Section,
                        Section.id == AcademicClass.section_id,
                    )
                    .outerjoin(
                        AttendanceSession,
                        and_(
                            AttendanceSession.academic_class_id == AcademicClass.id,
                            AttendanceSession.session_date == attendance_date,
                        ),
                    )
                    .outerjoin(
                        AttendanceRecord,
                        and_(
                            AttendanceRecord.session_id == AttendanceSession.id,
                            AttendanceRecord.student_id == Student.id,
                        ),
                    )
                )

                if division:
                    query = query.filter(Division.division_name == division)

                if class_id:
                    query = query.filter(AcademicClass.id == class_id)

                if status:

                    if status == "Not Marked":

                        query = query.filter(AttendanceRecord.id.is_(None))

                    else:

                        query = query.filter(AttendanceRecord.status == status)

                if search:

                    query = query.filter(
                        or_(
                            Student.first_name.ilike(f"%{search}%"),
                            Student.last_name.ilike(f"%{search}%"),
                        )
                    )
                total = query.count()

                records = (
                    query.order_by(AttendanceSession.session_date.desc())
                    .offset(offset)
                    .limit(limit)
                    .all()
                )

                items = []

                for row in records:

                    items.append(
                        {
                            "record_id": row.record_id,
                            "student_id": row.student_id,
                            "session_id": row.session_id,
                            "name": f"{row.first_name} {row.last_name}",
                            "role": "Student",
                            "roll_number": row.roll_number,
                            "class_id": row.class_id,
                            "status": row.status if row.status else "Not Marked",
                            "reason": row.remarks,
                            "date": attendance_date.strftime("%d %b %Y"),
                        }
                    )

                return (
                    jsonify(
                        {
                            "items": items,
                            "total": total,
                            "page": page,
                            "pages": ceil(total / limit),
                        }
                    ),
                    200,
                )

            # =====================================================
            # TEACHERS
            # =====================================================
            if not date:
                return jsonify({"error": "date required"}), 400

            attendance_date = datetime.strptime(date, "%Y-%m-%d").date()

            query = (
                db.session.query(
                    Teacher.id.label("teacher_id"),
                    Teacher.first_name,
                    Teacher.last_name,
                    TeacherAttendance.id.label("record_id"),
                    TeacherAttendance.status,
                    TeacherAttendance.reason,
                    TeacherAttendance.attendance_date,
                    TeacherAttendance.marked_by_role,
                    TeacherAttendance.updated_at,
                )
                .select_from(Teacher)
                .outerjoin(
                    TeacherAttendance,
                    and_(
                        TeacherAttendance.teacher_id == Teacher.id,
                        TeacherAttendance.attendance_date == attendance_date,
                    ),
                )
            )

            if status:

                if status == "Not Marked":
                    query = query.filter(TeacherAttendance.id.is_(None))

                else:

                    query = query.filter(TeacherAttendance.status == status)

            if search:

                query = query.filter(
                    or_(
                        Teacher.first_name.ilike(f"%{search}%"),
                        Teacher.last_name.ilike(f"%{search}%"),
                    )
                )

            total = query.count()

            records = (
                query.order_by(Teacher.first_name.asc())
                .offset(offset)
                .limit(limit)
                .all()
            )

            items = []

            for row in records:

                items.append(
                    {
                        "record_id": row.record_id,
                        "teacher_id": row.teacher_id,
                        "name": f"{row.first_name} {row.last_name}",
                        "role": "Teacher",
                        "status": (row.status if row.status else "Not Marked"),
                        "reason": row.reason,
                        "date": attendance_date.strftime("%d %b %Y"),
                        "marked_by": row.marked_by_role,
                        "updated_at": (
                            row.updated_at.strftime("%d %b %Y %H:%M")
                            if row.updated_at
                            else None
                        ),
                    }
                )

            return (
                jsonify(
                    {
                        "items": items,
                        "total": total,
                        "page": page,
                        "pages": ceil(total / limit),
                    }
                ),
                200,
            )

        except Exception as e:

            logger.exception(e)

            return jsonify({"error": "Failed to fetch attendance"}), 500


# =========================================================
# UPDATE ATTENDANCE STATUS API
# =========================================================
class UpdateAttendanceStatusAPI(MethodView):

    @permission_required("academic", "edit")
    def put(self):

        try:

            current_user = get_current_user()

            if not current_user:
                return jsonify({"error": "Unauthorized"}), 401

            data = request.get_json()

            role = data.get("role")
            record_id = data.get("record_id")

            status = data.get("status")
            remarks = data.get("remarks", "")

            VALID_STATUS = [
                "Present",
                "Absent",
                "Late",
            ]

            if status not in VALID_STATUS:
                return jsonify({"error": "Invalid status"}), 400

            # ==========================================
            # STUDENT ATTENDANCE
            # ==========================================
            if role == "students":

                if record_id:

                    record = AttendanceRecord.query.get(record_id)

                    if not record:
                        return jsonify({"error": "Attendance record not found"}), 404

                    record.status = status
                    record.remarks = remarks
                    record.marked_by_role = "Admin"
                    record.marked_by_user_id = current_user.id

                else:

                    student_id = data.get("student_id")
                    session_id = data.get("session_id")
                    class_id = data.get("class_id")
                    date = data.get("date")

                    if not student_id:
                        return jsonify({"error": "student_id required"}), 400

                    if not date:
                        return jsonify({"error": "date required"}), 400

                    attendance_date = datetime.strptime(date, "%Y-%m-%d").date()

                    session = AttendanceSession.query.filter(
                        AttendanceSession.academic_class_id == class_id,
                        AttendanceSession.session_date == attendance_date,
                    ).first()

                    if not session:

                        session = AttendanceSession(
                            academic_class_id=class_id,
                            session_date=attendance_date,
                            teacher_id=None,
                            marked_by_role="Admin",
                            marked_by_user_id=current_user.id,
                        )

                    db.session.add(session)
                    db.session.flush()

                record = AttendanceRecord.query.filter_by(
                    session_id=session.id,
                    student_id=student_id,
                ).first()

                if record:
                    record.status = status
                    record.remarks = remarks

                else:

                    record = AttendanceRecord(
                        session_id=session.id,
                        student_id=student_id,
                        status=status,
                        remarks=remarks,
                        marked_by_role="Admin",
                        marked_by_user_id=current_user.id,
                    )

                    db.session.add(record)

            # ==========================================
            # TEACHER ATTENDANCE
            # ==========================================
            else:

                if record_id:

                    teacher_record = TeacherAttendance.query.get(record_id)

                    if not teacher_record:
                        return (
                            jsonify({"error": "Teacher attendance record not found"}),
                            404,
                        )

                    teacher_record.status = status
                    teacher_record.reason = remarks
                    teacher_record.marked_by_role = "Admin"
                    teacher_record.marked_by_user_id = current_user.id

                else:

                    teacher_id = data.get("teacher_id")

                    date = data.get("date")

                    if not teacher_id:
                        return jsonify({"error": "teacher_id required"}), 400

                    if not date:
                        return jsonify({"error": "date required"}), 400

                    attendance_date = datetime.strptime(date, "%Y-%m-%d").date()

                    teacher_record = TeacherAttendance(
                        teacher_id=teacher_id,
                        attendance_date=attendance_date,
                        status=status,
                        reason=remarks,
                        marked_by_role="Admin",
                        marked_by_user_id=current_user.id,
                    )

                    db.session.add(teacher_record)

            db.session.commit()

            return (
                jsonify(
                    {
                        "message": "Attendance updated successfully",
                        "record_id": (
                            record.id if role == "students" else teacher_record.id
                        ),
                    }
                ),
                200,
            )

        except Exception as e:

            db.session.rollback()
            logger.exception(e)

            return jsonify({"error": "Failed to update attendance"}), 500


# =========================================================
# MARK ALL ATTENDANCE API
# =========================================================
# =========================================================
# MARK ALL ATTENDANCE API
# =========================================================
class MarkAllAttendanceAPI(MethodView):
    """
    BUG FIX: this previously required the caller to already know an
    AttendanceSession's numeric id (`session_id` in the request body)
    and 404'd with "Session not found" otherwise - but no session
    exists yet the first time attendance is marked for a class on a
    given day, and the frontend never had a session id to send in the
    first place (it only knows academic_class_id + date). Every
    "Mark All" click was therefore guaranteed to fail with a
    session-related error, regardless of what class was selected.

    Now mirrors the same get-or-create session pattern already used
    by UpdateAttendanceStatusAPI (single-record marking), and marks
    every student currently enrolled in the class - not just students
    who already happened to have an attendance row.
    """

    @permission_required("academic", "edit")
    def post(self):

        try:
            current_user = get_current_user()

            if not current_user:
                return jsonify({"error": "Unauthorized"}), 401

            data = request.get_json() or {}

            role = data.get("role", "students")
            status = data.get("status")
            date = data.get("date")

            VALID_STATUS = [
                "Present",
                "Absent",
                "Late",
            ]

            if status not in VALID_STATUS:
                return jsonify({"error": "Invalid status"}), 400

            if not date:
                return jsonify({"error": "date is required"}), 400

            try:
                attendance_date = datetime.strptime(date, "%Y-%m-%d").date()
            except ValueError:
                return (
                    jsonify(
                        {"error": "Invalid date format, expected YYYY-MM-DD"}
                    ),
                    400,
                )

            # =====================================================
            # STUDENTS
            # =====================================================
            if role == "students":

                academic_class_id = data.get("academic_class_id") or data.get(
                    "class_id"
                )

                if not academic_class_id:
                    return (
                        jsonify({"error": "academic_class_id is required"}),
                        400,
                    )

                if not AcademicClass.query.get(academic_class_id):
                    return jsonify({"error": "Class not found"}), 404

                session = AttendanceSession.query.filter(
                    AttendanceSession.academic_class_id == academic_class_id,
                    AttendanceSession.session_date == attendance_date,
                ).first()

                if not session:
                    session = AttendanceSession(
                        academic_class_id=academic_class_id,
                        session_date=attendance_date,
                        teacher_id=None,
                        marked_by_role="Admin",
                        marked_by_user_id=current_user.id,
                    )
                    db.session.add(session)
                    db.session.flush()

                student_ids = [
                    row.student_id
                    for row in StudentAcademicRecord.query.filter_by(
                        academic_class_id=academic_class_id,
                        is_current=True,
                    ).all()
                ]

                if not student_ids:
                    return (
                        jsonify({"error": "No students found in this class"}),
                        404,
                    )

                existing_records = {
                    r.student_id: r
                    for r in AttendanceRecord.query.filter_by(
                        session_id=session.id
                    ).all()
                }

                marked_count = 0

                for student_id in student_ids:
                    record = existing_records.get(student_id)

                    if record:
                        record.status = status
                        record.marked_by_role = "Admin"
                        record.marked_by_user_id = current_user.id
                    else:
                        db.session.add(
                            AttendanceRecord(
                                session_id=session.id,
                                student_id=student_id,
                                status=status,
                                marked_by_role="Admin",
                                marked_by_user_id=current_user.id,
                            )
                        )

                    marked_count += 1

                db.session.commit()

                return (
                    jsonify(
                        {
                            "message": f"Marked {marked_count} student(s) {status}",
                            "session_id": session.id,
                            "marked_count": marked_count,
                        }
                    ),
                    200,
                )

            # =====================================================
            # TEACHERS
            # =====================================================
            teachers = Teacher.query.filter_by(status="Active").all()

            if not teachers:
                return jsonify({"error": "No active teachers found"}), 404

            existing_records = {
                r.teacher_id: r
                for r in TeacherAttendance.query.filter_by(
                    attendance_date=attendance_date
                ).all()
            }

            marked_count = 0

            for teacher in teachers:
                record = existing_records.get(teacher.id)

                if record:
                    record.status = status
                    record.marked_by_role = "Admin"
                    record.marked_by_user_id = current_user.id
                else:
                    db.session.add(
                        TeacherAttendance(
                            teacher_id=teacher.id,
                            attendance_date=attendance_date,
                            status=status,
                            marked_by_role="Admin",
                            marked_by_user_id=current_user.id,
                        )
                    )

                marked_count += 1

            db.session.commit()

            return (
                jsonify(
                    {
                        "message": f"Marked {marked_count} teacher(s) {status}",
                        "marked_count": marked_count,
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            db.session.rollback()
            logger.exception(e)
            return jsonify({"error": "Database error"}), 500

        except Exception as e:

            db.session.rollback()
            logger.exception(e)

            return jsonify({"error": "Failed to mark attendance"}), 500
