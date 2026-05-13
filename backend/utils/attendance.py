from flask import jsonify, send_file, request
from flask.views import MethodView
from sqlalchemy import func, extract, case, and_
from sqlalchemy.exc import SQLAlchemyError
from utils.auth import db, Student
from utils.auth_middleware import login_required
from utils.studentDetails import StudentAcademicRecord, AcademicClass, Division, Section
from utils.teacherDetails import TeacherClass
from utils.examResult import Subject
from datetime import datetime
import calendar
import io
import logging
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter, A4, landscape
from reportlab.lib import colors

logger = logging.getLogger(__name__)


class AttendanceSession(db.Model):
    __tablename__ = "attendance_sessions"

    id = db.Column(db.Integer, primary_key=True)
    academic_class_id = db.Column(
        db.Integer, db.ForeignKey("academic_classes.id"), nullable=False
    )
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id"), nullable=False)
    session_date = db.Column(db.Date, nullable=False)
    period_no = db.Column(db.Integer)
    teacher_id = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    subject = db.relationship("Subject", backref="attendance_sessions")


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
    remarks = db.Column(db.String(255))
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
                db.session.query(AttendanceRecord, AttendanceSession, Subject)
                .join(
                    AttendanceSession,
                    AttendanceRecord.session_id == AttendanceSession.id,
                )
                .join(Subject, AttendanceSession.subject_id == Subject.id)
                .filter(AttendanceRecord.student_id == student_id)
                .order_by(AttendanceSession.session_date.desc())
                .limit(10)
                .all()
            )

            records = []

            for attendance, session, subject in records_query:

                records.append(
                    {
                        "date": session.session_date.strftime("%d %b %Y"),
                        "day": session.session_date.strftime("%A"),
                        "subject": subject.subject_name,
                        "period_no": session.period_no,
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
                subject = Subject.query.get(m.subject_id)

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
                            "subject_id": subject.id if subject else None,
                            "subject_name": subject.subject_name if subject else None,
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
            data = request.get_json(silent=True)
            if not data:
                return jsonify({"error": "JSON body required"}), 400

            academic_class_id = data.get("academic_class_id")
            subject_id = data.get("subject_id")
            teacher_id = data.get("teacher_id")
            period_no = data.get("period_no")
            date = data.get("date")

            attendance_list = data.get("attendance", [])

            if not academic_class_id:
                return jsonify({"error": "academic_class_id required"}), 400

            if not subject_id:
                return jsonify({"error": "subject_id required"}), 400

            if not date:
                return jsonify({"error": "date required"}), 400

            session_date = datetime.strptime(date, "%Y-%m-%d").date()

            # CHECK SESSION
            session = AttendanceSession.query.filter_by(
                academic_class_id=academic_class_id,
                subject_id=subject_id,
                session_date=session_date,
                period_no=period_no,
            ).first()

            # CREATE SESSION
            if not session:

                session = AttendanceSession(
                    academic_class_id=academic_class_id,
                    subject_id=subject_id,
                    session_date=session_date,
                    period_no=period_no,
                    teacher_id=teacher_id,
                )

                db.session.add(session)
                db.session.flush()

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

                else:

                    db.session.add(
                        AttendanceRecord(
                            session_id=session.id,
                            student_id=student_id,
                            status=status,
                            remarks=remarks,
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
            subject_id = request.args.get("subject_id")
            period_no = request.args.get("period_no")
            date = request.args.get("date")
            date_obj = datetime.strptime(date, "%Y-%m-%d").date()
            session = AttendanceSession.query.filter_by(
                academic_class_id=academic_class_id,
                subject_id=subject_id,
                session_date=date_obj,
                period_no=period_no,
            ).first()

            if not session:
                return jsonify({}), 200

            records = AttendanceRecord.query.filter_by(session_id=session.id).all()
            result = {}

            for r in records:
                result[r.student_id] = {"status": r.status, "remarks": r.remarks}
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
                db.session.query(AttendanceRecord, AttendanceSession, Subject)
                .join(
                    AttendanceSession,
                    AttendanceRecord.session_id == AttendanceSession.id,
                )
                .join(Subject, AttendanceSession.subject_id == Subject.id)
                .filter(AttendanceRecord.student_id == student_id)
                .order_by(AttendanceSession.session_date.desc())
                .all()
            )

            if not records:
                return jsonify({"error": "No attendance records found"}), 404

            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer)
            data = [["Date", "Day", "Subject", "Period", "Status", "Remarks"]]

            for attendance, session, subject in records:

                data.append(
                    [
                        session.session_date.strftime("%d-%m-%Y"),
                        session.session_date.strftime("%A"),
                        subject.subject_name,
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

            academic_class_id = request.args.get(
                "academic_class_id",
                type=int
            )

            subject_id = request.args.get(
                "subject_id",
                type=int
            )

            month = request.args.get(
                "month",
                type=int
            )

            year = request.args.get(
                "year",
                type=int
            )

            teacher_id = request.args.get(
                "teacher_id",
                type=int
            )

            # =====================================================
            # VALIDATION
            # =====================================================

            if not academic_class_id:
                return jsonify({
                    "error": "academic_class_id required"
                }), 400

            if not subject_id:
                return jsonify({
                    "error": "subject_id required"
                }), 400

            if not month:
                return jsonify({
                    "error": "month required"
                }), 400

            if not year:
                return jsonify({
                    "error": "year required"
                }), 400

            # =====================================================
            # FETCH CLASS + SUBJECT
            # =====================================================

            academic_class = AcademicClass.query.get(
                academic_class_id
            )

            subject = Subject.query.get(subject_id)

            if not academic_class:
                return jsonify({
                    "error": "Class not found"
                }), 404

            if not subject:
                return jsonify({
                    "error": "Subject not found"
                }), 404

            division = Division.query.get(
                academic_class.division_id
            )

            section = Section.query.get(
                academic_class.section_id
            )

            class_name = (
                f"{division.division_name} "
                f"{section.section_name}"
            )

            # =====================================================
            # FETCH SESSIONS
            # =====================================================

            sessions = (
                AttendanceSession.query
                .filter(
                    AttendanceSession.academic_class_id
                    == academic_class_id,

                    AttendanceSession.subject_id
                    == subject_id,

                    AttendanceSession.teacher_id
                    == teacher_id,

                    and_(
                        db.extract(
                            "month",
                            AttendanceSession.session_date
                        ) == month,

                        db.extract(
                            "year",
                            AttendanceSession.session_date
                        ) == year
                    )
                )
                .order_by(
                    AttendanceSession.session_date.asc()
                )
                .all()
            )

            if not sessions:
                return jsonify({
                    "error": "No attendance found"
                }), 404

            session_ids = [s.id for s in sessions]

            # =====================================================
            # FETCH RECORDS
            # =====================================================

            records = (
                db.session.query(
                    AttendanceRecord,
                    AttendanceSession,
                    Student
                )
                .join(
                    AttendanceSession,
                    AttendanceRecord.session_id
                    == AttendanceSession.id
                )
                .join(
                    Student,
                    AttendanceRecord.student_id
                    == Student.id
                )
                .filter(
                    AttendanceRecord.session_id.in_(
                        session_ids
                    )
                )
                .order_by(
                    AttendanceSession.session_date.asc()
                )
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
                Subject: {subject.subject_name}<br/>
                Month: {calendar.month_name[month]} {year}
                """,
                styles["Title"]
            )

            elements.append(title)
            elements.append(Spacer(1, 20))

            # =====================================================
            # TABLE
            # =====================================================

            data = [[
                "Date",
                "Period",
                "Roll No",
                "Student Name",
                "Status",
                "Remarks"
            ]]

            for attendance, session, student in records:

                student_record = (
                    StudentAcademicRecord.query
                    .filter_by(
                        student_id=student.id,
                        academic_class_id=academic_class_id,
                        is_current=True
                    )
                    .first()
                )

                roll_number = (
                    student_record.roll_number
                    if student_record else "-"
                )

                data.append([
                    session.session_date.strftime(
                        "%d-%m-%Y"
                    ),

                    session.period_no or "-",

                    roll_number,

                    f"{student.first_name} "
                    f"{student.last_name}",

                    attendance.status,

                    attendance.remarks or "-"
                ])

            table = Table(data, repeatRows=1)

            table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),

                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),

                    ("GRID", (0, 0), (-1, -1), 1, colors.black),

                    ("FONTSIZE", (0, 0), (-1, -1), 9),

                    ("BOTTOMPADDING", (0, 0), (-1, 0), 10),

                    ("BACKGROUND", (0, 1), (-1, -1), colors.whitesmoke),
                ])
            )

            elements.append(table)

            # =====================================================
            # BUILD PDF
            # =====================================================

            doc.build(elements)

            buffer.seek(0)

            filename = (
                f"attendance_"
                f"{class_name}_"
                f"{subject.subject_name}_"
                f"{month}_{year}.pdf"
            )

            return send_file(
                buffer,
                as_attachment=True,
                download_name=filename,
                mimetype="application/pdf"
            )

        except Exception as e:

            logger.exception(e)

            return jsonify({
                "error": "Failed to generate report"
            }), 500