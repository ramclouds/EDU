import logging
from flask import jsonify
from flask.views import MethodView
from datetime import date
from decimal import Decimal

from utils.auth import db, Student
from utils.auth_middleware import login_required

logger = logging.getLogger(__name__)

# =========================
# MODELS
# =========================
DUE_RUPESS = 10.00


class Book(db.Model):
    __tablename__ = "books"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    author = db.Column(db.String(100))
    category = db.Column(db.String(50))
    isbn = db.Column(db.String(20), unique=True)

    total_copies = db.Column(db.Integer, default=1)
    available_copies = db.Column(db.Integer, default=1)

    created_at = db.Column(db.DateTime)


class BookIssue(db.Model):
    __tablename__ = "book_issues"

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    book_id = db.Column(db.Integer, db.ForeignKey("books.id"), nullable=False)

    issue_date = db.Column(db.Date, nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    return_date = db.Column(db.Date)

    fine_per_day = db.Column(db.Numeric(5, 2), default=DUE_RUPESS)
    fine_amount = db.Column(db.Numeric(10, 2), default=0)

    status = db.Column(db.Enum("Issued", "Returned", "Overdue"), default="Issued")

    created_at = db.Column(db.DateTime)

    book = db.relationship("Book")


# =========================
# SERVICE LAYER
# =========================


class LibraryService:

    @staticmethod
    def calculate_status_and_fine(issue, today):
        """Pure function → no DB writes"""
        days_left = (issue.due_date - today).days

        if issue.return_date:
            return "Returned", 0, days_left

        if today > issue.due_date:
            overdue_days = (today - issue.due_date).days
            fine = overdue_days * float(issue.fine_per_day)
            return "Overdue", fine, days_left

        if days_left <= 2:
            return "Due Soon", 0, days_left

        return "On Time", 0, days_left

    @staticmethod
    def sync_issue(issue, status, fine):
        """
        Sync DB fields (used by cron OR API if needed)
        """
        issue.fine_amount = Decimal(fine)

        if status == "Overdue":
            issue.status = "Overdue"
        elif status == "Returned":
            issue.status = "Returned"
        else:
            issue.status = "Issued"


# =========================
# API: STUDENT LIBRARY
# =========================


class StudentLibraryAPI(MethodView):

    @login_required
    def get(self, student_id):
        try:
            # ================= VALIDATION =================
            try:
                student_id = int(student_id)
                if student_id <= 0:
                    return jsonify({"error": "Invalid student id"}), 400
            except:
                return jsonify({"error": "Student id must be integer"}), 400

            student = Student.query.get(student_id)
            if not student:
                return jsonify({"error": "Student not found"}), 404

            today = date.today()

            issues = (
                db.session.query(BookIssue)
                .join(Book)
                .filter(BookIssue.student_id == student_id)
                .order_by(BookIssue.id.desc())
                .all()
            )

            data = []
            total_books = len(issues)
            overdue_count = 0
            total_fine = 0

            for issue in issues:
                status, fine, days_left = LibraryService.calculate_status_and_fine(
                    issue, today
                )

                # ⚡ OPTIONAL: sync (safe lightweight update)
                LibraryService.sync_issue(issue, status, fine)

                if status == "Overdue":
                    overdue_count += 1

                total_fine += fine

                data.append(
                    {
                        "id": issue.id,
                        "title": issue.book.title,
                        "author": issue.book.author,
                        "category": issue.book.category,
                        "issue_date": str(issue.issue_date),
                        "due_date": str(issue.due_date),
                        "days_left": days_left,
                        "status": status,
                        "fine": float(fine),
                    }
                )

            # ✅ SINGLE COMMIT (optimized)
            db.session.commit()

            return (
                jsonify(
                    {
                        "summary": {
                            "total_books": total_books,
                            "overdue": overdue_count,
                            "fine_due": total_fine,
                        },
                        "books": data,
                    }
                ),
                200,
            )

        except Exception as e:
            db.session.rollback()
            logger.exception(f"Library API error: {e}")
            return jsonify({"error": "Something went wrong"}), 500
