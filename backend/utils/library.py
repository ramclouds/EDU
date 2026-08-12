import csv
import io
import logging
import re
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation

from flask import Response, jsonify, request
from flask.views import MethodView
from sqlalchemy import and_, case, func, or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from utils.Notifications import Notification
from utils.auth import Admin, Student, db, Teacher, NonTeachingStaff
from utils.auth_middleware import login_required, get_current_user
from utils.rolePermissionManagement import user_has_permission
from utils.teacherDetails import TeacherClass, Teacher
from utils.studentDetails import (
    StudentAcademicRecord,
    AcademicClass,
    Batch,
    Division,
    Section,
)
from utils.subjects import Subject

logger = logging.getLogger(__name__)

DUE_RUPEES = 10.00

CATEGORY_STATUSES = {"Active", "Inactive"}
CATEGORY_MAX_NAME_LENGTH = 100
CATEGORY_MAX_DESCRIPTION_LENGTH = 1000

AUTHOR_STATUSES = {"Active", "Inactive"}
AUTHOR_MAX_NAME_LENGTH = 150
AUTHOR_MAX_COUNTRY_LENGTH = 100
AUTHOR_MAX_BIO_LENGTH = 2000


# HELPERS

def clean_text(value):
    return re.sub(r"\s+", " ", str(value or "").strip())


def slugify(value):
    value = clean_text(value).lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def parse_boolean(value, default=False):
    if value is None:
        return default

    if isinstance(value, bool):
        return value

    return str(value).strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def parse_positive_integer(value, default=1):
    try:
        parsed = int(value)
        return parsed if parsed > 0 else default
    except (TypeError, ValueError):
        return default


def normalize_admin_rights(admin):
    if not admin:
        return set()

    role = clean_text(getattr(admin, "role", "")).lower()
    admin_type = clean_text(getattr(admin, "admin_type", "")).lower()

    if role == "super_admin" or admin_type == "super admin":
        return {"read", "write", "edit", "delete"}

    access_level = clean_text(getattr(admin, "access_level", "")).lower()

    if access_level in {
        "full control",
        "full",
        "all",
        "administrator",
    }:
        return {"read", "write", "edit", "delete"}

    return {item.strip().lower() for item in access_level.split(",") if item.strip()}


def authorize_library_admin(required_right="read"):
    current_user = getattr(request, "user", None)

    if not isinstance(current_user, Admin):
        return None, (
            jsonify(
                {
                    "success": False,
                    "error": "Admin access required",
                }
            ),
            403,
        )

    role = clean_text(getattr(current_user, "role", "")).lower()

    admin_type = clean_text(getattr(current_user, "admin_type", "")).lower()

    is_super_admin = role in {
        "super_admin",
        "super-admin",
        "super administrator",
    } or admin_type in {
        "super admin",
        "super administrator",
    }

    if is_super_admin:
        return current_user, None

    action_map = {
        "read": "view",
        "write": "create",
        "create": "create",
        "edit": "edit",
        "delete": "delete",
    }

    required_action = action_map.get(
        str(required_right or "read").strip().lower(),
        "view",
    )

    has_permission = user_has_permission(
        current_user,
        "library",
        required_action,
    )

    if not has_permission:
        return None, (
            jsonify(
                {
                    "success": False,
                    "error": "Permission denied",
                    "required_permission": {
                        "module": "library",
                        "action": required_action,
                    },
                }
            ),
            403,
        )

    return current_user, None


# MODELS

class BookCategory(db.Model):
    __tablename__ = "book_categories"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    name = db.Column(
        db.String(CATEGORY_MAX_NAME_LENGTH),
        nullable=False,
        unique=True,
        index=True,
    )

    slug = db.Column(
        db.String(120),
        nullable=False,
        unique=True,
        index=True,
    )

    description = db.Column(
        db.Text,
        nullable=True,
    )

    status = db.Column(
        db.Enum(
            "Active",
            "Inactive",
            name="book_category_status_enum",
        ),
        nullable=False,
        default="Active",
        index=True,
    )

    display_order = db.Column(
        db.Integer,
        nullable=False,
        default=0,
    )

    is_deleted = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    created_by = db.Column(
        db.String(50),
        nullable=True,
    )

    updated_by = db.Column(
        db.String(50),
        nullable=True,
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    books = db.relationship(
        "Book",
        back_populates="category_details",
        lazy="dynamic",
    )

    __table_args__ = (
        db.Index(
            "idx_book_category_status_deleted",
            "status",
            "is_deleted",
        ),
    )

    def to_dict(self, include_book_count=True):
        data = {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description or "",
            "status": self.status,
            "display_order": self.display_order,
            "is_deleted": self.is_deleted,
            "created_by": self.created_by,
            "updated_by": self.updated_by,
            "created_at": (self.created_at.isoformat() if self.created_at else None),
            "updated_at": (self.updated_at.isoformat() if self.updated_at else None),
        }

        if include_book_count:
            data["total_books"] = Book.query.filter(
                Book.category_id == self.id,
                Book.is_deleted.is_(False),
            ).count()

        return data


class BookAuthor(db.Model):
    __tablename__ = "book_authors"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    name = db.Column(
        db.String(AUTHOR_MAX_NAME_LENGTH),
        nullable=False,
        unique=True,
        index=True,
    )

    slug = db.Column(
        db.String(180),
        nullable=False,
        unique=True,
        index=True,
    )

    country = db.Column(
        db.String(AUTHOR_MAX_COUNTRY_LENGTH),
        nullable=True,
    )

    biography = db.Column(
        db.Text,
        nullable=True,
    )

    status = db.Column(
        db.Enum(
            "Active",
            "Inactive",
            name="book_author_status_enum",
        ),
        nullable=False,
        default="Active",
        index=True,
    )

    is_deleted = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    created_by = db.Column(
        db.String(50),
        nullable=True,
    )

    updated_by = db.Column(
        db.String(50),
        nullable=True,
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    books = db.relationship(
        "Book",
        back_populates="author_details",
        lazy="dynamic",
    )

    __table_args__ = (
        db.Index(
            "idx_book_author_status_deleted",
            "status",
            "is_deleted",
        ),
    )

    def to_dict(self, include_book_count=True):
        data = {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "country": self.country or "",
            "biography": self.biography or "",
            "status": self.status,
            "is_deleted": self.is_deleted,
            "created_by": self.created_by,
            "updated_by": self.updated_by,
            "created_at": (self.created_at.isoformat() if self.created_at else None),
            "updated_at": (self.updated_at.isoformat() if self.updated_at else None),
        }

        if include_book_count:
            data["total_books"] = Book.query.filter(
                Book.author_id == self.id,
                Book.is_deleted.is_(False),
            ).count()

        return data


class Book(db.Model):
    __tablename__ = "books"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    book_code = db.Column(
        db.String(30),
        unique=True,
        nullable=True,
        index=True,
    )

    title = db.Column(
        db.String(255),
        nullable=False,
        index=True,
    )

    # Kept for old records and readable fallback.
    author = db.Column(
        db.String(150),
        nullable=True,
    )

    author_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "book_authors.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # Kept for old records and readable fallback.
    category = db.Column(
        db.String(100),
        nullable=True,
    )

    category_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "book_categories.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    isbn = db.Column(
        db.String(30),
        unique=True,
        nullable=True,
        index=True,
    )

    total_copies = db.Column(
        db.Integer,
        nullable=False,
        default=1,
    )

    available_copies = db.Column(
        db.Integer,
        nullable=False,
        default=1,
    )

    shelf_no = db.Column(
        db.String(50),
        nullable=False,
    )

    publisher = db.Column(
        db.String(150),
        nullable=True,
    )

    published_year = db.Column(
        db.Integer,
        nullable=True,
    )

    language = db.Column(
        db.String(50),
        nullable=True,
        default="English",
    )

    description = db.Column(
        db.Text,
        nullable=True,
    )

    status = db.Column(
        db.Enum(
            "Available",
            "Unavailable",
            "Inactive",
            name="book_status_enum",
        ),
        nullable=False,
        default="Available",
        index=True,
    )

    is_deleted = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    created_by = db.Column(
        db.String(50),
        nullable=True,
    )

    updated_by = db.Column(
        db.String(50),
        nullable=True,
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    category_details = db.relationship(
        "BookCategory",
        back_populates="books",
    )

    author_details = db.relationship(
        "BookAuthor",
        back_populates="books",
    )

    def to_dict(self):
        author_name = self.author_details.name if self.author_details else self.author

        category_name = (
            self.category_details.name if self.category_details else self.category
        )

        return {
            "id": self.id,
            "book_code": self.book_code or f"B{self.id:05d}",
            "title": self.title,
            "author_id": self.author_id,
            "author_name": author_name or "",
            "author": author_name or "",
            "category_id": self.category_id,
            "category_name": category_name or "",
            "category": category_name or "",
            "isbn": self.isbn or "",
            "total_copies": self.total_copies,
            "available_copies": self.available_copies,
            "shelf_no": self.shelf_no or "",
            "publisher": self.publisher or "",
            "published_year": self.published_year,
            "language": self.language or "",
            "description": self.description or "",
            "status": self.status,
            "is_deleted": self.is_deleted,
            "created_at": (self.created_at.isoformat() if self.created_at else None),
            "updated_at": (self.updated_at.isoformat() if self.updated_at else None),
        }


class BookIssue(db.Model):
    __tablename__ = "book_issues"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id"),
        nullable=False,
    )

    book_id = db.Column(
        db.Integer,
        db.ForeignKey("books.id"),
        nullable=False,
    )

    issue_date = db.Column(
        db.Date,
        nullable=False,
    )

    due_date = db.Column(
        db.Date,
        nullable=False,
    )

    return_date = db.Column(
        db.Date,
        nullable=True,
    )

    fine_per_day = db.Column(
        db.Numeric(5, 2),
        default=DUE_RUPEES,
    )

    fine_amount = db.Column(
        db.Numeric(10, 2),
        default=0,
    )

    status = db.Column(
        db.Enum(
            "Issued",
            "Returned",
            "Overdue",
        ),
        default="Issued",
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
    )

    book = db.relationship("Book")


class LibraryFinePayment(db.Model):
    __tablename__ = "library_fine_payments"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id"),
        nullable=False,
        index=True,
    )

    book_issue_id = db.Column(
        db.Integer,
        db.ForeignKey("book_issues.id"),
        nullable=True,
        index=True,
    )

    amount = db.Column(
        db.Numeric(10, 2),
        nullable=False,
        default=0,
    )

    payment_method = db.Column(
        db.String(30),
        nullable=False,
        default="Cash",
    )

    reference_no = db.Column(
        db.String(100),
        nullable=True,
    )

    remarks = db.Column(
        db.String(500),
        nullable=True,
    )

    status = db.Column(
        db.Enum(
            "Collected",
            "Waived",
            "Refunded",
            name="library_fine_payment_status_enum",
        ),
        nullable=False,
        default="Collected",
        index=True,
    )

    collected_by = db.Column(
        db.String(50),
        nullable=True,
    )

    collected_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    student = db.relationship(
        "Student",
        foreign_keys=[student_id],
    )

    issue = db.relationship(
        "BookIssue",
        foreign_keys=[book_issue_id],
    )

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "book_issue_id": self.book_issue_id,
            "amount": float(self.amount or 0),
            "payment_method": self.payment_method,
            "reference_no": self.reference_no or "",
            "remarks": self.remarks or "",
            "status": self.status,
            "collected_by": self.collected_by,
            "collected_at": (
                self.collected_at.isoformat() if self.collected_at else None
            ),
        }


class TeacherBookIssue(db.Model):
    __tablename__ = "teacher_book_issues"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    teacher_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "teachers.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    book_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "books.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    issue_date = db.Column(
        db.Date,
        nullable=False,
    )

    due_date = db.Column(
        db.Date,
        nullable=False,
    )

    return_date = db.Column(
        db.Date,
        nullable=True,
    )

    fine_per_day = db.Column(
        db.Numeric(5, 2),
        nullable=False,
        default=DUE_RUPEES,
    )

    fine_amount = db.Column(
        db.Numeric(10, 2),
        nullable=False,
        default=0,
    )

    status = db.Column(
        db.Enum(
            "Issued",
            "Returned",
            "Overdue",
            name="teacher_book_issue_status_enum",
        ),
        nullable=False,
        default="Issued",
        index=True,
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    teacher = db.relationship(
        "Teacher",
        foreign_keys=[teacher_id],
    )

    book = db.relationship(
        "Book",
        foreign_keys=[book_id],
    )


class TeacherLibraryFinePayment(db.Model):
    __tablename__ = "teacher_library_fine_payments"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    teacher_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "teachers.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    book_issue_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "teacher_book_issues.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    amount = db.Column(
        db.Numeric(10, 2),
        nullable=False,
        default=0,
    )

    payment_method = db.Column(
        db.String(30),
        nullable=False,
        default="Cash",
    )

    reference_no = db.Column(
        db.String(100),
        nullable=True,
    )

    remarks = db.Column(
        db.String(500),
        nullable=True,
    )

    status = db.Column(
        db.Enum(
            "Collected",
            "Waived",
            "Refunded",
            name="teacher_fine_payment_status_enum",
        ),
        nullable=False,
        default="Collected",
        index=True,
    )

    collected_by = db.Column(
        db.String(50),
        nullable=True,
    )

    collected_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    teacher = db.relationship(
        "Teacher",
        foreign_keys=[teacher_id],
    )

    issue = db.relationship(
        "TeacherBookIssue",
        foreign_keys=[book_issue_id],
    )

    def to_dict(self):
        return {
            "id": self.id,
            "teacher_id": self.teacher_id,
            "book_issue_id": self.book_issue_id,
            "amount": float(self.amount or 0),
            "payment_method": self.payment_method,
            "reference_no": self.reference_no or "",
            "remarks": self.remarks or "",
            "status": self.status,
            "collected_by": self.collected_by,
            "collected_at": (
                self.collected_at.isoformat() if self.collected_at else None
            ),
        }

class StaffBookIssue(db.Model):
    __tablename__ = "staff_book_issues"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    staff_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "non_teaching_staff.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    book_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "books.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    issue_date = db.Column(
        db.Date,
        nullable=False,
    )

    due_date = db.Column(
        db.Date,
        nullable=False,
    )

    return_date = db.Column(
        db.Date,
        nullable=True,
    )

    fine_per_day = db.Column(
        db.Numeric(5, 2),
        nullable=False,
        default=DUE_RUPEES,
    )

    fine_amount = db.Column(
        db.Numeric(10, 2),
        nullable=False,
        default=0,
    )

    status = db.Column(
        db.Enum(
            "Issued",
            "Returned",
            "Overdue",
            name="staff_book_issue_status_enum",
        ),
        nullable=False,
        default="Issued",
        index=True,
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    staff = db.relationship(
        "NonTeachingStaff",
        foreign_keys=[staff_id],
    )

    book = db.relationship(
        "Book",
        foreign_keys=[book_id],
    )


class AdminBookIssue(db.Model):
    __tablename__ = "admin_book_issues"

    id = db.Column(db.Integer, primary_key=True)

    admin_id = db.Column(
        db.Integer,
        db.ForeignKey("admins.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    book_id = db.Column(
        db.Integer,
        db.ForeignKey("books.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    issue_date = db.Column(db.Date, nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    return_date = db.Column(db.Date, nullable=True)
    fine_per_day = db.Column(db.Numeric(5, 2), nullable=False, default=DUE_RUPEES)
    fine_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    status = db.Column(
        db.Enum("Issued", "Returned", "Overdue", name="admin_book_issue_status_enum"),
        nullable=False,
        default="Issued",
        index=True,
    )

    remarks = db.Column(db.String(500), nullable=True)
    issued_by = db.Column(db.String(50), nullable=True)
    returned_by = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    admin = db.relationship("Admin", foreign_keys=[admin_id])
    book = db.relationship("Book", foreign_keys=[book_id])

class StaffLibraryFinePayment(db.Model):
    __tablename__ = "staff_library_fine_payments"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    staff_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "non_teaching_staff.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    book_issue_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "staff_book_issues.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    amount = db.Column(
        db.Numeric(10, 2),
        nullable=False,
        default=0,
    )

    payment_method = db.Column(
        db.String(30),
        nullable=False,
        default="Cash",
    )

    reference_no = db.Column(
        db.String(100),
        nullable=True,
    )

    remarks = db.Column(
        db.String(500),
        nullable=True,
    )

    status = db.Column(
        db.Enum(
            "Collected",
            "Waived",
            "Refunded",
            name="staff_fine_payment_status_enum",
        ),
        nullable=False,
        default="Collected",
        index=True,
    )

    collected_by = db.Column(
        db.String(50),
        nullable=True,
    )

    collected_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    staff = db.relationship(
        "NonTeachingStaff",
        foreign_keys=[staff_id],
    )

    issue = db.relationship(
        "StaffBookIssue",
        foreign_keys=[book_issue_id],
    )

    def to_dict(self):
        return {
            "id": self.id,
            "staff_id": self.staff_id,
            "book_issue_id": (self.book_issue_id),
            "amount": float(self.amount or 0),
            "payment_method": (self.payment_method),
            "reference_no": (self.reference_no or ""),
            "remarks": (self.remarks or ""),
            "status": self.status,
            "collected_by": (self.collected_by),
            "collected_at": (
                self.collected_at.isoformat() if self.collected_at else None
            ),
        }


# CATEGORY VALIDATION

def validate_category_payload(payload, category=None):
    errors = {}

    name = clean_text(payload.get("name"))
    description = clean_text(payload.get("description"))
    status = clean_text(payload.get("status") or "Active")
    display_order_raw = payload.get("display_order", 0)

    if not name:
        errors["name"] = "Category name is required"
    elif len(name) < 2:
        errors["name"] = "Category name must contain at least 2 characters"
    elif len(name) > CATEGORY_MAX_NAME_LENGTH:
        errors["name"] = (
            f"Category name cannot exceed " f"{CATEGORY_MAX_NAME_LENGTH} characters"
        )
    elif not re.match(r"^[A-Za-z0-9][A-Za-z0-9 &'(),./+-]*$", name):
        errors["name"] = "Category name contains unsupported characters"

    if len(description) > CATEGORY_MAX_DESCRIPTION_LENGTH:
        errors["description"] = (
            f"Description cannot exceed "
            f"{CATEGORY_MAX_DESCRIPTION_LENGTH} characters"
        )

    if status not in CATEGORY_STATUSES:
        errors["status"] = "Status must be Active or Inactive"

    try:
        display_order = int(display_order_raw or 0)

        if display_order < 0:
            errors["display_order"] = "Display order cannot be negative"
    except (TypeError, ValueError):
        display_order = 0
        errors["display_order"] = "Display order must be a valid number"

    if name:
        duplicate_query = BookCategory.query.filter(
            func.lower(BookCategory.name) == name.lower(),
            BookCategory.is_deleted.is_(False),
        )

        if category:
            duplicate_query = duplicate_query.filter(BookCategory.id != category.id)

        if duplicate_query.first():
            errors["name"] = "A category with this name already exists"

    normalized_data = {
        "name": name,
        "slug": slugify(name),
        "description": description or None,
        "status": status,
        "display_order": display_order,
    }

    return normalized_data, errors


# CATEGORY LIST + CREATE API

class LibraryCategoryListAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        try:
            search = clean_text(request.args.get("search"))
            status = clean_text(request.args.get("status"))
            sort_by = clean_text(request.args.get("sort_by") or "display_order")
            sort_direction = clean_text(
                request.args.get("sort_direction") or "asc"
            ).lower()

            page = parse_positive_integer(
                request.args.get("page"),
                1,
            )

            per_page = min(
                parse_positive_integer(
                    request.args.get("per_page"),
                    10,
                ),
                100,
            )

            query = (
                db.session.query(
                    BookCategory,
                    func.count(Book.id).label("total_books"),
                )
                .outerjoin(
                    Book,
                    db.and_(
                        Book.category_id == BookCategory.id,
                        Book.is_deleted.is_(False),
                    ),
                )
                .filter(BookCategory.is_deleted.is_(False))
                .group_by(BookCategory.id)
            )

            if search:
                search_term = f"%{search}%"

                query = query.filter(
                    or_(
                        BookCategory.name.ilike(search_term),
                        BookCategory.description.ilike(search_term),
                        BookCategory.slug.ilike(search_term),
                    )
                )

            if status in CATEGORY_STATUSES:
                query = query.filter(BookCategory.status == status)

            allowed_sort_columns = {
                "name": BookCategory.name,
                "status": BookCategory.status,
                "display_order": BookCategory.display_order,
                "created_at": BookCategory.created_at,
                "updated_at": BookCategory.updated_at,
                "total_books": func.count(Book.id),
            }

            sort_column = allowed_sort_columns.get(
                sort_by,
                BookCategory.display_order,
            )

            if sort_direction == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())

            query = query.order_by(BookCategory.name.asc())

            pagination = query.paginate(
                page=page,
                per_page=per_page,
                error_out=False,
            )

            categories = []

            for category, total_books in pagination.items:
                item = category.to_dict(include_book_count=False)
                item["total_books"] = int(total_books or 0)
                categories.append(item)

            total_categories = BookCategory.query.filter(
                BookCategory.is_deleted.is_(False)
            ).count()

            active_categories = BookCategory.query.filter(
                BookCategory.is_deleted.is_(False),
                BookCategory.status == "Active",
            ).count()

            inactive_categories = BookCategory.query.filter(
                BookCategory.is_deleted.is_(False),
                BookCategory.status == "Inactive",
            ).count()

            assigned_books = Book.query.filter(
                Book.is_deleted.is_(False),
                Book.category_id.isnot(None),
            ).count()

            uncategorized_books = Book.query.filter(
                Book.is_deleted.is_(False),
                Book.category_id.is_(None),
            ).count()

            return (
                jsonify(
                    {
                        "success": True,
                        "categories": categories,
                        "stats": {
                            "total_categories": total_categories,
                            "active_categories": active_categories,
                            "inactive_categories": inactive_categories,
                            "assigned_books": assigned_books,
                            "uncategorized_books": uncategorized_books,
                        },
                        "pagination": {
                            "page": pagination.page,
                            "per_page": pagination.per_page,
                            "total": pagination.total,
                            "pages": pagination.pages,
                            "has_next": pagination.has_next,
                            "has_prev": pagination.has_prev,
                        },
                        "filters": {
                            "search": search,
                            "status": status,
                            "sort_by": sort_by,
                            "sort_direction": sort_direction,
                        },
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            logger.exception("Database error while loading categories")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Unable to load categories",
                    }
                ),
                500,
            )

        except Exception:
            logger.exception("Unexpected error while loading categories")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Something went wrong",
                    }
                ),
                500,
            )

    @login_required
    def post(self):
        current_admin, access_error = authorize_library_admin("write")

        if access_error:
            return access_error

        try:
            payload = request.get_json(silent=True) or {}
            category_data, errors = validate_category_payload(payload)

            if errors:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Validation failed",
                            "errors": errors,
                        }
                    ),
                    422,
                )

            category = BookCategory(
                **category_data,
                created_by=str(
                    getattr(
                        current_admin,
                        "admin_id",
                        current_admin.id,
                    )
                ),
                updated_by=str(
                    getattr(
                        current_admin,
                        "admin_id",
                        current_admin.id,
                    )
                ),
            )

            db.session.add(category)
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": ("Category created successfully"),
                        "category": category.to_dict(),
                    }
                ),
                201,
            )

        except IntegrityError:
            db.session.rollback()

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Category name already exists"),
                    }
                ),
                409,
            )

        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Database error while creating category")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Unable to create category",
                    }
                ),
                500,
            )

        except Exception:
            db.session.rollback()
            logger.exception("Unexpected error while creating category")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Something went wrong",
                    }
                ),
                500,
            )

# CATEGORY DETAILS + UPDATE + DELETE
class LibraryCategoryDetailAPI(MethodView):

    @login_required
    def get(self, category_id):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        category = BookCategory.query.filter(
            BookCategory.id == category_id,
            BookCategory.is_deleted.is_(False),
        ).first()

        if not category:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Category not found",
                    }
                ),
                404,
            )

        return (
            jsonify(
                {
                    "success": True,
                    "category": category.to_dict(),
                }
            ),
            200,
        )

    @login_required
    def put(self, category_id):
        current_admin, access_error = authorize_library_admin("edit")

        if access_error:
            return access_error

        category = BookCategory.query.filter(
            BookCategory.id == category_id,
            BookCategory.is_deleted.is_(False),
        ).first()

        if not category:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Category not found",
                    }
                ),
                404,
            )

        try:
            payload = request.get_json(silent=True) or {}

            merged_payload = {
                "name": payload.get("name", category.name),
                "description": payload.get(
                    "description",
                    category.description,
                ),
                "status": payload.get(
                    "status",
                    category.status,
                ),
                "display_order": payload.get(
                    "display_order",
                    category.display_order,
                ),
            }

            category_data, errors = validate_category_payload(
                merged_payload,
                category=category,
            )

            if errors:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Validation failed",
                            "errors": errors,
                        }
                    ),
                    422,
                )

            category.name = category_data["name"]
            category.slug = category_data["slug"]
            category.description = category_data["description"]
            category.status = category_data["status"]
            category.display_order = category_data["display_order"]
            category.updated_by = str(
                getattr(
                    current_admin,
                    "admin_id",
                    current_admin.id,
                )
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": ("Category updated successfully"),
                        "category": category.to_dict(),
                    }
                ),
                200,
            )

        except IntegrityError:
            db.session.rollback()

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Category name already exists"),
                    }
                ),
                409,
            )

        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Database error while updating category")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Unable to update category",
                    }
                ),
                500,
            )

        except Exception:
            db.session.rollback()
            logger.exception("Unexpected error while updating category")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Something went wrong",
                    }
                ),
                500,
            )

    @login_required
    def delete(self, category_id):
        current_admin, access_error = authorize_library_admin("delete")

        if access_error:
            return access_error

        category = BookCategory.query.filter(
            BookCategory.id == category_id,
            BookCategory.is_deleted.is_(False),
        ).first()

        if not category:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Category not found",
                    }
                ),
                404,
            )

        try:
            force = parse_boolean(
                request.args.get("force"),
                False,
            )

            assigned_book_count = Book.query.filter(
                Book.category_id == category.id,
                Book.is_deleted.is_(False),
            ).count()

            if assigned_book_count > 0 and not force:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": (
                                "Category cannot be deleted because "
                                f"{assigned_book_count} book(s) are "
                                "assigned to it"
                            ),
                            "assigned_books": assigned_book_count,
                            "requires_force": True,
                        }
                    ),
                    409,
                )

            if force and assigned_book_count > 0:
                Book.query.filter(
                    Book.category_id == category.id,
                    Book.is_deleted.is_(False),
                ).update(
                    {
                        Book.category_id: None,
                        Book.category: None,
                    },
                    synchronize_session=False,
                )

            category.is_deleted = True
            category.status = "Inactive"
            category.updated_by = str(
                getattr(
                    current_admin,
                    "admin_id",
                    current_admin.id,
                )
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": ("Category deleted successfully"),
                        "unassigned_books": (assigned_book_count if force else 0),
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Database error while deleting category")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Unable to delete category",
                    }
                ),
                500,
            )

# STATUS UPDATE
class LibraryCategoryStatusAPI(MethodView):

    @login_required
    def patch(self, category_id):
        current_admin, access_error = authorize_library_admin("edit")

        if access_error:
            return access_error

        category = BookCategory.query.filter(
            BookCategory.id == category_id,
            BookCategory.is_deleted.is_(False),
        ).first()

        if not category:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Category not found",
                    }
                ),
                404,
            )

        payload = request.get_json(silent=True) or {}
        status = clean_text(payload.get("status"))

        if status not in CATEGORY_STATUSES:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Status must be Active or Inactive"),
                    }
                ),
                422,
            )

        try:
            category.status = status
            category.updated_by = str(
                getattr(
                    current_admin,
                    "admin_id",
                    current_admin.id,
                )
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": (f"Category marked as {status}"),
                        "category": category.to_dict(),
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Unable to change category status")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to update category status"),
                    }
                ),
                500,
            )

# SELECT OPTIONS FOR ADD BOOK FORM
class LibraryCategoryOptionsAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        categories = (
            BookCategory.query.filter(
                BookCategory.is_deleted.is_(False),
                BookCategory.status == "Active",
            )
            .order_by(
                BookCategory.display_order.asc(),
                BookCategory.name.asc(),
            )
            .all()
        )

        return (
            jsonify(
                {
                    "success": True,
                    "categories": [
                        {
                            "id": category.id,
                            "name": category.name,
                            "slug": category.slug,
                        }
                        for category in categories
                    ],
                }
            ),
            200,
        )

def safe_student_value(student, *field_names, default=""):
    for field_name in field_names:
        value = getattr(student, field_name, None)

        if value not in (None, ""):
            return value

    return default


def get_student_full_name(student):
    direct_name = safe_student_value(
        student,
        "full_name",
        "name",
    )

    if direct_name:
        return clean_text(direct_name)

    name_parts = [
        safe_student_value(student, "first_name"),
        safe_student_value(student, "middle_name"),
        safe_student_value(student, "last_name"),
    ]

    return (
        clean_text(" ".join(str(part) for part in name_parts if part not in (None, "")))
        or f"Student {student.id}"
    )


def get_student_academic_details(student):
    """
    Load the student's current academic assignment from
    studentDetails.py models.

    Student
        -> StudentAcademicRecord
        -> AcademicClass
        -> Batch / Division / Section
    """

    academic_record = (
        db.session.query(StudentAcademicRecord)
        .filter(
            StudentAcademicRecord.student_id == student.id,
            StudentAcademicRecord.is_current.is_(True),
        )
        .order_by(StudentAcademicRecord.id.desc())
        .first()
    )

    if not academic_record:
        return {
            "academic_record_id": None,
            "academic_class_id": None,
            "class_name": "Not Assigned",
            "batch_id": None,
            "batch_name": "",
            "division_id": None,
            "division_name": "",
            "section_id": None,
            "section_name": "",
            "roll_number": "",
        }

    academic_class = db.session.get(
        AcademicClass,
        academic_record.academic_class_id,
    )

    if not academic_class:
        return {
            "academic_record_id": academic_record.id,
            "academic_class_id": (academic_record.academic_class_id),
            "class_name": "Not Assigned",
            "batch_id": None,
            "batch_name": "",
            "division_id": None,
            "division_name": "",
            "section_id": None,
            "section_name": "",
            "roll_number": (
                str(academic_record.roll_number)
                if academic_record.roll_number is not None
                else ""
            ),
        }

    batch = db.session.get(
        Batch,
        academic_class.batch_id,
    )

    division = db.session.get(
        Division,
        academic_class.division_id,
    )

    section = db.session.get(
        Section,
        academic_class.section_id,
    )

    batch_name = batch.batch_name if batch else ""
    division_name = division.division_name if division else ""
    section_name = section.section_name if section else ""
    class_name = clean_text(
        f"{division_name}"
        f"{'-' if division_name and section_name else ''}"
        f"{section_name}"
    )

    return {
        "academic_record_id": academic_record.id,
        "academic_class_id": academic_class.id,
        "class_name": (class_name if class_name else "Not Assigned"),
        "batch_id": academic_class.batch_id,
        "batch_name": batch_name,
        "division_id": academic_class.division_id,
        "division_name": division_name,
        "section_id": academic_class.section_id,
        "section_name": section_name,
        "roll_number": (
            str(academic_record.roll_number)
            if academic_record.roll_number is not None
            else ""
        ),
    }


def serialize_library_student(student):
    academic = get_student_academic_details(student)
    first_name = clean_text(getattr(student, "first_name", ""))
    middle_name = clean_text(getattr(student, "middle_name", ""))
    last_name = clean_text(getattr(student, "last_name", ""))
    full_name = clean_text(
        " ".join(
            value
            for value in (
                first_name,
                middle_name,
                last_name,
            )
            if value
        )
    )

    if not full_name:
        full_name = f"Student {student.id}"

    date_of_birth = getattr(
        student,
        "date_of_birth",
        None,
    )

    admission_date = getattr(
        student,
        "admission_date",
        None,
    )

    return {
        "id": student.id,
        "student_id": (getattr(student, "student_id", None) or f"S{student.id:04d}"),
        "user_id": (getattr(student, "user_id", None) or ""),
        "name": full_name,
        "full_name": full_name,
        "first_name": first_name,
        "middle_name": middle_name,
        "last_name": last_name,
        # CONTACT
        "email": (getattr(student, "email", None) or ""),
        "mobile": (getattr(student, "mobile", None) or ""),
        # FAMILY
        "father_name": (getattr(student, "father_name", None) or ""),
        "father_mobile": (getattr(student, "father_mobile", None) or ""),
        "father_email": (getattr(student, "father_email", None) or ""),
        "mother_name": (getattr(student, "mother_name", None) or ""),
        "mother_mobile": (getattr(student, "mother_mobile", None) or ""),
        "mother_email": (getattr(student, "mother_email", None) or ""),
        "parent_name": (getattr(student, "parent_name", None) or ""),
        "parent_mobile": (getattr(student, "parent_mobile", None) or ""),
        "parent_email": (getattr(student, "parent_email", None) or ""),
        # EMERGENCY
        "emergency_contact_name": (
            getattr(
                student,
                "emergency_contact_name",
                None,
            )
            or ""
        ),
        "emergency_contact_number": (
            getattr(
                student,
                "emergency_contact_number",
                None,
            )
            or ""
        ),
        "emergency_contact_relation": (
            getattr(
                student,
                "emergency_contact_relation",
                None,
            )
            or ""
        ),
        # PERSONAL
        "gender": (getattr(student, "gender", None) or ""),
        "date_of_birth": (date_of_birth.isoformat() if date_of_birth else None),
        "blood_group": (getattr(student, "blood_group", None) or ""),
        "address": (getattr(student, "address", None) or ""),
        # ADMISSION
        "admission_date": (admission_date.isoformat() if admission_date else None),
        "previous_school": (
            getattr(
                student,
                "previous_school",
                None,
            )
            or ""
        ),
        # MEDICAL
        "medical_conditions": (
            getattr(
                student,
                "medical_conditions",
                None,
            )
            or ""
        ),
        "allergies": (getattr(student, "allergies", None) or ""),
        "profile_image": (
            getattr(
                student,
                "profile_image",
                None,
            )
            or ""
        ),
        "status": (getattr(student, "status", None) or "Active"),
        # CURRENT ACADEMIC DETAILS
        **academic,
    }


def calculate_issue_fine(issue, today=None):
    today = today or date.today()

    if issue.return_date:
        effective_date = issue.return_date
    else:
        effective_date = today

    overdue_days = max(
        (effective_date - issue.due_date).days,
        0,
    )

    fine_amount = Decimal(str(issue.fine_per_day or DUE_RUPEES)) * Decimal(overdue_days)

    return overdue_days, fine_amount


def get_issue_paid_amount(issue_id):
    amount = (
        db.session.query(
            func.coalesce(
                func.sum(
                    case(
                        (
                            LibraryFinePayment.status == "Collected",
                            LibraryFinePayment.amount,
                        ),
                        else_=0,
                    )
                ),
                0,
            )
        )
        .filter(
            LibraryFinePayment.book_issue_id == issue_id,
        )
        .scalar()
    )

    return Decimal(str(amount or 0))


def serialize_book_issue(issue):
    overdue_days, calculated_fine = calculate_issue_fine(issue)

    paid_amount = get_issue_paid_amount(issue.id)

    pending_fine = max(
        calculated_fine - paid_amount,
        Decimal("0"),
    )

    if issue.return_date:
        display_status = "Returned"
    elif date.today() > issue.due_date:
        display_status = "Overdue"
    elif (issue.due_date - date.today()).days <= 2:
        display_status = "Due Soon"
    else:
        display_status = "Issued"

    category_name = (
        issue.book.category_details.name
        if issue.book and issue.book.category_details
        else (issue.book.category if issue.book else "")
    )

    return {
        "id": issue.id,
        "book_id": issue.book_id,
        "book_title": (issue.book.title if issue.book else "Deleted Book"),
        "title": (issue.book.title if issue.book else "Deleted Book"),
        "author": (issue.book.author or "" if issue.book else ""),
        "category": category_name or "Uncategorized",
        "isbn": (issue.book.isbn or "" if issue.book else ""),
        "issue_date": (issue.issue_date.isoformat() if issue.issue_date else None),
        "due_date": (issue.due_date.isoformat() if issue.due_date else None),
        "return_date": (issue.return_date.isoformat() if issue.return_date else None),
        "fine_per_day": float(issue.fine_per_day or 0),
        "overdue_days": overdue_days,
        "fine_amount": float(calculated_fine),
        "paid_fine": float(paid_amount),
        "pending_fine": float(pending_fine),
        "status": display_status,
    }

# EXISTING STUDENT LIBRARY SERVICE
class LibraryService:

    @staticmethod
    def calculate_status_and_fine(issue, today):
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
        issue.fine_amount = Decimal(str(fine))

        if status == "Overdue":
            issue.status = "Overdue"
        elif status == "Returned":
            issue.status = "Returned"
        else:
            issue.status = "Issued"


# AUTHOR VALIDATION
def validate_author_payload(payload, author=None):
    errors = {}

    name = clean_text(payload.get("name"))
    country = clean_text(payload.get("country"))
    biography = clean_text(payload.get("biography"))
    status = clean_text(payload.get("status") or "Active")

    if not name:
        errors["name"] = "Author name is required"
    elif len(name) < 2:
        errors["name"] = "Author name must contain at least 2 characters"
    elif len(name) > AUTHOR_MAX_NAME_LENGTH:
        errors["name"] = (
            f"Author name cannot exceed " f"{AUTHOR_MAX_NAME_LENGTH} characters"
        )
    elif not re.match(
        r"^[A-Za-z0-9][A-Za-z0-9 .,'&()\-]*$",
        name,
    ):
        errors["name"] = "Author name contains unsupported characters"

    if len(country) > AUTHOR_MAX_COUNTRY_LENGTH:
        errors["country"] = (
            f"Country cannot exceed " f"{AUTHOR_MAX_COUNTRY_LENGTH} characters"
        )

    if len(biography) > AUTHOR_MAX_BIO_LENGTH:
        errors["biography"] = (
            f"Biography cannot exceed " f"{AUTHOR_MAX_BIO_LENGTH} characters"
        )

    if status not in AUTHOR_STATUSES:
        errors["status"] = "Status must be Active or Inactive"

    if name:
        duplicate_query = BookAuthor.query.filter(
            func.lower(BookAuthor.name) == name.lower(),
            BookAuthor.is_deleted.is_(False),
        )

        if author:
            duplicate_query = duplicate_query.filter(BookAuthor.id != author.id)

        if duplicate_query.first():
            errors["name"] = "An author with this name already exists"

    normalized_data = {
        "name": name,
        "slug": slugify(name),
        "country": country or None,
        "biography": biography or None,
        "status": status,
    }

    return normalized_data, errors


# AUTHOR LIST + CREATE
class LibraryAuthorListAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        try:
            search = clean_text(request.args.get("search"))
            country = clean_text(request.args.get("country"))
            status = clean_text(request.args.get("status"))

            sort_by = clean_text(request.args.get("sort_by") or "name")

            sort_direction = clean_text(
                request.args.get("sort_direction") or "asc"
            ).lower()

            page = parse_positive_integer(
                request.args.get("page"),
                1,
            )

            per_page = min(
                parse_positive_integer(
                    request.args.get("per_page"),
                    10,
                ),
                100,
            )

            query = (
                db.session.query(
                    BookAuthor,
                    func.count(Book.id).label("total_books"),
                )
                .outerjoin(
                    Book,
                    db.and_(
                        Book.author_id == BookAuthor.id,
                        Book.is_deleted.is_(False),
                    ),
                )
                .filter(BookAuthor.is_deleted.is_(False))
                .group_by(BookAuthor.id)
            )

            if search:
                search_term = f"%{search}%"

                query = query.filter(
                    or_(
                        BookAuthor.name.ilike(search_term),
                        BookAuthor.country.ilike(search_term),
                        BookAuthor.biography.ilike(search_term),
                    )
                )

            if country:
                query = query.filter(BookAuthor.country == country)

            if status in AUTHOR_STATUSES:
                query = query.filter(BookAuthor.status == status)

            allowed_sort_columns = {
                "name": BookAuthor.name,
                "country": BookAuthor.country,
                "status": BookAuthor.status,
                "created_at": BookAuthor.created_at,
                "updated_at": BookAuthor.updated_at,
                "total_books": func.count(Book.id),
            }

            sort_column = allowed_sort_columns.get(
                sort_by,
                BookAuthor.name,
            )

            if sort_direction == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())

            pagination = query.paginate(
                page=page,
                per_page=per_page,
                error_out=False,
            )

            authors = []

            for author, total_books in pagination.items:
                item = author.to_dict(include_book_count=False)

                item["total_books"] = int(total_books or 0)

                authors.append(item)

            total_authors = BookAuthor.query.filter(
                BookAuthor.is_deleted.is_(False)
            ).count()

            active_authors = BookAuthor.query.filter(
                BookAuthor.is_deleted.is_(False),
                BookAuthor.status == "Active",
            ).count()

            inactive_authors = BookAuthor.query.filter(
                BookAuthor.is_deleted.is_(False),
                BookAuthor.status == "Inactive",
            ).count()

            assigned_books = Book.query.filter(
                Book.is_deleted.is_(False),
                Book.author_id.isnot(None),
            ).count()

            countries = [
                row[0]
                for row in (
                    db.session.query(BookAuthor.country)
                    .filter(
                        BookAuthor.is_deleted.is_(False),
                        BookAuthor.country.isnot(None),
                        BookAuthor.country != "",
                    )
                    .distinct()
                    .order_by(BookAuthor.country.asc())
                    .all()
                )
                if row[0]
            ]

            return (
                jsonify(
                    {
                        "success": True,
                        "authors": authors,
                        "stats": {
                            "total_authors": total_authors,
                            "active_authors": active_authors,
                            "inactive_authors": inactive_authors,
                            "assigned_books": assigned_books,
                        },
                        "countries": countries,
                        "pagination": {
                            "page": pagination.page,
                            "per_page": pagination.per_page,
                            "total": pagination.total,
                            "pages": pagination.pages,
                            "has_next": pagination.has_next,
                            "has_prev": pagination.has_prev,
                        },
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            logger.exception("Database error while loading authors")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Unable to load authors",
                    }
                ),
                500,
            )

        except Exception:
            logger.exception("Unexpected error while loading authors")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Something went wrong",
                    }
                ),
                500,
            )

    @login_required
    def post(self):
        current_admin, access_error = authorize_library_admin("write")

        if access_error:
            return access_error

        try:
            payload = request.get_json(silent=True) or {}

            author_data, errors = validate_author_payload(payload)

            if errors:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Validation failed",
                            "errors": errors,
                        }
                    ),
                    422,
                )

            admin_reference = str(
                getattr(
                    current_admin,
                    "admin_id",
                    current_admin.id,
                )
            )

            author = BookAuthor(
                **author_data,
                created_by=admin_reference,
                updated_by=admin_reference,
            )

            db.session.add(author)
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": ("Author created successfully"),
                        "author": author.to_dict(),
                    }
                ),
                201,
            )

        except IntegrityError:
            db.session.rollback()

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Author name already exists"),
                    }
                ),
                409,
            )

        except SQLAlchemyError:
            db.session.rollback()

            logger.exception("Database error while creating author")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Unable to create author",
                    }
                ),
                500,
            )

        except Exception:
            db.session.rollback()

            logger.exception("Unexpected error while creating author")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Something went wrong",
                    }
                ),
                500,
            )

# AUTHOR DETAILS + UPDATE + DELETE
class LibraryAuthorDetailAPI(MethodView):

    @login_required
    def get(self, author_id):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        author = BookAuthor.query.filter(
            BookAuthor.id == author_id,
            BookAuthor.is_deleted.is_(False),
        ).first()

        if not author:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Author not found",
                    }
                ),
                404,
            )

        return (
            jsonify(
                {
                    "success": True,
                    "author": author.to_dict(),
                }
            ),
            200,
        )

    @login_required
    def put(self, author_id):
        current_admin, access_error = authorize_library_admin("edit")

        if access_error:
            return access_error

        author = BookAuthor.query.filter(
            BookAuthor.id == author_id,
            BookAuthor.is_deleted.is_(False),
        ).first()

        if not author:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Author not found",
                    }
                ),
                404,
            )

        try:
            payload = request.get_json(silent=True) or {}

            merged_payload = {
                "name": payload.get(
                    "name",
                    author.name,
                ),
                "country": payload.get(
                    "country",
                    author.country,
                ),
                "biography": payload.get(
                    "biography",
                    author.biography,
                ),
                "status": payload.get(
                    "status",
                    author.status,
                ),
            }

            author_data, errors = validate_author_payload(
                merged_payload,
                author=author,
            )

            if errors:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Validation failed",
                            "errors": errors,
                        }
                    ),
                    422,
                )

            author.name = author_data["name"]
            author.slug = author_data["slug"]
            author.country = author_data["country"]
            author.biography = author_data["biography"]
            author.status = author_data["status"]

            author.updated_by = str(
                getattr(
                    current_admin,
                    "admin_id",
                    current_admin.id,
                )
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": ("Author updated successfully"),
                        "author": author.to_dict(),
                    }
                ),
                200,
            )

        except IntegrityError:
            db.session.rollback()

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Author name already exists"),
                    }
                ),
                409,
            )

        except SQLAlchemyError:
            db.session.rollback()

            logger.exception("Database error while updating author")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Unable to update author",
                    }
                ),
                500,
            )

        except Exception:
            db.session.rollback()

            logger.exception("Unexpected error while updating author")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Something went wrong",
                    }
                ),
                500,
            )

    @login_required
    def delete(self, author_id):
        current_admin, access_error = authorize_library_admin("delete")

        if access_error:
            return access_error

        author = BookAuthor.query.filter(
            BookAuthor.id == author_id,
            BookAuthor.is_deleted.is_(False),
        ).first()

        if not author:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Author not found",
                    }
                ),
                404,
            )

        try:
            force = parse_boolean(
                request.args.get("force"),
                False,
            )

            assigned_books = Book.query.filter(
                Book.author_id == author.id,
                Book.is_deleted.is_(False),
            ).count()

            if assigned_books > 0 and not force:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": (
                                "Author cannot be deleted because "
                                f"{assigned_books} book(s) are "
                                "assigned to this author"
                            ),
                            "assigned_books": assigned_books,
                            "requires_force": True,
                        }
                    ),
                    409,
                )

            if assigned_books > 0:
                Book.query.filter(
                    Book.author_id == author.id,
                    Book.is_deleted.is_(False),
                ).update(
                    {
                        Book.author_id: None,
                        Book.author: author.name,
                    },
                    synchronize_session=False,
                )

            author.is_deleted = True
            author.status = "Inactive"

            author.updated_by = str(
                getattr(
                    current_admin,
                    "admin_id",
                    current_admin.id,
                )
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": ("Author deleted successfully"),
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            db.session.rollback()

            logger.exception("Database error while deleting author")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Unable to delete author",
                    }
                ),
                500,
            )

        except Exception:
            db.session.rollback()

            logger.exception("Unexpected error while deleting author")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Something went wrong",
                    }
                ),
                500,
            )


# AUTHOR STATUS
class LibraryAuthorStatusAPI(MethodView):

    @login_required
    def patch(self, author_id):
        current_admin, access_error = authorize_library_admin("edit")

        if access_error:
            return access_error

        author = BookAuthor.query.filter(
            BookAuthor.id == author_id,
            BookAuthor.is_deleted.is_(False),
        ).first()

        if not author:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Author not found",
                    }
                ),
                404,
            )

        payload = request.get_json(silent=True) or {}
        status = clean_text(payload.get("status"))

        if status not in AUTHOR_STATUSES:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Status must be Active or Inactive"),
                    }
                ),
                422,
            )

        try:
            author.status = status

            author.updated_by = str(
                getattr(
                    current_admin,
                    "admin_id",
                    current_admin.id,
                )
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": (f"Author marked as {status}"),
                        "author": author.to_dict(),
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            db.session.rollback()

            logger.exception("Database error while updating author status")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to update author status"),
                    }
                ),
                500,
            )


# AUTHOR OPTIONS FOR BOOK FORM
class LibraryAuthorOptionsAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        authors = (
            BookAuthor.query.filter(
                BookAuthor.is_deleted.is_(False),
                BookAuthor.status == "Active",
            )
            .order_by(BookAuthor.name.asc())
            .all()
        )

        return (
            jsonify(
                {
                    "success": True,
                    "authors": [
                        {
                            "id": author.id,
                            "name": author.name,
                            "country": author.country or "",
                        }
                        for author in authors
                    ],
                }
            ),
            200,
        )


# BOOK VALIDATION
def validate_book_payload(data):
    errors = {}
    title = clean_text(data.get("title"))
    author_id = data.get("author_id")
    category_id = data.get("category_id")
    isbn = clean_text(data.get("isbn"))
    shelf_no = clean_text(data.get("shelf_no"))
    publisher = clean_text(data.get("publisher"))
    language = clean_text(data.get("language") or "English")
    description = clean_text(data.get("description"))
    status = clean_text(data.get("status") or "Available").title()
    total_copies_raw = data.get(
        "total_copies",
        1,
    )
    available_copies_raw = data.get(
        "available_copies",
        total_copies_raw,
    )

    published_year_raw = data.get("published_year")

    if not title:
        errors["title"] = "Book title is required"
    elif len(title) < 2:
        errors["title"] = "Book title must contain at " "least 2 characters"
    elif len(title) > 255:
        errors["title"] = "Book title cannot exceed " "255 characters"

    try:
        author_id = int(author_id)

        if author_id <= 0:
            raise ValueError

    except (TypeError, ValueError):
        author_id = None
        errors["author_id"] = "Please select a valid author"

    try:
        category_id = int(category_id)

        if category_id <= 0:
            raise ValueError

    except (TypeError, ValueError):
        category_id = None
        errors["category_id"] = "Please select a valid category"

    try:
        total_copies = int(total_copies_raw)

        if total_copies < 1:
            errors["total_copies"] = "Total copies must be " "at least 1"

    except (TypeError, ValueError):
        total_copies = 1
        errors["total_copies"] = "Total copies must be " "a valid number"

    try:
        available_copies = int(available_copies_raw)

        if available_copies < 0:
            errors["available_copies"] = "Available copies cannot " "be negative"

        elif available_copies > total_copies:
            errors["available_copies"] = (
                "Available copies cannot " "exceed total copies"
            )

    except (TypeError, ValueError):
        available_copies = total_copies

        errors["available_copies"] = "Available copies must be " "a valid number"

    if not shelf_no:
        errors["shelf_no"] = "Shelf number is required"
    elif len(shelf_no) > 50:
        errors["shelf_no"] = "Shelf number cannot exceed " "50 characters"

    if len(isbn) > 30:
        errors["isbn"] = "ISBN cannot exceed " "30 characters"

    if len(publisher) > 150:
        errors["publisher"] = "Publisher cannot exceed " "150 characters"

    if len(language) > 50:
        errors["language"] = "Language cannot exceed " "50 characters"

    if len(description) > 3000:
        errors["description"] = "Description cannot exceed " "3000 characters"

    if published_year_raw in {
        "",
        None,
    }:
        published_year = None

    else:
        try:
            published_year = int(published_year_raw)
            current_year = datetime.utcnow().year

            if published_year < 1000 or published_year > current_year + 1:
                errors["published_year"] = "Enter a valid " "published year"

        except (TypeError, ValueError):
            published_year = None

            errors["published_year"] = "Published year must be " "a valid number"

    allowed_statuses = {
        "Available",
        "Unavailable",
        "Inactive",
    }

    if status not in allowed_statuses:
        errors["status"] = "Status must be Available, " "Unavailable or Inactive"

    cleaned_data = {
        "title": title,
        "author_id": author_id,
        "category_id": category_id,
        "isbn": isbn or None,
        "total_copies": total_copies,
        "available_copies": (available_copies),
        "shelf_no": shelf_no,
        "publisher": publisher or None,
        "published_year": published_year,
        "language": language or "English",
        "description": (description or None),
        "status": status,
    }

    return cleaned_data, errors

def serialize_staff_book_issue(issue):
    effective_date = issue.return_date or date.today()

    overdue_days = max(
        (effective_date - issue.due_date).days,
        0,
    )

    calculated_fine = Decimal(str(issue.fine_per_day or DUE_RUPEES)) * Decimal(
        overdue_days
    )

    collected_amount = (
        db.session.query(
            func.coalesce(
                func.sum(StaffLibraryFinePayment.amount),
                0,
            )
        )
        .filter(
            StaffLibraryFinePayment.book_issue_id == issue.id,
            StaffLibraryFinePayment.status == "Collected",
        )
        .scalar()
    )

    paid_fine = Decimal(str(collected_amount or 0))

    pending_fine = max(
        calculated_fine - paid_fine,
        Decimal("0"),
    )

    if issue.return_date:
        display_status = "Returned"

    elif date.today() > issue.due_date:
        display_status = "Overdue"

    elif (issue.due_date - date.today()).days <= 2:
        display_status = "Due Soon"

    else:
        display_status = "Issued"

    book = issue.book

    return {
        "id": issue.id,
        "book_id": issue.book_id,
        "book_title": (book.title if book else "Deleted Book"),
        "author": (
            book.author_details.name
            if book and book.author_details
            else (book.author if book else "")
        ),
        "category": (
            book.category_details.name
            if book and book.category_details
            else (book.category if book else "")
        ),
        "isbn": (book.isbn if book else ""),
        "issue_date": (issue.issue_date.isoformat() if issue.issue_date else None),
        "due_date": (issue.due_date.isoformat() if issue.due_date else None),
        "return_date": (issue.return_date.isoformat() if issue.return_date else None),
        "overdue_days": overdue_days,
        "fine_amount": float(calculated_fine),
        "paid_fine": float(paid_fine),
        "pending_fine": float(pending_fine),
        "status": display_status,
    }


def generate_book_code(book_id):
    return f"B{int(book_id):05d}"

# BOOK LIST + CREATE API
class LibraryBookListAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        try:
            search = clean_text(request.args.get("search"))

            status = clean_text(request.args.get("status"))

            author_id = request.args.get("author_id")
            category_id = request.args.get("category_id")

            page = parse_positive_integer(
                request.args.get("page"),
                1,
            )

            per_page = min(
                parse_positive_integer(
                    request.args.get(
                        "per_page",
                        request.args.get("limit", 10),
                    ),
                    10,
                ),
                100,
            )

            sort_by = clean_text(request.args.get("sort_by") or "created_at")

            sort_direction = clean_text(
                request.args.get("sort_direction") or "desc"
            ).lower()

            query = Book.query.filter(Book.is_deleted.is_(False))

            if search:
                search_term = f"%{search}%"

                query = (
                    query.outerjoin(
                        BookAuthor,
                        Book.author_id == BookAuthor.id,
                    )
                    .outerjoin(
                        BookCategory,
                        Book.category_id == BookCategory.id,
                    )
                    .filter(
                        or_(
                            Book.title.ilike(search_term),
                            Book.book_code.ilike(search_term),
                            Book.isbn.ilike(search_term),
                            Book.author.ilike(search_term),
                            Book.category.ilike(search_term),
                            Book.publisher.ilike(search_term),
                            Book.shelf_no.ilike(search_term),
                            BookAuthor.name.ilike(search_term),
                            BookCategory.name.ilike(search_term),
                        )
                    )
                )

            if status in {
                "Available",
                "Unavailable",
                "Inactive",
            }:
                query = query.filter(Book.status == status)

            if author_id:
                try:
                    parsed_author_id = int(author_id)

                    if parsed_author_id > 0:
                        query = query.filter(Book.author_id == parsed_author_id)
                except (TypeError, ValueError):
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": ("Invalid author id"),
                            }
                        ),
                        422,
                    )

            if category_id:
                try:
                    parsed_category_id = int(category_id)

                    if parsed_category_id > 0:
                        query = query.filter(Book.category_id == parsed_category_id)
                except (TypeError, ValueError):
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": ("Invalid category id"),
                            }
                        ),
                        422,
                    )

            allowed_sort_columns = {
                "title": Book.title,
                "book_code": Book.book_code,
                "isbn": Book.isbn,
                "total_copies": Book.total_copies,
                "available_copies": (Book.available_copies),
                "status": Book.status,
                "published_year": (Book.published_year),
                "created_at": Book.created_at,
                "updated_at": Book.updated_at,
            }

            sort_column = allowed_sort_columns.get(
                sort_by,
                Book.created_at,
            )

            if sort_direction == "asc":
                query = query.order_by(sort_column.asc())
            else:
                query = query.order_by(sort_column.desc())

            query = query.order_by(Book.id.desc())

            pagination = query.paginate(
                page=page,
                per_page=per_page,
                error_out=False,
            )

            books = [book.to_dict() for book in pagination.items]

            total_books = Book.query.filter(Book.is_deleted.is_(False)).count()

            available_books = Book.query.filter(
                Book.is_deleted.is_(False),
                Book.status == "Available",
            ).count()

            unavailable_books = Book.query.filter(
                Book.is_deleted.is_(False),
                Book.status == "Unavailable",
            ).count()

            inactive_books = Book.query.filter(
                Book.is_deleted.is_(False),
                Book.status == "Inactive",
            ).count()

            total_copies = (
                db.session.query(
                    func.coalesce(
                        func.sum(Book.total_copies),
                        0,
                    )
                )
                .filter(Book.is_deleted.is_(False))
                .scalar()
            )

            available_copies = (
                db.session.query(
                    func.coalesce(
                        func.sum(Book.available_copies),
                        0,
                    )
                )
                .filter(Book.is_deleted.is_(False))
                .scalar()
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "books": books,
                        "stats": {
                            "total_books": (total_books),
                            "available_books": (available_books),
                            "unavailable_books": (unavailable_books),
                            "inactive_books": (inactive_books),
                            "total_copies": int(total_copies or 0),
                            "available_copies": int(available_copies or 0),
                        },
                        "pagination": {
                            "page": (pagination.page),
                            "per_page": (pagination.per_page),
                            "total": (pagination.total),
                            "pages": (pagination.pages),
                            "has_next": (pagination.has_next),
                            "has_prev": (pagination.has_prev),
                        },
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            logger.exception("Database error while loading books")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to load books"),
                    }
                ),
                500,
            )

        except Exception:
            logger.exception("Unexpected error while loading books")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Something went wrong while " "loading books"),
                    }
                ),
                500,
            )

    @login_required
    def post(self):
        current_admin, access_error = authorize_library_admin("write")

        if access_error:
            return access_error

        try:
            payload = request.get_json(silent=True) or {}

            logger.info(
                "Received add-book payload: %s",
                payload,
            )

            book_data, errors = validate_book_payload(payload)

            author = None
            category = None

            if book_data["author_id"]:
                author = BookAuthor.query.filter(
                    BookAuthor.id == book_data["author_id"],
                    BookAuthor.is_deleted.is_(False),
                    BookAuthor.status == "Active",
                ).first()

                if not author:
                    errors["author_id"] = (
                        "Selected author does not " "exist or is inactive"
                    )

            if book_data["category_id"]:
                category = BookCategory.query.filter(
                    BookCategory.id == book_data["category_id"],
                    BookCategory.is_deleted.is_(False),
                    BookCategory.status == "Active",
                ).first()

                if not category:
                    errors["category_id"] = (
                        "Selected category does not " "exist or is inactive"
                    )

            if book_data["isbn"]:
                existing_isbn = Book.query.filter(
                    func.lower(Book.isbn) == book_data["isbn"].lower(),
                    Book.is_deleted.is_(False),
                ).first()

                if existing_isbn:
                    errors["isbn"] = "A book with this ISBN " "already exists"

            if errors:
                logger.warning(
                    "Add-book validation errors: %s",
                    errors,
                )

                return (
                    jsonify(
                        {
                            "success": False,
                            "error": ("Validation failed"),
                            "message": ("Validation failed"),
                            "errors": errors,
                        }
                    ),
                    422,
                )

            admin_reference = str(
                getattr(
                    current_admin,
                    "admin_id",
                    current_admin.id,
                )
            )

            book = Book(
                title=book_data["title"],
                author_id=book_data["author_id"],
                # Maintain old readable field.
                author=(author.name if author else None),
                category_id=book_data["category_id"],
                # Maintain old readable field.
                category=(category.name if category else None),
                isbn=book_data["isbn"],
                total_copies=book_data["total_copies"],
                available_copies=book_data["available_copies"],
                shelf_no=book_data["shelf_no"],
                publisher=book_data["publisher"],
                published_year=book_data["published_year"],
                language=book_data["language"],
                description=book_data["description"],
                status=book_data["status"],
                is_deleted=False,
                created_by=admin_reference,
                updated_by=admin_reference,
            )

            db.session.add(book)
            db.session.flush()

            book.book_code = generate_book_code(book.id)

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": ("Book added successfully"),
                        "book": book.to_dict(),
                    }
                ),
                201,
            )

        except IntegrityError as error:
            db.session.rollback()

            logger.exception("Integrity error while adding book")

            error_text = str(error).lower()

            if "isbn" in error_text:
                message = "A book with this ISBN " "already exists"
            elif "book_code" in error_text:
                message = "Generated book code " "already exists"
            else:
                message = "Book already exists or " "contains duplicate values"

            return (
                jsonify(
                    {
                        "success": False,
                        "error": message,
                        "message": message,
                    }
                ),
                409,
            )

        except SQLAlchemyError:
            db.session.rollback()

            logger.exception("Database error while adding book")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to add book"),
                        "message": ("Unable to add book"),
                    }
                ),
                500,
            )

        except Exception:
            db.session.rollback()

            logger.exception("Unexpected error while adding book")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Something went wrong " "while adding the book"),
                        "message": ("Something went wrong " "while adding the book"),
                    }
                ),
                500,
            )


# ADD BOOK FORM OPTIONS
class LibraryBookOptionsAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        try:
            categories = (
                BookCategory.query.filter(
                    BookCategory.is_deleted.is_(False),
                    BookCategory.status == "Active",
                )
                .order_by(
                    BookCategory.display_order.asc(),
                    BookCategory.name.asc(),
                )
                .all()
            )

            authors = (
                BookAuthor.query.filter(
                    BookAuthor.is_deleted.is_(False),
                    BookAuthor.status == "Active",
                )
                .order_by(BookAuthor.name.asc())
                .all()
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "categories": [
                            {
                                "id": category.id,
                                "name": category.name,
                            }
                            for category in categories
                        ],
                        "authors": [
                            {
                                "id": author.id,
                                "name": author.name,
                                "country": author.country or "",
                            }
                            for author in authors
                        ],
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            logger.exception("Unable to load add book options")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to load book form options"),
                    }
                ),
                500,
            )


class StudentLibraryAPI(MethodView):

    @login_required
    def get(self, student_id):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        try:
            student_id = int(student_id)

            if student_id <= 0:
                raise ValueError

        except (TypeError, ValueError):
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Invalid student id",
                    }
                ),
                400,
            )

        student = db.session.get(
            Student,
            student_id,
        )

        if not student:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Student not found",
                    }
                ),
                404,
            )

        issues = (
            BookIssue.query.filter(
                BookIssue.student_id == student_id,
            )
            .order_by(BookIssue.id.desc())
            .all()
        )

        issue_rows = [serialize_book_issue(issue) for issue in issues]
        active_issues = [issue for issue in issue_rows if not issue["return_date"]]
        returned_issues = [issue for issue in issue_rows if issue["return_date"]]
        payment_rows = (
            LibraryFinePayment.query.filter(
                LibraryFinePayment.student_id == student_id,
            )
            .order_by(LibraryFinePayment.collected_at.desc())
            .all()
        )

        pending_fine = sum(issue["pending_fine"] for issue in issue_rows)

        collected_fine = sum(
            float(payment.amount or 0)
            for payment in payment_rows
            if payment.status == "Collected"
        )

        waived_fine = sum(
            float(payment.amount or 0)
            for payment in payment_rows
            if payment.status == "Waived"
        )

        overdue_count = sum(
            1 for issue in active_issues if issue["status"] == "Overdue"
        )

        return (
            jsonify(
                {
                    "success": True,
                    "student": serialize_library_student(student),
                    "summary": {
                        "active_books": len(active_issues),
                        "returned_books": len(returned_issues),
                        "total_transactions": len(issue_rows),
                        "overdue_books": overdue_count,
                        "pending_fine": float(pending_fine),
                        "collected_fine": float(collected_fine),
                        "waived_fine": float(waived_fine),
                    },
                    "active_issues": active_issues,
                    "return_history": returned_issues,
                    "fine_payments": [payment.to_dict() for payment in payment_rows],
                }
            ),
            200,
        )

class LibraryStudentFinePaymentAPI(MethodView):

    @login_required
    def post(self, student_id):
        current_admin, access_error = authorize_library_admin("write")

        if access_error:
            return access_error

        student = db.session.get(
            Student,
            student_id,
        )

        if not student:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Student not found",
                    }
                ),
                404,
            )

        payload = request.get_json(silent=True) or {}

        issue_id = payload.get("book_issue_id")
        amount_raw = payload.get("amount")
        payment_method = clean_text(payload.get("payment_method") or "Cash")
        reference_no = clean_text(payload.get("reference_no"))
        remarks = clean_text(payload.get("remarks"))
        payment_status = clean_text(payload.get("status") or "Collected")

        errors = {}

        try:
            amount = Decimal(str(amount_raw))

            if amount <= 0:
                errors["amount"] = "Amount must be greater than zero"

        except Exception:
            amount = Decimal("0")
            errors["amount"] = "Enter a valid amount"

        issue = None

        if issue_id not in (None, ""):
            try:
                issue_id = int(issue_id)

                issue = BookIssue.query.filter(
                    BookIssue.id == issue_id,
                    BookIssue.student_id == student_id,
                ).first()

                if not issue:
                    errors["book_issue_id"] = "Issue record not found"

            except (TypeError, ValueError):
                errors["book_issue_id"] = "Invalid issue record"

        if payment_method not in {
            "Cash",
            "UPI",
            "Card",
            "Bank Transfer",
            "Cheque",
        }:
            errors["payment_method"] = "Invalid payment method"

        if payment_status not in {
            "Collected",
            "Waived",
        }:
            errors["status"] = "Status must be Collected or Waived"

        if issue:
            issue_data = serialize_book_issue(issue)

            if amount > Decimal(str(issue_data["pending_fine"])):
                errors["amount"] = "Amount cannot exceed pending fine"

        if errors:
            return (
                jsonify(
                    {
                        "success": False,
                        "errors": errors,
                        "error": "Validation failed",
                    }
                ),
                422,
            )

        payment = LibraryFinePayment(
            student_id=student_id,
            book_issue_id=(issue.id if issue else None),
            amount=amount,
            payment_method=payment_method,
            reference_no=reference_no or None,
            remarks=remarks or None,
            status=payment_status,
            collected_by=str(
                getattr(
                    current_admin,
                    "admin_id",
                    current_admin.id,
                )
            ),
        )

        try:
            db.session.add(payment)
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": (
                            "Fine payment recorded successfully"
                            if payment_status == "Collected"
                            else "Fine waived successfully"
                        ),
                        "payment": payment.to_dict(),
                    }
                ),
                201,
            )

        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Unable to save library fine payment")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to save fine payment"),
                    }
                ),
                500,
            )


def build_member_full_name(member):
    name_parts = [
        clean_text(getattr(member, "first_name", "")),
        clean_text(getattr(member, "middle_name", "")),
        clean_text(getattr(member, "last_name", "")),
    ]

    return (
        clean_text(" ".join(part for part in name_parts if part))
        or f"Member {member.id}"
    )


def serialize_admin_library_member(admin):
    admin_type = clean_text(getattr(admin, "admin_type", ""))
    role = clean_text(getattr(admin, "role", ""))
    admin_type_lower = admin_type.lower()
    role_lower = role.lower()

    is_full_admin = (
        role_lower
        in {
            "super_admin",
            "super-admin",
            "super administrator",
        }
        or "administrator" in role_lower
        or "admin" in admin_type_lower
    )

    member_role = "Admin" if is_full_admin else "Staff"

    department = (
        clean_text(getattr(admin, "department", ""))
        or admin_type
        or role
        or "Administration"
    )

    return {
        "id": admin.id,
        "member_key": f"admin-{admin.id}",
        "member_type": ("admin" if member_role == "Admin" else "staff"),
        "role": member_role,
        "member_code": (
            getattr(admin, "admin_id", None)
            or getattr(admin, "user_id", None)
            or f"A{admin.id:04d}"
        ),
        "name": build_member_full_name(admin),
        "email": (getattr(admin, "email", None) or ""),
        "mobile": (getattr(admin, "mobile", None) or ""),
        "department": department,
        "designation": (
            getattr(admin, "designation", None) or role or admin_type or ""
        ),
        "class_or_department": department,
        "status": (getattr(admin, "status", None) or "Active"),
        "active_books": 0,
        "returned_books": 0,
        "overdue_books": 0,
        "pending_fine": 0.0,
        "collected_fine": 0.0,
        "library_status": (getattr(admin, "status", None) or "Active"),
        "profile": {
            "admin_type": admin_type,
            "role": role,
            "department": department,
            "designation": (
                getattr(
                    admin,
                    "designation",
                    None,
                )
                or ""
            ),
            "address": (getattr(admin, "address", None) or ""),
            "city": (getattr(admin, "city", None) or ""),
            "state": (getattr(admin, "state", None) or ""),
            "joining_date": (
                admin.joining_date.isoformat()
                if getattr(
                    admin,
                    "joining_date",
                    None,
                )
                else None
            ),
            "employment_type": (
                getattr(
                    admin,
                    "employment_type",
                    None,
                )
                or ""
            ),
        },
    }


def serialize_student_member(student):
    student_data = serialize_library_student(student)

    issues = (
        BookIssue.query.filter(BookIssue.student_id == student.id)
        .order_by(BookIssue.id.desc())
        .all()
    )

    issue_rows = [serialize_book_issue(issue) for issue in issues]

    active_issues = [issue for issue in issue_rows if not issue["return_date"]]

    returned_issues = [issue for issue in issue_rows if issue["return_date"]]

    overdue_count = sum(1 for issue in active_issues if issue["status"] == "Overdue")

    pending_fine = sum(float(issue.get("pending_fine", 0) or 0) for issue in issue_rows)

    collected_fine = (
        db.session.query(
            func.coalesce(
                func.sum(LibraryFinePayment.amount),
                0,
            )
        )
        .filter(
            LibraryFinePayment.student_id == student.id,
            LibraryFinePayment.status == "Collected",
        )
        .scalar()
    )

    if overdue_count > 0:
        library_status = "Blocked"
    elif pending_fine > 0:
        library_status = "Pending"
    else:
        library_status = student_data["status"] or "Active"

    return {
        **student_data,
        "member_key": f"student-{student.id}",
        "member_type": "student",
        "role": "Student",
        "member_code": (student_data["student_id"]),
        "class_or_department": (student_data["class_name"]),
        "active_books": len(active_issues),
        "returned_books": len(returned_issues),
        "overdue_books": overdue_count,
        "pending_fine": float(pending_fine),
        "collected_fine": float(collected_fine or 0),
        "library_status": library_status,
    }


def serialize_teacher_member(teacher):
    teacher_data = serialize_library_teacher(teacher)

    issues = (
        TeacherBookIssue.query.filter(TeacherBookIssue.teacher_id == teacher.id)
        .order_by(TeacherBookIssue.id.desc())
        .all()
    )
    issue_rows = [serialize_teacher_book_issue(issue) for issue in issues]
    active_issues = [issue for issue in issue_rows if not issue["return_date"]]
    returned_issues = [issue for issue in issue_rows if issue["return_date"]]
    overdue_count = sum(1 for issue in active_issues if issue["status"] == "Overdue")
    pending_fine = sum(float(issue.get("pending_fine", 0) or 0) for issue in issue_rows)
    collected_fine = (
        db.session.query(
            func.coalesce(
                func.sum(TeacherLibraryFinePayment.amount),
                0,
            )
        )
        .filter(
            TeacherLibraryFinePayment.teacher_id == teacher.id,
            TeacherLibraryFinePayment.status == "Collected",
        )
        .scalar()
    )

    if overdue_count > 0:
        library_status = "Blocked"
    elif pending_fine > 0:
        library_status = "Pending"
    else:
        library_status = teacher_data["status"] or "Active"

    return {
        **teacher_data,
        "member_key": f"teacher-{teacher.id}",
        "member_type": "teacher",
        "role": "Teacher",
        "member_code": (teacher_data["teacher_id"]),
        "class_or_department": (teacher_data["department"]),
        "active_books": len(active_issues),
        "returned_books": len(returned_issues),
        "overdue_books": overdue_count,
        "pending_fine": float(pending_fine),
        "collected_fine": float(collected_fine or 0),
        "library_status": library_status,
    }


class LibraryStudentsAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        try:
            page = parse_positive_integer(
                request.args.get("page"),
                1,
            )

            per_page = min(
                parse_positive_integer(
                    request.args.get("per_page"),
                    10,
                ),
                100,
            )

            search = clean_text(request.args.get("search"))
            class_name_filter = clean_text(request.args.get("class_name"))
            status_filter = clean_text(request.args.get("status"))
            division_id_filter = request.args.get("division_id")
            section_id_filter = request.args.get("section_id")
            batch_id_filter = request.args.get("batch_id")
            query = (
                db.session.query(Student)
                .outerjoin(
                    StudentAcademicRecord,
                    and_(
                        StudentAcademicRecord.student_id == Student.id,
                        StudentAcademicRecord.is_current.is_(True),
                    ),
                )
                .outerjoin(
                    AcademicClass,
                    AcademicClass.id == StudentAcademicRecord.academic_class_id,
                )
                .outerjoin(
                    Batch,
                    Batch.id == AcademicClass.batch_id,
                )
                .outerjoin(
                    Division,
                    Division.id == AcademicClass.division_id,
                )
                .outerjoin(
                    Section,
                    Section.id == AcademicClass.section_id,
                )
            )

            if search:
                search_term = f"%{search}%"

                search_conditions = [
                    Student.student_id.ilike(search_term),
                    Student.first_name.ilike(search_term),
                    Student.middle_name.ilike(search_term),
                    Student.last_name.ilike(search_term),
                    Student.email.ilike(search_term),
                    Student.mobile.ilike(search_term),
                ]

                try:
                    roll_number = int(search)

                    search_conditions.append(
                        StudentAcademicRecord.roll_number == roll_number
                    )
                except (TypeError, ValueError):
                    pass

                query = query.filter(or_(*search_conditions))

            if status_filter:
                query = query.filter(
                    func.lower(Student.status) == status_filter.lower()
                )

            if division_id_filter:
                try:
                    query = query.filter(
                        AcademicClass.division_id == int(division_id_filter)
                    )
                except (TypeError, ValueError):
                    pass

            if section_id_filter:
                try:
                    query = query.filter(
                        AcademicClass.section_id == int(section_id_filter)
                    )
                except (TypeError, ValueError):
                    pass

            if batch_id_filter:
                try:
                    query = query.filter(AcademicClass.batch_id == int(batch_id_filter))
                except (TypeError, ValueError):
                    pass

            if class_name_filter:
                normalized_class = class_name_filter.replace(" ", "").lower()

                class_expression = func.lower(
                    func.concat(
                        Division.division_name,
                        "-",
                        Section.section_name,
                    )
                )

                query = query.filter(class_expression == normalized_class)

            query = query.distinct(Student.id)

            pagination = query.order_by(Student.id.desc()).paginate(
                page=page,
                per_page=per_page,
                error_out=False,
            )

            student_rows = []

            for student in pagination.items:
                student_data = serialize_library_student(student)

                issues = (
                    BookIssue.query.filter(
                        BookIssue.student_id == student.id,
                    )
                    .order_by(BookIssue.id.desc())
                    .all()
                )

                serialized_issues = [serialize_book_issue(issue) for issue in issues]

                active_issues = [
                    issue for issue in serialized_issues if not issue["return_date"]
                ]

                returned_issues = [
                    issue for issue in serialized_issues if issue["return_date"]
                ]

                overdue_count = sum(
                    1 for issue in active_issues if issue["status"] == "Overdue"
                )

                pending_fine = sum(
                    float(
                        issue.get(
                            "pending_fine",
                            0,
                        )
                        or 0
                    )
                    for issue in serialized_issues
                )

                collected_fine = (
                    db.session.query(
                        func.coalesce(
                            func.sum(LibraryFinePayment.amount),
                            0,
                        )
                    )
                    .filter(
                        LibraryFinePayment.student_id == student.id,
                        LibraryFinePayment.status == "Collected",
                    )
                    .scalar()
                )

                if overdue_count > 0:
                    library_status = "Blocked"
                elif pending_fine > 0:
                    library_status = "Fine Pending"
                else:
                    library_status = student_data["status"] or "Active"

                student_rows.append(
                    {
                        **student_data,
                        "active_books": len(active_issues),
                        "returned_books": len(returned_issues),
                        "total_transactions": len(serialized_issues),
                        "overdue_books": (overdue_count),
                        "pending_fine": float(pending_fine),
                        "collected_fine": float(collected_fine or 0),
                        "library_status": (library_status),
                    }
                )

            class_rows = (
                db.session.query(
                    AcademicClass.id,
                    Batch.id.label("batch_id"),
                    Batch.batch_name,
                    Division.id.label("division_id"),
                    Division.division_name,
                    Section.id.label("section_id"),
                    Section.section_name,
                )
                .join(
                    Batch,
                    Batch.id == AcademicClass.batch_id,
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
                    Division.division_name.asc(),
                    Section.section_name.asc(),
                )
                .all()
            )

            classes = [
                {
                    "academic_class_id": row.id,
                    "batch_id": row.batch_id,
                    "batch_name": row.batch_name,
                    "division_id": row.division_id,
                    "division_name": (row.division_name),
                    "section_id": row.section_id,
                    "section_name": (row.section_name),
                    "class_name": (f"{row.division_name}" f"-{row.section_name}"),
                }
                for row in class_rows
            ]

            total_active_books = BookIssue.query.filter(
                BookIssue.return_date.is_(None)
            ).count()

            total_collected_fine = (
                db.session.query(
                    func.coalesce(
                        func.sum(LibraryFinePayment.amount),
                        0,
                    )
                )
                .filter(LibraryFinePayment.status == "Collected")
                .scalar()
            )

            students_with_fine = 0

            student_ids_with_issues = (
                db.session.query(BookIssue.student_id).distinct().all()
            )

            for (student_id,) in student_ids_with_issues:
                issue_rows = BookIssue.query.filter(
                    BookIssue.student_id == student_id
                ).all()

                pending = sum(
                    float(
                        serialize_book_issue(issue).get(
                            "pending_fine",
                            0,
                        )
                        or 0
                    )
                    for issue in issue_rows
                )

                if pending > 0:
                    students_with_fine += 1

            return (
                jsonify(
                    {
                        "success": True,
                        "students": student_rows,
                        "classes": classes,
                        "stats": {
                            "total_students": (pagination.total),
                            "active_issues": (total_active_books),
                            "students_with_fine": (students_with_fine),
                            "collected_fine": float(total_collected_fine or 0),
                        },
                        "pagination": {
                            "page": (pagination.page),
                            "per_page": (pagination.per_page),
                            "total": (pagination.total),
                            "pages": (pagination.pages or 1),
                            "has_next": (pagination.has_next),
                            "has_prev": (pagination.has_prev),
                        },
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            logger.exception("Database error while loading " "library students")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to load library " "students"),
                    }
                ),
                500,
            )

        except Exception:
            logger.exception("Unexpected error while loading " "library students")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Something went wrong"),
                    }
                ),
                500,
            )

# BOOK DETAILS + UPDATE + DELETE
class LibraryBookDetailAPI(MethodView):

    @login_required
    def get(self, book_id):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        book = Book.query.filter(
            Book.id == book_id,
            Book.is_deleted.is_(False),
        ).first()

        if not book:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Book not found",
                    }
                ),
                404,
            )

        return (
            jsonify(
                {
                    "success": True,
                    "book": book.to_dict(),
                }
            ),
            200,
        )

    @login_required
    def put(self, book_id):
        current_admin, access_error = authorize_library_admin("edit")

        if access_error:
            return access_error

        book = Book.query.filter(
            Book.id == book_id,
            Book.is_deleted.is_(False),
        ).first()

        if not book:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Book not found",
                    }
                ),
                404,
            )

        try:
            payload = request.get_json(silent=True) or {}

            merged_payload = {
                "title": payload.get("title", book.title),
                "author_id": payload.get("author_id", book.author_id),
                "category_id": payload.get("category_id", book.category_id),
                "isbn": payload.get("isbn", book.isbn),
                "total_copies": payload.get("total_copies", book.total_copies),
                "available_copies": payload.get(
                    "available_copies", book.available_copies
                ),
                "shelf_no": payload.get("shelf_no", book.shelf_no),
                "publisher": payload.get("publisher", book.publisher),
                "published_year": payload.get("published_year", book.published_year),
                "language": payload.get("language", book.language),
                "description": payload.get("description", book.description),
                "status": payload.get("status", book.status),
            }

            book_data, errors = validate_book_payload(merged_payload)

            author = None
            category = None

            if book_data["author_id"]:
                author = BookAuthor.query.filter(
                    BookAuthor.id == book_data["author_id"],
                    BookAuthor.is_deleted.is_(False),
                    BookAuthor.status == "Active",
                ).first()

                if not author:
                    errors["author_id"] = (
                        "Selected author does not exist or is inactive"
                    )

            if book_data["category_id"]:
                category = BookCategory.query.filter(
                    BookCategory.id == book_data["category_id"],
                    BookCategory.is_deleted.is_(False),
                    BookCategory.status == "Active",
                ).first()

                if not category:
                    errors["category_id"] = (
                        "Selected category does not exist or is inactive"
                    )

            if book_data["isbn"]:
                existing_isbn = Book.query.filter(
                    func.lower(Book.isbn) == book_data["isbn"].lower(),
                    Book.id != book.id,
                    Book.is_deleted.is_(False),
                ).first()

                if existing_isbn:
                    errors["isbn"] = "A book with this ISBN already exists"

            if errors:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Validation failed",
                            "message": "Validation failed",
                            "errors": errors,
                        }
                    ),
                    422,
                )

            admin_reference = str(getattr(current_admin, "admin_id", current_admin.id))

            book.title = book_data["title"]
            book.author_id = book_data["author_id"]
            book.author = author.name if author else None
            book.category_id = book_data["category_id"]
            book.category = category.name if category else None
            book.isbn = book_data["isbn"]
            book.total_copies = book_data["total_copies"]
            book.available_copies = book_data["available_copies"]
            book.shelf_no = book_data["shelf_no"]
            book.publisher = book_data["publisher"]
            book.published_year = book_data["published_year"]
            book.language = book_data["language"]
            book.description = book_data["description"]
            book.status = book_data["status"]
            book.updated_by = admin_reference

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Book updated successfully",
                        "book": book.to_dict(),
                    }
                ),
                200,
            )

        except IntegrityError:
            db.session.rollback()
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "A book with this ISBN already exists",
                    }
                ),
                409,
            )

        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Database error while updating book")
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Unable to update book",
                    }
                ),
                500,
            )

        except Exception:
            db.session.rollback()
            logger.exception("Unexpected error while updating book")
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Something went wrong while updating book",
                    }
                ),
                500,
            )

    @login_required
    def delete(self, book_id):
        current_admin, access_error = authorize_library_admin("delete")

        if access_error:
            return access_error

        book = Book.query.filter(
            Book.id == book_id,
            Book.is_deleted.is_(False),
        ).first()

        if not book:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Book not found",
                    }
                ),
                404,
            )

        try:
            active_issues = BookIssue.query.filter(
                BookIssue.book_id == book.id,
                BookIssue.status.in_(["Issued", "Overdue"]),
            ).count()

            if active_issues > 0:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": (
                                f"Book cannot be deleted because it is currently "
                                f"issued to {active_issues} student(s)"
                            ),
                        }
                    ),
                    409,
                )

            book.is_deleted = True
            book.status = "Inactive"
            book.updated_by = str(getattr(current_admin, "admin_id", current_admin.id))

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Book deleted successfully",
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Database error while deleting book")
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Unable to delete book",
                    }
                ),
                500,
            )


# BOOK STATUS UPDATE
class LibraryBookStatusAPI(MethodView):

    @login_required
    def patch(self, book_id):
        current_admin, access_error = authorize_library_admin("edit")

        if access_error:
            return access_error

        book = Book.query.filter(
            Book.id == book_id,
            Book.is_deleted.is_(False),
        ).first()

        if not book:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Book not found",
                    }
                ),
                404,
            )

        payload = request.get_json(silent=True) or {}
        status = clean_text(payload.get("status")).title()

        if status not in {"Available", "Unavailable", "Inactive"}:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Status must be Available, Unavailable, or Inactive",
                    }
                ),
                422,
            )

        try:
            book.status = status
            book.updated_by = str(getattr(current_admin, "admin_id", current_admin.id))

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": f"Book status updated to {status}",
                        "book": book.to_dict(),
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Database error while updating book status")
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Unable to update book status",
                    }
                ),
                500,
            )


def serialize_library_teacher(teacher):
    first_name = clean_text(getattr(teacher, "first_name", ""))
    middle_name = clean_text(getattr(teacher, "middle_name", ""))
    last_name = clean_text(getattr(teacher, "last_name", ""))

    full_name = (
        clean_text(
            " ".join(
                value
                for value in (
                    first_name,
                    middle_name,
                    last_name,
                )
                if value
            )
        )
        or f"Teacher {teacher.id}"
    )

    assignments = []

    teacher_classes = (
        TeacherClass.query.filter_by(teacher_id=teacher.id)
        .order_by(TeacherClass.id.asc())
        .all()
    )

    for mapping in teacher_classes:
        academic_class = db.session.get(
            AcademicClass,
            mapping.academic_class_id,
        )

        subject = db.session.get(
            Subject,
            mapping.subject_id,
        )

        division = None
        section = None

        if academic_class:
            division = db.session.get(
                Division,
                academic_class.division_id,
            )

            section = db.session.get(
                Section,
                academic_class.section_id,
            )

        division_name = division.division_name if division else ""
        section_name = section.section_name if section else ""
        class_name = clean_text(
            f"{division_name}"
            f"{'-' if division_name and section_name else ''}"
            f"{section_name}"
        )

        assignments.append(
            {
                "teacher_class_id": mapping.id,
                "academic_class_id": (mapping.academic_class_id),
                "subject_id": mapping.subject_id,
                "class_name": class_name,
                "subject_name": (subject.subject_name if subject else ""),
            }
        )

    department = clean_text(getattr(teacher, "department", ""))

    if not department:
        specialisation = clean_text(
            getattr(
                teacher,
                "specialization",
                "",
            )
        )

        department = specialisation or "Not Assigned"

    return {
        "id": teacher.id,
        "teacher_id": (getattr(teacher, "teacher_id", None) or f"T{teacher.id:04d}"),
        "user_id": (getattr(teacher, "user_id", None) or ""),
        "name": full_name,
        "full_name": full_name,
        "first_name": first_name,
        "middle_name": middle_name,
        "last_name": last_name,
        "gender": (getattr(teacher, "gender", None) or ""),
        "date_of_birth": (
            teacher.date_of_birth.isoformat()
            if getattr(
                teacher,
                "date_of_birth",
                None,
            )
            else None
        ),
        "blood_group": (getattr(teacher, "blood_group", None) or ""),
        "email": (getattr(teacher, "email", None) or ""),
        "mobile": (getattr(teacher, "mobile", None) or ""),
        "alternate_mobile": (
            getattr(
                teacher,
                "alternate_mobile",
                None,
            )
            or ""
        ),
        "address": (getattr(teacher, "address", None) or ""),
        "city": (getattr(teacher, "city", None) or ""),
        "state": (getattr(teacher, "state", None) or ""),
        "pincode": (getattr(teacher, "pincode", None) or ""),
        "designation": (
            getattr(
                teacher,
                "designation",
                None,
            )
            or ""
        ),
        "department": department,
        "degree": (getattr(teacher, "degree", None) or ""),
        "university": (
            getattr(
                teacher,
                "university",
                None,
            )
            or ""
        ),
        "experience_years": (
            getattr(
                teacher,
                "experience_years",
                None,
            )
            or 0
        ),
        "specialization": (
            getattr(
                teacher,
                "specialization",
                None,
            )
            or ""
        ),
        "joining_date": (
            teacher.joining_date.isoformat()
            if getattr(
                teacher,
                "joining_date",
                None,
            )
            else None
        ),
        "employment_type": (
            getattr(
                teacher,
                "employment_type",
                None,
            )
            or ""
        ),
        "status": (getattr(teacher, "status", None) or "Active"),
        "assignments": assignments,
    }


def get_teacher_issue_paid_amount(issue_id):
    amount = (
        db.session.query(
            func.coalesce(
                func.sum(
                    case(
                        (
                            TeacherLibraryFinePayment.status == "Collected",
                            TeacherLibraryFinePayment.amount,
                        ),
                        else_=0,
                    )
                ),
                0,
            )
        )
        .filter(TeacherLibraryFinePayment.book_issue_id == issue_id)
        .scalar()
    )

    return Decimal(str(amount or 0))


def serialize_teacher_book_issue(issue):
    today = date.today()

    effective_date = issue.return_date if issue.return_date else today

    overdue_days = max(
        (effective_date - issue.due_date).days,
        0,
    )

    calculated_fine = Decimal(str(issue.fine_per_day or DUE_RUPEES)) * Decimal(
        overdue_days
    )

    paid_fine = get_teacher_issue_paid_amount(issue.id)

    pending_fine = max(
        calculated_fine - paid_fine,
        Decimal("0"),
    )

    if issue.return_date:
        status = "Returned"
    elif today > issue.due_date:
        status = "Overdue"
    elif (issue.due_date - today).days <= 2:
        status = "Due Soon"
    else:
        status = "Issued"

    book = issue.book

    return {
        "id": issue.id,
        "teacher_id": issue.teacher_id,
        "book_id": issue.book_id,
        "book_code": (book.book_code if book else ""),
        "book_title": (book.title if book else "Deleted Book"),
        "title": (book.title if book else "Deleted Book"),
        "author": (
            book.author_details.name
            if book and book.author_details
            else (book.author if book else "")
        ),
        "category": (
            book.category_details.name
            if book and book.category_details
            else (book.category if book else "")
        ),
        "isbn": (book.isbn if book else ""),
        "issue_date": (issue.issue_date.isoformat() if issue.issue_date else None),
        "due_date": (issue.due_date.isoformat() if issue.due_date else None),
        "return_date": (issue.return_date.isoformat() if issue.return_date else None),
        "overdue_days": overdue_days,
        "fine_amount": float(calculated_fine),
        "paid_fine": float(paid_fine),
        "pending_fine": float(pending_fine),
        "status": status,
    }


LIBRARY_MEMBER_TYPES = {
    "student",
    "teacher",
    "staff",
    "admin",
}

LIBRARY_ISSUE_STATUSES = {
    "Issued",
    "Due Soon",
    "Overdue",
    "Returned",
}


def parse_library_date(value, field_name):
    value = clean_text(value)

    if not value:
        return None, f"{field_name} is required"

    try:
        return (
            datetime.strptime(
                value,
                "%Y-%m-%d",
            ).date(),
            None,
        )

    except ValueError:
        return (
            None,
            f"{field_name} must use YYYY-MM-DD",
        )


def get_member_model(member_type):
    return {
        "student": Student,
        "teacher": Teacher,
        "staff": NonTeachingStaff,
        "admin": Admin,
    }.get(member_type)


def get_issue_model(member_type):
    return {
        "student": BookIssue,
        "teacher": TeacherBookIssue,
        "staff": StaffBookIssue,
        "admin": AdminBookIssue,
    }.get(member_type)


def get_issue_member_column(member_type):
    return {
        "student": BookIssue.student_id,
        "teacher": TeacherBookIssue.teacher_id,
        "staff": StaffBookIssue.staff_id,
        "admin": AdminBookIssue.admin_id,
    }.get(member_type)


def get_issue_member_field(member_type):
    return {
        "student": "student_id",
        "teacher": "teacher_id",
        "staff": "staff_id",
        "admin": "admin_id",
    }.get(member_type)


def get_fine_payment_model(member_type):
    return {
        "student": LibraryFinePayment,
        "teacher": TeacherLibraryFinePayment,
        "staff": StaffLibraryFinePayment,
    }.get(member_type)


def get_fine_payment_member_field(member_type):
    return {
        "student": "student_id",
        "teacher": "teacher_id",
        "staff": "staff_id",
    }.get(member_type)


def get_issue_paid_fine(
    member_type,
    issue_id,
):
    payment_model = get_fine_payment_model(member_type)

    if payment_model is None:
        return Decimal("0")

    amount = (
        db.session.query(
            func.coalesce(
                func.sum(payment_model.amount),
                0,
            )
        )
        .filter(
            payment_model.book_issue_id == issue_id,
            payment_model.status == "Collected",
        )
        .scalar()
    )

    return Decimal(str(amount or 0))


def get_issue_waived_fine(
    member_type,
    issue_id,
):
    payment_model = get_fine_payment_model(member_type)

    if payment_model is None:
        return Decimal("0")

    amount = (
        db.session.query(
            func.coalesce(
                func.sum(payment_model.amount),
                0,
            )
        )
        .filter(
            payment_model.book_issue_id == issue_id,
            payment_model.status == "Waived",
        )
        .scalar()
    )

    return Decimal(str(amount or 0))


def calculate_return_details(
    issue,
    return_date=None,
):
    actual_return_date = return_date or issue.return_date or date.today()

    overdue_days = max(
        (actual_return_date - issue.due_date).days,
        0,
    )

    fine_amount = Decimal(str(issue.fine_per_day or DUE_RUPEES)) * Decimal(overdue_days)

    return {
        "return_date": actual_return_date,
        "overdue_days": overdue_days,
        "fine_amount": fine_amount,
    }


def serialize_return_record(
    member_type,
    issue,
):
    circulation_data = serialize_circulation_issue(
        member_type,
        issue,
    )

    return_details = calculate_return_details(
        issue,
        issue.return_date,
    )

    paid_fine = get_issue_paid_fine(
        member_type,
        issue.id,
    )

    waived_fine = get_issue_waived_fine(
        member_type,
        issue.id,
    )

    total_resolved = paid_fine + waived_fine

    pending_fine = max(
        return_details["fine_amount"] - total_resolved,
        Decimal("0"),
    )

    if return_details["fine_amount"] <= 0:
        fine_status = "No Fine"

    elif pending_fine <= 0:
        if waived_fine > 0:
            fine_status = "Waived"
        else:
            fine_status = "Paid"

    else:
        fine_status = "Pending"

    return {
        **circulation_data,
        "return_date": (issue.return_date.isoformat() if issue.return_date else None),
        "overdue_days": (return_details["overdue_days"]),
        "fine_amount": float(return_details["fine_amount"]),
        "paid_fine": float(paid_fine),
        "waived_fine": float(waived_fine),
        "pending_fine": float(pending_fine),
        "fine_status": fine_status,
    }


def get_member_code(member_type, member):
    field_name = {
        "student": "student_id",
        "teacher": "teacher_id",
        "staff": "staff_id",
        "admin": "admin_id",
    }.get(member_type)

    return getattr(member, field_name, None) or str(member.id)


def get_member_name(member):
    return (
        clean_text(
            " ".join(
                filter(
                    None,
                    [
                        getattr(
                            member,
                            "first_name",
                            "",
                        ),
                        getattr(
                            member,
                            "middle_name",
                            "",
                        ),
                        getattr(
                            member,
                            "last_name",
                            "",
                        ),
                    ],
                )
            )
        )
        or f"Member {member.id}"
    )


def get_member_department(member_type, member):
    if member_type == "student":
        academic = get_student_academic_details(member)

        return academic.get(
            "class_name",
            "Not Assigned",
        )

    return (
        getattr(member, "department", None)
        or getattr(
            member,
            "specialization",
            None,
        )
        or getattr(
            member,
            "admin_type",
            None,
        )
        or "Not Assigned"
    )


def get_issue_member_id(
    member_type,
    issue,
):
    field_name = get_issue_member_field(member_type)

    return getattr(
        issue,
        field_name,
        None,
    )


def calculate_circulation_fine(issue):
    effective_date = issue.return_date or date.today()

    overdue_days = max(
        (effective_date - issue.due_date).days,
        0,
    )

    fine_amount = Decimal(str(issue.fine_per_day or DUE_RUPEES)) * Decimal(overdue_days)

    return overdue_days, fine_amount


def get_circulation_status(issue):
    if issue.return_date:
        return "Returned"

    today = date.today()

    if today > issue.due_date:
        return "Overdue"

    if (issue.due_date - today).days <= 2:
        return "Due Soon"

    return "Issued"


def serialize_circulation_issue(
    member_type,
    issue,
):
    member_model = get_member_model(member_type)

    member_id = get_issue_member_id(
        member_type,
        issue,
    )

    member = (
        db.session.get(
            member_model,
            member_id,
        )
        if member_model and member_id
        else None
    )

    overdue_days, fine_amount = calculate_circulation_fine(issue)

    book = issue.book

    return {
        "id": issue.id,
        "issue_code": (f"LIB-{member_type[:3].upper()}" f"-{issue.id:06d}"),
        "member_type": member_type,
        "member_id": member_id,
        "member_code": (
            get_member_code(
                member_type,
                member,
            )
            if member
            else ""
        ),
        "member_name": (get_member_name(member) if member else "Deleted Member"),
        "member_group": (
            get_member_department(
                member_type,
                member,
            )
            if member
            else ""
        ),
        "book_id": issue.book_id,
        "book_code": (
            getattr(
                book,
                "book_code",
                "",
            )
            if book
            else ""
        ),
        "book_title": (book.title if book else "Deleted Book"),
        "author": (
            book.author_details.name
            if (
                book
                and getattr(
                    book,
                    "author_details",
                    None,
                )
            )
            else (
                getattr(
                    book,
                    "author",
                    "",
                )
                if book
                else ""
            )
        ),
        "isbn": (getattr(book, "isbn", "") if book else ""),
        "shelf_no": (
            getattr(
                book,
                "shelf_no",
                "",
            )
            if book
            else ""
        ),
        "issue_date": (issue.issue_date.isoformat() if issue.issue_date else None),
        "due_date": (issue.due_date.isoformat() if issue.due_date else None),
        "return_date": (issue.return_date.isoformat() if issue.return_date else None),
        "fine_per_day": float(issue.fine_per_day or 0),
        "overdue_days": overdue_days,
        "fine_amount": float(fine_amount),
        "status": get_circulation_status(issue),
        "remarks": (getattr(issue, "remarks", None) or ""),
        "created_at": (
            issue.created_at.isoformat()
            if getattr(
                issue,
                "created_at",
                None,
            )
            else None
        ),
    }


class LibraryTeachersAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        try:
            page = parse_positive_integer(
                request.args.get("page"),
                1,
            )

            per_page = min(
                parse_positive_integer(
                    request.args.get("per_page"),
                    10,
                ),
                100,
            )

            search = clean_text(request.args.get("search"))

            department = clean_text(request.args.get("department"))

            status = clean_text(request.args.get("status"))

            query = Teacher.query

            if search:
                pattern = f"%{search}%"

                query = query.filter(
                    or_(
                        Teacher.teacher_id.ilike(pattern),
                        Teacher.first_name.ilike(pattern),
                        Teacher.middle_name.ilike(pattern),
                        Teacher.last_name.ilike(pattern),
                        Teacher.email.ilike(pattern),
                        Teacher.mobile.ilike(pattern),
                    )
                )

            if status:
                query = query.filter(func.lower(Teacher.status) == status.lower())

            if department:
                conditions = []

                if hasattr(
                    Teacher,
                    "department",
                ):
                    conditions.append(Teacher.department.ilike(department))

                if hasattr(
                    Teacher,
                    "specialization",
                ):
                    conditions.append(Teacher.specialization.ilike(department))

                if conditions:
                    query = query.filter(or_(*conditions))

            pagination = query.order_by(Teacher.id.desc()).paginate(
                page=page,
                per_page=per_page,
                error_out=False,
            )

            teacher_rows = []

            for teacher in pagination.items:
                teacher_data = serialize_library_teacher(teacher)

                issues = (
                    TeacherBookIssue.query.filter(
                        TeacherBookIssue.teacher_id == teacher.id
                    )
                    .order_by(TeacherBookIssue.id.desc())
                    .all()
                )

                issue_rows = [serialize_teacher_book_issue(issue) for issue in issues]

                active_issues = [
                    issue for issue in issue_rows if not issue["return_date"]
                ]

                returned_issues = [
                    issue for issue in issue_rows if issue["return_date"]
                ]

                overdue_count = sum(
                    1 for issue in active_issues if issue["status"] == "Overdue"
                )

                pending_fine = sum(
                    float(
                        issue.get(
                            "pending_fine",
                            0,
                        )
                        or 0
                    )
                    for issue in issue_rows
                )

                collected_fine = (
                    db.session.query(
                        func.coalesce(
                            func.sum(TeacherLibraryFinePayment.amount),
                            0,
                        )
                    )
                    .filter(
                        TeacherLibraryFinePayment.teacher_id == teacher.id,
                        TeacherLibraryFinePayment.status == "Collected",
                    )
                    .scalar()
                )

                if overdue_count > 0:
                    library_status = "Blocked"
                elif pending_fine > 0:
                    library_status = "Fine Pending"
                else:
                    library_status = teacher_data["status"]

                teacher_rows.append(
                    {
                        **teacher_data,
                        "active_books": len(active_issues),
                        "returned_books": len(returned_issues),
                        "total_transactions": len(issue_rows),
                        "overdue_books": (overdue_count),
                        "pending_fine": float(pending_fine),
                        "collected_fine": float(collected_fine or 0),
                        "library_status": (library_status),
                    }
                )

            department_columns = []

            if hasattr(
                Teacher,
                "department",
            ):
                department_columns.append(Teacher.department)

            if hasattr(
                Teacher,
                "specialization",
            ):
                department_columns.append(Teacher.specialization)

            department_values = set()

            for column in department_columns:
                values = (
                    db.session.query(column)
                    .filter(
                        column.isnot(None),
                        column != "",
                    )
                    .distinct()
                    .all()
                )

                department_values.update(
                    clean_text(value) for (value,) in values if clean_text(value)
                )

            total_active_issues = TeacherBookIssue.query.filter(
                TeacherBookIssue.return_date.is_(None)
            ).count()

            total_collected_fine = (
                db.session.query(
                    func.coalesce(
                        func.sum(TeacherLibraryFinePayment.amount),
                        0,
                    )
                )
                .filter(TeacherLibraryFinePayment.status == "Collected")
                .scalar()
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "teachers": teacher_rows,
                        "departments": sorted(department_values),
                        "stats": {
                            "total_teachers": (pagination.total),
                            "active_issues": (total_active_issues),
                            "teachers_with_fine": sum(
                                1 for item in teacher_rows if item["pending_fine"] > 0
                            ),
                            "collected_fine": float(total_collected_fine or 0),
                        },
                        "pagination": {
                            "page": (pagination.page),
                            "per_page": (pagination.per_page),
                            "total": (pagination.total),
                            "pages": (pagination.pages or 1),
                            "has_next": (pagination.has_next),
                            "has_prev": (pagination.has_prev),
                        },
                    }
                ),
                200,
            )

        except Exception:
            logger.exception("Unable to load library teachers")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to load library " "teachers"),
                    }
                ),
                500,
            )


class LibraryMembersAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        try:
            page = parse_positive_integer(
                request.args.get("page"),
                1,
            )

            per_page = min(
                parse_positive_integer(
                    request.args.get("per_page"),
                    10,
                ),
                100,
            )

            search = clean_text(request.args.get("search"))

            role_filter = clean_text(request.args.get("role")).lower()

            status_filter = clean_text(request.args.get("status"))

            department_filter = clean_text(request.args.get("department"))

            members = []

            # == ADMINS ==
            if role_filter in {
                "",
                "admin",
            }:
                admin_query = Admin.query

                if hasattr(
                    Admin,
                    "is_deleted",
                ):
                    admin_query = admin_query.filter(Admin.is_deleted.is_(False))

                if status_filter:
                    admin_query = admin_query.filter(
                        func.lower(Admin.status) == status_filter.lower()
                    )

                if department_filter:
                    admin_query = admin_query.filter(
                        Admin.department == department_filter
                    )

                if search:
                    pattern = f"%{search}%"

                    admin_query = admin_query.filter(
                        or_(
                            Admin.admin_id.ilike(pattern),
                            Admin.first_name.ilike(pattern),
                            Admin.middle_name.ilike(pattern),
                            Admin.last_name.ilike(pattern),
                            Admin.email.ilike(pattern),
                            Admin.mobile.ilike(pattern),
                            Admin.department.ilike(pattern),
                            Admin.designation.ilike(pattern),
                        )
                    )

                admins = admin_query.order_by(
                    Admin.first_name.asc(),
                    Admin.last_name.asc(),
                ).all()

                for admin in admins:
                    full_name = clean_text(
                        " ".join(
                            filter(
                                None,
                                [
                                    admin.first_name,
                                    admin.middle_name,
                                    admin.last_name,
                                ],
                            )
                        )
                    )

                    members.append(
                        {
                            "id": admin.id,
                            "member_key": (f"admin-{admin.id}"),
                            "member_type": "admin",
                            "role": "Administrator",
                            "member_code": (admin.admin_id),
                            "name": full_name,
                            "email": (admin.email or ""),
                            "mobile": (admin.mobile or ""),
                            "department": (admin.department or "Administration"),
                            "designation": (
                                admin.designation or admin.admin_type or ""
                            ),
                            "class_or_department": (
                                admin.department or "Administration"
                            ),
                            "status": admin.status,
                            "library_status": (admin.status),
                            "active_books": 0,
                            "returned_books": 0,
                            "overdue_books": 0,
                            "pending_fine": 0.0,
                            "collected_fine": 0.0,
                            "profile": (admin.to_dict()),
                        }
                    )

            # == NON-TEACHING STAFF ==
            if role_filter in {
                "",
                "staff",
            }:
                staff_query = NonTeachingStaff.query.filter(
                    NonTeachingStaff.is_deleted.is_(False)
                )

                if status_filter:
                    staff_query = staff_query.filter(
                        func.lower(NonTeachingStaff.status) == status_filter.lower()
                    )

                if department_filter:
                    staff_query = staff_query.filter(
                        NonTeachingStaff.department == department_filter
                    )

                if search:
                    pattern = f"%{search}%"

                    staff_query = staff_query.filter(
                        or_(
                            NonTeachingStaff.staff_id.ilike(pattern),
                            NonTeachingStaff.first_name.ilike(pattern),
                            NonTeachingStaff.middle_name.ilike(pattern),
                            NonTeachingStaff.last_name.ilike(pattern),
                            NonTeachingStaff.email.ilike(pattern),
                            NonTeachingStaff.mobile.ilike(pattern),
                            NonTeachingStaff.department.ilike(pattern),
                            NonTeachingStaff.designation.ilike(pattern),
                        )
                    )

                staff_rows = staff_query.order_by(
                    NonTeachingStaff.first_name.asc(),
                    NonTeachingStaff.last_name.asc(),
                ).all()

                for staff in staff_rows:
                    issues = (
                        StaffBookIssue.query.filter(StaffBookIssue.staff_id == staff.id)
                        .order_by(StaffBookIssue.id.desc())
                        .all()
                    )

                    active_issues = [issue for issue in issues if not issue.return_date]

                    returned_issues = [issue for issue in issues if issue.return_date]

                    overdue_issues = [
                        issue
                        for issue in active_issues
                        if date.today() > issue.due_date
                    ]

                    pending_fine = Decimal("0")

                    for issue in issues:
                        effective_date = issue.return_date or date.today()

                        overdue_days = max(
                            (effective_date - issue.due_date).days,
                            0,
                        )

                        calculated_fine = Decimal(
                            str(issue.fine_per_day or DUE_RUPEES)
                        ) * Decimal(overdue_days)

                        paid_amount = (
                            db.session.query(
                                func.coalesce(
                                    func.sum(StaffLibraryFinePayment.amount),
                                    0,
                                )
                            )
                            .filter(
                                StaffLibraryFinePayment.book_issue_id == issue.id,
                                StaffLibraryFinePayment.status == "Collected",
                            )
                            .scalar()
                        )

                        pending_fine += max(
                            calculated_fine - Decimal(str(paid_amount or 0)),
                            Decimal("0"),
                        )

                    collected_fine = (
                        db.session.query(
                            func.coalesce(
                                func.sum(StaffLibraryFinePayment.amount),
                                0,
                            )
                        )
                        .filter(
                            StaffLibraryFinePayment.staff_id == staff.id,
                            StaffLibraryFinePayment.status == "Collected",
                        )
                        .scalar()
                    )

                    if overdue_issues:
                        library_status = "Blocked"

                    elif pending_fine > 0:
                        library_status = "Fine Pending"

                    else:
                        library_status = staff.status

                    staff_data = staff.to_dict()

                    members.append(
                        {
                            **staff_data,
                            "member_key": (f"staff-{staff.id}"),
                            "member_type": "staff",
                            "role": ("Non-Teaching Staff"),
                            "member_code": (staff.staff_id),
                            "class_or_department": (staff.department),
                            "active_books": len(active_issues),
                            "returned_books": len(returned_issues),
                            "overdue_books": len(overdue_issues),
                            "pending_fine": float(pending_fine),
                            "collected_fine": float(collected_fine or 0),
                            "library_status": (library_status),
                            "profile": staff_data,
                        }
                    )

            members.sort(
                key=lambda item: (
                    item["member_type"],
                    item["name"].lower(),
                )
            )

            total = len(members)

            pages = max(
                (total + per_page - 1) // per_page,
                1,
            )

            if page > pages:
                page = pages

            start_index = (page - 1) * per_page

            page_members = members[start_index : start_index + per_page]

            department_values = set()

            admin_departments = (
                db.session.query(Admin.department)
                .filter(
                    Admin.department.isnot(None),
                    Admin.department != "",
                )
                .distinct()
                .all()
            )

            staff_departments = (
                db.session.query(NonTeachingStaff.department)
                .filter(
                    NonTeachingStaff.is_deleted.is_(False),
                    NonTeachingStaff.department.isnot(None),
                    NonTeachingStaff.department != "",
                )
                .distinct()
                .all()
            )

            department_values.update(value for (value,) in admin_departments if value)

            department_values.update(value for (value,) in staff_departments if value)

            return (
                jsonify(
                    {
                        "success": True,
                        "members": page_members,
                        "departments": sorted(department_values),
                        "stats": {
                            "total_members": total,
                            "admins": sum(
                                1
                                for member in members
                                if member["member_type"] == "admin"
                            ),
                            "staff": sum(
                                1
                                for member in members
                                if member["member_type"] == "staff"
                            ),
                            "active_issues": sum(
                                int(
                                    member.get(
                                        "active_books",
                                        0,
                                    )
                                    or 0
                                )
                                for member in members
                            ),
                            "pending_fine": sum(
                                float(
                                    member.get(
                                        "pending_fine",
                                        0,
                                    )
                                    or 0
                                )
                                for member in members
                            ),
                        },
                        "pagination": {
                            "page": page,
                            "per_page": (per_page),
                            "total": total,
                            "pages": pages,
                            "has_prev": page > 1,
                            "has_next": (page < pages),
                        },
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            logger.exception("Database error while loading " "admin and staff members")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to load " "library members"),
                    }
                ),
                500,
            )

        except Exception:
            logger.exception("Unexpected members API error")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Something went wrong"),
                    }
                ),
                500,
            )


class LibraryTeacherDetailsAPI(MethodView):

    @login_required
    def get(self, teacher_id):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        teacher = db.session.get(
            Teacher,
            teacher_id,
        )

        if not teacher:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Teacher not found"),
                    }
                ),
                404,
            )

        issues = (
            TeacherBookIssue.query.filter(TeacherBookIssue.teacher_id == teacher_id)
            .order_by(TeacherBookIssue.id.desc())
            .all()
        )

        issue_rows = [serialize_teacher_book_issue(issue) for issue in issues]

        active_issues = [issue for issue in issue_rows if not issue["return_date"]]

        return_history = [issue for issue in issue_rows if issue["return_date"]]

        payments = (
            TeacherLibraryFinePayment.query.filter(
                TeacherLibraryFinePayment.teacher_id == teacher_id
            )
            .order_by(TeacherLibraryFinePayment.collected_at.desc())
            .all()
        )

        pending_fine = sum(float(issue["pending_fine"] or 0) for issue in issue_rows)

        collected_fine = sum(
            float(payment.amount or 0)
            for payment in payments
            if payment.status == "Collected"
        )

        waived_fine = sum(
            float(payment.amount or 0)
            for payment in payments
            if payment.status == "Waived"
        )

        overdue_count = sum(
            1 for issue in active_issues if issue["status"] == "Overdue"
        )

        return (
            jsonify(
                {
                    "success": True,
                    "teacher": (serialize_library_teacher(teacher)),
                    "summary": {
                        "active_books": len(active_issues),
                        "returned_books": len(return_history),
                        "total_transactions": len(issue_rows),
                        "overdue_books": (overdue_count),
                        "pending_fine": (pending_fine),
                        "collected_fine": (collected_fine),
                        "waived_fine": (waived_fine),
                    },
                    "active_issues": (active_issues),
                    "return_history": (return_history),
                    "fine_payments": [payment.to_dict() for payment in payments],
                }
            ),
            200,
        )


class LibraryTeacherFinePaymentAPI(MethodView):

    @login_required
    def post(self, teacher_id):
        current_admin, access_error = authorize_library_admin("write")

        if access_error:
            return access_error

        teacher = db.session.get(
            Teacher,
            teacher_id,
        )

        if not teacher:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Teacher not found"),
                    }
                ),
                404,
            )

        payload = request.get_json(silent=True) or {}

        issue_id = payload.get("book_issue_id")

        try:
            amount = Decimal(str(payload.get("amount")))

            if amount <= 0:
                raise ValueError

        except Exception:
            return (
                jsonify(
                    {
                        "success": False,
                        "errors": {"amount": ("Enter a valid " "amount")},
                    }
                ),
                422,
            )

        issue = None

        if issue_id:
            issue = TeacherBookIssue.query.filter(
                TeacherBookIssue.id == int(issue_id),
                TeacherBookIssue.teacher_id == teacher_id,
            ).first()

            if not issue:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": ("Issue record " "not found"),
                        }
                    ),
                    404,
                )

            issue_data = serialize_teacher_book_issue(issue)

            if amount > Decimal(str(issue_data["pending_fine"])):
                return (
                    jsonify(
                        {
                            "success": False,
                            "errors": {
                                "amount": ("Amount cannot " "exceed pending " "fine")
                            },
                        }
                    ),
                    422,
                )

        payment_status = clean_text(payload.get("status") or "Collected")

        if payment_status not in {
            "Collected",
            "Waived",
        }:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Invalid payment status"),
                    }
                ),
                422,
            )

        payment = TeacherLibraryFinePayment(
            teacher_id=teacher_id,
            book_issue_id=(issue.id if issue else None),
            amount=amount,
            payment_method=clean_text(payload.get("payment_method") or "Cash"),
            reference_no=clean_text(payload.get("reference_no")) or None,
            remarks=clean_text(payload.get("remarks")) or None,
            status=payment_status,
            collected_by=str(
                getattr(
                    current_admin,
                    "admin_id",
                    current_admin.id,
                )
            ),
        )

        try:
            db.session.add(payment)
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": ("Teacher fine recorded " "successfully"),
                        "payment": (payment.to_dict()),
                    }
                ),
                201,
            )

        except SQLAlchemyError:
            db.session.rollback()

            logger.exception("Unable to save teacher fine")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to save fine"),
                    }
                ),
                500,
            )


class LibraryMemberDetailsAPI(MethodView):

    @login_required
    def get(self, member_type, member_id):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        member_type = clean_text(member_type).lower()

        try:
            member_id = int(member_id)

            if member_id <= 0:
                raise ValueError

        except (TypeError, ValueError):
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Invalid member id"),
                    }
                ),
                400,
            )

        # == ADMIN ==
        if member_type == "admin":
            admin = db.session.get(
                Admin,
                member_id,
            )

            if not admin or getattr(
                admin,
                "is_deleted",
                False,
            ):
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": ("Administrator " "not found"),
                        }
                    ),
                    404,
                )

            admin_data = admin.to_dict()

            admin_data.update(
                {
                    "name": " ".join(
                        filter(
                            None,
                            [
                                admin.first_name,
                                admin.middle_name,
                                admin.last_name,
                            ],
                        )
                    ),
                    "member_code": (admin.admin_id),
                    "member_type": "admin",
                    "role_label": ("Administrator"),
                    "library_status": (admin.status),
                }
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "member": admin_data,
                        "summary": {
                            "active_books": 0,
                            "returned_books": 0,
                            "overdue_books": 0,
                            "total_transactions": 0,
                            "pending_fine": 0,
                            "collected_fine": 0,
                            "waived_fine": 0,
                        },
                        "active_issues": [],
                        "return_history": [],
                        "fine_payments": [],
                    }
                ),
                200,
            )

        # = NON-TEACHING STAFF =
        if member_type == "staff":
            staff = db.session.get(
                NonTeachingStaff,
                member_id,
            )

            if not staff or staff.is_deleted:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": ("Staff member " "not found"),
                        }
                    ),
                    404,
                )

            issues = (
                StaffBookIssue.query.filter(StaffBookIssue.staff_id == staff.id)
                .order_by(StaffBookIssue.id.desc())
                .all()
            )

            issue_rows = [serialize_staff_book_issue(issue) for issue in issues]

            active_issues = [issue for issue in issue_rows if not issue["return_date"]]

            return_history = [issue for issue in issue_rows if issue["return_date"]]

            payments = (
                StaffLibraryFinePayment.query.filter(
                    StaffLibraryFinePayment.staff_id == staff.id
                )
                .order_by(StaffLibraryFinePayment.collected_at.desc())
                .all()
            )

            pending_fine = sum(
                float(
                    issue.get(
                        "pending_fine",
                        0,
                    )
                    or 0
                )
                for issue in issue_rows
            )

            collected_fine = sum(
                float(payment.amount or 0)
                for payment in payments
                if payment.status == "Collected"
            )

            waived_fine = sum(
                float(payment.amount or 0)
                for payment in payments
                if payment.status == "Waived"
            )

            overdue_books = sum(
                1 for issue in active_issues if issue["status"] == "Overdue"
            )

            staff_data = staff.to_dict()

            staff_data.update(
                {
                    "name": " ".join(
                        filter(
                            None,
                            [
                                staff.first_name,
                                staff.middle_name,
                                staff.last_name,
                            ],
                        )
                    ),
                    "member_code": (staff.staff_id),
                    "member_type": "staff",
                    "role_label": ("Non-Teaching Staff"),
                    "library_status": (
                        "Blocked"
                        if overdue_books > 0
                        else ("Fine Pending" if pending_fine > 0 else staff.status)
                    ),
                }
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "member": staff_data,
                        "summary": {
                            "active_books": len(active_issues),
                            "returned_books": len(return_history),
                            "overdue_books": (overdue_books),
                            "total_transactions": len(issue_rows),
                            "pending_fine": (pending_fine),
                            "collected_fine": (collected_fine),
                            "waived_fine": (waived_fine),
                        },
                        "active_issues": (active_issues),
                        "return_history": (return_history),
                        "fine_payments": [payment.to_dict() for payment in payments],
                    }
                ),
                200,
            )

        return (
            jsonify(
                {
                    "success": False,
                    "error": ("Member type must be " "admin or staff"),
                }
            ),
            400,
        )


class LibraryCirculationOptionsAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        try:
            member_type = clean_text(request.args.get("member_type")).lower()

            member_search = clean_text(request.args.get("member_search"))

            book_search = clean_text(request.args.get("book_search"))

            members = []

            requested_types = (
                [member_type]
                if member_type in LIBRARY_MEMBER_TYPES
                else [
                    "student",
                    "teacher",
                    "staff",
                    "admin",
                ]
            )

            for current_type in requested_types:
                model = get_member_model(current_type)

                query = model.query

                if hasattr(
                    model,
                    "is_deleted",
                ):
                    query = query.filter(model.is_deleted.is_(False))

                if hasattr(model, "status"):
                    query = query.filter(model.status == "Active")

                if member_search:
                    pattern = f"%{member_search}%"

                    conditions = []

                    for field_name in (
                        "student_id",
                        "teacher_id",
                        "staff_id",
                        "admin_id",
                        "first_name",
                        "middle_name",
                        "last_name",
                        "email",
                        "mobile",
                    ):
                        column = getattr(
                            model,
                            field_name,
                            None,
                        )

                        if column is not None:
                            conditions.append(column.ilike(pattern))

                    if conditions:
                        query = query.filter(or_(*conditions))

                rows = query.order_by(model.id.desc()).limit(100).all()

                for member in rows:
                    members.append(
                        {
                            "id": member.id,
                            "member_type": (current_type),
                            "member_code": (
                                get_member_code(
                                    current_type,
                                    member,
                                )
                            ),
                            "name": (get_member_name(member)),
                            "group": (
                                get_member_department(
                                    current_type,
                                    member,
                                )
                            ),
                            "mobile": (
                                getattr(
                                    member,
                                    "mobile",
                                    None,
                                )
                                or ""
                            ),
                            "status": (
                                getattr(
                                    member,
                                    "status",
                                    None,
                                )
                                or "Active"
                            ),
                        }
                    )

            book_query = Book.query.filter(
                Book.is_deleted.is_(False),
                Book.status == "Available",
                Book.available_copies > 0,
            )

            if book_search:
                pattern = f"%{book_search}%"

                book_query = book_query.filter(
                    or_(
                        Book.title.ilike(pattern),
                        Book.book_code.ilike(pattern),
                        Book.isbn.ilike(pattern),
                        Book.author.ilike(pattern),
                    )
                )

            books = book_query.order_by(Book.title.asc()).limit(200).all()

            return (
                jsonify(
                    {
                        "success": True,
                        "members": members,
                        "books": [
                            {
                                "id": book.id,
                                "book_code": (book.book_code),
                                "title": book.title,
                                "author": (
                                    book.author_details.name
                                    if getattr(
                                        book,
                                        "author_details",
                                        None,
                                    )
                                    else (book.author or "")
                                ),
                                "isbn": (book.isbn or ""),
                                "shelf_no": (book.shelf_no or ""),
                                "available_copies": (book.available_copies),
                                "total_copies": (book.total_copies),
                            }
                            for book in books
                        ],
                        "defaults": {
                            "issue_date": (date.today().isoformat()),
                            "due_date": (date.today() + timedelta(days=14)).isoformat(),
                            "fine_per_day": float(DUE_RUPEES),
                        },
                    }
                ),
                200,
            )

        except Exception:
            logger.exception("Unable to load circulation options")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to load issue " "book options"),
                    }
                ),
                500,
            )


class LibraryCirculationAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        try:
            page = parse_positive_integer(
                request.args.get("page"),
                1,
            )

            per_page = min(
                parse_positive_integer(
                    request.args.get("per_page"),
                    10,
                ),
                100,
            )

            search = clean_text(request.args.get("search")).lower()

            status_filter = clean_text(request.args.get("status"))

            member_type_filter = clean_text(request.args.get("member_type")).lower()

            date_from = clean_text(request.args.get("date_from"))

            date_to = clean_text(request.args.get("date_to"))

            export_format = clean_text(request.args.get("export")).lower()

            issue_rows = []

            # Select one member type when filtered.
            # Otherwise load all supported member types.
            selected_types = (
                [member_type_filter]
                if member_type_filter in LIBRARY_MEMBER_TYPES
                else list(LIBRARY_MEMBER_TYPES)
            )

            parsed_date_from = None
            parsed_date_to = None

            # Validate From Date.
            if date_from:
                (
                    parsed_date_from,
                    date_from_error,
                ) = parse_library_date(
                    date_from,
                    "From date",
                )

                if date_from_error:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": (date_from_error),
                                "errors": {
                                    "date_from": (date_from_error),
                                },
                            }
                        ),
                        422,
                    )

            # Validate To Date.
            if date_to:
                (
                    parsed_date_to,
                    date_to_error,
                ) = parse_library_date(
                    date_to,
                    "To date",
                )

                if date_to_error:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": (date_to_error),
                                "errors": {
                                    "date_to": (date_to_error),
                                },
                            }
                        ),
                        422,
                    )

            if (
                parsed_date_from
                and parsed_date_to
                and parsed_date_to < parsed_date_from
            ):
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": ("To date cannot be " "before From date"),
                            "errors": {
                                "date_to": ("To date cannot be " "before From date"),
                            },
                        }
                    ),
                    422,
                )

            # Load circulation records from all
            # supported issue tables.
            for member_type in selected_types:
                issue_model = get_issue_model(member_type)

                # Protect against an unsupported or
                # missing issue model.
                if issue_model is None:
                    logger.warning(
                        "No issue model configured " "for member type: %s",
                        member_type,
                    )
                    continue

                query = issue_model.query

                if parsed_date_from:
                    query = query.filter(issue_model.issue_date >= parsed_date_from)

                if parsed_date_to:
                    query = query.filter(issue_model.issue_date <= parsed_date_to)

                issues = query.all()

                issue_rows.extend(
                    serialize_circulation_issue(
                        member_type,
                        issue,
                    )
                    for issue in issues
                )

            # Search by issue, member or book details.
            if search:
                issue_rows = [
                    row
                    for row in issue_rows
                    if (
                        search
                        in str(
                            row.get(
                                "member_name",
                                "",
                            )
                        ).lower()
                        or search
                        in str(
                            row.get(
                                "member_code",
                                "",
                            )
                        ).lower()
                        or search
                        in str(
                            row.get(
                                "member_group",
                                "",
                            )
                        ).lower()
                        or search
                        in str(
                            row.get(
                                "book_title",
                                "",
                            )
                        ).lower()
                        or search
                        in str(
                            row.get(
                                "book_code",
                                "",
                            )
                        ).lower()
                        or search
                        in str(
                            row.get(
                                "author",
                                "",
                            )
                        ).lower()
                        or search
                        in str(
                            row.get(
                                "isbn",
                                "",
                            )
                        ).lower()
                        or search
                        in str(
                            row.get(
                                "issue_code",
                                "",
                            )
                        ).lower()
                    )
                ]

            # Apply circulation status filter.
            if status_filter:
                issue_rows = [
                    row
                    for row in issue_rows
                    if str(
                        row.get(
                            "status",
                            "",
                        )
                    ).lower()
                    == status_filter.lower()
                ]

            # Latest issued records first.
            issue_rows.sort(
                key=lambda row: (
                    row.get("created_at") or "",
                    row.get("issue_date") or "",
                    row.get("id") or 0,
                ),
                reverse=True,
            )

            # ==
            # EXPORT ALL FILTERED RECORDS AS CSV
            # ==
            if export_format == "csv":
                output = io.StringIO()

                # Add BOM so Microsoft Excel displays
                # Unicode characters correctly.
                output.write("\ufeff")

                writer = csv.writer(output)

                writer.writerow(
                    [
                        "Issue ID",
                        "Member Type",
                        "Member ID",
                        "Member Name",
                        "Class / Department",
                        "Book Code",
                        "Book Title",
                        "Author",
                        "ISBN",
                        "Shelf Number",
                        "Issue Date",
                        "Due Date",
                        "Return Date",
                        "Status",
                        "Late Days",
                        "Fine Per Day",
                        "Fine Amount",
                        "Remarks",
                        "Record Created At",
                    ]
                )

                for row in issue_rows:
                    writer.writerow(
                        [
                            row.get(
                                "issue_code",
                                "",
                            ),
                            str(
                                row.get(
                                    "member_type",
                                    "",
                                )
                            )
                            .replace(
                                "_",
                                " ",
                            )
                            .title(),
                            row.get(
                                "member_code",
                                "",
                            ),
                            row.get(
                                "member_name",
                                "",
                            ),
                            row.get(
                                "member_group",
                                "",
                            ),
                            row.get(
                                "book_code",
                                "",
                            ),
                            row.get(
                                "book_title",
                                "",
                            ),
                            row.get(
                                "author",
                                "",
                            ),
                            row.get(
                                "isbn",
                                "",
                            ),
                            row.get(
                                "shelf_no",
                                "",
                            ),
                            row.get(
                                "issue_date",
                                "",
                            ),
                            row.get(
                                "due_date",
                                "",
                            ),
                            row.get(
                                "return_date",
                                "",
                            ),
                            row.get(
                                "status",
                                "",
                            ),
                            int(
                                row.get(
                                    "overdue_days",
                                    0,
                                )
                                or 0
                            ),
                            float(
                                row.get(
                                    "fine_per_day",
                                    0,
                                )
                                or 0
                            ),
                            float(
                                row.get(
                                    "fine_amount",
                                    0,
                                )
                                or 0
                            ),
                            row.get(
                                "remarks",
                                "",
                            ),
                            row.get(
                                "created_at",
                                "",
                            ),
                        ]
                    )

                if status_filter:
                    report_scope = (
                        status_filter.strip()
                        .lower()
                        .replace(
                            " ",
                            "-",
                        )
                    )
                else:
                    report_scope = "all-circulation"

                filename = (
                    f"library-{report_scope}-"
                    f"report-"
                    f"{date.today().isoformat()}"
                    f".csv"
                )

                return Response(
                    output.getvalue(),
                    status=200,
                    mimetype=("text/csv; " "charset=utf-8"),
                    headers={
                        "Content-Disposition": (
                            "attachment; " f'filename="{filename}"'
                        ),
                        "X-Exported-Records": str(len(issue_rows)),
                    },
                )

            total = len(issue_rows)

            pages = max(
                (total + per_page - 1) // per_page,
                1,
            )

            if page > pages:
                page = pages

            start = (page - 1) * per_page

            paginated_rows = issue_rows[start : start + per_page]

            active_rows = [
                row
                for row in issue_rows
                if row.get("status")
                in {
                    "Issued",
                    "Due Soon",
                    "Overdue",
                }
            ]

            currently_issued = sum(1 for row in active_rows)

            due_soon = sum(1 for row in active_rows if row.get("status") == "Due Soon")

            overdue = sum(1 for row in active_rows if row.get("status") == "Overdue")

            returned = sum(1 for row in issue_rows if row.get("status") == "Returned")

            outstanding_fine = sum(
                float(
                    row.get(
                        "fine_amount",
                        0,
                    )
                    or 0
                )
                for row in active_rows
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "issues": (paginated_rows),
                        "stats": {
                            "total_records": (total),
                            "currently_issued": (currently_issued),
                            "due_soon": (due_soon),
                            "overdue": (overdue),
                            "returned": (returned),
                            "outstanding_fine": (outstanding_fine),
                        },
                        "applied_filters": {
                            "search": search,
                            "member_type": (member_type_filter),
                            "status": (status_filter),
                            "date_from": (date_from),
                            "date_to": (date_to),
                        },
                        "pagination": {
                            "page": page,
                            "per_page": (per_page),
                            "total": total,
                            "pages": pages,
                            "has_prev": (page > 1),
                            "has_next": (page < pages),
                        },
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            logger.exception("Database error while loading " "circulation records")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to load issued " "book records"),
                    }
                ),
                500,
            )

        except Exception:
            logger.exception("Unexpected error while loading " "circulation records")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to load issued " "book records"),
                    }
                ),
                500,
            )

    @login_required
    def post(self):
        current_admin, access_error = authorize_library_admin("write")

        if access_error:
            return access_error

        payload = request.get_json(silent=True) or {}

        errors = {}

        member_type = clean_text(payload.get("member_type")).lower()

        if member_type not in LIBRARY_MEMBER_TYPES:
            errors["member_type"] = "Select a valid member type"

        try:
            member_id = int(payload.get("member_id"))

            if member_id <= 0:
                raise ValueError

        except (
            TypeError,
            ValueError,
        ):
            member_id = None

            errors["member_id"] = "Select a valid member"

        try:
            book_id = int(payload.get("book_id"))

            if book_id <= 0:
                raise ValueError

        except (
            TypeError,
            ValueError,
        ):
            book_id = None

            errors["book_id"] = "Select a valid book"

        issue_date, issue_error = parse_library_date(
            payload.get("issue_date"),
            "Issue date",
        )

        due_date, due_error = parse_library_date(
            payload.get("due_date"),
            "Due date",
        )

        if issue_error:
            errors["issue_date"] = issue_error

        if due_error:
            errors["due_date"] = due_error

        if issue_date and due_date and due_date <= issue_date:
            errors["due_date"] = "Due date must be after " "the issue date"

        try:
            fine_per_day = Decimal(
                str(
                    payload.get(
                        "fine_per_day",
                        DUE_RUPEES,
                    )
                )
            )

            if fine_per_day < 0:
                raise ValueError

        except (
            TypeError,
            ValueError,
            InvalidOperation,
        ):
            fine_per_day = Decimal(str(DUE_RUPEES))

            errors["fine_per_day"] = "Fine per day must be " "zero or greater"

        member = None
        issue_model = None
        member_column = None
        member_field = None

        if member_type in LIBRARY_MEMBER_TYPES:
            issue_model = get_issue_model(member_type)

            member_column = get_issue_member_column(member_type)

            member_field = get_issue_member_field(member_type)

            if issue_model is None or member_column is None or not member_field:
                errors["member_type"] = (
                    "Library issuing is not " "configured for this " "member type"
                )

        if member_id and not errors.get("member_type"):
            member_model = get_member_model(member_type)

            if member_model is None:
                errors["member_type"] = "Invalid member type"

            else:
                member = db.session.get(
                    member_model,
                    member_id,
                )

                if not member:
                    errors["member_id"] = "Selected member " "not found"

                elif getattr(
                    member,
                    "is_deleted",
                    False,
                ):
                    errors["member_id"] = "Selected member " "is unavailable"

                elif (
                    str(
                        getattr(
                            member,
                            "status",
                            "Active",
                        )
                    ).lower()
                    != "active"
                ):
                    errors["member_id"] = "Selected member " "is not active"

        book = None

        if book_id:
            book = (
                Book.query.filter(
                    Book.id == book_id,
                    Book.is_deleted.is_(False),
                )
                .with_for_update()
                .first()
            )

            if not book:
                errors["book_id"] = "Selected book not found"

            elif str(book.status or "").lower() not in {
                "available",
                "active",
            }:
                errors["book_id"] = "Selected book is " "unavailable"

            elif int(book.available_copies or 0) <= 0:
                errors["book_id"] = "No copies are available"

        if member and book and issue_model and member_column is not None:
            duplicate_issue = issue_model.query.filter(
                member_column == member.id,
                issue_model.book_id == book.id,
                issue_model.return_date.is_(None),
            ).first()

            if duplicate_issue:
                errors["book_id"] = (
                    "This member already has " "an active issue for this " "book"
                )

            active_count = issue_model.query.filter(
                member_column == member.id,
                issue_model.return_date.is_(None),
            ).count()

            issue_limits = {
                "student": 3,
                "teacher": 5,
                "staff": 3,
                "admin": 5,
            }

            issue_limit = issue_limits.get(
                member_type,
                3,
            )

            if active_count >= issue_limit:
                errors["member_id"] = (
                    f"This member has reached " f"the {issue_limit}-book " f"limit"
                )

            # Prevent issuing books to a member
            # who already has an overdue book.
            overdue_issue = issue_model.query.filter(
                member_column == member.id,
                issue_model.return_date.is_(None),
                issue_model.due_date < date.today(),
            ).first()

            if overdue_issue:
                errors["member_id"] = (
                    "This member has an "
                    "overdue book. Return or "
                    "resolve it before issuing "
                    "another book"
                )

        if errors:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Validation failed"),
                        "errors": errors,
                    }
                ),
                422,
            )

        issue_data = {
            member_field: member.id,
            "book_id": book.id,
            "issue_date": issue_date,
            "due_date": due_date,
            "fine_per_day": (fine_per_day),
            "fine_amount": Decimal("0"),
            "status": "Issued",
        }

        if hasattr(
            issue_model,
            "remarks",
        ):
            issue_data["remarks"] = clean_text(payload.get("remarks")) or None

        if hasattr(
            issue_model,
            "issued_by",
        ):
            issue_data["issued_by"] = str(
                getattr(
                    current_admin,
                    "admin_id",
                    current_admin.id,
                )
            )

        issue = issue_model(**issue_data)

        try:
            book.available_copies = max(
                int(book.available_copies or 0) - 1,
                0,
            )

            if book.available_copies <= 0:
                book.status = "Unavailable"

            db.session.add(issue)
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": ("Book issued " "successfully"),
                        "issue": (
                            serialize_circulation_issue(
                                member_type,
                                issue,
                            )
                        ),
                    }
                ),
                201,
            )

        except SQLAlchemyError:
            db.session.rollback()

            logger.exception("Unable to issue book")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to issue book"),
                    }
                ),
                500,
            )

        except Exception:
            db.session.rollback()

            logger.exception("Unexpected error while " "issuing book")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to issue book"),
                    }
                ),
                500,
            )


class LibraryReturnOptionsAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        try:
            search = clean_text(request.args.get("search")).lower()

            member_type_filter = clean_text(request.args.get("member_type")).lower()

            selected_types = (
                [member_type_filter]
                if member_type_filter in LIBRARY_MEMBER_TYPES
                else list(LIBRARY_MEMBER_TYPES)
            )

            active_issues = []

            for member_type in selected_types:
                issue_model = get_issue_model(member_type)

                if issue_model is None:
                    continue

                issues = (
                    issue_model.query.filter(issue_model.return_date.is_(None))
                    .order_by(
                        issue_model.issue_date.desc(),
                        issue_model.id.desc(),
                    )
                    .all()
                )

                for issue in issues:
                    row = serialize_circulation_issue(
                        member_type,
                        issue,
                    )

                    if search:
                        searchable_text = " ".join(
                            [
                                str(
                                    row.get(
                                        "issue_code",
                                        "",
                                    )
                                ),
                                str(
                                    row.get(
                                        "member_name",
                                        "",
                                    )
                                ),
                                str(
                                    row.get(
                                        "member_code",
                                        "",
                                    )
                                ),
                                str(
                                    row.get(
                                        "book_title",
                                        "",
                                    )
                                ),
                                str(
                                    row.get(
                                        "book_code",
                                        "",
                                    )
                                ),
                                str(
                                    row.get(
                                        "isbn",
                                        "",
                                    )
                                ),
                            ]
                        ).lower()

                        if search not in searchable_text:
                            continue

                    return_details = calculate_return_details(
                        issue,
                        date.today(),
                    )

                    row.update(
                        {
                            "calculated_return_date": (date.today().isoformat()),
                            "calculated_overdue_days": (return_details["overdue_days"]),
                            "calculated_fine": float(return_details["fine_amount"]),
                        }
                    )

                    active_issues.append(row)

            active_issues.sort(
                key=lambda row: (
                    row.get("created_at") or "",
                    row.get("issue_date") or "",
                    row.get("id") or 0,
                ),
                reverse=True,
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "active_issues": (active_issues),
                        "defaults": {
                            "return_date": (date.today().isoformat()),
                        },
                    }
                ),
                200,
            )

        except Exception:
            logger.exception("Unable to load return options")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to load active " "issued records"),
                    }
                ),
                500,
            )


class LibraryReturnBookAPI(MethodView):

    @login_required
    def post(
        self,
        member_type,
        issue_id,
    ):
        current_admin, access_error = authorize_library_admin("write")

        if access_error:
            return access_error

        member_type = clean_text(member_type).lower()

        if member_type not in LIBRARY_MEMBER_TYPES:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Invalid member type"),
                    }
                ),
                400,
            )

        issue_model = get_issue_model(member_type)

        if issue_model is None:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": (
                            "Return processing is "
                            "not configured for "
                            "this member type"
                        ),
                    }
                ),
                422,
            )

        issue = (
            issue_model.query.filter(issue_model.id == issue_id)
            .with_for_update()
            .first()
        )

        if not issue:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Issued record not found"),
                    }
                ),
                404,
            )

        if issue.return_date:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("This book has already " "been returned"),
                    }
                ),
                409,
            )

        payload = request.get_json(silent=True) or {}

        (
            return_date,
            return_date_error,
        ) = parse_library_date(
            payload.get("return_date"),
            "Return date",
        )

        if return_date_error:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Validation failed"),
                        "errors": {
                            "return_date": (return_date_error),
                        },
                    }
                ),
                422,
            )

        if return_date < issue.issue_date:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Validation failed"),
                        "errors": {
                            "return_date": (
                                "Return date cannot " "be before issue date"
                            ),
                        },
                    }
                ),
                422,
            )

        fine_action = clean_text(payload.get("fine_action") or "pending").lower()

        allowed_fine_actions = {
            "pending",
            "collect",
            "waive",
        }

        if fine_action not in allowed_fine_actions:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Invalid fine action"),
                    }
                ),
                422,
            )

        payment_method = clean_text(payload.get("payment_method") or "Cash")

        reference_no = clean_text(payload.get("reference_no"))

        remarks = clean_text(payload.get("remarks"))

        return_details = calculate_return_details(
            issue,
            return_date,
        )

        overdue_days = return_details["overdue_days"]

        fine_amount = return_details["fine_amount"]

        if fine_action in {"collect", "waive"} and fine_amount > 0:
            payment_model = get_fine_payment_model(member_type)

            payment_member_field = get_fine_payment_member_field(member_type)

            if payment_model is None or not payment_member_field:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": (
                                "Fine payment is not "
                                "configured for this "
                                "member type"
                            ),
                        }
                    ),
                    422,
                )

        book = Book.query.filter(Book.id == issue.book_id).with_for_update().first()

        try:
            issue.return_date = return_date

            issue.status = "Returned"

            issue.fine_amount = fine_amount

            if (
                hasattr(
                    issue,
                    "remarks",
                )
                and remarks
            ):
                previous_remarks = clean_text(
                    getattr(
                        issue,
                        "remarks",
                        "",
                    )
                )

                issue.remarks = (
                    f"{previous_remarks}\n" f"Return: {remarks}"
                    if previous_remarks
                    else f"Return: {remarks}"
                )

            if hasattr(
                issue,
                "returned_by",
            ):
                issue.returned_by = str(
                    getattr(
                        current_admin,
                        "admin_id",
                        current_admin.id,
                    )
                )

            if book:
                total_copies = int(book.total_copies or 0)

                available_copies = int(book.available_copies or 0)

                book.available_copies = min(
                    available_copies + 1,
                    total_copies,
                )

                if (
                    book.available_copies > 0
                    and str(book.status or "").lower() == "unavailable"
                ):
                    book.status = "Available"

            if fine_amount > 0 and fine_action in {"collect", "waive"}:
                member_field_name = get_issue_member_field(member_type)

                member_id = getattr(
                    issue,
                    member_field_name,
                )

                payment_status = "Collected" if fine_action == "collect" else "Waived"

                payment_data = {
                    payment_member_field: (member_id),
                    "book_issue_id": (issue.id),
                    "amount": fine_amount,
                    "payment_method": (
                        payment_method if payment_status == "Collected" else "Waiver"
                    ),
                    "reference_no": (reference_no or None),
                    "remarks": (remarks or None),
                    "status": (payment_status),
                    "collected_by": str(
                        getattr(
                            current_admin,
                            "admin_id",
                            current_admin.id,
                        )
                    ),
                }

                payment = payment_model(**payment_data)

                db.session.add(payment)

            db.session.commit()

            returned_record = serialize_return_record(
                member_type,
                issue,
            )

            if fine_amount <= 0:
                message = "Book returned successfully"

            elif fine_action == "collect":
                message = "Book returned and fine " "collected successfully"

            elif fine_action == "waive":
                message = "Book returned and fine " "waived successfully"

            else:
                message = "Book returned successfully. " "Fine remains pending"

            return (
                jsonify(
                    {
                        "success": True,
                        "message": message,
                        "overdue_days": (overdue_days),
                        "fine_amount": float(fine_amount),
                        "fine_action": (fine_action),
                        "record": (returned_record),
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            db.session.rollback()

            logger.exception("Unable to process book return")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to process " "book return"),
                    }
                ),
                500,
            )

        except Exception:
            db.session.rollback()

            logger.exception("Unexpected return-book error")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to process " "book return"),
                    }
                ),
                500,
            )


class LibraryReturnedBooksAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        try:
            page = parse_positive_integer(
                request.args.get("page"),
                1,
            )

            per_page = min(
                parse_positive_integer(
                    request.args.get("per_page"),
                    10,
                ),
                100,
            )

            search = clean_text(request.args.get("search")).lower()

            member_type_filter = clean_text(request.args.get("member_type")).lower()

            fine_status_filter = clean_text(request.args.get("fine_status")).lower()

            date_from = clean_text(request.args.get("date_from"))

            date_to = clean_text(request.args.get("date_to"))

            export_format = clean_text(request.args.get("export")).lower()

            parsed_date_from = None
            parsed_date_to = None

            if date_from:
                (
                    parsed_date_from,
                    date_from_error,
                ) = parse_library_date(
                    date_from,
                    "From date",
                )

                if date_from_error:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": (date_from_error),
                            }
                        ),
                        422,
                    )

            if date_to:
                (
                    parsed_date_to,
                    date_to_error,
                ) = parse_library_date(
                    date_to,
                    "To date",
                )

                if date_to_error:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": (date_to_error),
                            }
                        ),
                        422,
                    )

            if (
                parsed_date_from
                and parsed_date_to
                and parsed_date_to < parsed_date_from
            ):
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": ("To date cannot be " "before From date"),
                        }
                    ),
                    422,
                )

            selected_types = (
                [member_type_filter]
                if member_type_filter in LIBRARY_MEMBER_TYPES
                else list(LIBRARY_MEMBER_TYPES)
            )

            records = []

            for member_type in selected_types:
                issue_model = get_issue_model(member_type)

                if issue_model is None:
                    continue

                query = issue_model.query.filter(issue_model.return_date.isnot(None))

                if parsed_date_from:
                    query = query.filter(issue_model.return_date >= parsed_date_from)

                if parsed_date_to:
                    query = query.filter(issue_model.return_date <= parsed_date_to)

                rows = query.all()

                records.extend(
                    serialize_return_record(
                        member_type,
                        issue,
                    )
                    for issue in rows
                )

            if search:
                records = [
                    row
                    for row in records
                    if search
                    in " ".join(
                        [
                            str(
                                row.get(
                                    "issue_code",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "member_name",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "member_code",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "book_title",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "book_code",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "isbn",
                                    "",
                                )
                            ),
                        ]
                    ).lower()
                ]

            if fine_status_filter:
                records = [
                    row
                    for row in records
                    if str(
                        row.get(
                            "fine_status",
                            "",
                        )
                    ).lower()
                    == fine_status_filter
                ]

            records.sort(
                key=lambda row: (
                    row.get("return_date") or "",
                    row.get("created_at") or "",
                    row.get("id") or 0,
                ),
                reverse=True,
            )

            if export_format == "csv":
                output = io.StringIO()
                output.write("\ufeff")

                writer = csv.writer(output)

                writer.writerow(
                    [
                        "Issue ID",
                        "Member Type",
                        "Member ID",
                        "Member Name",
                        "Class / Department",
                        "Book Code",
                        "Book Title",
                        "Author",
                        "ISBN",
                        "Issue Date",
                        "Due Date",
                        "Return Date",
                        "Late Days",
                        "Fine Amount",
                        "Paid Fine",
                        "Waived Fine",
                        "Pending Fine",
                        "Fine Status",
                        "Remarks",
                    ]
                )

                for row in records:
                    writer.writerow(
                        [
                            row.get(
                                "issue_code",
                                "",
                            ),
                            str(
                                row.get(
                                    "member_type",
                                    "",
                                )
                            ).title(),
                            row.get(
                                "member_code",
                                "",
                            ),
                            row.get(
                                "member_name",
                                "",
                            ),
                            row.get(
                                "member_group",
                                "",
                            ),
                            row.get(
                                "book_code",
                                "",
                            ),
                            row.get(
                                "book_title",
                                "",
                            ),
                            row.get(
                                "author",
                                "",
                            ),
                            row.get(
                                "isbn",
                                "",
                            ),
                            row.get(
                                "issue_date",
                                "",
                            ),
                            row.get(
                                "due_date",
                                "",
                            ),
                            row.get(
                                "return_date",
                                "",
                            ),
                            row.get(
                                "overdue_days",
                                0,
                            ),
                            row.get(
                                "fine_amount",
                                0,
                            ),
                            row.get(
                                "paid_fine",
                                0,
                            ),
                            row.get(
                                "waived_fine",
                                0,
                            ),
                            row.get(
                                "pending_fine",
                                0,
                            ),
                            row.get(
                                "fine_status",
                                "",
                            ),
                            row.get(
                                "remarks",
                                "",
                            ),
                        ]
                    )

                filename = (
                    "library-returned-books-" f"{date.today().isoformat()}" ".csv"
                )

                return Response(
                    output.getvalue(),
                    status=200,
                    mimetype=("text/csv; charset=utf-8"),
                    headers={
                        "Content-Disposition": (
                            "attachment; " f'filename="{filename}"'
                        ),
                        "X-Exported-Records": (str(len(records))),
                    },
                )

            total = len(records)

            pages = max(
                (total + per_page - 1) // per_page,
                1,
            )

            if page > pages:
                page = pages

            start = (page - 1) * per_page

            paginated_records = records[start : start + per_page]

            return (
                jsonify(
                    {
                        "success": True,
                        "records": (paginated_records),
                        "stats": {
                            "total_returned": (total),
                            "returned_today": sum(
                                1
                                for row in records
                                if row.get("return_date") == date.today().isoformat()
                            ),
                            "late_returns": sum(
                                1
                                for row in records
                                if int(
                                    row.get(
                                        "overdue_days",
                                        0,
                                    )
                                    or 0
                                )
                                > 0
                            ),
                            "pending_fines": sum(
                                1
                                for row in records
                                if row.get("fine_status") == "Pending"
                            ),
                            "fine_collected": sum(
                                float(
                                    row.get(
                                        "paid_fine",
                                        0,
                                    )
                                    or 0
                                )
                                for row in records
                            ),
                            "fine_waived": sum(
                                float(
                                    row.get(
                                        "waived_fine",
                                        0,
                                    )
                                    or 0
                                )
                                for row in records
                            ),
                        },
                        "pagination": {
                            "page": page,
                            "per_page": (per_page),
                            "total": total,
                            "pages": pages,
                            "has_prev": (page > 1),
                            "has_next": (page < pages),
                        },
                    }
                ),
                200,
            )

        except Exception:
            logger.exception("Unable to load returned books")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to load " "returned-book records"),
                    }
                ),
                500,
            )


class LibraryCirculationReturnAPI(MethodView):

    @login_required
    def post(
        self,
        member_type,
        issue_id,
    ):
        current_admin, access_error = authorize_library_admin("write")

        if access_error:
            return access_error

        member_type = clean_text(member_type).lower()

        if member_type not in (LIBRARY_MEMBER_TYPES):
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Invalid member type"),
                    }
                ),
                400,
            )

        issue_model = get_issue_model(member_type)

        issue = (
            issue_model.query.filter(issue_model.id == issue_id)
            .with_for_update()
            .first()
        )

        if not issue:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Issue record not found"),
                    }
                ),
                404,
            )

        if issue.return_date:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("This book is already returned"),
                    }
                ),
                409,
            )

        payload = request.get_json(silent=True) or {}

        return_date_value = payload.get("return_date") or date.today().isoformat()

        return_date, return_error = parse_library_date(
            return_date_value,
            "Return date",
        )

        if return_error:
            return (
                jsonify(
                    {
                        "success": False,
                        "errors": {"return_date": (return_error)},
                    }
                ),
                422,
            )

        if return_date < issue.issue_date:
            return (
                jsonify(
                    {
                        "success": False,
                        "errors": {
                            "return_date": (
                                "Return date cannot " "be before issue date"
                            )
                        },
                    }
                ),
                422,
            )

        book = Book.query.filter(Book.id == issue.book_id).with_for_update().first()

        overdue_days = max(
            (return_date - issue.due_date).days,
            0,
        )

        fine_amount = Decimal(str(issue.fine_per_day or DUE_RUPEES)) * Decimal(
            overdue_days
        )

        try:
            issue.return_date = return_date

            issue.status = "Returned"

            issue.fine_amount = fine_amount

            if hasattr(
                issue,
                "returned_by",
            ):
                issue.returned_by = str(
                    getattr(
                        current_admin,
                        "admin_id",
                        current_admin.id,
                    )
                )

            if book:
                book.available_copies = min(
                    int(book.available_copies or 0) + 1,
                    int(book.total_copies or 0),
                )

                if book.available_copies > 0 and book.status == "Unavailable":
                    book.status = "Available"

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": ("Book returned successfully"),
                        "fine_amount": float(fine_amount),
                        "issue": (
                            serialize_circulation_issue(
                                member_type,
                                issue,
                            )
                        ),
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            db.session.rollback()

            logger.exception("Unable to return book")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to return book"),
                    }
                ),
                500,
            )


def get_library_fine_models(member_type):
    return {
        "student": {
            "issue_model": BookIssue,
            "payment_model": LibraryFinePayment,
            "member_model": Student,
            "member_field": "student_id",
            "member_column": BookIssue.student_id,
            "payment_member_field": "student_id",
        },
        "teacher": {
            "issue_model": TeacherBookIssue,
            "payment_model": TeacherLibraryFinePayment,
            "member_model": Teacher,
            "member_field": "teacher_id",
            "member_column": TeacherBookIssue.teacher_id,
            "payment_member_field": "teacher_id",
        },
        "staff": {
            "issue_model": StaffBookIssue,
            "payment_model": StaffLibraryFinePayment,
            "member_model": NonTeachingStaff,
            "member_field": "staff_id",
            "member_column": StaffBookIssue.staff_id,
            "payment_member_field": "staff_id",
        },
    }.get(member_type)


def get_fine_payment_totals(
    member_type,
    issue_id,
):
    configuration = get_library_fine_models(member_type)

    if not configuration:
        return {
            "collected": Decimal("0"),
            "waived": Decimal("0"),
            "refunded": Decimal("0"),
        }

    payment_model = configuration["payment_model"]

    rows = (
        db.session.query(
            payment_model.status,
            func.coalesce(
                func.sum(payment_model.amount),
                0,
            ),
        )
        .filter(payment_model.book_issue_id == issue_id)
        .group_by(payment_model.status)
        .all()
    )

    totals = {
        "collected": Decimal("0"),
        "waived": Decimal("0"),
        "refunded": Decimal("0"),
    }

    for status, amount in rows:
        normalized_status = clean_text(status).lower()

        if normalized_status == "collected":
            totals["collected"] += Decimal(str(amount or 0))

        elif normalized_status == "waived":
            totals["waived"] += Decimal(str(amount or 0))

        elif normalized_status == "refunded":
            totals["refunded"] += Decimal(str(amount or 0))

    return totals


def calculate_issue_fine_amount(issue):
    effective_date = issue.return_date or date.today()

    overdue_days = max(
        (effective_date - issue.due_date).days,
        0,
    )

    fine_per_day = Decimal(str(issue.fine_per_day or DUE_RUPEES))

    fine_amount = fine_per_day * Decimal(overdue_days)

    return {
        "overdue_days": overdue_days,
        "fine_per_day": fine_per_day,
        "fine_amount": fine_amount,
    }


def get_fine_status(
    fine_amount,
    collected_amount,
    waived_amount,
):
    fine_amount = Decimal(str(fine_amount or 0))

    collected_amount = Decimal(str(collected_amount or 0))

    waived_amount = Decimal(str(waived_amount or 0))

    resolved_amount = collected_amount + waived_amount

    pending_amount = max(
        fine_amount - resolved_amount,
        Decimal("0"),
    )

    if fine_amount <= 0:
        return "No Fine", pending_amount

    if pending_amount <= 0:
        if waived_amount > 0 and collected_amount > 0:
            return (
                "Partially Paid & Waived",
                pending_amount,
            )

        if waived_amount > 0:
            return "Waived", pending_amount

        return "Paid", pending_amount

    if collected_amount > 0:
        return "Partially Paid", pending_amount

    if waived_amount > 0:
        return "Partially Waived", pending_amount

    return "Pending", pending_amount


def serialize_library_fine(
    member_type,
    issue,
):
    configuration = get_library_fine_models(member_type)

    if not configuration:
        return None

    member_field = configuration["member_field"]

    member_model = configuration["member_model"]

    member_id = getattr(
        issue,
        member_field,
        None,
    )

    member = (
        db.session.get(
            member_model,
            member_id,
        )
        if member_id
        else None
    )

    book = issue.book

    fine_details = calculate_issue_fine_amount(issue)

    payment_totals = get_fine_payment_totals(
        member_type,
        issue.id,
    )

    collected_amount = payment_totals["collected"] - payment_totals["refunded"]

    if collected_amount < 0:
        collected_amount = Decimal("0")

    fine_status, pending_amount = get_fine_status(
        fine_details["fine_amount"],
        collected_amount,
        payment_totals["waived"],
    )

    if member:
        member_name = get_member_name(member)

        member_code = get_member_code(
            member_type,
            member,
        )

        member_group = get_member_department(
            member_type,
            member,
        )

    else:
        member_name = "Deleted Member"
        member_code = ""
        member_group = ""

    return {
        "id": (f"{member_type}-{issue.id}"),
        "fine_code": (f"FINE-" f"{member_type[:3].upper()}-" f"{issue.id:06d}"),
        "member_type": member_type,
        "member_id": member_id,
        "member_name": member_name,
        "member_code": member_code,
        "member_group": member_group,
        "issue_id": issue.id,
        "issue_code": (f"LIB-" f"{member_type[:3].upper()}-" f"{issue.id:06d}"),
        "book_id": issue.book_id,
        "book_code": (
            getattr(
                book,
                "book_code",
                "",
            )
            if book
            else ""
        ),
        "book_title": (book.title if book else "Deleted Book"),
        "author": (
            book.author_details.name
            if (
                book
                and getattr(
                    book,
                    "author_details",
                    None,
                )
            )
            else (
                getattr(
                    book,
                    "author",
                    "",
                )
                if book
                else ""
            )
        ),
        "isbn": (
            getattr(
                book,
                "isbn",
                "",
            )
            if book
            else ""
        ),
        "issue_date": (issue.issue_date.isoformat() if issue.issue_date else None),
        "due_date": (issue.due_date.isoformat() if issue.due_date else None),
        "return_date": (issue.return_date.isoformat() if issue.return_date else None),
        "overdue_days": (fine_details["overdue_days"]),
        "fine_per_day": float(fine_details["fine_per_day"]),
        "fine_amount": float(fine_details["fine_amount"]),
        "collected_amount": float(collected_amount),
        "waived_amount": float(payment_totals["waived"]),
        "refunded_amount": float(payment_totals["refunded"]),
        "pending_amount": float(pending_amount),
        "status": fine_status,
        "book_returned": bool(issue.return_date),
        "created_at": (
            issue.created_at.isoformat()
            if getattr(
                issue,
                "created_at",
                None,
            )
            else None
        ),
    }

# LIBRARY TRANSACTION HELPERS
def get_library_transaction_configuration(member_type):
    return {
        "student": {
            "payment_model": LibraryFinePayment,
            "issue_model": BookIssue,
            "member_model": Student,
            "payment_member_field": "student_id",
            "issue_member_field": "student_id",
        },
        "teacher": {
            "payment_model": TeacherLibraryFinePayment,
            "issue_model": TeacherBookIssue,
            "member_model": Teacher,
            "payment_member_field": "teacher_id",
            "issue_member_field": "teacher_id",
        },
        "staff": {
            "payment_model": StaffLibraryFinePayment,
            "issue_model": StaffBookIssue,
            "member_model": NonTeachingStaff,
            "payment_member_field": "staff_id",
            "issue_member_field": "staff_id",
        },
    }.get(member_type)


def get_transaction_display_status(payment_status):
    normalized_status = clean_text(payment_status).lower()

    if normalized_status == "collected":
        return "Paid"

    if normalized_status == "waived":
        return "Waived"

    if normalized_status == "refunded":
        return "Refunded"

    return payment_status or "Unknown"


def serialize_library_transaction(
    member_type,
    payment,
):
    configuration = get_library_transaction_configuration(member_type)

    if not configuration:
        return None

    member_id = getattr(
        payment,
        configuration["payment_member_field"],
        None,
    )

    member = (
        db.session.get(
            configuration["member_model"],
            member_id,
        )
        if member_id
        else None
    )

    issue = None

    if payment.book_issue_id:
        issue = db.session.get(
            configuration["issue_model"],
            payment.book_issue_id,
        )

    book = issue.book if issue and getattr(issue, "book", None) else None

    member_name = get_member_name(member) if member else "Deleted Member"

    member_code = (
        get_member_code(
            member_type,
            member,
        )
        if member
        else ""
    )

    member_group = (
        get_member_department(
            member_type,
            member,
        )
        if member
        else ""
    )

    transaction_status = get_transaction_display_status(payment.status)

    transaction_prefix = {
        "student": "STU",
        "teacher": "TCH",
        "staff": "STF",
    }.get(
        member_type,
        "MEM",
    )

    return {
        "id": (f"{member_type}-{payment.id}"),
        "transaction_id": payment.id,
        "transaction_code": (f"TXN-{transaction_prefix}-" f"{payment.id:06d}"),
        "member_type": member_type,
        "member_id": member_id,
        "member_code": member_code,
        "member_name": member_name,
        "member_group": member_group,
        "issue_id": (payment.book_issue_id),
        "issue_code": (
            f"LIB-{transaction_prefix}-" f"{payment.book_issue_id:06d}"
            if payment.book_issue_id
            else ""
        ),
        "book_id": (issue.book_id if issue else None),
        "book_code": (
            getattr(
                book,
                "book_code",
                "",
            )
            if book
            else ""
        ),
        "book_title": (book.title if book else "General Fine Payment"),
        "author": (
            book.author_details.name
            if (
                book
                and getattr(
                    book,
                    "author_details",
                    None,
                )
            )
            else (
                getattr(
                    book,
                    "author",
                    "",
                )
                if book
                else ""
            )
        ),
        "isbn": (
            getattr(
                book,
                "isbn",
                "",
            )
            if book
            else ""
        ),
        "amount": float(payment.amount or 0),
        "payment_method": (payment.payment_method or ""),
        "reference_no": (payment.reference_no or ""),
        "remarks": (payment.remarks or ""),
        "status": transaction_status,
        "database_status": (payment.status),
        "collected_by": (payment.collected_by or ""),
        "transaction_date": (
            payment.collected_at.isoformat() if payment.collected_at else None
        ),
        "issue_date": (
            issue.issue_date.isoformat() if issue and issue.issue_date else None
        ),
        "due_date": (issue.due_date.isoformat() if issue and issue.due_date else None),
        "return_date": (
            issue.return_date.isoformat() if issue and issue.return_date else None
        ),
    }


class LibraryFinesAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        try:
            page = parse_positive_integer(
                request.args.get("page"),
                1,
            )

            per_page = min(
                parse_positive_integer(
                    request.args.get("per_page"),
                    10,
                ),
                100,
            )

            search = clean_text(request.args.get("search")).lower()

            member_type_filter = clean_text(request.args.get("member_type")).lower()

            status_filter = clean_text(request.args.get("status")).lower()

            date_from = clean_text(request.args.get("date_from"))

            date_to = clean_text(request.args.get("date_to"))

            export_format = clean_text(request.args.get("export")).lower()

            parsed_date_from = None
            parsed_date_to = None

            if date_from:
                (
                    parsed_date_from,
                    date_from_error,
                ) = parse_library_date(
                    date_from,
                    "From date",
                )

                if date_from_error:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": (date_from_error),
                            }
                        ),
                        422,
                    )

            if date_to:
                (
                    parsed_date_to,
                    date_to_error,
                ) = parse_library_date(
                    date_to,
                    "To date",
                )

                if date_to_error:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": (date_to_error),
                            }
                        ),
                        422,
                    )

            if (
                parsed_date_from
                and parsed_date_to
                and parsed_date_to < parsed_date_from
            ):
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": ("To date cannot be " "before From date"),
                        }
                    ),
                    422,
                )

            supported_types = [
                "student",
                "teacher",
                "staff",
            ]

            selected_types = (
                [member_type_filter]
                if member_type_filter in supported_types
                else supported_types
            )

            fine_rows = []

            for member_type in selected_types:
                configuration = get_library_fine_models(member_type)

                if not configuration:
                    continue

                issue_model = configuration["issue_model"]

                query = issue_model.query

                # Only include records that
                # actually generated a fine.
                query = query.filter(
                    issue_model.due_date
                    < func.coalesce(
                        issue_model.return_date,
                        date.today(),
                    )
                )

                if parsed_date_from:
                    query = query.filter(issue_model.due_date >= parsed_date_from)

                if parsed_date_to:
                    query = query.filter(issue_model.due_date <= parsed_date_to)

                issue_rows = query.all()

                for issue in issue_rows:
                    fine_row = serialize_library_fine(
                        member_type,
                        issue,
                    )

                    if fine_row and fine_row["fine_amount"] > 0:
                        fine_rows.append(fine_row)

            if search:
                fine_rows = [
                    row
                    for row in fine_rows
                    if search
                    in " ".join(
                        [
                            str(
                                row.get(
                                    "fine_code",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "issue_code",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "member_name",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "member_code",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "member_group",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "book_title",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "book_code",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "author",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "isbn",
                                    "",
                                )
                            ),
                        ]
                    ).lower()
                ]

            if status_filter:
                fine_rows = [
                    row
                    for row in fine_rows
                    if str(
                        row.get(
                            "status",
                            "",
                        )
                    ).lower()
                    == status_filter
                ]

            fine_rows.sort(
                key=lambda row: (
                    row.get("created_at") or "",
                    row.get("due_date") or "",
                    row.get("issue_id") or 0,
                ),
                reverse=True,
            )

            if export_format == "csv":
                output = io.StringIO()
                output.write("\ufeff")

                writer = csv.writer(output)

                writer.writerow(
                    [
                        "Fine ID",
                        "Issue ID",
                        "Member Type",
                        "Member ID",
                        "Member Name",
                        "Class / Department",
                        "Book Code",
                        "Book Title",
                        "Author",
                        "ISBN",
                        "Issue Date",
                        "Due Date",
                        "Return Date",
                        "Late Days",
                        "Fine Per Day",
                        "Fine Amount",
                        "Collected Amount",
                        "Waived Amount",
                        "Refunded Amount",
                        "Pending Amount",
                        "Fine Status",
                        "Book Returned",
                    ]
                )

                for row in fine_rows:
                    writer.writerow(
                        [
                            row.get(
                                "fine_code",
                                "",
                            ),
                            row.get(
                                "issue_code",
                                "",
                            ),
                            str(
                                row.get(
                                    "member_type",
                                    "",
                                )
                            ).title(),
                            row.get(
                                "member_code",
                                "",
                            ),
                            row.get(
                                "member_name",
                                "",
                            ),
                            row.get(
                                "member_group",
                                "",
                            ),
                            row.get(
                                "book_code",
                                "",
                            ),
                            row.get(
                                "book_title",
                                "",
                            ),
                            row.get(
                                "author",
                                "",
                            ),
                            row.get(
                                "isbn",
                                "",
                            ),
                            row.get(
                                "issue_date",
                                "",
                            ),
                            row.get(
                                "due_date",
                                "",
                            ),
                            row.get(
                                "return_date",
                                "",
                            ),
                            row.get(
                                "overdue_days",
                                0,
                            ),
                            row.get(
                                "fine_per_day",
                                0,
                            ),
                            row.get(
                                "fine_amount",
                                0,
                            ),
                            row.get(
                                "collected_amount",
                                0,
                            ),
                            row.get(
                                "waived_amount",
                                0,
                            ),
                            row.get(
                                "refunded_amount",
                                0,
                            ),
                            row.get(
                                "pending_amount",
                                0,
                            ),
                            row.get(
                                "status",
                                "",
                            ),
                            ("Yes" if row.get("book_returned") else "No"),
                        ]
                    )

                filename = "library-fine-report-" f"{date.today().isoformat()}" ".csv"

                return Response(
                    output.getvalue(),
                    status=200,
                    mimetype=("text/csv; charset=utf-8"),
                    headers={
                        "Content-Disposition": (
                            "attachment; " f'filename="{filename}"'
                        ),
                        "X-Exported-Records": (str(len(fine_rows))),
                    },
                )

            total = len(fine_rows)

            pages = max(
                (total + per_page - 1) // per_page,
                1,
            )

            if page > pages:
                page = pages

            start_index = (page - 1) * per_page

            paginated_rows = fine_rows[start_index : start_index + per_page]

            pending_rows = [
                row
                for row in fine_rows
                if row["status"]
                in {
                    "Pending",
                    "Partially Paid",
                    "Partially Waived",
                }
            ]

            return (
                jsonify(
                    {
                        "success": True,
                        "fines": paginated_rows,
                        "stats": {
                            "total_fines": total,
                            "pending_count": sum(
                                1 for row in fine_rows if row["status"] == "Pending"
                            ),
                            "partially_paid_count": sum(
                                1
                                for row in fine_rows
                                if row["status"]
                                in {
                                    "Partially Paid",
                                    "Partially Waived",
                                }
                            ),
                            "paid_count": sum(
                                1
                                for row in fine_rows
                                if row["status"]
                                in {
                                    "Paid",
                                    "Partially Paid & Waived",
                                }
                            ),
                            "waived_count": sum(
                                1 for row in fine_rows if row["status"] == "Waived"
                            ),
                            "pending_amount": sum(
                                float(row["pending_amount"] or 0)
                                for row in pending_rows
                            ),
                            "collected_amount": sum(
                                float(row["collected_amount"] or 0) for row in fine_rows
                            ),
                            "waived_amount": sum(
                                float(row["waived_amount"] or 0) for row in fine_rows
                            ),
                        },
                        "pagination": {
                            "page": page,
                            "per_page": (per_page),
                            "total": total,
                            "pages": pages,
                            "has_prev": (page > 1),
                            "has_next": (page < pages),
                        },
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            logger.exception("Database error while " "loading library fines")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to load " "library fines"),
                    }
                ),
                500,
            )

        except Exception:
            logger.exception("Unexpected error while " "loading library fines")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to load " "library fines"),
                    }
                ),
                500,
            )


class LibraryFineActionAPI(MethodView):

    @login_required
    def post(
        self,
        member_type,
        issue_id,
    ):
        current_admin, access_error = authorize_library_admin("write")

        if access_error:
            return access_error

        member_type = clean_text(member_type).lower()

        configuration = get_library_fine_models(member_type)

        if not configuration:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": (
                            "Fine management is not "
                            "configured for this "
                            "member type"
                        ),
                    }
                ),
                422,
            )

        issue_model = configuration["issue_model"]

        payment_model = configuration["payment_model"]

        payment_member_field = configuration["payment_member_field"]

        issue_member_field = configuration["member_field"]

        issue = (
            issue_model.query.filter(issue_model.id == issue_id)
            .with_for_update()
            .first()
        )

        if not issue:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Fine record not found"),
                    }
                ),
                404,
            )

        payload = request.get_json(silent=True) or {}

        action = clean_text(payload.get("action")).lower()

        if action not in {
            "collect",
            "waive",
        }:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Action must be collect " "or waive"),
                    }
                ),
                422,
            )

        fine_data = serialize_library_fine(
            member_type,
            issue,
        )

        pending_amount = Decimal(str(fine_data["pending_amount"] or 0))

        if pending_amount <= 0:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("This fine has already " "been fully resolved"),
                    }
                ),
                409,
            )

        requested_amount = payload.get("amount")

        if requested_amount in {
            None,
            "",
        }:
            amount = pending_amount

        else:
            try:
                amount = Decimal(str(requested_amount))

            except (
                InvalidOperation,
                TypeError,
                ValueError,
            ):
                return (
                    jsonify(
                        {
                            "success": False,
                            "errors": {
                                "amount": ("Enter a valid " "amount"),
                            },
                        }
                    ),
                    422,
                )

        if amount <= 0:
            return (
                jsonify(
                    {
                        "success": False,
                        "errors": {
                            "amount": ("Amount must be " "greater than zero"),
                        },
                    }
                ),
                422,
            )

        if amount > pending_amount:
            return (
                jsonify(
                    {
                        "success": False,
                        "errors": {
                            "amount": ("Amount cannot exceed " "the pending fine"),
                        },
                    }
                ),
                422,
            )

        payment_method = clean_text(
            payload.get("payment_method") or ("Waiver" if action == "waive" else "Cash")
        )

        reference_no = clean_text(payload.get("reference_no"))

        remarks = clean_text(payload.get("remarks"))

        if action == "waive" and not remarks:
            return (
                jsonify(
                    {
                        "success": False,
                        "errors": {
                            "remarks": ("Waiver reason is " "required"),
                        },
                    }
                ),
                422,
            )

        member_id = getattr(
            issue,
            issue_member_field,
        )

        payment_data = {
            payment_member_field: (member_id),
            "book_issue_id": issue.id,
            "amount": amount,
            "payment_method": (payment_method),
            "reference_no": (reference_no or None),
            "remarks": (remarks or None),
            "status": ("Collected" if action == "collect" else "Waived"),
            "collected_by": str(
                getattr(
                    current_admin,
                    "admin_id",
                    current_admin.id,
                )
            ),
        }

        payment = payment_model(**payment_data)

        try:
            db.session.add(payment)
            db.session.commit()

            updated_fine = serialize_library_fine(
                member_type,
                issue,
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "message": (
                            "Fine collected " "successfully"
                            if action == "collect"
                            else ("Fine waived " "successfully")
                        ),
                        "fine": updated_fine,
                    }
                ),
                201,
            )

        except SQLAlchemyError:
            db.session.rollback()

            logger.exception("Unable to save fine action")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to update fine"),
                    }
                ),
                500,
            )


class LibraryFineDetailsAPI(MethodView):

    @login_required
    def get(
        self,
        member_type,
        issue_id,
    ):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        member_type = clean_text(member_type).lower()

        configuration = get_library_fine_models(member_type)

        if not configuration:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Invalid member type"),
                    }
                ),
                400,
            )

        issue_model = configuration["issue_model"]

        payment_model = configuration["payment_model"]

        issue = db.session.get(
            issue_model,
            issue_id,
        )

        if not issue:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Fine record not found"),
                    }
                ),
                404,
            )

        fine = serialize_library_fine(
            member_type,
            issue,
        )

        payments = (
            payment_model.query.filter(payment_model.book_issue_id == issue_id)
            .order_by(payment_model.collected_at.desc())
            .all()
        )

        return (
            jsonify(
                {
                    "success": True,
                    "fine": fine,
                    "payments": [payment.to_dict() for payment in payments],
                }
            ),
            200,
        )



# LIBRARY TRANSACTIONS API



class LibraryTransactionsAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        try:
            page = parse_positive_integer(
                request.args.get("page"),
                1,
            )

            per_page = min(
                parse_positive_integer(
                    request.args.get("per_page"),
                    10,
                ),
                100,
            )

            search = clean_text(request.args.get("search")).lower()

            member_type_filter = clean_text(request.args.get("member_type")).lower()

            status_filter = clean_text(request.args.get("status")).lower()

            payment_method_filter = clean_text(
                request.args.get("payment_method")
            ).lower()

            date_from = clean_text(request.args.get("date_from"))

            date_to = clean_text(request.args.get("date_to"))

            export_format = clean_text(request.args.get("export")).lower()

            parsed_date_from = None
            parsed_date_to = None

            if date_from:
                (
                    parsed_date_from,
                    date_from_error,
                ) = parse_library_date(
                    date_from,
                    "From date",
                )

                if date_from_error:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": (date_from_error),
                                "errors": {
                                    "date_from": (date_from_error),
                                },
                            }
                        ),
                        422,
                    )

            if date_to:
                (
                    parsed_date_to,
                    date_to_error,
                ) = parse_library_date(
                    date_to,
                    "To date",
                )

                if date_to_error:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": (date_to_error),
                                "errors": {
                                    "date_to": (date_to_error),
                                },
                            }
                        ),
                        422,
                    )

            if (
                parsed_date_from
                and parsed_date_to
                and parsed_date_to < parsed_date_from
            ):
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": ("To date cannot be " "before From date"),
                        }
                    ),
                    422,
                )

            supported_member_types = [
                "student",
                "teacher",
                "staff",
            ]

            selected_member_types = (
                [member_type_filter]
                if member_type_filter in supported_member_types
                else supported_member_types
            )

            transaction_rows = []

            for member_type in selected_member_types:
                configuration = get_library_transaction_configuration(member_type)

                if not configuration:
                    continue

                payment_model = configuration["payment_model"]

                query = payment_model.query

                if parsed_date_from:
                    start_datetime = datetime.combine(
                        parsed_date_from,
                        datetime.min.time(),
                    )

                    query = query.filter(payment_model.collected_at >= start_datetime)

                if parsed_date_to:
                    end_datetime = datetime.combine(
                        parsed_date_to,
                        datetime.max.time(),
                    )

                    query = query.filter(payment_model.collected_at <= end_datetime)

                payments = query.all()

                for payment in payments:
                    transaction = serialize_library_transaction(
                        member_type,
                        payment,
                    )

                    if transaction:
                        transaction_rows.append(transaction)

            if search:
                transaction_rows = [
                    row
                    for row in transaction_rows
                    if search
                    in " ".join(
                        [
                            str(
                                row.get(
                                    "transaction_code",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "member_name",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "member_code",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "member_group",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "issue_code",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "book_title",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "book_code",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "isbn",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "reference_no",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "collected_by",
                                    "",
                                )
                            ),
                        ]
                    ).lower()
                ]

            if status_filter:
                transaction_rows = [
                    row
                    for row in transaction_rows
                    if str(
                        row.get(
                            "status",
                            "",
                        )
                    ).lower()
                    == status_filter
                ]

            if payment_method_filter:
                transaction_rows = [
                    row
                    for row in transaction_rows
                    if str(
                        row.get(
                            "payment_method",
                            "",
                        )
                    ).lower()
                    == payment_method_filter
                ]

            transaction_rows.sort(
                key=lambda row: (
                    row.get("transaction_date") or "",
                    row.get("transaction_id") or 0,
                ),
                reverse=True,
            )

            # ==
            # FILTERED CSV EXPORT
            # ==
            if export_format == "csv":
                output = io.StringIO()
                output.write("\ufeff")

                writer = csv.writer(output)

                writer.writerow(
                    [
                        "Transaction ID",
                        "Member Type",
                        "Member ID",
                        "Member Name",
                        "Class / Department",
                        "Issue ID",
                        "Book Code",
                        "Book Title",
                        "Author",
                        "ISBN",
                        "Amount",
                        "Payment Method",
                        "Reference Number",
                        "Transaction Status",
                        "Transaction Date",
                        "Collected By",
                        "Remarks",
                    ]
                )

                for row in transaction_rows:
                    writer.writerow(
                        [
                            row.get(
                                "transaction_code",
                                "",
                            ),
                            (
                                "Non-Teaching Staff"
                                if row.get("member_type") == "staff"
                                else str(
                                    row.get(
                                        "member_type",
                                        "",
                                    )
                                ).title()
                            ),
                            row.get(
                                "member_code",
                                "",
                            ),
                            row.get(
                                "member_name",
                                "",
                            ),
                            row.get(
                                "member_group",
                                "",
                            ),
                            row.get(
                                "issue_code",
                                "",
                            ),
                            row.get(
                                "book_code",
                                "",
                            ),
                            row.get(
                                "book_title",
                                "",
                            ),
                            row.get(
                                "author",
                                "",
                            ),
                            row.get(
                                "isbn",
                                "",
                            ),
                            row.get(
                                "amount",
                                0,
                            ),
                            row.get(
                                "payment_method",
                                "",
                            ),
                            row.get(
                                "reference_no",
                                "",
                            ),
                            row.get(
                                "status",
                                "",
                            ),
                            row.get(
                                "transaction_date",
                                "",
                            ),
                            row.get(
                                "collected_by",
                                "",
                            ),
                            row.get(
                                "remarks",
                                "",
                            ),
                        ]
                    )

                filename = "library-transactions-" f"{date.today().isoformat()}" ".csv"

                return Response(
                    output.getvalue(),
                    status=200,
                    mimetype=("text/csv; charset=utf-8"),
                    headers={
                        "Content-Disposition": (
                            "attachment; " f'filename="{filename}"'
                        ),
                        "X-Exported-Records": (str(len(transaction_rows))),
                    },
                )

            total = len(transaction_rows)

            pages = max(
                (total + per_page - 1) // per_page,
                1,
            )

            if page > pages:
                page = pages

            start_index = (page - 1) * per_page

            paginated_rows = transaction_rows[start_index : start_index + per_page]

            paid_rows = [row for row in transaction_rows if row["status"] == "Paid"]

            waived_rows = [row for row in transaction_rows if row["status"] == "Waived"]

            refunded_rows = [
                row for row in transaction_rows if row["status"] == "Refunded"
            ]

            total_collected = sum(
                float(
                    row.get(
                        "amount",
                        0,
                    )
                    or 0
                )
                for row in paid_rows
            )

            total_waived = sum(
                float(
                    row.get(
                        "amount",
                        0,
                    )
                    or 0
                )
                for row in waived_rows
            )

            total_refunded = sum(
                float(
                    row.get(
                        "amount",
                        0,
                    )
                    or 0
                )
                for row in refunded_rows
            )

            net_collection = max(
                total_collected - total_refunded,
                0,
            )

            # Pending fines are calculated from
            # current issue records, not payment rows.
            pending_fine_amount = Decimal("0")

            for member_type in selected_member_types:
                fine_configuration = get_library_fine_models(member_type)

                if not fine_configuration:
                    continue

                issue_model = fine_configuration["issue_model"]

                issue_rows = issue_model.query.filter(
                    issue_model.due_date
                    < func.coalesce(
                        issue_model.return_date,
                        date.today(),
                    )
                ).all()

                for issue in issue_rows:
                    fine = serialize_library_fine(
                        member_type,
                        issue,
                    )

                    if fine:
                        pending_fine_amount += Decimal(
                            str(
                                fine.get(
                                    "pending_amount",
                                    0,
                                )
                                or 0
                            )
                        )

            return (
                jsonify(
                    {
                        "success": True,
                        "transactions": (paginated_rows),
                        "stats": {
                            "total_transactions": (total),
                            "total_collected": (total_collected),
                            "net_collection": (net_collection),
                            "total_waived": (total_waived),
                            "total_refunded": (total_refunded),
                            "pending_fine": float(pending_fine_amount),
                            "paid_transactions": (len(paid_rows)),
                            "waived_transactions": (len(waived_rows)),
                            "refunded_transactions": (len(refunded_rows)),
                        },
                        "pagination": {
                            "page": page,
                            "per_page": (per_page),
                            "total": total,
                            "pages": pages,
                            "has_prev": (page > 1),
                            "has_next": (page < pages),
                        },
                        "applied_filters": {
                            "search": search,
                            "member_type": (member_type_filter),
                            "status": (status_filter),
                            "payment_method": (payment_method_filter),
                            "date_from": (date_from),
                            "date_to": date_to,
                        },
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            logger.exception("Database error while loading " "library transactions")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to load library " "transactions"),
                    }
                ),
                500,
            )

        except Exception:
            logger.exception("Unexpected error while loading " "library transactions")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to load library " "transactions"),
                    }
                ),
                500,
            )



# LIBRARY REPORTS & ANALYTICS API



class LibraryReportsAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        try:
            # =
            # FILTERS
            # =
            member_type_filter = clean_text(request.args.get("member_type")).lower()

            status_filter = clean_text(request.args.get("status")).lower()

            search = clean_text(request.args.get("search")).lower()

            date_from = clean_text(request.args.get("date_from"))

            date_to = clean_text(request.args.get("date_to"))

            export_format = clean_text(request.args.get("export")).lower()

            page = parse_positive_integer(
                request.args.get("page"),
                1,
            )

            per_page = min(
                parse_positive_integer(
                    request.args.get("per_page"),
                    15,
                ),
                100,
            )

            parsed_date_from = None
            parsed_date_to = None

            if date_from:
                (
                    parsed_date_from,
                    date_error,
                ) = parse_library_date(
                    date_from,
                    "From date",
                )

                if date_error:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": date_error,
                                "errors": {
                                    "date_from": (date_error),
                                },
                            }
                        ),
                        422,
                    )

            if date_to:
                (
                    parsed_date_to,
                    date_error,
                ) = parse_library_date(
                    date_to,
                    "To date",
                )

                if date_error:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": date_error,
                                "errors": {
                                    "date_to": (date_error),
                                },
                            }
                        ),
                        422,
                    )

            if (
                parsed_date_from
                and parsed_date_to
                and parsed_date_to < parsed_date_from
            ):
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": ("To date cannot be " "before From date"),
                        }
                    ),
                    422,
                )

            selected_types = (
                [member_type_filter]
                if member_type_filter in LIBRARY_MEMBER_TYPES
                else [
                    "student",
                    "teacher",
                    "staff",
                    "admin",
                ]
            )

            # =
            # LOAD CIRCULATION DATA
            # =
            report_rows = []

            for member_type in selected_types:

                issue_model = get_issue_model(member_type)

                if issue_model is None:
                    continue

                query = issue_model.query

                if parsed_date_from:
                    query = query.filter(issue_model.issue_date >= parsed_date_from)

                if parsed_date_to:
                    query = query.filter(issue_model.issue_date <= parsed_date_to)

                issues = query.all()

                for issue in issues:

                    row = serialize_circulation_issue(
                        member_type,
                        issue,
                    )

                    report_rows.append(row)

            # =
            # SEARCH
            # =
            if search:
                report_rows = [
                    row
                    for row in report_rows
                    if search
                    in " ".join(
                        [
                            str(
                                row.get(
                                    "issue_code",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "member_name",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "member_code",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "member_group",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "book_title",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "book_code",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "author",
                                    "",
                                )
                            ),
                            str(
                                row.get(
                                    "isbn",
                                    "",
                                )
                            ),
                        ]
                    ).lower()
                ]

            # =
            # STATUS FILTER
            # =
            if status_filter:
                report_rows = [
                    row
                    for row in report_rows
                    if str(
                        row.get(
                            "status",
                            "",
                        )
                    ).lower()
                    == status_filter
                ]

            # Latest records first.
            report_rows.sort(
                key=lambda row: (
                    row.get("created_at") or "",
                    row.get("issue_date") or "",
                    row.get("id") or 0,
                ),
                reverse=True,
            )

            # =
            # BOOK STATISTICS
            # =
            total_titles = Book.query.filter(Book.is_deleted.is_(False)).count()

            book_copy_stats = (
                db.session.query(
                    func.coalesce(
                        func.sum(Book.total_copies),
                        0,
                    ),
                    func.coalesce(
                        func.sum(Book.available_copies),
                        0,
                    ),
                )
                .filter(Book.is_deleted.is_(False))
                .first()
            )

            total_copies = int(book_copy_stats[0] or 0)

            available_copies = int(book_copy_stats[1] or 0)

            # =
            # CIRCULATION KPIs
            # =
            currently_issued = sum(
                1
                for row in report_rows
                if row.get("status")
                in {
                    "Issued",
                    "Due Soon",
                    "Overdue",
                }
            )

            returned_books = sum(
                1 for row in report_rows if row.get("status") == "Returned"
            )

            overdue_books = sum(
                1 for row in report_rows if row.get("status") == "Overdue"
            )

            due_soon_books = sum(
                1 for row in report_rows if row.get("status") == "Due Soon"
            )

            # =
            # MEMBER DISTRIBUTION
            # Based on circulation records after filters.
            # =
            member_distribution_map = {
                "student": 0,
                "teacher": 0,
                "staff": 0,
                "admin": 0,
            }

            unique_members = {
                "student": set(),
                "teacher": set(),
                "staff": set(),
                "admin": set(),
            }

            for row in report_rows:
                member_type = row.get("member_type")

                member_id = row.get("member_id")

                if member_type in unique_members and member_id is not None:
                    unique_members[member_type].add(member_id)

            for member_type in member_distribution_map:
                member_distribution_map[member_type] = len(unique_members[member_type])

            member_distribution = [
                {
                    "key": "student",
                    "label": "Students",
                    "value": (member_distribution_map["student"]),
                },
                {
                    "key": "teacher",
                    "label": "Teachers",
                    "value": (member_distribution_map["teacher"]),
                },
                {
                    "key": "staff",
                    "label": ("Non-Teaching Staff"),
                    "value": (member_distribution_map["staff"]),
                },
                {
                    "key": "admin",
                    "label": "Administrators",
                    "value": (member_distribution_map["admin"]),
                },
            ]

            total_active_members = sum(item["value"] for item in member_distribution)

            # =
            # ISSUE TREND
            # Group by calendar date.
            # =
            trend_map = {}

            for row in report_rows:
                issue_date = row.get("issue_date")

                if not issue_date:
                    continue

                if issue_date not in trend_map:
                    trend_map[issue_date] = {
                        "date": issue_date,
                        "issued": 0,
                        "returned": 0,
                        "overdue": 0,
                    }

                trend_map[issue_date]["issued"] += 1

                if row.get("status") == "Returned":
                    trend_map[issue_date]["returned"] += 1

                if row.get("status") == "Overdue":
                    trend_map[issue_date]["overdue"] += 1

            issue_trend = sorted(
                trend_map.values(),
                key=lambda item: (item["date"]),
            )

            # Limit chart to latest 30 dates.
            if len(issue_trend) > 30:
                issue_trend = issue_trend[-30:]

            # =
            # MOST ISSUED BOOKS
            # =
            book_usage = {}

            for row in report_rows:
                book_id = row.get("book_id")

                if not book_id:
                    continue

                if book_id not in book_usage:
                    book_usage[book_id] = {
                        "book_id": book_id,
                        "book_code": (
                            row.get(
                                "book_code",
                                "",
                            )
                        ),
                        "title": (
                            row.get(
                                "book_title",
                                "",
                            )
                        ),
                        "author": (
                            row.get(
                                "author",
                                "",
                            )
                        ),
                        "issues": 0,
                    }

                book_usage[book_id]["issues"] += 1

            top_books = sorted(
                book_usage.values(),
                key=lambda item: (item["issues"]),
                reverse=True,
            )[:5]

            # =
            # FINE ANALYTICS
            # Admin is intentionally excluded because the
            # current fine-payment system supports
            # student/teacher/staff.
            # =
            total_fine_generated = Decimal("0")

            total_fine_collected = Decimal("0")

            total_fine_waived = Decimal("0")

            total_fine_pending = Decimal("0")

            fine_member_types = [
                member_type
                for member_type in selected_types
                if member_type
                in {
                    "student",
                    "teacher",
                    "staff",
                }
            ]

            for member_type in fine_member_types:
                configuration = get_library_fine_models(member_type)

                if not configuration:
                    continue

                issue_model = configuration["issue_model"]

                query = issue_model.query

                if parsed_date_from:
                    query = query.filter(issue_model.issue_date >= parsed_date_from)

                if parsed_date_to:
                    query = query.filter(issue_model.issue_date <= parsed_date_to)

                issues = query.all()

                for issue in issues:

                    fine_data = serialize_library_fine(
                        member_type,
                        issue,
                    )

                    if not fine_data:
                        continue

                    total_fine_generated += Decimal(
                        str(
                            fine_data.get(
                                "fine_amount",
                                0,
                            )
                            or 0
                        )
                    )

                    total_fine_collected += Decimal(
                        str(
                            fine_data.get(
                                "collected_amount",
                                0,
                            )
                            or 0
                        )
                    )

                    total_fine_waived += Decimal(
                        str(
                            fine_data.get(
                                "waived_amount",
                                0,
                            )
                            or 0
                        )
                    )

                    total_fine_pending += Decimal(
                        str(
                            fine_data.get(
                                "pending_amount",
                                0,
                            )
                            or 0
                        )
                    )

            # =
            # CATEGORY ANALYTICS
            # =
            category_rows = (
                db.session.query(
                    BookCategory.name,
                    func.count(Book.id).label("book_count"),
                    func.coalesce(
                        func.sum(Book.total_copies),
                        0,
                    ).label("total_copies"),
                )
                .outerjoin(
                    Book,
                    and_(
                        Book.category_id == BookCategory.id,
                        Book.is_deleted.is_(False),
                    ),
                )
                .filter(BookCategory.is_deleted.is_(False))
                .group_by(
                    BookCategory.id,
                    BookCategory.name,
                )
                .order_by(func.count(Book.id).desc())
                .all()
            )

            category_distribution = [
                {
                    "name": (category_name or "Uncategorized"),
                    "book_count": int(book_count or 0),
                    "total_copies": int(copies or 0),
                }
                for (
                    category_name,
                    book_count,
                    copies,
                ) in category_rows
            ]

            # =
            # CSV EXPORT
            # Exports ALL matching report rows before paging.
            # =
            if export_format == "csv":

                output = io.StringIO()

                output.write("\ufeff")

                writer = csv.writer(output)

                writer.writerow(
                    [
                        "Report ID",
                        "Issue ID",
                        "Member Type",
                        "Member ID",
                        "Member Name",
                        "Class / Department",
                        "Book Code",
                        "Book Title",
                        "Author",
                        "ISBN",
                        "Issue Date",
                        "Due Date",
                        "Return Date",
                        "Late Days",
                        "Fine Amount",
                        "Status",
                    ]
                )

                for index, row in enumerate(
                    report_rows,
                    start=1,
                ):
                    writer.writerow(
                        [
                            (f"RPT-" f"{index:06d}"),
                            row.get(
                                "issue_code",
                                "",
                            ),
                            (
                                "Non-Teaching Staff"
                                if row.get("member_type") == "staff"
                                else str(
                                    row.get(
                                        "member_type",
                                        "",
                                    )
                                ).title()
                            ),
                            row.get(
                                "member_code",
                                "",
                            ),
                            row.get(
                                "member_name",
                                "",
                            ),
                            row.get(
                                "member_group",
                                "",
                            ),
                            row.get(
                                "book_code",
                                "",
                            ),
                            row.get(
                                "book_title",
                                "",
                            ),
                            row.get(
                                "author",
                                "",
                            ),
                            row.get(
                                "isbn",
                                "",
                            ),
                            row.get(
                                "issue_date",
                                "",
                            ),
                            row.get(
                                "due_date",
                                "",
                            ),
                            row.get(
                                "return_date",
                                "",
                            ),
                            row.get(
                                "overdue_days",
                                0,
                            ),
                            row.get(
                                "fine_amount",
                                0,
                            ),
                            row.get(
                                "status",
                                "",
                            ),
                        ]
                    )

                filename = "library-report-" f"{date.today().isoformat()}" ".csv"

                return Response(
                    output.getvalue(),
                    status=200,
                    mimetype=("text/csv; " "charset=utf-8"),
                    headers={
                        "Content-Disposition": (
                            "attachment; " f'filename="{filename}"'
                        ),
                        "X-Exported-Records": (str(len(report_rows))),
                    },
                )

            # =
            # PAGINATION
            # =
            total_records = len(report_rows)

            pages = max(
                (total_records + per_page - 1) // per_page,
                1,
            )

            if page > pages:
                page = pages

            start_index = (page - 1) * per_page

            paginated_rows = report_rows[start_index : start_index + per_page]

            report_table = []

            for index, row in enumerate(
                paginated_rows,
                start=start_index + 1,
            ):

                if row.get("status") == "Returned":
                    transaction_type = "Returned"

                elif row.get("status") == "Overdue":
                    transaction_type = "Overdue"

                else:
                    transaction_type = "Issued"

                report_table.append(
                    {
                        **row,
                        "report_id": (f"RPT-" f"{index:06d}"),
                        "transaction_type": (transaction_type),
                        "transaction_date": (
                            row.get("return_date")
                            if transaction_type == "Returned"
                            else row.get("issue_date")
                        ),
                    }
                )

            return (
                jsonify(
                    {
                        "success": True,
                        "stats": {
                            "total_titles": (total_titles),
                            "total_copies": (total_copies),
                            "available_copies": (available_copies),
                            "currently_issued": (currently_issued),
                            "returned_books": (returned_books),
                            "overdue_books": (overdue_books),
                            "due_soon_books": (due_soon_books),
                            "active_members": (total_active_members),
                            "fine_generated": (float(total_fine_generated)),
                            "fine_collected": (float(total_fine_collected)),
                            "fine_waived": (float(total_fine_waived)),
                            "fine_pending": (float(total_fine_pending)),
                        },
                        "issue_trend": (issue_trend),
                        "member_distribution": (member_distribution),
                        "category_distribution": (category_distribution),
                        "top_books": (top_books),
                        "records": (report_table),
                        "pagination": {
                            "page": page,
                            "per_page": (per_page),
                            "total": (total_records),
                            "pages": pages,
                            "has_prev": (page > 1),
                            "has_next": (page < pages),
                        },
                        "applied_filters": {
                            "search": search,
                            "member_type": (member_type_filter),
                            "status": (status_filter),
                            "date_from": (date_from),
                            "date_to": (date_to),
                        },
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            logger.exception("Database error while " "loading library reports")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to load " "library reports"),
                    }
                ),
                500,
            )

        except Exception:
            logger.exception("Unexpected error while " "loading library reports")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to load " "library reports"),
                    }
                ),
                500,
            )



# LIBRARY ADMIN DASHBOARD API



class LibraryDashboardAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_library_admin("read")

        if access_error:
            return access_error

        try:
            today = date.today()

            # =
            # BOOK INVENTORY
            # =
            book_stats = (
                db.session.query(
                    func.count(Book.id),
                    func.coalesce(
                        func.sum(Book.total_copies),
                        0,
                    ),
                    func.coalesce(
                        func.sum(Book.available_copies),
                        0,
                    ),
                )
                .filter(Book.is_deleted.is_(False))
                .first()
            )

            total_titles = int(book_stats[0] or 0)

            total_copies = int(book_stats[1] or 0)

            available_copies = int(book_stats[2] or 0)

            issued_copies = max(
                total_copies - available_copies,
                0,
            )

            # =
            # CIRCULATION
            # =
            circulation_rows = []

            member_types = [
                "student",
                "teacher",
                "staff",
                "admin",
            ]

            for member_type in member_types:
                issue_model = get_issue_model(member_type)

                if issue_model is None:
                    continue

                issues = issue_model.query.order_by(issue_model.id.desc()).all()

                for issue in issues:
                    circulation_rows.append(
                        serialize_circulation_issue(
                            member_type,
                            issue,
                        )
                    )

            currently_issued = [
                row
                for row in circulation_rows
                if row.get("status")
                in {
                    "Issued",
                    "Due Soon",
                    "Overdue",
                }
            ]

            overdue_rows = [
                row for row in circulation_rows if row.get("status") == "Overdue"
            ]

            due_soon_rows = [
                row for row in circulation_rows if row.get("status") == "Due Soon"
            ]

            returned_today = [
                row
                for row in circulation_rows
                if row.get("return_date") == today.isoformat()
            ]

            issued_today = [
                row
                for row in circulation_rows
                if row.get("issue_date") == today.isoformat()
            ]

            # =
            # MEMBER COUNTS
            # =
            total_students = Student.query.count()

            total_teachers = Teacher.query.count()

            total_staff = (
                NonTeachingStaff.query.filter(
                    NonTeachingStaff.is_deleted.is_(False)
                ).count()
                if hasattr(
                    NonTeachingStaff,
                    "is_deleted",
                )
                else NonTeachingStaff.query.count()
            )

            total_admins = (
                Admin.query.filter(Admin.is_deleted.is_(False)).count()
                if hasattr(
                    Admin,
                    "is_deleted",
                )
                else Admin.query.count()
            )

            total_members = total_students + total_teachers + total_staff + total_admins

            # =
            # FINE / REVENUE STATS
            # =
            total_collected = Decimal("0")
            total_waived = Decimal("0")
            total_pending = Decimal("0")

            for member_type in [
                "student",
                "teacher",
                "staff",
            ]:
                configuration = get_library_fine_models(member_type)

                if not configuration:
                    continue

                issue_model = configuration["issue_model"]

                issues = issue_model.query.all()

                for issue in issues:
                    fine = serialize_library_fine(
                        member_type,
                        issue,
                    )

                    if not fine:
                        continue

                    total_collected += Decimal(
                        str(
                            fine.get(
                                "collected_amount",
                                0,
                            )
                            or 0
                        )
                    )

                    total_waived += Decimal(
                        str(
                            fine.get(
                                "waived_amount",
                                0,
                            )
                            or 0
                        )
                    )

                    total_pending += Decimal(
                        str(
                            fine.get(
                                "pending_amount",
                                0,
                            )
                            or 0
                        )
                    )

            # =
            # ISSUE TREND - LAST 7 DAYS
            # =
            issue_trend = []

            for offset in range(
                6,
                -1,
                -1,
            ):
                current_date = today - timedelta(days=offset)

                date_string = current_date.isoformat()

                issue_count = sum(
                    1
                    for row in circulation_rows
                    if row.get("issue_date") == date_string
                )

                return_count = sum(
                    1
                    for row in circulation_rows
                    if row.get("return_date") == date_string
                )

                issue_trend.append(
                    {
                        "date": date_string,
                        "label": (current_date.strftime("%a")),
                        "issued": issue_count,
                        "returned": (return_count),
                    }
                )

            # =
            # COLLECTION TREND - LAST 7 DAYS
            # =
            revenue_map = {}

            for offset in range(
                6,
                -1,
                -1,
            ):
                current_date = today - timedelta(days=offset)

                revenue_map[current_date.isoformat()] = Decimal("0")

            for member_type in [
                "student",
                "teacher",
                "staff",
            ]:
                configuration = get_library_fine_models(member_type)

                if not configuration:
                    continue

                payment_model = configuration["payment_model"]

                payments = payment_model.query.filter(
                    payment_model.status == "Collected"
                ).all()

                for payment in payments:
                    if not payment.collected_at:
                        continue

                    transaction_date = payment.collected_at.date().isoformat()

                    if transaction_date in revenue_map:
                        revenue_map[transaction_date] += Decimal(
                            str(payment.amount or 0)
                        )

            revenue_trend = [
                {
                    "date": date_key,
                    "label": (
                        datetime.strptime(
                            date_key,
                            "%Y-%m-%d",
                        ).strftime("%a")
                    ),
                    "amount": float(amount),
                }
                for (
                    date_key,
                    amount,
                ) in revenue_map.items()
            ]

            # =
            # RECENT ACTIVITIES
            # =
            activities = []

            for row in circulation_rows:
                if row.get("issue_date"):
                    activities.append(
                        {
                            "id": (
                                f"issue-"
                                f"{row.get('member_type')}-"
                                f"{row.get('id')}"
                            ),
                            "type": "issue",
                            "title": (
                                f"{row.get('member_name')} "
                                f'issued "{row.get("book_title")}"'
                            ),
                            "member_name": (row.get("member_name")),
                            "book_title": (row.get("book_title")),
                            "date": (row.get("created_at") or row.get("issue_date")),
                        }
                    )

                if row.get("return_date"):
                    activities.append(
                        {
                            "id": (
                                f"return-"
                                f"{row.get('member_type')}-"
                                f"{row.get('id')}"
                            ),
                            "type": "return",
                            "title": (
                                f"{row.get('member_name')} "
                                f'returned "{row.get("book_title")}"'
                            ),
                            "member_name": (row.get("member_name")),
                            "book_title": (row.get("book_title")),
                            "date": (row.get("return_date")),
                        }
                    )

            # Recent fine-payment activity.
            for member_type in [
                "student",
                "teacher",
                "staff",
            ]:
                configuration = get_library_fine_models(member_type)

                if not configuration:
                    continue

                payment_model = configuration["payment_model"]

                member_model = configuration["member_model"]

                member_field = configuration["payment_member_field"]

                payments = (
                    payment_model.query.order_by(payment_model.collected_at.desc())
                    .limit(10)
                    .all()
                )

                for payment in payments:
                    member_id = getattr(
                        payment,
                        member_field,
                        None,
                    )

                    member = (
                        db.session.get(
                            member_model,
                            member_id,
                        )
                        if member_id
                        else None
                    )

                    member_name = get_member_name(member) if member else "Member"

                    display_status = (
                        "paid"
                        if payment.status == "Collected"
                        else payment.status.lower()
                    )

                    activities.append(
                        {
                            "id": (f"payment-" f"{member_type}-" f"{payment.id}"),
                            "type": (
                                "payment" if payment.status == "Collected" else "waiver"
                            ),
                            "title": (
                                f"Fine {display_status} "
                                f"by {member_name} "
                                f"(₹{float(payment.amount or 0):.2f})"
                            ),
                            "member_name": (member_name),
                            "amount": float(payment.amount or 0),
                            "date": (
                                payment.collected_at.isoformat()
                                if payment.collected_at
                                else None
                            ),
                        }
                    )

            activities.sort(
                key=lambda item: (item.get("date") or ""),
                reverse=True,
            )

            recent_activity = activities[:10]

            # =
            # RECENTLY ADDED BOOKS
            # =
            recent_books_query = Book.query.filter(Book.is_deleted.is_(False))

            if hasattr(
                Book,
                "created_at",
            ):
                recent_books_query = recent_books_query.order_by(Book.created_at.desc())
            else:
                recent_books_query = recent_books_query.order_by(Book.id.desc())

            recent_books = recent_books_query.limit(5).all()

            # =
            # OVERDUE ALERTS
            # =
            overdue_rows.sort(
                key=lambda row: (
                    row.get(
                        "overdue_days",
                        0,
                    )
                ),
                reverse=True,
            )

            overdue_alerts = [
                {
                    "id": row.get("id"),
                    "member_type": (row.get("member_type")),
                    "member_name": (row.get("member_name")),
                    "member_code": (row.get("member_code")),
                    "book_title": (row.get("book_title")),
                    "due_date": (row.get("due_date")),
                    "overdue_days": (
                        row.get(
                            "overdue_days",
                            0,
                        )
                    ),
                    "fine_amount": (
                        row.get(
                            "fine_amount",
                            0,
                        )
                    ),
                }
                for row in overdue_rows[:10]
            ]

            return (
                jsonify(
                    {
                        "success": True,
                        "stats": {
                            "total_titles": (total_titles),
                            "total_copies": (total_copies),
                            "available_copies": (available_copies),
                            "issued_copies": (issued_copies),
                            "currently_issued": (len(currently_issued)),
                            "overdue_books": (len(overdue_rows)),
                            "due_soon": (len(due_soon_rows)),
                            "issued_today": (len(issued_today)),
                            "returned_today": (len(returned_today)),
                            "total_members": (total_members),
                            "students": (total_students),
                            "teachers": (total_teachers),
                            "staff": (total_staff),
                            "admins": (total_admins),
                            "fine_collected": (float(total_collected)),
                            "fine_pending": (float(total_pending)),
                            "fine_waived": (float(total_waived)),
                        },
                        "issue_trend": (issue_trend),
                        "revenue_trend": (revenue_trend),
                        "recent_activity": (recent_activity),
                        "overdue_alerts": (overdue_alerts),
                        "recent_books": [
                            {
                                "id": book.id,
                                "book_code": (book.book_code),
                                "title": (book.title),
                                "author": (
                                    book.author_details.name
                                    if getattr(
                                        book,
                                        "author_details",
                                        None,
                                    )
                                    else (book.author or "")
                                ),
                                "available_copies": (book.available_copies),
                                "total_copies": (book.total_copies),
                                "created_at": (
                                    book.created_at.isoformat()
                                    if getattr(
                                        book,
                                        "created_at",
                                        None,
                                    )
                                    else None
                                ),
                            }
                            for book in recent_books
                        ],
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            logger.exception("Database error while loading " "library dashboard")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to load " "library dashboard"),
                    }
                ),
                500,
            )

        except Exception:
            logger.exception("Unexpected error while loading " "library dashboard")

            return (
                jsonify(
                    {
                        "success": False,
                        "error": ("Unable to load " "library dashboard"),
                    }
                ),
                500,
            )


# STUDENT LIBRARY SELF-SERVICE DASHBOARD


class StudentLibraryDashboardAPI(MethodView):

    @login_required
    def get(self):
        try:
            current_user = get_current_user()

            if not current_user:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Unauthorized",
                        }
                    ),
                    401,
                )

            # ==
            # RESOLVE LOGGED-IN STUDENT
            # ==
            student = Student.query.filter(
                Student.user_id
                == current_user.id
            ).first()

            if not student:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": (
                                "Student profile "
                                "not found"
                            ),
                        }
                    ),
                    404,
                )

            # ==
            # STUDENT ISSUE HISTORY
            # ==
            issues = (
                BookIssue.query.filter(
                    BookIssue.student_id
                    == student.id
                )
                .order_by(
                    BookIssue.id.desc()
                )
                .all()
            )

            history = []

            for issue in issues:
                row = (
                    serialize_circulation_issue(
                        "student",
                        issue,
                    )
                )

                fine = (
                    serialize_library_fine(
                        "student",
                        issue,
                    )
                )

                history.append(
                    {
                        **row,

                        "fine_amount": (
                            fine.get(
                                "fine_amount",
                                0,
                            )
                            if fine
                            else 0
                        ),

                        "pending_fine": (
                            fine.get(
                                "pending_amount",
                                0,
                            )
                            if fine
                            else 0
                        ),

                        "collected_amount": (
                            fine.get(
                                "collected_amount",
                                0,
                            )
                            if fine
                            else 0
                        ),

                        "waived_amount": (
                            fine.get(
                                "waived_amount",
                                0,
                            )
                            if fine
                            else 0
                        ),
                    }
                )

            current_books = [
                row
                for row in history
                if row.get("status")
                in {
                    "Issued",
                    "Due Soon",
                    "Overdue",
                }
            ]

            # ==
            # FINES
            # ==
            fines = []

            for issue in issues:
                fine = (
                    serialize_library_fine(
                        "student",
                        issue,
                    )
                )

                if (
                    fine
                    and float(
                        fine.get(
                            "fine_amount",
                            0,
                        )
                        or 0
                    )
                    > 0
                ):
                    fines.append(
                        fine
                    )

            # ==
            # PAYMENTS
            # ==
            payments = (
                LibraryFinePayment.query
                .filter(
                    LibraryFinePayment.student_id
                    == student.id
                )
                .order_by(
                    LibraryFinePayment
                    .collected_at
                    .desc()
                )
                .all()
            )

            payment_rows = []

            for payment in payments:
                transaction = (
                    serialize_library_transaction(
                        "student",
                        payment,
                    )
                )

                if transaction:
                    payment_rows.append(
                        transaction
                    )

            # ==
            # SUMMARY
            # ==
            currently_issued = len(
                current_books
            )

            overdue = sum(
                1
                for row
                in current_books
                if row.get("status")
                == "Overdue"
            )

            due_soon = sum(
                1
                for row
                in current_books
                if row.get("status")
                == "Due Soon"
            )

            returned = sum(
                1
                for row in history
                if row.get("status")
                == "Returned"
            )

            fine_generated = sum(
                float(
                    fine.get(
                        "fine_amount",
                        0,
                    )
                    or 0
                )
                for fine in fines
            )

            fine_paid = sum(
                float(
                    fine.get(
                        "collected_amount",
                        0,
                    )
                    or 0
                )
                for fine in fines
            )

            fine_waived = sum(
                float(
                    fine.get(
                        "waived_amount",
                        0,
                    )
                    or 0
                )
                for fine in fines
            )

            fine_pending = sum(
                float(
                    fine.get(
                        "pending_amount",
                        0,
                    )
                    or 0
                )
                for fine in fines
            )

            # ==
            # LIBRARY NOTIFICATIONS
            # ==
            notifications = []

            try:
                notifications = (
                    Notification.query.filter(
                        Notification.user_id
                        == current_user.id,
                        Notification.role
                        == "student",
                        Notification.type.in_(
                            [
                                "overdue",
                                "fine",
                                "return_reminder",
                                "general",
                                "announcement",
                            ]
                        ),
                    )
                    .order_by(
                        Notification
                        .created_at
                        .desc()
                    )
                    .limit(20)
                    .all()
                )

                notification_rows = [
                    (
                        item.to_dict()
                        if hasattr(
                            item,
                            "to_dict",
                        )
                        else {
                            "id": item.id,
                            "title": item.title,
                            "message": (
                                item.message
                            ),
                            "type": item.type,
                            "is_read": (
                                item.is_read
                            ),
                            "created_at": (
                                item.created_at
                                .isoformat()
                                if item.created_at
                                else None
                            ),
                        }
                    )
                    for item
                    in notifications
                ]

            except Exception:
                notification_rows = []

            # ==
            # BORROWING LIMIT
            # ==
            borrow_limit = 3

            remaining_limit = max(
                borrow_limit
                - currently_issued,
                0,
            )

            member_status = (
                "Blocked"
                if overdue > 0
                and fine_pending > 0
                else "Active"
            )

            return (
                jsonify(
                    {
                        "success": True,

                        "profile": {
                            "student_id": (
                                student.id
                            ),

                            "student_code": (
                                getattr(
                                    student,
                                    "student_id",
                                    "",
                                )
                            ),

                            "name": (
                                get_member_name(
                                    student
                                )
                            ),

                            "class_name": (
                                get_member_department(
                                    "student",
                                    student,
                                )
                            ),

                            "status": (
                                member_status
                            ),

                            "borrow_limit": (
                                borrow_limit
                            ),

                            "remaining_limit": (
                                remaining_limit
                            ),
                        },

                        "summary": {
                            "currently_issued": (
                                currently_issued
                            ),

                            "overdue": (
                                overdue
                            ),

                            "due_soon": (
                                due_soon
                            ),

                            "returned": (
                                returned
                            ),

                            "total_borrowed": (
                                len(history)
                            ),

                            "fine_generated": (
                                fine_generated
                            ),

                            "fine_paid": (
                                fine_paid
                            ),

                            "fine_waived": (
                                fine_waived
                            ),

                            "fine_pending": (
                                fine_pending
                            ),
                        },

                        "current_books": (
                            current_books
                        ),

                        "history": (
                            history
                        ),

                        "fines": (
                            fines
                        ),

                        "payments": (
                            payment_rows
                        ),

                        "notifications": (
                            notification_rows
                        ),

                        "pagination": {
                            "page": 1,
                            "per_page": (
                                len(history)
                                or 10
                            ),
                            "total": (
                                len(history)
                            ),
                            "pages": 1,
                            "has_prev": False,
                            "has_next": False,
                        },
                    }
                ),
                200,
            )

        except SQLAlchemyError:
            logger.exception(
                "Database error while "
                "loading student library"
            )

            return (
                jsonify(
                    {
                        "success": False,
                        "error": (
                            "Unable to load "
                            "student library"
                        ),
                    }
                ),
                500,
            )

        except Exception:
            logger.exception(
                "Unexpected error while "
                "loading student library"
            )

            return (
                jsonify(
                    {
                        "success": False,
                        "error": (
                            "Unable to load "
                            "student library"
                        ),
                    }
                ),
                500,
            )