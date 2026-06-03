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
from utils.auth import db, Teacher
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
    academic_class_id = db.Column(
        db.Integer, db.ForeignKey("academic_classes.id"), nullable=False, index=True
    )
    academic_year = db.Column(db.String(20), nullable=False, index=True)
    exam_name = db.Column(db.String(100), nullable=False)
    exam_type = db.Column(db.String(50))
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    is_published = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, server_default=func.now())
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        db.UniqueConstraint(
            "academic_class_id", "academic_year", "exam_name", name="uq_exam"
        ),
    )


class Subject(db.Model):
    __tablename__ = "subjects"

    id = db.Column(db.Integer, primary_key=True)
    subject_code = db.Column(db.String(20), unique=True)
    subject_name = db.Column(db.String(100), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, server_default=func.now())


class ExamSubject(db.Model):
    __tablename__ = "exam_subjects"

    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey("exams.id"), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id"), nullable=False)
    internal_max = db.Column(db.Float, default=20)
    external_max = db.Column(db.Float, default=50)
    oral_max = db.Column(db.Float, default=10)
    practical_max = db.Column(db.Float, default=20)
    passing_marks = db.Column(db.Float, default=35)
    __table_args__ = (
        db.UniqueConstraint("exam_id", "subject_id", name="uq_exam_subject"),
    )


class ExamResult(db.Model):
    __tablename__ = "exam_results"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id"),
        nullable=False,
        index=True,
    )
    exam_id = db.Column(
        db.Integer,
        db.ForeignKey("exams.id"),
        nullable=False,
        index=True,
    )
    subject_id = db.Column(
        db.Integer,
        db.ForeignKey("subjects.id"),
        nullable=False,
        index=True,
    )

    # MARKS
    internal_marks = db.Column(db.Float, default=0)
    external_marks = db.Column(db.Float, default=0)
    oral_marks = db.Column(db.Float, default=0)
    practical_marks = db.Column(db.Float, default=0)

    # OUT OF
    internal_out_of = db.Column(db.Float, default=0)
    external_out_of = db.Column(db.Float, default=0)
    oral_out_of = db.Column(db.Float, default=0)
    practical_out_of = db.Column(db.Float, default=0)

    # RESULT
    total_marks = db.Column(db.Float, default=0)
    percentage = db.Column(db.Float, default=0)
    grade = db.Column(db.String(5))

    status = db.Column(db.String(20), default="Draft")
    remarks = db.Column(db.Text)
    created_by = db.Column(
        db.Integer,
        db.ForeignKey("teachers.id"),
    )
    created_at = db.Column(
        db.DateTime,
        server_default=func.now(),
    )
    updated_at = db.Column(
        db.DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
    __table_args__ = (
        db.UniqueConstraint(
            "student_id",
            "exam_id",
            "subject_id",
            name="uq_student_exam_subject",
        ),
    )


# RESULT AUDIT LOG TABLE
class ExamResultAudit(db.Model):
    __tablename__ = "exam_result_audit"

    id = db.Column(db.Integer, primary_key=True)
    result_id = db.Column(db.Integer, db.ForeignKey("exam_results.id"))
    updated_by = db.Column(db.Integer, db.ForeignKey("teachers.id"))
    old_total = db.Column(db.Float)
    new_total = db.Column(db.Float)
    action = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, server_default=func.now())


# MAIN API
class StudentExamResultsAPI(MethodView):
    @login_required
    def get(self, student_id):
        try:
            year = request.args.get("year")
            exam = request.args.get("exam")

            record = StudentAcademicRecord.query.filter_by(
                student_id=student_id, is_current=True
            ).first()

            if not record:
                return jsonify({"error": "Academic record not found"}), 404

            query = (
                db.session.query(
                    Exam.academic_year,
                    Exam.exam_name,
                    Subject.subject_name,
                    ExamResult.internal_marks,
                    ExamResult.external_marks,
                    ExamResult.oral_marks,
                    ExamResult.practical_marks,
                    ExamResult.internal_out_of,
                    ExamResult.external_out_of,
                    ExamResult.oral_out_of,
                    ExamResult.practical_out_of,
                    ExamResult.total_marks,
                    ExamResult.percentage,
                    ExamResult.grade,
                    ExamResult.status,
                    ExamResult.remarks,
                )
                .join(Exam, Exam.id == ExamResult.exam_id)
                .join(Subject, Subject.id == ExamResult.subject_id)
                .filter(ExamResult.student_id == student_id)
            )

            if year and year != "all":
                query = query.filter(Exam.academic_year == year)

            if exam and exam != "all":
                query = query.filter(Exam.exam_name == exam)

            results = query.order_by(Exam.academic_year.desc()).all()

            data = [
                {
                    "year": r.academic_year,
                    "exam": r.exam_name,
                    "subject": r.subject_name,
                    "internal": r.internal_marks or 0,
                    "external": r.external_marks or 0,
                    "oral": r.oral_marks or 0,
                    "practical": r.practical_marks or 0,
                    "internalOutOf": r.internal_out_of or 0,
                    "externalOutOf": r.external_out_of or 0,
                    "oralOutOf": r.oral_out_of or 0,
                    "practicalOutOf": r.practical_out_of or 0,
                    "marks": float(r.total_marks or 0),
                    "percentage": float(r.percentage or 0),
                    "grade": r.grade,
                    "status": r.status,
                    "remarks": r.remarks,
                }
                for r in results
            ]

            return jsonify(data), 200

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Something went wrong"}), 500


# PERFORMANCE (CHART DATA)
class PerformanceAPI(MethodView):
    @login_required
    def get(self, student_id):
        try:
            results = (
                db.session.query(
                    Exam.exam_name, func.avg(ExamResult.total_marks).label("avg_marks")
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
                .order_by(Exam.start_date.asc())
                .limit(5)
                .all()
            )

            data = [
                {
                    "subject": "N/A",  # can map later if needed
                    "exam": e.exam_name,
                    "start_date": str(e.start_date),
                    "end_date": str(e.end_date),
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
            years = (
                db.session.query(Exam.academic_year)
                .join(ExamResult, Exam.id == ExamResult.exam_id)
                .filter(ExamResult.student_id == student_id)
                .distinct()
                .order_by(Exam.academic_year.desc())
                .all()
            )

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
            logger.exception(e)
            return jsonify({"error": "Failed to load filters"}), 500


# DOWNLOAD PDF (UPDATED - MATCH TEACHER SYSTEM)
class DownloadResultPDF(MethodView):
    @login_required
    def get(self, student_id):
        try:
            student = Student.query.get(student_id)
            if not student:
                return jsonify({"error": "Student not found"}), 404

            record = StudentAcademicRecord.query.filter_by(
                student_id=student_id, is_current=True
            ).first()

            if not record:
                return jsonify({"error": "Academic record not found"}), 404

            academic = AcademicClass.query.get(record.academic_class_id)

            division = Division.query.get(academic.division_id)
            section = Section.query.get(academic.section_id)

            roll_no = record.roll_number or "N/A"

            # ================= FETCH RESULTS (JOINED PROPERLY) =================
            results = (
                db.session.query(ExamResult, Exam, Subject)
                .join(Exam, Exam.id == ExamResult.exam_id)
                .join(Subject, Subject.id == ExamResult.subject_id)
                .filter(ExamResult.student_id == student_id)
                .order_by(Exam.id.desc())
                .all()
            )

            if not results:
                return jsonify({"error": "No results found"}), 404

            # ================= CALCULATIONS =================
            total_obtained = 0
            total_out_of = 0

            for res, exam, subject in results:
                total_obtained += res.total_marks or 0

                total_out_of += (
                    (res.internal_out_of or 0)
                    + (res.external_out_of or 0)
                    + (res.oral_out_of or 0)
                    + (res.practical_out_of or 0)
                )

            percentage = (
                round((total_obtained / total_out_of) * 100, 2)
                if total_out_of > 0
                else 0
            )

            # ================= RESULT STATUS =================
            result_status = "Pass"
            if percentage < 35:
                result_status = "Fail"

            year = results[0][1].academic_year
            exam_name = results[0][1].exam_name

            # ================= PDF SETUP =================
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)

            elements = []

            center_bold = ParagraphStyle(
                name="center_bold", alignment=TA_CENTER, fontSize=16, spaceAfter=8
            )

            small_center = ParagraphStyle(
                name="small_center", alignment=TA_CENTER, fontSize=10
            )

            # ================= HEADER =================
            elements.append(Paragraph("<b>SCHOOL NAME</b>", center_bold))
            elements.append(Paragraph(f"<b>{exam_name} - {year}</b>", small_center))
            elements.append(Spacer(1, 12))

            # ================= STUDENT INFO =================
            student_info = [
                [
                    "Student Name",
                    f"{student.first_name} {student.last_name}",
                    "Roll No",
                    roll_no,
                ],
                [
                    "Class",
                    division.division_name,
                    "Section",
                    section.section_name,
                ],
                [
                    "Result",
                    result_status,
                    "Percentage",
                    f"{percentage}%",
                ],
            ]

            student_table = Table(student_info, colWidths=[120, 140, 80, 120])
            student_table.setStyle(
                TableStyle(
                    [
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                        ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
                    ]
                )
            )

            elements.append(student_table)
            elements.append(Spacer(1, 15))

            # ================= MARKS TABLE =================
            marks_data = [
                [
                    "Subject",
                    "Internal (I/O)",
                    "External (I/O)",
                    "Oral (I/O)",
                    "Practical (I/O)",
                    "Total",
                    "Grade",
                ]
            ]

            for res, exam, subject in results:
                marks_data.append(
                    [
                        subject.subject_name.upper(),
                        f"{res.internal_marks}/{res.internal_out_of}",
                        f"{res.external_marks}/{res.external_out_of}",
                        f"{res.oral_marks}/{res.oral_out_of}",
                        f"{res.practical_marks}/{res.practical_out_of}",
                        f"{res.total_marks}",
                        res.grade,
                    ]
                )

            marks_table = Table(marks_data, colWidths=[90, 70, 70, 70, 70, 60, 50])

            marks_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2E86C1")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                    ]
                )
            )

            elements.append(marks_table)
            elements.append(Spacer(1, 15))

            # ================= SUMMARY =================
            summary_table = Table(
                [
                    ["Total Obtained", total_obtained],
                    ["Total Out Of", total_out_of],
                    ["Final Percentage", f"{percentage}%"],
                ],
                colWidths=[200, 200],
            )

            summary_table.setStyle(
                TableStyle(
                    [
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                        ("BACKGROUND", (0, 0), (-1, -1), colors.whitesmoke),
                    ]
                )
            )

            elements.append(summary_table)

            # ================= BUILD PDF =================
            doc.build(elements)
            buffer.seek(0)

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


# ========================= GET TEACHER ASSIGNED STUDENTS =========================
class TeacherStudentsAPI(MethodView):

    @login_required
    def get(self):
        try:
            from utils.teacherDetails import TeacherClass

            teacher_id = request.args.get("teacher_id")

            teacher_classes = TeacherClass.query.filter_by(teacher_id=teacher_id).all()

            academic_class_ids = [tc.academic_class_id for tc in teacher_classes]

            records = (
                db.session.query(
                    StudentAcademicRecord,
                    Student,
                    AcademicClass,
                    Division,
                    Section,
                )
                .join(Student, Student.id == StudentAcademicRecord.student_id)
                .join(
                    AcademicClass,
                    AcademicClass.id == StudentAcademicRecord.academic_class_id,
                )
                .join(Division, Division.id == AcademicClass.division_id)
                .join(Section, Section.id == AcademicClass.section_id)
                .filter(
                    StudentAcademicRecord.is_current == True,
                    StudentAcademicRecord.academic_class_id.in_(academic_class_ids),
                )
                .all()
            )

            data = []

            for record, student, academic, division, section in records:

                # ✅ CHECK IF RESULT EXISTS
                published_result = (
                    db.session.query(ExamResult)
                    .filter(
                        ExamResult.student_id == student.id,
                        ExamResult.status == "Published",
                    )
                    .first()
                )

                status = "Completed" if published_result else "Pending"

                data.append(
                    {
                        "id": student.id,
                        "name": f"{student.first_name} {student.last_name}",
                        "rollNo": record.roll_number,
                        "className": f"{division.division_name}-{section.section_name}",
                        "division": division.division_name,
                        "section": section.section_name,
                        "academic_class_id": academic.id,
                        "status": status,  # ✅ FIXED
                    }
                )

            return jsonify(data), 200

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to load students"}), 500


# ========================= TEACHER SUBJECTS =========================
class TeacherSubjectsAPI(MethodView):

    @login_required
    def get(self):
        try:
            from utils.teacherDetails import TeacherClass

            teacher_id = request.args.get("teacher_id")

            if not teacher_id:
                return jsonify({"error": "teacher_id required"}), 400

            teacher_classes = TeacherClass.query.filter_by(teacher_id=teacher_id).all()
            subject_ids = list(set([tc.subject_id for tc in teacher_classes]))
            subjects = Subject.query.filter(Subject.id.in_(subject_ids)).all()

            data = [
                {
                    "id": s.id,
                    "name": s.subject_name,
                }
                for s in subjects
            ]

            return jsonify(data), 200

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to load subjects"}), 500


# ========================= TEACHER CLASSES =========================
class TeacherClassesAPI(MethodView):

    @login_required
    def get(self):
        try:
            from utils.teacherDetails import TeacherClass

            teacher_id = request.args.get("teacher_id")

            if not teacher_id:
                return jsonify({"error": "teacher_id required"}), 400

            teacher_classes = TeacherClass.query.filter_by(teacher_id=teacher_id).all()

            class_data = []

            for tc in teacher_classes:

                academic = AcademicClass.query.get(tc.academic_class_id)

                if not academic:
                    continue

                division = Division.query.get(academic.division_id)
                section = Section.query.get(academic.section_id)
                class_data.append(
                    {
                        "id": academic.id,
                        "name": f"{division.division_name}-{section.section_name}",
                    }
                )

            return jsonify(class_data), 200

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to load classes"}), 500


# ========================= GET SINGLE STUDENT MARKS =========================
class TeacherStudentMarksAPI(MethodView):

    @login_required
    def get(self, student_id):
        try:
            subject = request.args.get("subject")
            exam = request.args.get("exam")

            result = (
                db.session.query(
                    ExamResult,
                    Exam,
                    Subject,
                )
                .join(
                    Exam,
                    Exam.id == ExamResult.exam_id,
                )
                .join(
                    Subject,
                    Subject.id == ExamResult.subject_id,
                )
                .filter(
                    ExamResult.student_id == student_id,
                    Subject.subject_name == subject,
                    Exam.exam_name == exam,
                )
                .first()
            )

            if not result:
                return jsonify(
                    {
                        "internal": 0,
                        "external": 0,
                        "oral": 0,
                        "practical": 0,
                    }
                )

            exam_result = result[0]

            internal = exam_result.internal_marks or 0
            external = exam_result.external_marks or 0
            oral = exam_result.oral_marks or 0
            practical = exam_result.practical_marks or 0
            return jsonify(
                {
                    "internal": internal,
                    "external": external,
                    "oral": oral,
                    "practical": practical,
                    "internalOutOf": exam_result.internal_out_of or 0,
                    "externalOutOf": exam_result.external_out_of or 0,
                    "oralOutOf": exam_result.oral_out_of or 0,
                    "practicalOutOf": exam_result.practical_out_of or 0,
                    "marks": exam_result.total_marks,
                    "percentage": exam_result.percentage,
                    "status": exam_result.status,
                    "grade": exam_result.grade,
                    "remarks": exam_result.remarks or "",
                }
            )

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to load marks"}), 500


# ========================= SAVE STUDENT MARKS =========================
class SaveTeacherMarksAPI(MethodView):

    @login_required
    def post(self):
        try:
            data = request.get_json()

            student_id = data.get("studentId")
            subject_name = data.get("subject")
            exam_name = data.get("examType")

            # MARKS
            internal = float(data.get("internal", 0))
            external = float(data.get("external", 0))
            oral = float(data.get("oral", 0))
            practical = float(data.get("practical", 0))

            # OUT OF
            internal_out_of = float(data.get("internalOutOf", 0))
            external_out_of = float(data.get("externalOutOf", 0))
            oral_out_of = float(data.get("oralOutOf", 0))
            practical_out_of = float(data.get("practicalOutOf", 0))

            remarks = data.get("remarks", "")

            # ================= VALIDATIONS =================

            if internal < 0 or external < 0 or oral < 0 or practical < 0:
                return jsonify({"error": "Negative marks not allowed"}), 400

            if internal > internal_out_of:
                return jsonify({"error": "Internal marks exceed OutOf"}), 400

            if external > external_out_of:
                return jsonify({"error": "External marks exceed OutOf"}), 400

            if oral > oral_out_of:
                return jsonify({"error": "Oral marks exceed OutOf"}), 400

            if practical > practical_out_of:
                return jsonify({"error": "Practical marks exceed OutOf"}), 400

            # ================= TOTAL =================

            total = internal + external + oral + practical

            total_out_of = (
                internal_out_of + external_out_of + oral_out_of + practical_out_of
            )

            percentage = (
                round((total / total_out_of) * 100, 2) if total_out_of > 0 else 0
            )

            # ================= GRADE =================

            if percentage >= 90:
                grade = "A+"
            elif percentage >= 80:
                grade = "A"
            elif percentage >= 70:
                grade = "B+"
            elif percentage >= 60:
                grade = "B"
            elif percentage >= 50:
                grade = "C"
            elif percentage >= 35:
                grade = "Pass"
            else:
                grade = "Fail"

            # ================= SUBJECT =================

            subject = Subject.query.filter_by(subject_name=subject_name).first()

            if not subject:
                return jsonify({"error": "Subject not found"}), 404

            # ================= STUDENT RECORD =================

            academic_record = StudentAcademicRecord.query.filter_by(
                student_id=student_id,
                is_current=True,
            ).first()

            if not academic_record:
                return jsonify({"error": "Student academic record missing"}), 404

            # ================= EXAM =================

            exam = Exam.query.filter_by(
                academic_class_id=academic_record.academic_class_id,
                exam_name=exam_name,
            ).first()

            if not exam:

                exam = Exam(
                    academic_class_id=academic_record.academic_class_id,
                    academic_year="2025-26",
                    exam_name=exam_name,
                )

                db.session.add(exam)
                db.session.flush()

            # ================= CHECK EXISTING =================

            result = ExamResult.query.filter_by(
                student_id=student_id,
                exam_id=exam.id,
                subject_id=subject.id,
            ).first()

            if result:

                old_total = result.total_marks

                result.internal_marks = internal
                result.external_marks = external
                result.oral_marks = oral
                result.practical_marks = practical

                result.internal_out_of = internal_out_of
                result.external_out_of = external_out_of
                result.oral_out_of = oral_out_of
                result.practical_out_of = practical_out_of

                result.total_marks = total
                result.percentage = percentage
                result.grade = grade
                result.status = "Published"
                result.remarks = remarks

                audit = ExamResultAudit(
                    result_id=result.id,
                    updated_by=data.get("teacherId"),
                    old_total=old_total,
                    new_total=total,
                    action="UPDATED",
                )

                db.session.add(audit)

            else:

                result = ExamResult(
                    student_id=student_id,
                    exam_id=exam.id,
                    subject_id=subject.id,
                    internal_marks=internal,
                    external_marks=external,
                    oral_marks=oral,
                    practical_marks=practical,
                    internal_out_of=internal_out_of,
                    external_out_of=external_out_of,
                    oral_out_of=oral_out_of,
                    practical_out_of=practical_out_of,
                    total_marks=total,
                    percentage=percentage,
                    grade=grade,
                    status="Published",
                    remarks=remarks,
                    created_by=data.get("teacherId"),
                )

                db.session.add(result)

            db.session.commit()

            return (
                jsonify(
                    {
                        "message": "Marks saved successfully",
                        "percentage": percentage,
                        "grade": grade,
                    }
                ),
                200,
            )

        except Exception as e:
            logger.exception(e)

            db.session.rollback()

            return jsonify({"error": "Failed to save marks"}), 500


# ========================= REPORT CARD =========================
class TeacherReportCardAPI(MethodView):

    @login_required
    def get(self, student_id):
        try:
            student = Student.query.get(student_id)

            if not student:
                return jsonify({"error": "Student not found"}), 404

            academic_record = StudentAcademicRecord.query.filter_by(
                student_id=student_id,
                is_current=True,
            ).first()

            if not academic_record:
                return jsonify({"error": "Academic record missing"}), 404

            academic = AcademicClass.query.get(academic_record.academic_class_id)
            division = Division.query.get(academic.division_id)
            section = Section.query.get(academic.section_id)

            results = (
                db.session.query(
                    ExamResult,
                    Subject,
                )
                .join(
                    Subject,
                    Subject.id == ExamResult.subject_id,
                )
                .filter(ExamResult.student_id == student_id)
                .all()
            )

            subjects = []
            total_marks = 0

            for result, subject in results:

                internal = result.internal_marks or 0
                external = result.external_marks or 0
                oral = result.oral_marks or 0
                practical = result.practical_marks or 0
                total_marks += result.total_marks
                subjects.append(
                    {
                        "subject": subject.subject_name,
                        "internal": internal,
                        "external": external,
                        "practical": practical,
                        "oral": oral,
                        "internalOutOf": result.internal_out_of,
                        "externalOutOf": result.external_out_of,
                        "practicalOutOf": result.practical_out_of,
                        "oralOutOf": result.oral_out_of,
                        "total": result.total_marks,
                        "percentage": result.percentage,
                        "status": result.status,
                        "grade": result.grade,
                        "remarks": result.remarks,
                    }
                )

            max_marks = len(subjects) * 100

            percentage = (
                round((total_marks / max_marks) * 100, 2) if max_marks > 0 else 0
            )

            final_grade = "A+"

            if percentage < 90:
                final_grade = "A"

            if percentage < 80:
                final_grade = "B"

            if percentage < 70:
                final_grade = "C"

            if percentage < 35:
                final_grade = "Fail"

            return (
                jsonify(
                    {
                        "year": "2025-26",
                        "student": {
                            "name": (f"{student.first_name} " f"{student.last_name}"),
                            "rollNo": academic_record.roll_number,
                            "className": (
                                f"{division.division_name}-" f"{section.section_name}"
                            ),
                            "division": division.division_name,
                        },
                        "subjects": subjects,
                        "summary": {
                            "total": (f"{int(total_marks)} / " f"{max_marks}"),
                            "percentage": percentage,
                            "grade": final_grade,
                        },
                    }
                ),
                200,
            )

        except Exception as e:
            logger.exception(e)

            return jsonify({"error": "Failed to load report card"}), 500


# ========================= TEACHER ANALYTICS API =========================
class TeacherAnalyticsAPI(MethodView):

    @login_required
    def get(self):
        try:
            from utils.teacherDetails import TeacherClass

            teacher_id = request.args.get("teacher_id")
            class_id = request.args.get("class_id")
            subject_id = request.args.get("subject_id")

            if not teacher_id:
                return jsonify({"error": "teacher_id required"}), 400

            # ================= GET ASSIGNED CLASSES =================
            teacher_classes = TeacherClass.query.filter_by(teacher_id=teacher_id).all()

            assigned_class_ids = [tc.academic_class_id for tc in teacher_classes]

            assigned_subject_ids = [tc.subject_id for tc in teacher_classes]

            # ================= BASE QUERY =================
            query = (
                db.session.query(
                    ExamResult,
                    Student,
                    Subject,
                    AcademicClass,
                    Division,
                    Section,
                )
                .join(Student, Student.id == ExamResult.student_id)
                .join(Subject, Subject.id == ExamResult.subject_id)
                .join(
                    StudentAcademicRecord,
                    StudentAcademicRecord.student_id == Student.id,
                )
                .join(
                    AcademicClass,
                    AcademicClass.id == StudentAcademicRecord.academic_class_id,
                )
                .join(Division, Division.id == AcademicClass.division_id)
                .join(Section, Section.id == AcademicClass.section_id)
                .filter(
                    StudentAcademicRecord.is_current == True,
                    AcademicClass.id.in_(assigned_class_ids),
                    Subject.id.in_(assigned_subject_ids),
                    ExamResult.status == "Published",
                )
            )

            # ================= FILTERS =================
            if class_id and class_id != "all":
                query = query.filter(AcademicClass.id == class_id)

            if subject_id and subject_id != "all":
                query = query.filter(Subject.id == subject_id)

            results = query.all()

            # ================= EMPTY =================
            if not results:
                return (
                    jsonify(
                        {
                            "kpis": {
                                "avgMarks": 0,
                                "passRate": 0,
                                "topScore": 0,
                                "lowScore": 0,
                            },
                            "topStudents": [],
                            "weakStudents": [],
                            "performanceChart": {
                                "labels": [],
                                "data": [],
                            },
                            "subjectChart": {
                                "labels": [],
                                "data": [],
                            },
                            "insight": "No analytics data available",
                        }
                    ),
                    200,
                )

            # ================= KPI =================
            percentages = [r[0].percentage or 0 for r in results]
            avg_marks = round(sum(percentages) / len(percentages), 2)
            pass_students = len([p for p in percentages if p >= 35])
            pass_rate = round((pass_students / len(percentages)) * 100, 2)
            top_score = round(max(percentages), 2)
            low_score = round(min(percentages), 2)

            # ================= STUDENT-WISE ANALYTICS =================
            student_map = {}
            for res, student, subject, academic, division, section in results:
                student_id = student.id
                if student_id not in student_map:

                    student_map[student_id] = {
                        "student": f"{student.first_name} {student.last_name}",
                        "className": f"{division.division_name}-{section.section_name}",
                        "percentages": [],
                    }

                student_map[student_id]["percentages"].append(res.percentage or 0)

            # ================= CALCULATE AVERAGES =================
            student_analytics = []
            for _, data in student_map.items():
                avg_percentage = round(
                    sum(data["percentages"]) / len(data["percentages"]),
                    2,
                )

                student_analytics.append(
                    {
                        "student": data["student"],
                        "className": data["className"],
                        "percentage": avg_percentage,
                    }
                )

            # ================= TOP STUDENTS =================
            top_students = sorted(
                student_analytics,
                key=lambda x: x["percentage"],
                reverse=True,
            )[:5]

            # ================= WEAK STUDENTS =================
            top_student_names = [s["student"] for s in top_students]

            weak_students = sorted(
                [s for s in student_analytics if s["student"] not in top_student_names],
                key=lambda x: x["percentage"],
            )[:5]

            if len(student_analytics) <= 1:
                weak_students = []
            # ================= CLASS PERFORMANCE =================
            class_map = {}

            for res, student, subject, academic, division, section in results:

                class_name = f"{division.division_name}-{section.section_name}"

                if class_name not in class_map:
                    class_map[class_name] = []

                class_map[class_name].append(res.percentage or 0)

            performance_labels = []
            performance_data = []

            for cls, values in class_map.items():

                performance_labels.append(cls)

                performance_data.append(round(sum(values) / len(values), 2))

            # ================= SUBJECT ANALYTICS =================
            subject_map = {}

            for res, student, subject, academic, division, section in results:

                if subject.subject_name not in subject_map:
                    subject_map[subject.subject_name] = []

                subject_map[subject.subject_name].append(res.percentage or 0)

            subject_labels = []
            subject_data = []

            for sub, vals in subject_map.items():

                subject_labels.append(sub)

                subject_data.append(round(sum(vals) / len(vals), 2))

            # ================= AI INSIGHTS =================
            insight = "Overall class performance is stable."

            if avg_marks >= 85:
                insight = "Excellent performance across assigned classes."

            elif avg_marks >= 70:
                insight = "Students are performing well with room for improvement."

            elif avg_marks >= 50:
                insight = "Average performance detected. Focus on weaker students."

            else:
                insight = "Critical improvement required in multiple subjects."

            return (
                jsonify(
                    {
                        "kpis": {
                            "avgMarks": avg_marks,
                            "passRate": pass_rate,
                            "topScore": top_score,
                            "lowScore": low_score,
                        },
                        "topStudents": top_students,
                        "weakStudents": weak_students,
                        "performanceChart": {
                            "labels": performance_labels,
                            "data": performance_data,
                        },
                        "subjectChart": {
                            "labels": subject_labels,
                            "data": subject_data,
                        },
                        "insight": insight,
                    }
                ),
                200,
            )

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Failed to load analytics"}), 500


# ========================= TEACHER ANALYTICS PDF =========================
class TeacherAnalyticsPDFAPI(MethodView):

    @login_required
    def get(self):

        try:
            from utils.teacherDetails import TeacherClass

            teacher_id = request.args.get("teacher_id")
            class_id = request.args.get("class_id")
            subject_id = request.args.get("subject_id")

            if not teacher_id:
                return jsonify({"error": "teacher_id required"}), 400

            # ================= ASSIGNED CLASSES =================
            teacher_classes = TeacherClass.query.filter_by(
                teacher_id=teacher_id
            ).all()

            assigned_class_ids = [
                tc.academic_class_id for tc in teacher_classes
            ]

            assigned_subject_ids = [
                tc.subject_id for tc in teacher_classes
            ]

            # ================= QUERY =================
            query = (
                db.session.query(
                    ExamResult,
                    Student,
                    Subject,
                    AcademicClass,
                    Division,
                    Section,
                )
                .join(Student, Student.id == ExamResult.student_id)
                .join(Subject, Subject.id == ExamResult.subject_id)
                .join(
                    StudentAcademicRecord,
                    StudentAcademicRecord.student_id == Student.id,
                )
                .join(
                    AcademicClass,
                    AcademicClass.id == StudentAcademicRecord.academic_class_id,
                )
                .join(Division, Division.id == AcademicClass.division_id)
                .join(Section, Section.id == AcademicClass.section_id)
                .filter(
                    StudentAcademicRecord.is_current == True,
                    AcademicClass.id.in_(assigned_class_ids),
                    Subject.id.in_(assigned_subject_ids),
                    ExamResult.status == "Published",
                )
            )

            # ================= FILTERS =================
            if class_id and class_id != "all":
                query = query.filter(AcademicClass.id == class_id)

            if subject_id and subject_id != "all":
                query = query.filter(Subject.id == subject_id)

            results = query.all()

            if not results:
                return jsonify({"error": "No analytics data found"}), 404

            # ================= KPI =================
            percentages = [r[0].percentage or 0 for r in results]

            avg_marks = round(sum(percentages) / len(percentages), 2)

            pass_students = len([
                p for p in percentages if p >= 35
            ])

            pass_rate = round(
                (pass_students / len(percentages)) * 100,
                2,
            )

            top_score = max(percentages)
            low_score = min(percentages)

            # ================= STUDENT ANALYTICS =================
            student_map = {}

            for res, student, subject, academic, division, section in results:

                if student.id not in student_map:

                    student_map[student.id] = {
                        "student": (
                            f"{student.first_name} "
                            f"{student.last_name}"
                        ),
                        "className": (
                            f"{division.division_name}-"
                            f"{section.section_name}"
                        ),
                        "percentages": [],
                    }

                student_map[student.id]["percentages"].append(
                    res.percentage or 0
                )

            student_analytics = []

            for _, data in student_map.items():

                avg_percentage = round(
                    sum(data["percentages"]) /
                    len(data["percentages"]),
                    2,
                )

                student_analytics.append({
                    "student": data["student"],
                    "className": data["className"],
                    "percentage": avg_percentage,
                })

            # ================= TOP =================
            top_students = sorted(
                student_analytics,
                key=lambda x: x["percentage"],
                reverse=True,
            )[:5]

            # ================= WEAK =================
            top_names = [
                s["student"] for s in top_students
            ]

            weak_students = sorted(
                [
                    s for s in student_analytics
                    if s["student"] not in top_names
                ],
                key=lambda x: x["percentage"],
            )[:5]

            # ================= INSIGHT =================
            insight = "Overall class performance is stable."

            if avg_marks >= 85:
                insight = (
                    "Excellent performance across assigned classes."
                )

            elif avg_marks >= 70:
                insight = (
                    "Students are performing well with room for improvement."
                )

            elif avg_marks >= 50:
                insight = (
                    "Average performance detected."
                )

            else:
                insight = (
                    "Critical improvement required."
                )

            # ================= PDF =================
            buffer = BytesIO()

            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
            )

            elements = []

            styles = getSampleStyleSheet()

            title_style = ParagraphStyle(
                name="title",
                alignment=TA_CENTER,
                fontSize=18,
                spaceAfter=20,
            )

            # ================= HEADER =================
            elements.append(
                Paragraph(
                    "<b>Teacher Analytics Report</b>",
                    title_style,
                )
            )

            # ================= KPI TABLE =================
            kpi_data = [
                ["Metric", "Value"],
                ["Average Marks", f"{avg_marks}%"],
                ["Pass Rate", f"{pass_rate}%"],
                ["Top Score", f"{top_score}%"],
                ["Low Score", f"{low_score}%"],
            ]

            kpi_table = Table(
                kpi_data,
                colWidths=[220, 220],
            )

            kpi_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0),
                     colors.HexColor("#4F46E5")),

                    ("TEXTCOLOR", (0, 0), (-1, 0),
                     colors.white),

                    ("GRID", (0, 0), (-1, -1),
                     0.5, colors.black),

                    ("FONTNAME", (0, 0), (-1, 0),
                     "Helvetica-Bold"),
                ])
            )

            elements.append(kpi_table)

            elements.append(Spacer(1, 20))

            # ================= TOP STUDENTS =================
            elements.append(
                Paragraph(
                    "<b>Top Students</b>",
                    styles["Heading2"],
                )
            )

            top_data = [["Student", "Class", "Percentage"]]

            for student in top_students:

                top_data.append([
                    student["student"],
                    student["className"],
                    f"{student['percentage']}%",
                ])

            top_table = Table(top_data)

            top_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0),
                     colors.green),

                    ("TEXTCOLOR", (0, 0), (-1, 0),
                     colors.white),

                    ("GRID", (0, 0), (-1, -1),
                     0.5, colors.black),
                ])
            )

            elements.append(top_table)

            elements.append(Spacer(1, 20))

            # ================= WEAK STUDENTS =================
            elements.append(
                Paragraph(
                    "<b>Needs Improvement</b>",
                    styles["Heading2"],
                )
            )

            weak_data = [["Student", "Class", "Percentage"]]

            for student in weak_students:

                weak_data.append([
                    student["student"],
                    student["className"],
                    f"{student['percentage']}%",
                ])

            weak_table = Table(weak_data)

            weak_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0),
                     colors.red),

                    ("TEXTCOLOR", (0, 0), (-1, 0),
                     colors.white),

                    ("GRID", (0, 0), (-1, -1),
                     0.5, colors.black),
                ])
            )

            elements.append(weak_table)

            elements.append(Spacer(1, 20))

            # ================= AI INSIGHT =================
            elements.append(
                Paragraph(
                    f"<b>AI Insight:</b> {insight}",
                    styles["BodyText"],
                )
            )

            # ================= BUILD =================
            doc.build(elements)

            buffer.seek(0)

            return send_file(
                buffer,
                as_attachment=True,
                download_name="teacher_analytics_report.pdf",
                mimetype="application/pdf",
            )

        except Exception as e:
            logger.exception(e)

            return jsonify({
                "error": "Failed to generate analytics PDF"
            }), 500