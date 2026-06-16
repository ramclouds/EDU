import logging
from flask import jsonify, request
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
class TimetableLecture(db.Model):
    __tablename__ = "timetable_lectures"

    id = db.Column(db.Integer, primary_key=True)
    academic_class_id = db.Column(
        db.Integer, db.ForeignKey("academic_classes.id"), nullable=False
    )

    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id"), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id"), nullable=False)
    day = db.Column(
        db.Enum("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"),
        nullable=False,
    )

    period_no = db.Column(db.Integer, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    room_no = db.Column(db.String(50))
    lecture_type = db.Column(db.String(30), default="Theory")
    remarks = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime, server_default=db.func.now(), onupdate=db.func.now()
    )

    __table_args__ = (
        db.UniqueConstraint(
            "academic_class_id", "day", "period_no", name="uq_class_period"
        ),
        db.UniqueConstraint("teacher_id", "day", "period_no", name="uq_teacher_period"),
    )


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


class TimetableOptionsAPI(MethodView):
    @login_required
    def get(self):
        try:
            teachers = Teacher.query.all()
            subjects = Subject.query.all()
            classes = AcademicClass.query.all()
            divisions = Division.query.all()
            sections = Section.query.all()

            # Create lookup maps
            division_map = {d.id: d.division_name for d in divisions}
            section_map = {s.id: s.section_name for s in sections}

            # Build class response
            classes_response = []

            for c in classes:
                division_name = division_map.get(c.division_id, "")
                section_name = section_map.get(c.section_id, "")

                display_name = "-".join(
                    filter(
                        None,
                        [
                            division_name,
                            section_name,
                        ],
                    )
                )

                classes_response.append(
                    {
                        "id": c.id,
                        "batch_id": c.batch_id,
                        "division_id": c.division_id,
                        "section_id": c.section_id,
                        # Keep old field for compatibility
                        "class_name": display_name or f"Class {c.id}",
                        # New field
                        "display_name": display_name or f"Class {c.id}",
                    }
                )

            return jsonify(
                {
                    "teachers": [
                        {
                            "id": t.id,
                            "first_name": t.first_name,
                            "last_name": t.last_name,
                        }
                        for t in teachers
                    ],
                    "subjects": [
                        {
                            "id": s.id,
                            "subject_name": s.subject_name,
                        }
                        for s in subjects
                    ],
                    "classes": classes_response,
                    "divisions": [
                        {
                            "id": d.id,
                            "division_name": d.division_name,
                        }
                        for d in divisions
                    ],
                    "sections": [
                        {
                            "id": s.id,
                            "section_name": s.section_name,
                        }
                        for s in sections
                    ],
                    "rooms": [],
                    "batches": [],
                }
            )

        except Exception as e:
            logger.exception("Failed to load timetable options")

            return (
                jsonify({"error": str(e)}),
                500,
            )


# Create Lecture API
class TimetableLectureAPI(MethodView):

    @login_required
    def post(self):

        data = request.get_json()
        teacher_id = data["teacher_id"]
        academic_class_id = data["academic_class_id"]
        day = data["day"]
        period_no = data["period_no"]

        # Teacher Conflict
        teacher_conflict = TimetableLecture.query.filter_by(
            teacher_id=teacher_id, day=day, period_no=period_no
        ).first()

        if teacher_conflict:
            return jsonify({"error": "Teacher already assigned"}), 400

        # Class Conflict
        class_conflict = TimetableLecture.query.filter_by(
            academic_class_id=academic_class_id, day=day, period_no=period_no
        ).first()

        if class_conflict:
            return jsonify({"error": "Class already occupied"}), 400

        lecture = TimetableLecture(
            academic_class_id=academic_class_id,
            teacher_id=teacher_id,
            subject_id=data["subject_id"],
            day=day,
            period_no=period_no,
            start_time=data["start_time"],
            end_time=data["end_time"],
            room_no=data.get("room_no"),
            lecture_type=data.get("lecture_type", "Theory"),
            remarks=data.get("remarks"),
        )

        db.session.add(lecture)
        db.session.commit()

        return jsonify({"message": "Lecture created successfully"}), 201

    @login_required
    def delete(self, lecture_id):

        lecture = TimetableLecture.query.get(lecture_id)

        if not lecture:
            return jsonify({"error": "Lecture not found"}), 404

        try:

            db.session.delete(lecture)
            db.session.commit()
            return jsonify({"message": "Lecture deleted"}), 200

        except Exception as e:

            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @login_required
    def put(self, lecture_id):

        lecture = TimetableLecture.query.get(lecture_id)

        if not lecture:
            return jsonify({"error": "Lecture not found"}), 404

        data = request.get_json()

        conflict = TimetableLecture.query.filter(
            TimetableLecture.id != lecture_id,
            TimetableLecture.teacher_id == data["teacher_id"],
            TimetableLecture.day == data["day"],
            TimetableLecture.period_no == data["period_no"],
        ).first()

        if conflict:
            return jsonify({"error": "Teacher already occupied"}), 400

        lecture.teacher_id = data["teacher_id"]
        lecture.subject_id = data["subject_id"]
        lecture.day = data["day"]
        lecture.period_no = data["period_no"]
        lecture.start_time = data["start_time"]
        lecture.end_time = data["end_time"]
        lecture.room_no = data.get("room_no")
        lecture.remarks = data.get("remarks")
        lecture.lecture_type = data.get("lecture_type")

        db.session.commit()
        return jsonify({"message": "Lecture updated"})


class CopyTimetableAPI(MethodView):

    @login_required
    def post(self):

        data = request.json
        source = data["source_day"]
        target = data["target_day"]
        class_id = data["academic_class_id"]

        lectures = TimetableLecture.query.filter_by(
            academic_class_id=class_id, day=source
        ).all()

        for lecture in lectures:

            exists = TimetableLecture.query.filter_by(
                academic_class_id=class_id, day=target, period_no=lecture.period_no
            ).first()

            if exists:
                continue

            db.session.add(
                TimetableLecture(
                    academic_class_id=lecture.academic_class_id,
                    teacher_id=lecture.teacher_id,
                    subject_id=lecture.subject_id,
                    day=target,
                    period_no=lecture.period_no,
                    start_time=lecture.start_time,
                    end_time=lecture.end_time,
                    room_no=lecture.room_no,
                    lecture_type=lecture.lecture_type,
                    remarks=lecture.remarks,
                )
            )

        db.session.commit()
        return jsonify({"message": "Copied successfully"})


class AdminTimetablePDFAPI(MethodView):

    @login_required
    def get(self):

        class_id = request.args.get("academic_class_id")
        rows = TimetableLecture.query.filter_by(academic_class_id=class_id).all()

        ...


# Load Timetable API
class AdminTimetableAPI(MethodView):

    @login_required
    def get(self):

        academic_class_id = request.args.get("academic_class_id")

        query = TimetableLecture.query

        if academic_class_id:
            query = query.filter_by(academic_class_id=academic_class_id)

        rows = query.order_by(TimetableLecture.day, TimetableLecture.period_no).all()

        response = []

        for row in rows:

            teacher = Teacher.query.get(row.teacher_id)
            subject = Subject.query.get(row.subject_id)

            response.append(
                {
                    "id": row.id,
                    "academic_class_id": row.academic_class_id,
                    "subject_id": row.subject_id,
                    "teacher_id": row.teacher_id,
                    "day": row.day,
                    "period_no": row.period_no,
                    "start_time": row.start_time.strftime("%H:%M"),
                    "end_time": row.end_time.strftime("%H:%M"),
                    "teacher_name": (
                        f"{teacher.first_name} {teacher.last_name}".strip()
                        if teacher
                        else None
                    ),
                    "subject_name": subject.subject_name if subject else "",
                    "room_no": row.room_no,
                    "lecture_type": row.lecture_type,
                    "remarks": row.remarks,
                }
            )

        return jsonify(response)


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
                TimetableLecture.query.filter_by(academic_class_id=academic_class_id)
                .order_by(TimetableLecture.day, TimetableLecture.period_no)
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

                    subject = Subject.query.get(r.subject_id)
                    teacher = Teacher.query.get(r.teacher_id)

                    timetable[day].append(
                        {
                            "period": r.period_no,
                            "start_time": (
                                r.start_time.strftime("%H:%M") if r.start_time else None
                            ),
                            "end_time": (
                                r.end_time.strftime("%H:%M") if r.end_time else None
                            ),
                            "subject": (
                                subject.subject_name if subject else "Unknown Subject"
                            ),
                            "teacher_name": (
                                f"{teacher.first_name} {teacher.last_name}".strip()
                                if teacher
                                else "Not Assigned"
                            ),
                            "room": r.room_no,
                            "lecture_type": r.lecture_type,
                            "remarks": r.remarks,
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


# TEACHER TIMETABLE API
class TeacherTimetableAPI(MethodView):

    @login_required
    def get(self, teacher_id):

        try:

            # VALIDATION
            try:
                teacher_id = int(teacher_id)

                if teacher_id <= 0:
                    return jsonify({"error": "Invalid teacher id"}), 400

            except (ValueError, TypeError):
                return jsonify({"error": "Teacher id must be integer"}), 400

            teacher = Teacher.query.get(teacher_id)

            if not teacher:
                return jsonify({"error": "Teacher not found"}), 404

            # FETCH TIMETABLE
            rows = (
                TimetableLecture.query.filter_by(teacher_id=teacher_id)
                .order_by(TimetableLecture.day, TimetableLecture.period_no)
                .all()
            )

            if not rows:
                return jsonify({"teacher_id": teacher_id, "timetable": {}}), 200

            # FORMAT RESPONSE
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
                            "day": r.day,
                            "class_name": class_name,
                            "subject": (
                                subject.subject_name if subject else "Unknown Subject"
                            ),
                            "start_time": (
                                r.start_time.strftime("%H:%M") if r.start_time else None
                            ),
                            "end_time": (
                                r.end_time.strftime("%H:%M") if r.end_time else None
                            ),
                            "period": r.period_no,
                            "room": r.room_no,
                            "lecture_type": (r.lecture_type or "Theory"),
                            "remarks": (r.remarks or ""),
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
            # VALIDATION
            try:

                teacher_id = int(teacher_id)

                if teacher_id <= 0:
                    return jsonify({"error": "Invalid teacher id"}), 400

            except (ValueError, TypeError):

                return jsonify({"error": "Teacher id must be integer"}), 400

            # FETCH TEACHER
            teacher = Teacher.query.get(teacher_id)

            if not teacher:
                return jsonify({"error": "Teacher not found"}), 404

            # FETCH TIMETABLE
            rows = (
                TimetableLecture.query.filter_by(teacher_id=teacher_id)
                .order_by(TimetableLecture.day, TimetableLecture.period_no)
                .all()
            )

            if not rows:
                return jsonify({"error": "No timetable found"}), 404

            # PDF BUFFER
            buffer = BytesIO()

            # PDF DOCUMENT
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

            # TEACHER NAME
            teacher_name = " ".join(
                filter(
                    None, [teacher.first_name, teacher.middle_name, teacher.last_name]
                )
            )

            # TITLE
            title = Paragraph(
                f"<b>{teacher_name} - Weekly Timetable</b>", styles["Title"]
            )

            elements.append(title)
            elements.append(Spacer(1, 0.25 * inch))

            # DAY + PERIOD ORDER
            days_order = [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
            ]

            periods_order = [1, 2, 3, 4, 5, 6]
            # CREATE LOOKUP
            timetable_map = {}

            for r in rows:
                try:
                    # CLASS NAME
                    academic = AcademicClass.query.get(r.academic_class_id)
                    class_name = "-"

                    if academic:

                        division = Division.query.get(academic.division_id)
                        section = Section.query.get(academic.section_id)

                        if division and section:

                            class_name = (
                                f"{division.division_name}-" f"{section.section_name}"
                            )

                    # SUBJECT NAME
                    subject = Subject.query.get(r.subject_id)
                    subject_name = subject.subject_name if subject else "-"

                    # CELL CONTENT
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

            # TABLE HEADER
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

            # TABLE ROWS
            for day in days_order:
                row = [day]
                for period in periods_order:
                    row.append(timetable_map.get((day, period), ""))
                data.append(row)

            # CREATE TABLE
            table = Table(
                data, repeatRows=1, colWidths=[70, 100, 100, 100, 100, 100, 100]
            )

            # TABLE STYLE
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

            # BUILD PDF
            doc.build(elements)
            buffer.seek(0)

            # RETURN PDF
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
