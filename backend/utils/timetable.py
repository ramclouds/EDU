import logging
from flask import jsonify
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError
from utils.auth import db, Teacher
from utils.auth_middleware import login_required
from utils.studentDetails import StudentAcademicRecord, AcademicClass, Division, Section
from utils.examResult import Subject

from io import BytesIO
from flask import send_file
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import inch

logger = logging.getLogger(__name__)


# MODEL
class Timetable(db.Model):
    __tablename__ = "timetable"

    id = db.Column(db.Integer, primary_key=True)

    academic_class_id = db.Column(db.Integer, nullable=False)

    day = db.Column(
        db.Enum("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"),
        nullable=False,
    )

    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)

    subject_name = db.Column(db.String(50), nullable=False)

    teacher_id = db.Column(db.Integer)

    created_at = db.Column(db.DateTime, server_default=db.func.now())


class StudentTimetableAPI(MethodView):
    @login_required
    def get(self, student_id):
        try:
            # VALIDATION
            try:
                student_id = int(student_id)
                if student_id <= 0:
                    return jsonify({"error": "Invalid student id"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Student id must be an integer"}), 400

            # GET CURRENT CLASS
            record = StudentAcademicRecord.query.filter_by(
                student_id=student_id, is_current=True
            ).first()

            if not record:
                return jsonify({"error": "No academic record found"}), 404

            academic_class_id = record.academic_class_id

            # FETCH TIMETABLE
            rows = (
                Timetable.query.filter_by(academic_class_id=academic_class_id)
                .order_by(Timetable.day, Timetable.start_time)
                .all()
            )

            if not rows:
                return jsonify({"class_id": academic_class_id, "timetable": {}}), 200

            # FORMAT (FRONTEND READY)
            timetable = {}

            for r in rows:
                try:
                    day = r.day

                    if day not in timetable:
                        timetable[day] = []

                    timetable[day].append(
                        {
                            "start_time": (
                                r.start_time.strftime("%H:%M") if r.start_time else None
                            ),
                            "end_time": (
                                r.end_time.strftime("%H:%M") if r.end_time else None
                            ),
                            "subject": r.subject_name,
                        }
                    )

                except Exception as e:
                    logger.warning(f"Skipping invalid timetable row: {e}")

            return jsonify({"class_id": academic_class_id, "timetable": timetable}), 200

        except SQLAlchemyError as db_err:
            logger.error(f"Database error: {db_err}")
            db.session.rollback()
            return jsonify({"error": "Database error occurred"}), 500

        except Exception as e:
            logger.exception(f"StudentTimetableAPI error: {e}")
            return jsonify({"error": "Something went wrong"}), 500


class TeacherTimetable(db.Model):
    __tablename__ = "teacher_timetable"

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

    day = db.Column(
        db.Enum("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"),
        nullable=False,
    )

    period_no = db.Column(db.Integer, nullable=False)

    start_time = db.Column(db.Time, nullable=False)

    end_time = db.Column(db.Time, nullable=False)

    room_no = db.Column(db.String(30))

    is_lab = db.Column(db.Boolean, default=False)

    is_extra_class = db.Column(db.Boolean, default=False)

    remarks = db.Column(db.String(255))

    created_at = db.Column(db.DateTime, server_default=db.func.now())

    updated_at = db.Column(
        db.DateTime, server_default=db.func.now(), onupdate=db.func.now()
    )

    __table_args__ = (
        db.UniqueConstraint("teacher_id", "day", "start_time", name="uq_teacher_slot"),
        db.UniqueConstraint(
            "academic_class_id", "day", "start_time", name="uq_class_slot"
        ),
        db.UniqueConstraint("teacher_id", "day", "period_no", name="uq_teacher_period"),
    )


# ======================================
# TEACHER TIMETABLE API
# ======================================
class TeacherTimetableAPI(MethodView):

    @login_required
    def get(self, teacher_id):

        try:
            # -------------------
            # VALIDATION
            # -------------------
            try:
                teacher_id = int(teacher_id)

                if teacher_id <= 0:
                    return jsonify({"error": "Invalid teacher id"}), 400

            except (ValueError, TypeError):
                return jsonify({"error": "Teacher id must be integer"}), 400

            teacher = Teacher.query.get(teacher_id)

            if not teacher:
                return jsonify({"error": "Teacher not found"}), 404

            # -------------------
            # FETCH TIMETABLE
            # -------------------
            rows = (
                TeacherTimetable.query.filter_by(teacher_id=teacher_id)
                .order_by(TeacherTimetable.day, TeacherTimetable.start_time)
                .all()
            )

            if not rows:
                return jsonify({"teacher_id": teacher_id, "timetable": {}}), 200

            # -------------------
            # FORMAT RESPONSE
            # -------------------
            timetable = {}

            for r in rows:
                try:

                    day = r.day

                    if day not in timetable:
                        timetable[day] = []

                    # CLASS LOOKUP
                    academic = AcademicClass.query.get(r.academic_class_id)

                    class_name = None

                    if academic:
                        division = Division.query.get(academic.division_id)

                        section = Section.query.get(academic.section_id)

                        if division and section:
                            class_name = (
                                f"{division.division_name}-" f"{section.section_name}"
                            )

                    # SUBJECT LOOKUP
                    subject = Subject.query.get(r.subject_id)

                    timetable[day].append(
                        {
                            "class_name": class_name,
                            "subject": (subject.subject_name if subject else None),
                            "start_time": r.start_time.strftime("%H:%M"),
                            "end_time": r.end_time.strftime("%H:%M"),
                            "period": r.period_no,
                            "room": r.room_no,
                            "is_lab": r.is_lab,
                            "is_extra_class": r.is_extra_class,
                            "remarks": r.remarks,
                        }
                    )

                except Exception as row_err:
                    logger.warning(f"Skipping invalid timetable row: {row_err}")

            return jsonify({"teacher_id": teacher_id, "timetable": timetable}), 200

        except SQLAlchemyError as db_err:
            logger.error(f"Database error: {db_err}")
            db.session.rollback()

            return jsonify({"error": "Database error occurred"}), 500

        except Exception as e:
            logger.exception(f"TeacherTimetableAPI error: {e}")

            return jsonify({"error": "Something went wrong"}), 500


# DOWNLOAD PDF API
class DownloadTeacherTimetablePDFAPI(MethodView):

    @login_required
    def get(self, teacher_id):

        try:

            # --------------------------
            # VALIDATION
            # --------------------------
            try:

                teacher_id = int(teacher_id)

                if teacher_id <= 0:
                    return jsonify({"error": "Invalid teacher id"}), 400

            except (ValueError, TypeError):

                return jsonify({"error": "Teacher id must be integer"}), 400

            # --------------------------
            # FETCH TEACHER
            # --------------------------
            teacher = Teacher.query.get(teacher_id)

            if not teacher:
                return jsonify({"error": "Teacher not found"}), 404

            # --------------------------
            # FETCH TIMETABLE
            # --------------------------
            rows = (
                TeacherTimetable.query.filter_by(teacher_id=teacher_id)
                .order_by(TeacherTimetable.day, TeacherTimetable.period_no)
                .all()
            )

            if not rows:
                return jsonify({"error": "No timetable found"}), 404

            # --------------------------
            # PDF BUFFER
            # --------------------------
            buffer = BytesIO()

            # --------------------------
            # PDF DOCUMENT
            # --------------------------
            doc = SimpleDocTemplate(
                buffer,
                pagesize=landscape(A4),
                rightMargin=20,
                leftMargin=20,
                topMargin=20,
                bottomMargin=20,
            )

            elements = []

            styles = getSampleStyleSheet()

            # --------------------------
            # TEACHER NAME
            # --------------------------
            teacher_name = " ".join(
                filter(
                    None, [teacher.first_name, teacher.middle_name, teacher.last_name]
                )
            )

            # --------------------------
            # TITLE
            # --------------------------
            title = Paragraph(
                f"<b>{teacher_name} - Weekly Timetable</b>", styles["Title"]
            )

            elements.append(title)

            elements.append(Spacer(1, 0.25 * inch))

            # --------------------------
            # DAY + PERIOD ORDER
            # --------------------------
            days_order = [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
            ]

            periods_order = [1, 2, 3, 4, 5, 6]

            # --------------------------
            # CREATE LOOKUP
            # --------------------------
            timetable_map = {}

            for r in rows:

                try:

                    # --------------------------
                    # CLASS NAME
                    # --------------------------
                    academic = AcademicClass.query.get(r.academic_class_id)

                    class_name = "-"

                    if academic:

                        division = Division.query.get(academic.division_id)

                        section = Section.query.get(academic.section_id)

                        if division and section:

                            class_name = (
                                f"{division.division_name}-" f"{section.section_name}"
                            )

                    # --------------------------
                    # SUBJECT NAME
                    # --------------------------
                    subject = Subject.query.get(r.subject_id)

                    subject_name = subject.subject_name if subject else "-"

                    # --------------------------
                    # CELL CONTENT
                    # --------------------------
                    cell = (
                        f"{subject_name}\n\n"
                        f"{class_name}\n\n"
                        f"{r.start_time.strftime('%H:%M')} - "
                        f"{r.end_time.strftime('%H:%M')}\n\n"
                        f"Room {r.room_no or '-'}"
                    )

                    # EXTRA CLASS
                    if r.is_extra_class:
                        cell += "\n\nExtra Class"

                    # LAB
                    if r.is_lab:
                        cell += "\nLab"

                    timetable_map[(r.day, r.period_no)] = cell

                except Exception as row_err:

                    logger.warning(f"Skipping invalid row: {row_err}")

            # --------------------------
            # TABLE HEADER
            # --------------------------
            data = [
                [
                    "Day",
                    "Period 1",
                    "Period 2",
                    "Period 3",
                    "Period 4",
                    "Period 5",
                    "Period 6",
                ]
            ]

            # --------------------------
            # TABLE ROWS
            # --------------------------
            for day in days_order:

                row = [day]

                for period in periods_order:

                    row.append(timetable_map.get((day, period), ""))

                data.append(row)

            # --------------------------
            # CREATE TABLE
            # --------------------------
            table = Table(
                data, repeatRows=1, colWidths=[70, 100, 100, 100, 100, 100, 100]
            )

            # --------------------------
            # TABLE STYLE
            # --------------------------
            table.setStyle(
                TableStyle(
                    [
                        # HEADER
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, 0), 10),
                        # DAY COLUMN
                        ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#EEF2FF")),
                        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 1), (0, -1), 9),
                        # BODY
                        ("FONTNAME", (1, 1), (-1, -1), "Helvetica"),
                        ("FONTSIZE", (1, 1), (-1, -1), 8),
                        # ALIGN
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        # GRID
                        ("GRID", (0, 0), (-1, -1), 1, colors.grey),
                        # PADDING
                        ("TOPPADDING", (0, 0), (-1, -1), 10),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                        ("LEFTPADDING", (0, 0), (-1, -1), 5),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                    ]
                )
            )

            elements.append(table)

            # --------------------------
            # BUILD PDF
            # --------------------------
            doc.build(elements)

            buffer.seek(0)

            # --------------------------
            # RETURN PDF
            # --------------------------
            return send_file(
                buffer,
                as_attachment=True,
                download_name=(f"teacher_{teacher_id}_timetable.pdf"),
                mimetype="application/pdf",
            )

        except SQLAlchemyError as db_err:

            logger.error(f"Database error: {db_err}")

            db.session.rollback()

            return jsonify({"error": "Database error occurred"}), 500

        except Exception as e:

            logger.exception(f"DownloadTeacherTimetablePDFAPI error: {e}")

            return jsonify({"error": str(e)}), 500
