import logging
import re
from datetime import date, datetime
from decimal import Decimal

from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from utils.auth import Admin, Student, db
from utils.auth_middleware import login_required
from utils.rolePermissionManagement import user_has_permission

logger = logging.getLogger(__name__)

DUE_RUPEES = 10.00

CATEGORY_STATUSES = {"Active", "Inactive"}
CATEGORY_MAX_NAME_LENGTH = 100
CATEGORY_MAX_DESCRIPTION_LENGTH = 1000

AUTHOR_STATUSES = {"Active", "Inactive"}
AUTHOR_MAX_NAME_LENGTH = 150
AUTHOR_MAX_COUNTRY_LENGTH = 100
AUTHOR_MAX_BIO_LENGTH = 2000


# =========================================================
# HELPERS
# =========================================================
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


# =========================================================
# MODELS
# =========================================================
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


# =========================================================
# CATEGORY VALIDATION
# =========================================================
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


# =========================================================
# CATEGORY LIST + CREATE API
# =========================================================
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


# =========================================================
# CATEGORY DETAILS + UPDATE + DELETE
# =========================================================
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


# =========================================================
# STATUS UPDATE
# =========================================================
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


# =========================================================
# SELECT OPTIONS FOR ADD BOOK FORM
# =========================================================
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


# =========================================================
# EXISTING STUDENT LIBRARY SERVICE
# =========================================================
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


# =========================================================
# AUTHOR VALIDATION
# =========================================================
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


# =========================================================
# AUTHOR LIST + CREATE
# =========================================================
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


# =========================================================
# AUTHOR DETAILS + UPDATE + DELETE
# =========================================================
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


# =========================================================
# AUTHOR STATUS
# =========================================================
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


# =========================================================
# AUTHOR OPTIONS FOR BOOK FORM
# =========================================================
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


# =========================================================
# BOOK VALIDATION
# =========================================================
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


def generate_book_code(book_id):
    return f"B{int(book_id):05d}"


# =========================================================
# BOOK LIST + CREATE API
# =========================================================
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

            # Supports both:
            # ?limit=10
            # ?per_page=10
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


# =========================================================
# ADD BOOK FORM OPTIONS
# =========================================================
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
        try:
            try:
                student_id = int(student_id)

                if student_id <= 0:
                    return (
                        jsonify(
                            {
                                "error": "Invalid student id",
                            }
                        ),
                        400,
                    )

            except (TypeError, ValueError):
                return (
                    jsonify(
                        {
                            "error": ("Student id must be integer"),
                        }
                    ),
                    400,
                )

            student = db.session.get(Student, student_id)

            if not student:
                return (
                    jsonify(
                        {
                            "error": "Student not found",
                        }
                    ),
                    404,
                )

            today = date.today()

            issues = (
                db.session.query(BookIssue)
                .join(Book)
                .filter(
                    BookIssue.student_id == student_id,
                    Book.is_deleted.is_(False),
                )
                .order_by(BookIssue.id.desc())
                .all()
            )

            data = []
            total_books = len(issues)
            overdue_count = 0
            total_fine = 0

            for issue in issues:
                status, fine, days_left = LibraryService.calculate_status_and_fine(
                    issue,
                    today,
                )

                LibraryService.sync_issue(
                    issue,
                    status,
                    fine,
                )

                if status == "Overdue":
                    overdue_count += 1

                total_fine += fine

                category_name = (
                    issue.book.category_details.name
                    if issue.book.category_details
                    else issue.book.category
                )

                data.append(
                    {
                        "id": issue.id,
                        "title": issue.book.title,
                        "author": issue.book.author,
                        "category": (category_name or "Uncategorized"),
                        "issue_date": str(issue.issue_date),
                        "due_date": str(issue.due_date),
                        "days_left": days_left,
                        "status": status,
                        "fine": float(fine),
                    }
                )

            db.session.commit()

            return (
                jsonify(
                    {
                        "summary": {
                            "total_books": total_books,
                            "overdue": overdue_count,
                            "fine_due": float(total_fine),
                        },
                        "books": data,
                    }
                ),
                200,
            )

        except Exception:
            db.session.rollback()
            logger.exception("Library API error")

            return (
                jsonify(
                    {
                        "error": "Something went wrong",
                    }
                ),
                500,
            )


# =========================================================
# BOOK DETAILS + UPDATE + DELETE
# =========================================================
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
                "published_year": payload.get(
                    "published_year", book.published_year
                ),
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

            admin_reference = str(
                getattr(current_admin, "admin_id", current_admin.id)
            )

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
            book.updated_by = str(
                getattr(current_admin, "admin_id", current_admin.id)
            )

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


# =========================================================
# BOOK STATUS UPDATE
# =========================================================
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
            book.updated_by = str(
                getattr(current_admin, "admin_id", current_admin.id)
            )

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