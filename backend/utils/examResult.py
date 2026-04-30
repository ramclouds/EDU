from flask import jsonify, send_file
from flask.views import MethodView
import re
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
import logging
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from flask import request
from utils.auth import db
from utils.auth_middleware import login_required
from utils.studentDetails import (
    StudentAcademicRecord,
    Student,
    AcademicClass,
    Batch,
    Division,
    Section,
)

logger = logging.getLogger(__name__)


# MODELS
class Exam(db.Model):
    __tablename__ = "exams"

    id = db.Column(db.Integer, primary_key=True)
    academic_class_id = db.Column(db.Integer)
    academic_year = db.Column(db.String(20))
    exam_name = db.Column(db.String(50))
    exam_date = db.Column(db.Date)
    start_time = db.Column(db.Time)
    end_time = db.Column(db.Time)


class Subject(db.Model):
    __tablename__ = "subjects"

    id = db.Column(db.Integer, primary_key=True)
    subject_name = db.Column(db.String(50))


class ExamResult(db.Model):
    __tablename__ = "exam_results"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer)
    exam_id = db.Column(db.Integer)
    subject_id = db.Column(db.Integer)
    academic_year = db.Column(db.String(20))
    marks = db.Column(db.Float)
    grade = db.Column(db.String(5))
    remarks = db.Column(db.String(255))


# MAIN API
class StudentExamResultsAPI(MethodView):
    @login_required
    def get(self, student_id):
        try:
            year = request.args.get("year")
            exam = request.args.get("exam")

            # Get student's current class
            record = StudentAcademicRecord.query.filter_by(
                student_id=student_id, is_current=True
            ).first()

            if not record:
                return jsonify({"error": "Academic record not found"}), 404

            # RESULTS QUERY (OPTIMIZED JOIN)
            query = (
                db.session.query(
                    ExamResult.id,
                    ExamResult.academic_year,
                    Exam.exam_name,
                    Subject.subject_name,
                    ExamResult.marks,
                    ExamResult.grade,
                    ExamResult.remarks,
                )
                .join(Exam, Exam.id == ExamResult.exam_id)
                .join(Subject, Subject.id == ExamResult.subject_id)
                .filter(ExamResult.student_id == student_id)
            )

            if year and year != "all":
                query = query.filter(ExamResult.academic_year == year)

            if exam and exam != "all":
                query = query.filter(Exam.exam_name == exam)

            results = query.order_by(ExamResult.id.desc()).all()

            data = [
                {
                    "year": r.academic_year,
                    "exam": r.exam_name,
                    "subject": r.subject_name,
                    "marks": float(r.marks),
                    "grade": r.grade,
                    "remarks": r.remarks,
                }
                for r in results
            ]

            return jsonify(data), 200

        except SQLAlchemyError as e:
            logger.error(f"DB error: {e}")
            db.session.rollback()
            return jsonify({"error": "Database error"}), 500

        except Exception as e:
            logger.exception(f"Error: {e}")
            return jsonify({"error": "Something went wrong"}), 500


# PERFORMANCE (CHART DATA)
class PerformanceAPI(MethodView):
    @login_required
    def get(self, student_id):
        try:
            results = (
                db.session.query(
                    Exam.exam_name, func.avg(ExamResult.marks).label("avg_marks")
                )
                .join(Exam, Exam.id == ExamResult.exam_id)
                .filter(ExamResult.student_id == student_id)
                .group_by(Exam.exam_name)
                .all()
            )

            data = {
                "labels": [r.exam_name for r in results],
                "marks": [float(r.avg_marks) for r in results],
            }

            return jsonify(data), 200

        except Exception as e:
            logger.exception(f"Performance error: {e}")
            return jsonify({"error": "Something went wrong"}), 500


# UPCOMING EXAMS
class UpcomingExamsAPI(MethodView):
    @login_required
    def get(self, student_id):
        try:
            record = StudentAcademicRecord.query.filter_by(
                student_id=student_id, is_current=True
            ).first()

            if not record:
                return jsonify([]), 200

            exams = (
                Exam.query.filter(Exam.academic_class_id == record.academic_class_id)
                .order_by(Exam.exam_date.asc())
                .limit(5)
                .all()
            )

            data = [
                {
                    "subject": "N/A",  # can map later if needed
                    "exam": e.exam_name,
                    "date": str(e.exam_date),
                    "start_time": str(e.start_time),
                }
                for e in exams
            ]

            return jsonify(data), 200

        except Exception as e:
            logger.exception(f"Upcoming exams error: {e}")
            return jsonify({"error": "Something went wrong"}), 500


# FILTER OPTIONS API
class ExamFilterOptionsAPI(MethodView):
    @login_required
    def get(self, student_id):
        try:
            # DISTINCT YEARS
            years = (
                db.session.query(ExamResult.academic_year)
                .filter(ExamResult.student_id == student_id)
                .distinct()
                .all()
            )

            # DISTINCT EXAMS
            exams = (
                db.session.query(Exam.exam_name)
                .join(ExamResult, Exam.id == ExamResult.exam_id)
                .filter(ExamResult.student_id == student_id)
                .distinct()
                .all()
            )

            return (
                jsonify(
                    {"years": [y[0] for y in years], "exams": [e[0] for e in exams]}
                ),
                200,
            )

        except Exception as e:
            logger.exception(f"Filter options error: {e}")
            return jsonify({"error": "Failed to load filters"}), 500


# DOWNLOAD PDF
class DownloadResultPDF(MethodView):
    @login_required
    def get(self, student_id):
        try:
            # FETCH STUDENT
            student = Student.query.get(student_id)
            if not student:
                return jsonify({"error": "Student not found"}), 404

            # ACADEMIC INFO (CLASS DETAILS)
            record = StudentAcademicRecord.query.filter_by(
                student_id=student_id, is_current=True
            ).first()

            roll_no = record.roll_number if record else "N/A"

            batch_name = division_name = section_name = "N/A"

            if record:
                academic = AcademicClass.query.get(record.academic_class_id)
                if academic:
                    batch = Batch.query.get(academic.batch_id)
                    division = Division.query.get(academic.division_id)
                    section = Section.query.get(academic.section_id)

                    batch_name = batch.batch_name if batch else "N/A"
                    division_name = division.division_name if division else "N/A"
                    section_name = section.section_name if section else "N/A"

            # FETCH RESULTS
            results = (
                db.session.query(ExamResult, Exam, Subject)
                .join(Exam, Exam.id == ExamResult.exam_id)
                .join(Subject, Subject.id == ExamResult.subject_id)
                .filter(ExamResult.student_id == student_id)
                .all()
            )

            if not results:
                return jsonify({"error": "No results found"}), 404

            # CALCULATIONS
            total_marks = sum(r.ExamResult.marks for r in results)
            max_marks = len(results) * 100
            percentage = round((total_marks / max_marks) * 100, 2)

            result_status = "Pass"
            if any(r.ExamResult.marks < 35 for r in results):
                result_status = "Compartment"

            year = results[0].ExamResult.academic_year

            # PDF SETUP
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)

            elements = []
            styles = getSampleStyleSheet()

            # STYLES
            center_bold = ParagraphStyle(
                name="center_bold", alignment=TA_CENTER, fontSize=16, spaceAfter=8
            )

            red_center = ParagraphStyle(
                name="red_center",
                alignment=TA_CENTER,
                textColor=colors.red,
                fontSize=12,
            )

            small_center = ParagraphStyle(
                name="small_center", alignment=TA_CENTER, fontSize=10
            )

            # HEADER
            elements.append(Paragraph("<b>SCHOOL NAME</b>", center_bold))
            elements.append(Paragraph("Website: yoursite.com", red_center))
            elements.append(Spacer(1, 6))

            elements.append(
                Paragraph(f"<b>YEARLY EXAMINATION {year}</b>", small_center)
            )

            elements.append(Spacer(1, 12))

            # STUDENT DETAILS TABLE
            student_info = [
                [
                    "Student Name",
                    student.first_name + " " + student.last_name,
                    "Roll No",
                    roll_no,
                ],
                [
                    "Father Name",
                    student.parent_name or "N/A",
                    "DOB",
                    str(student.date_of_birth) if student.date_of_birth else "N/A",
                ],
                ["Class", division_name, "Section", section_name],
                ["Result", result_status, "Percentage", f"{percentage}%"],
            ]

            student_table = Table(student_info, colWidths=[110, 150, 80, 100])

            student_table.setStyle(
                TableStyle(
                    [
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                        ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
                        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                    ]
                )
            )

            elements.append(student_table)
            elements.append(Spacer(1, 15))

            # MARKS TABLE
            marks_data = [["Papers", "Marks Obtained"]]

            for res, exam, subject in results:
                marks_data.append(
                    [subject.subject_name.upper(), f"{int(res.marks)}/100"]
                )

            marks_data.append(["Result", result_status])
            marks_data.append(["Total", f"{int(total_marks)}/{max_marks}"])

            marks_table = Table(marks_data, colWidths=[300, 150])

            marks_table.setStyle(
                TableStyle(
                    [
                        # Header
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2E86C1")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        # Grid
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                        # Body
                        ("BACKGROUND", (0, 1), (-1, -3), colors.whitesmoke),
                        # Result + Total
                        ("BACKGROUND", (0, -2), (-1, -1), colors.lightgrey),
                        ("FONTNAME", (0, -2), (-1, -1), "Helvetica-Bold"),
                        # Alignment
                        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                    ]
                )
            )

            elements.append(marks_table)
            elements.append(Spacer(1, 20))

            # FOOTER
            elements.append(
                Paragraph(
                    "Disclaimer: Not official marksheet",
                    ParagraphStyle(name="disc", alignment=TA_CENTER, fontSize=8),
                )
            )

            # BUILD PDF
            doc.build(elements)
            buffer.seek(0)

            # DYNAMIC FILE NAME
            safe_name = re.sub(
                r"[^a-zA-Z0-9]", "_", student.first_name + student.last_name
            )
            filename = f"{safe_name}_{year}_result.pdf"

            return send_file(
                buffer,
                as_attachment=True,
                download_name=filename,
                mimetype="application/pdf",
            )

        except Exception as e:
            logger.exception(f"PDF error: {e}")
            return jsonify({"error": "Failed to generate PDF"}), 500
