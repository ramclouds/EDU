from datetime import date, datetime, timedelta
import re
import uuid

from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy import func, or_
from sqlalchemy.exc import SQLAlchemyError

from utils.auth import db, Admin, Student, Teacher

try:
    from utils.auth import Staff  # alias for NonTeachingStaff, see utils/auth.py
except ImportError:
    Staff = None

from utils.auth_middleware import login_required
from utils.rolePermissionManagement import user_has_permission

from utils.Notifications import (
    Notification,
    ActivityLog,
    log_activity,
    recipient_school_id,
)
from utils.studentDetails import (
    StudentAcademicRecord,
    AcademicClass,
    Batch,
    Division,
    Section,
)

import logging

logger = logging.getLogger(__name__)


# ============================= HELPERS =============================
def _clean_str(value):
    return re.sub(r"\s+", " ", str(value or "").strip())


def _parse_amount(value, default=None):
    try:
        if value in (None, ""):
            return default
        amount = round(float(value), 2)
        return amount if amount >= 0 else default
    except (TypeError, ValueError):
        return default


def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except ValueError:
        return None


def _gen_reference(prefix):
    return f"{prefix}-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


def current_school_id():
    """Caller's school. None for a legacy/unmigrated install (matches None)."""
    return getattr(getattr(request, "user", None), "school_id", None)


def scoped_get(model, pk):
    if pk is None:
        return None
    try:
        pk = int(pk)
    except (TypeError, ValueError):
        return None
    return model.query.filter_by(id=pk, school_id=current_school_id()).first()


def authorize_accounts_admin(required_right="read"):
    """
    Same shape as hostel.py's authorize_hostel_admin(), checked against
    the "accounts" module instead of "hostel". Super Admins always pass.
    """
    current_user = getattr(request, "user", None)

    if not isinstance(current_user, Admin):
        return None, (
            jsonify({"success": False, "error": "Admin access required"}),
            403,
        )

    role = (getattr(current_user, "role", "") or "").strip().lower()
    admin_type = (getattr(current_user, "admin_type", "") or "").strip().lower()

    is_super_admin = role in {
        "super_admin",
        "super-admin",
        "super administrator",
    } or admin_type in {"super admin", "super administrator"}

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
        str(required_right or "read").strip().lower(), "view"
    )

    has_permission = user_has_permission(current_user, "accounts", required_action)

    if not has_permission:
        return None, (
            jsonify(
                {
                    "success": False,
                    "error": "Permission denied",
                    "required_permission": {
                        "module": "accounts",
                        "action": required_action,
                    },
                }
            ),
            403,
        )

    return current_user, None


def _student_class_details(student_id):
    record = (
        db.session.query(StudentAcademicRecord)
        .filter(
            StudentAcademicRecord.student_id == student_id,
            StudentAcademicRecord.is_current.is_(True),
        )
        .order_by(StudentAcademicRecord.id.desc())
        .first()
    )

    if not record:
        return {
            "class_name": "Not Assigned",
            "batch_name": None,
            "division_name": None,
            "section_name": None,
            "roll_number": None,
        }

    academic = db.session.get(AcademicClass, record.academic_class_id)

    batch = db.session.get(Batch, academic.batch_id) if academic else None
    division = db.session.get(Division, academic.division_id) if academic else None
    section = db.session.get(Section, academic.section_id) if academic else None

    division_name = division.division_name if division else ""
    section_name = section.section_name if section else ""
    class_name = _clean_str(
        f"{division_name}{'-' if division_name and section_name else ''}{section_name}"
    )

    return {
        "class_name": class_name or "Not Assigned",
        "batch_name": batch.batch_name if batch else None,
        "division_name": division_name or None,
        "section_name": section_name or None,
        "roll_number": record.roll_number,
    }


def _resolve_staff_person(record_type, record_id):
    """
    Look up a teacher / non-teaching staff / admin by (record_type, id)
    and return a small, consistent identity dict, or None if not found
    or record_type is invalid.
    """
    record_type = str(record_type or "").strip().lower()

    if record_type == "teacher":
        person = scoped_get(Teacher, record_id)
        if not person:
            return None
        return {
            "record_type": "teacher",
            "id": person.id,
            "staff_code": person.teacher_id,
            "name": _clean_str(
                f"{person.first_name or ''} {person.middle_name or ''} {person.last_name or ''}"
            ),
            "email": person.email,
            "mobile": person.mobile,
            "designation": person.designation or "Teacher",
            "department": "Academics",
            "status": person.status,
        }

    if record_type == "staff":
        if Staff is None:
            return None
        person = scoped_get(Staff, record_id)
        if not person or getattr(person, "is_deleted", False):
            return None
        return {
            "record_type": "staff",
            "id": person.id,
            "staff_code": person.staff_id,
            "name": _clean_str(
                f"{person.first_name or ''} {person.middle_name or ''} {person.last_name or ''}"
            ),
            "email": person.email,
            "mobile": person.mobile,
            "designation": person.designation or person.staff_type,
            "department": person.department,
            "status": person.status,
        }

    if record_type == "admin":
        person = scoped_get(Admin, record_id)
        if not person or getattr(person, "is_deleted", False):
            return None
        return {
            "record_type": "admin",
            "id": person.id,
            "staff_code": person.admin_id,
            "name": _clean_str(
                f"{person.first_name or ''} {person.middle_name or ''} {person.last_name or ''}"
            ),
            "email": person.email,
            "mobile": person.mobile,
            "designation": person.designation or person.admin_type,
            "department": person.department or person.admin_type,
            "status": person.status,
        }

    return None


def _all_staff_persons():
    """Every teacher + non-teaching staff + admin as the same identity
    shape _resolve_staff_person returns, for the Salary Management and
    payroll bulk-generation screens that need the whole roster at once
    rather than one lookup at a time."""
    people = []

    for teacher in Teacher.query.all():
        people.append(_resolve_staff_person("teacher", teacher.id))

    if Staff is not None:
        for staff in Staff.query.filter(Staff.is_deleted.is_(False)).all():
            people.append(_resolve_staff_person("staff", staff.id))

    for admin in Admin.query.filter(Admin.is_deleted.is_(False)).all():
        people.append(_resolve_staff_person("admin", admin.id))

    return [p for p in people if p]


def _students_in_batch(batch_id):
    """All students whose current academic record places them in the
    given batch. batch_id=None returns every active student."""
    if batch_id is None:
        return Student.query.filter(Student.status == "Active").all()

    rows = (
        db.session.query(Student)
        .join(StudentAcademicRecord, StudentAcademicRecord.student_id == Student.id)
        .join(AcademicClass, AcademicClass.id == StudentAcademicRecord.academic_class_id)
        .filter(
            StudentAcademicRecord.is_current.is_(True),
            AcademicClass.batch_id == batch_id,
            Student.status == "Active",
        )
        .all()
    )
    return rows


def _refresh_overdue_installments():
    """Flip any Pending/Partial installment whose due date has passed
    into Overdue. Called at the top of the read endpoints that surface
    fee status school-wide, since there's no scheduled job doing this."""
    today = date.today()
    stale = FeeInstallment.query.filter(FeeInstallment.school_id == current_school_id(), 
        FeeInstallment.status.in_(["Pending", "Partial"]),
        FeeInstallment.due_date < today,
    ).all()

    for installment in stale:
        installment.refresh_status()

    if stale:
        db.session.commit()


def _notify_user(user_id, role, title, message, notif_type, **extra):
    """
    Best-effort: create one row in the app's real notification inbox
    (utils/Notifications.py's Notification model) for a single
    recipient. Runs in its own try/except with its own commit, so a
    notification failure (bad data, DB hiccup) never rolls back or
    fails the fee payment / payslip / installment action that
    triggered it - the money still gets recorded either way.
    """
    try:
        notification = Notification(
            school_id=recipient_school_id(user_id, role),
            user_id=user_id,
            role=role,
            title=title,
            message=message,
            type=notif_type,
            channel="App",
            delivery_status="Sent",
            sent_at=datetime.utcnow(),
            created_by="system",
            **extra,
        )
        db.session.add(notification)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.warning(f"_notify_user failed (user_id={user_id}, role={role}): {e}")


def _notify_student(student, title, message, notif_type):
    if not student:
        return
    _notify_user(
        user_id=student.id,
        role="student",
        title=title,
        message=message,
        notif_type=notif_type,
        student_id=student.id,
        recipient_name=_clean_str(f"{student.first_name} {student.last_name}"),
        recipient_code=student.student_id,
        recipient_email=student.email,
        recipient_mobile=student.mobile,
    )


def _notify_staff(record_type, record_id, title, message, notif_type):
    person = _resolve_staff_person(record_type, record_id)
    if not person:
        return

    extra = {
        "recipient_name": person["name"],
        "recipient_code": person["staff_code"],
        "recipient_email": person["email"],
        "recipient_mobile": person["mobile"],
    }
    if record_type == "teacher":
        extra["teacher_id"] = record_id
    elif record_type == "staff":
        extra["staff_id"] = record_id
    # role="admin" recipients don't have a dedicated FK column on
    # Notification (only student_id/teacher_id/staff_id exist) -
    # user_id + role="admin" is still enough for NotificationsAPI.get
    # to find it, since that endpoint filters on exactly those two.

    _notify_user(
        user_id=record_id,
        role=record_type,
        title=title,
        message=message,
        notif_type=notif_type,
        **extra,
    )


# ============================= AUDIT / OVERSIGHT =============================
# Every meaningful write an Accounts Admin makes gets logged here via
# ActivityLog (utils/Notifications.py - the same audit trail the rest
# of the app already uses, not a new one). The Activity Logs section
# that reads this back is Super-Admin-only, both on the frontend
# (sidebar item hidden unless isSuperAdmin) and here on the backend
# (see _require_super_admin below) - an Accounts Admin can generate
# these log rows by using the dashboard, but can never read them back.

# Actions large/destructive enough to also interrupt a Super Admin
# with a real-time alert, not just a line in a log they'd have to go
# looking for.
LARGE_EXPENSE_ALERT_THRESHOLD = 50000  # ₹ - tune to whatever counts as "large" for this school


def _log_accounts_activity(current_user, action, description):
    """Record one audit trail row for something the Accounts Admin did.
    Best-effort (log_activity already has its own try/except+commit)."""
    if not current_user:
        return
    log_activity(
        user_id=getattr(current_user, "id", None),
        role="admin",
        action=action,
        description=description,
    )


def _super_admin_ids():
    rows = Admin.query.filter(
        or_(Admin.admin_type == "Super Admin", Admin.role == "super_admin"),
        Admin.is_deleted.is_(False),
    ).all()
    return [a.id for a in rows]


def _alert_super_admins(current_user, action, description):
    """For risky/destructive actions: log it AND push a real-time
    notification to every Super Admin, so oversight doesn't depend on
    someone remembering to check the Activity Logs screen."""
    _log_accounts_activity(current_user, action, description)

    actor_name = _clean_str(
        f"{getattr(current_user, 'first_name', '')} {getattr(current_user, 'last_name', '')}"
    ) or "An Accounts Admin"

    for admin_id in _super_admin_ids():
        _notify_user(
            user_id=admin_id,
            role="admin",
            title="⚠️ Accounts Activity Alert",
            message=f"{actor_name}: {description}",
            notif_type="accounts_alert",
        )


# ============================= MODELS =============================
class FeeStructure(db.Model):
    """A reusable fee template - e.g. "Class 10 Term 1 Tuition, due
    15 Jun, ₹5000" - that can be applied in bulk to generate a
    FeeInstallment for every student in a batch (or every student in
    the school if no batch is set) instead of creating installments
    one student at a time."""

    __tablename__ = "fee_structures"

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )

    name = db.Column(db.String(120), nullable=False)
    fee_category = db.Column(
        db.Enum(
            "Tuition", "Admission", "Transport", "Hostel", "Exam", "Library",
            "Lab", "Sports", "Miscellaneous",
        ),
        default="Tuition",
        nullable=False,
    )
    academic_year = db.Column(db.String(20))

    amount = db.Column(db.Numeric(10, 2), nullable=False)
    due_date = db.Column(db.Date, nullable=False)

    # Null = applies to every active student in the school.
    batch_id = db.Column(
        db.Integer, db.ForeignKey("batches.id", ondelete="SET NULL")
    )

    description = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    created_by = db.Column(db.Integer, db.ForeignKey("admins.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    installments = db.relationship(
        "FeeInstallment", backref="source_structure", lazy="dynamic"
    )


class FeeInstallment(db.Model):
    """One fee due for one student - a term fee, an admission fee, a bus
    fee, an exam fee, etc. Split out per-installment rather than one
    lump "total fee" per student so partial payments and due-date-based
    overdue tracking both work per line item."""

    __tablename__ = "fee_installments"

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )

    student_id = db.Column(
        db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )

    # Set when this installment was generated by "Apply" on a
    # FeeStructure template, so re-applying that template can skip
    # students who already have it instead of double-billing them.
    source_structure_id = db.Column(
        db.Integer, db.ForeignKey("fee_structures.id", ondelete="SET NULL")
    )

    title = db.Column(db.String(120), nullable=False)  # "Term 1 Tuition", "Bus Fee Q2"
    fee_category = db.Column(
        db.Enum(
            "Tuition", "Admission", "Transport", "Hostel", "Exam", "Library",
            "Lab", "Sports", "Miscellaneous",
        ),
        default="Tuition",
        nullable=False,
    )
    academic_year = db.Column(db.String(20))  # "2026-2027"

    amount = db.Column(db.Numeric(10, 2), nullable=False)
    late_fee = db.Column(db.Numeric(10, 2), default=0)
    discount = db.Column(db.Numeric(10, 2), default=0)
    paid_amount = db.Column(db.Numeric(10, 2), default=0, nullable=False)

    due_date = db.Column(db.Date, nullable=False)

    status = db.Column(
        db.Enum("Pending", "Partial", "Paid", "Overdue", "Waived"),
        default="Pending",
        nullable=False,
    )

    remarks = db.Column(db.String(255))

    created_by = db.Column(db.Integer, db.ForeignKey("admins.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    payments = db.relationship(
        "FeePayment", backref="installment", lazy="dynamic",
        cascade="all, delete-orphan",
    )

    def net_payable(self):
        amount = float(self.amount or 0)
        late = float(self.late_fee or 0)
        discount = float(self.discount or 0)
        return round(max(amount + late - discount, 0), 2)

    def balance(self):
        return round(max(self.net_payable() - float(self.paid_amount or 0), 0), 2)

    def refresh_status(self):
        """Recompute status from paid_amount vs due date. Called after
        every payment is recorded or an installment's amount/date
        changes."""
        if self.status == "Waived":
            return

        balance = self.balance()

        if balance <= 0:
            self.status = "Paid"
        elif float(self.paid_amount or 0) > 0:
            self.status = "Partial"
        elif self.due_date and self.due_date < date.today():
            self.status = "Overdue"
        else:
            self.status = "Pending"


class FeePayment(db.Model):
    """A single payment transaction. Usually linked to one installment,
    but installment_id can be null for an unallocated advance payment
    that accounts can apply to installments later."""

    __tablename__ = "fee_payments"

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )

    student_id = db.Column(
        db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    installment_id = db.Column(
        db.Integer, db.ForeignKey("fee_installments.id", ondelete="SET NULL")
    )

    # Unique per school, not globally: two schools must be able to issue
    # receipt 0001 each. (The old global unique would have made the second
    # school's first payment fail.)
    receipt_number = db.Column(db.String(40), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)

    payment_mode = db.Column(
        db.Enum("Cash", "Card", "UPI", "Bank Transfer", "Cheque", "Online"),
        default="Cash",
        nullable=False,
    )
    transaction_ref = db.Column(db.String(100))

    payment_date = db.Column(db.Date, default=date.today, nullable=False)

    status = db.Column(
        db.Enum("Success", "Refunded", "Cancelled"), default="Success", nullable=False
    )

    remarks = db.Column(db.String(255))

    received_by = db.Column(db.Integer, db.ForeignKey("admins.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class SalaryStructure(db.Model):
    """Versioned pay structure for a staff member. Editing salary
    creates a new row and flips is_current instead of mutating history,
    so past payslips stay accurate even if the structure changes later."""

    __tablename__ = "salary_structures"

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )

    record_type = db.Column(db.Enum("teacher", "staff", "admin"), nullable=False)
    record_id = db.Column(db.Integer, nullable=False)

    basic = db.Column(db.Numeric(10, 2), default=0, nullable=False)
    hra = db.Column(db.Numeric(10, 2), default=0)
    da = db.Column(db.Numeric(10, 2), default=0)
    conveyance_allowance = db.Column(db.Numeric(10, 2), default=0)
    medical_allowance = db.Column(db.Numeric(10, 2), default=0)
    other_allowance = db.Column(db.Numeric(10, 2), default=0)

    provident_fund = db.Column(db.Numeric(10, 2), default=0)
    professional_tax = db.Column(db.Numeric(10, 2), default=0)
    income_tax = db.Column(db.Numeric(10, 2), default=0)
    other_deduction = db.Column(db.Numeric(10, 2), default=0)

    effective_from = db.Column(db.Date, default=date.today, nullable=False)
    is_current = db.Column(db.Boolean, default=True, nullable=False)

    created_by = db.Column(db.Integer, db.ForeignKey("admins.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def gross(self):
        return round(
            float(self.basic or 0)
            + float(self.hra or 0)
            + float(self.da or 0)
            + float(self.conveyance_allowance or 0)
            + float(self.medical_allowance or 0)
            + float(self.other_allowance or 0),
            2,
        )

    def total_deductions(self):
        return round(
            float(self.provident_fund or 0)
            + float(self.professional_tax or 0)
            + float(self.income_tax or 0)
            + float(self.other_deduction or 0),
            2,
        )

    def net(self):
        return round(self.gross() - self.total_deductions(), 2)


class Payslip(db.Model):
    """One generated payslip for one staff member for one month. Snapshots
    the gross/deductions/net at generation time so it stays correct even
    if the underlying SalaryStructure is edited afterwards."""

    __tablename__ = "payslips"
    __table_args__ = (
        db.UniqueConstraint(
            "record_type", "record_id", "month", "year", name="uq_payslip_period"
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )

    record_type = db.Column(db.Enum("teacher", "staff", "admin"), nullable=False)
    record_id = db.Column(db.Integer, nullable=False)

    month = db.Column(db.Integer, nullable=False)  # 1-12
    year = db.Column(db.Integer, nullable=False)

    gross_salary = db.Column(db.Numeric(10, 2), nullable=False)
    total_deductions = db.Column(db.Numeric(10, 2), nullable=False)
    net_salary = db.Column(db.Numeric(10, 2), nullable=False)

    working_days = db.Column(db.Integer)
    lop_days = db.Column(db.Integer, default=0)  # loss-of-pay / unpaid leave days

    status = db.Column(
        db.Enum("Pending", "Processing", "Paid", "Failed"),
        default="Pending",
        nullable=False,
    )

    payment_date = db.Column(db.Date)
    payment_mode = db.Column(
        db.Enum("Cash", "Bank Transfer", "Cheque", "UPI", "Online")
    )
    transaction_ref = db.Column(db.String(100))

    remarks = db.Column(db.String(255))

    generated_by = db.Column(db.Integer, db.ForeignKey("admins.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class AccountsTransaction(db.Model):
    """General ledger line for money in/out that isn't student fees or
    staff payroll - donations, rent income, utility bills, maintenance,
    supplies, etc."""

    __tablename__ = "accounts_transactions"

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )

    entry_type = db.Column(db.Enum("Income", "Expense"), nullable=False)
    category = db.Column(db.String(80), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    transaction_date = db.Column(db.Date, default=date.today, nullable=False)

    payment_mode = db.Column(
        db.Enum("Cash", "Card", "UPI", "Bank Transfer", "Cheque", "Online"),
        default="Cash",
    )
    reference_no = db.Column(db.String(100))
    description = db.Column(db.String(255))

    # Which bank account this money moved through, if any - null means
    # cash or otherwise untracked. Lets Bank Accounts compute a real
    # running balance instead of just being a static address book.
    bank_account_id = db.Column(
        db.Integer, db.ForeignKey("bank_accounts.id", ondelete="SET NULL")
    )

    added_by = db.Column(db.Integer, db.ForeignKey("admins.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class BankAccount(db.Model):
    """A school bank account. Balance isn't stored directly - it's
    opening_balance plus every AccountsTransaction (income/expense,
    including fee payments and payroll where applicable) linked to this
    account, so it stays correct automatically as transactions are
    recorded rather than needing manual reconciliation."""

    __tablename__ = "bank_accounts"

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )

    account_name = db.Column(db.String(120), nullable=False)
    bank_name = db.Column(db.String(120), nullable=False)
    account_number = db.Column(db.String(40), nullable=False)
    ifsc_code = db.Column(db.String(20))
    account_type = db.Column(
        db.Enum("Savings", "Current"), default="Current", nullable=False
    )
    opening_balance = db.Column(db.Numeric(12, 2), default=0, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    notes = db.Column(db.String(255))

    created_by = db.Column(db.Integer, db.ForeignKey("admins.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    transactions = db.relationship(
        "AccountsTransaction", backref="bank_account", lazy="dynamic"
    )


class ExpenseCategory(db.Model):
    """A managed expense category (Utilities, Maintenance, Supplies,
    ...) with an optional monthly budget, so the Expense Categories
    section can show budget-vs-spent instead of admins typing free-text
    categories with no structure or oversight."""

    __tablename__ = "expense_categories"

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(
        db.Integer, db.ForeignKey("schools.id"), nullable=True, index=True
    )

    name = db.Column(db.String(80), nullable=False)
    description = db.Column(db.String(255))
    monthly_budget = db.Column(db.Numeric(10, 2))  # null = no budget cap set
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    created_by = db.Column(db.Integer, db.ForeignKey("admins.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ============================= SERIALIZERS =============================
def serialize_installment(installment):
    return {
        "id": installment.id,
        "student_id": installment.student_id,
        "source_structure_id": installment.source_structure_id,
        "title": installment.title,
        "fee_category": installment.fee_category,
        "academic_year": installment.academic_year,
        "amount": float(installment.amount or 0),
        "late_fee": float(installment.late_fee or 0),
        "discount": float(installment.discount or 0),
        "net_payable": installment.net_payable(),
        "paid_amount": float(installment.paid_amount or 0),
        "balance": installment.balance(),
        "due_date": installment.due_date.isoformat() if installment.due_date else None,
        "status": installment.status,
        "remarks": installment.remarks,
        "created_at": installment.created_at.isoformat() if installment.created_at else None,
    }


def serialize_payment(payment):
    return {
        "id": payment.id,
        "student_id": payment.student_id,
        "installment_id": payment.installment_id,
        "receipt_number": payment.receipt_number,
        "amount": float(payment.amount or 0),
        "payment_mode": payment.payment_mode,
        "transaction_ref": payment.transaction_ref,
        "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
        "status": payment.status,
        "remarks": payment.remarks,
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
    }


def serialize_salary_structure(structure):
    return {
        "id": structure.id,
        "record_type": structure.record_type,
        "record_id": structure.record_id,
        "basic": float(structure.basic or 0),
        "hra": float(structure.hra or 0),
        "da": float(structure.da or 0),
        "conveyance_allowance": float(structure.conveyance_allowance or 0),
        "medical_allowance": float(structure.medical_allowance or 0),
        "other_allowance": float(structure.other_allowance or 0),
        "provident_fund": float(structure.provident_fund or 0),
        "professional_tax": float(structure.professional_tax or 0),
        "income_tax": float(structure.income_tax or 0),
        "other_deduction": float(structure.other_deduction or 0),
        "gross": structure.gross(),
        "total_deductions": structure.total_deductions(),
        "net": structure.net(),
        "effective_from": (
            structure.effective_from.isoformat() if structure.effective_from else None
        ),
        "is_current": structure.is_current,
    }


def serialize_payslip(payslip):
    return {
        "id": payslip.id,
        "record_type": payslip.record_type,
        "record_id": payslip.record_id,
        "month": payslip.month,
        "year": payslip.year,
        "gross_salary": float(payslip.gross_salary or 0),
        "total_deductions": float(payslip.total_deductions or 0),
        "net_salary": float(payslip.net_salary or 0),
        "working_days": payslip.working_days,
        "lop_days": payslip.lop_days,
        "status": payslip.status,
        "payment_date": payslip.payment_date.isoformat() if payslip.payment_date else None,
        "payment_mode": payslip.payment_mode,
        "transaction_ref": payslip.transaction_ref,
        "remarks": payslip.remarks,
        "created_at": payslip.created_at.isoformat() if payslip.created_at else None,
    }


def serialize_fee_structure(structure, target_count=None):
    row = {
        "id": structure.id,
        "name": structure.name,
        "fee_category": structure.fee_category,
        "academic_year": structure.academic_year,
        "amount": float(structure.amount or 0),
        "due_date": structure.due_date.isoformat() if structure.due_date else None,
        "batch_id": structure.batch_id,
        "description": structure.description,
        "is_active": structure.is_active,
        "applied_count": structure.installments.count(),
        "created_at": structure.created_at.isoformat() if structure.created_at else None,
    }
    if target_count is not None:
        row["target_count"] = target_count
    return row


def serialize_transaction(txn):
    return {
        "id": txn.id,
        "entry_type": txn.entry_type,
        "category": txn.category,
        "amount": float(txn.amount or 0),
        "transaction_date": (
            txn.transaction_date.isoformat() if txn.transaction_date else None
        ),
        "payment_mode": txn.payment_mode,
        "reference_no": txn.reference_no,
        "description": txn.description,
        "bank_account_id": txn.bank_account_id,
        "bank_account_name": txn.bank_account.account_name if txn.bank_account else None,
        "created_at": txn.created_at.isoformat() if txn.created_at else None,
    }


def serialize_bank_account(account, current_balance=None, recent_transactions=None):
    number = account.account_number or ""
    masked = f"**** {number[-4:]}" if len(number) >= 4 else number

    row = {
        "id": account.id,
        "account_name": account.account_name,
        "bank_name": account.bank_name,
        "account_number": account.account_number,
        "masked_account_number": masked,
        "ifsc_code": account.ifsc_code,
        "account_type": account.account_type,
        "opening_balance": float(account.opening_balance or 0),
        "is_active": account.is_active,
        "notes": account.notes,
        "created_at": account.created_at.isoformat() if account.created_at else None,
    }
    if current_balance is not None:
        row["current_balance"] = round(current_balance, 2)
    if recent_transactions is not None:
        row["recent_transactions"] = recent_transactions
    return row


def serialize_expense_category(category, spent=None):
    budget = float(category.monthly_budget) if category.monthly_budget is not None else None
    row = {
        "id": category.id,
        "name": category.name,
        "description": category.description,
        "monthly_budget": budget,
        "is_active": category.is_active,
        "created_at": category.created_at.isoformat() if category.created_at else None,
    }
    if spent is not None:
        row["spent_this_month"] = round(spent, 2)
        if budget:
            row["budget_remaining"] = round(budget - spent, 2)
            row["utilization_pct"] = round(min((spent / budget) * 100, 999), 1)
        else:
            row["budget_remaining"] = None
            row["utilization_pct"] = None
    return row


# =====================================================================
# STUDENT FEES
# =====================================================================
class StudentFeeOverviewAPI(MethodView):
    """
    GET /api/accounts/students/<student_id>/fees

    Everything the "click on a student name" modal needs in one call:
    identity + contact + parent info + class placement + every
    installment + full payment history + a rolled-up summary.
    """

    @login_required
    def get(self, student_id):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        try:
            student = scoped_get(Student, student_id)
            if not student:
                return jsonify({"success": False, "error": "Student not found"}), 404

            installments = (
                FeeInstallment.query.filter_by(school_id=current_school_id(), student_id=student_id)
                .order_by(FeeInstallment.due_date.asc())
                .all()
            )

            payments = (
                FeePayment.query.filter_by(school_id=current_school_id(), student_id=student_id)
                .order_by(FeePayment.payment_date.desc(), FeePayment.id.desc())
                .all()
            )

            total_billed = sum(i.net_payable() for i in installments)
            total_paid = sum(float(p.amount or 0) for p in payments if p.status == "Success")
            total_pending = round(max(total_billed - total_paid, 0), 2)
            overdue_count = sum(1 for i in installments if i.status == "Overdue")

            return (
                jsonify(
                    {
                        "success": True,
                        "student": {
                            "id": student.id,
                            "student_id": student.student_id,
                            "name": _clean_str(
                                f"{student.first_name} {student.middle_name or ''} {student.last_name}"
                            ),
                            "email": student.email,
                            "mobile": student.mobile,
                            "status": student.status,
                            "father_name": student.father_name,
                            "father_mobile": student.father_mobile,
                            "mother_name": student.mother_name,
                            "mother_mobile": student.mother_mobile,
                            "parent_name": student.parent_name,
                            "parent_mobile": student.parent_mobile,
                            "address": student.address,
                            **_student_class_details(student.id),
                        },
                        "summary": {
                            "total_billed": round(total_billed, 2),
                            "total_paid": round(total_paid, 2),
                            "total_pending": total_pending,
                            "overdue_installments": overdue_count,
                            "installment_count": len(installments),
                        },
                        "installments": [serialize_installment(i) for i in installments],
                        "payments": [serialize_payment(p) for p in payments],
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error loading student fee overview")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


class FeeInstallmentListAPI(MethodView):
    """GET/POST /api/accounts/students/<student_id>/installments"""

    @login_required
    def get(self, student_id):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        installments = (
            FeeInstallment.query.filter_by(school_id=current_school_id(), student_id=student_id)
            .order_by(FeeInstallment.due_date.asc())
            .all()
        )
        return (
            jsonify(
                {
                    "success": True,
                    "installments": [serialize_installment(i) for i in installments],
                }
            ),
            200,
        )

    @login_required
    def post(self, student_id):
        current_user, access_error = authorize_accounts_admin("write")
        if access_error:
            return access_error

        try:
            student = scoped_get(Student, student_id)
            if not student:
                return jsonify({"success": False, "error": "Student not found"}), 404

            data = request.get_json(silent=True) or {}

            title = _clean_str(data.get("title"))
            amount = _parse_amount(data.get("amount"))
            due_date = _parse_date(data.get("due_date"))

            if not title:
                return jsonify({"success": False, "error": "Title is required"}), 400
            if amount is None or amount <= 0:
                return jsonify({"success": False, "error": "A valid amount is required"}), 400
            if not due_date:
                return jsonify({"success": False, "error": "A valid due_date (YYYY-MM-DD) is required"}), 400

            installment = FeeInstallment(
                school_id=current_school_id(),
                student_id=student_id,
                title=title,
                fee_category=_clean_str(data.get("fee_category")) or "Tuition",
                academic_year=_clean_str(data.get("academic_year")) or None,
                amount=amount,
                late_fee=_parse_amount(data.get("late_fee"), 0) or 0,
                discount=_parse_amount(data.get("discount"), 0) or 0,
                due_date=due_date,
                remarks=_clean_str(data.get("remarks")) or None,
                created_by=getattr(current_user, "id", None),
            )
            installment.refresh_status()

            db.session.add(installment)
            db.session.commit()

            _log_accounts_activity(
                current_user,
                action="fee_installment_created",
                description=(
                    f"Created fee installment '{title}' (₹{installment.net_payable()}) "
                    f"for student #{student.student_id}"
                ),
            )

            _notify_student(
                student,
                title="New Fee Due",
                message=(
                    f"A new fee has been added to your account: {title} - "
                    f"₹{installment.net_payable()} due by {due_date.strftime('%d %b %Y')}."
                ),
                notif_type="fee_due",
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Fee installment created",
                        "installment": serialize_installment(installment),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error creating installment")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


class FeeInstallmentDetailAPI(MethodView):
    """PUT/DELETE /api/accounts/installments/<installment_id>"""

    @login_required
    def put(self, installment_id):
        current_user, access_error = authorize_accounts_admin("edit")
        if access_error:
            return access_error

        try:
            installment = scoped_get(FeeInstallment, installment_id)
            if not installment:
                return jsonify({"success": False, "error": "Installment not found"}), 404

            data = request.get_json(silent=True) or {}

            if "title" in data:
                installment.title = _clean_str(data.get("title")) or installment.title
            if "fee_category" in data:
                installment.fee_category = _clean_str(data.get("fee_category")) or installment.fee_category
            if "amount" in data:
                amount = _parse_amount(data.get("amount"))
                if amount is not None:
                    installment.amount = amount
            if "late_fee" in data:
                installment.late_fee = _parse_amount(data.get("late_fee"), installment.late_fee)
            if "discount" in data:
                installment.discount = _parse_amount(data.get("discount"), installment.discount)
            if "due_date" in data:
                due_date = _parse_date(data.get("due_date"))
                if due_date:
                    installment.due_date = due_date
            if "remarks" in data:
                installment.remarks = _clean_str(data.get("remarks")) or None
            if "status" in data and data.get("status") == "Waived":
                installment.status = "Waived"

            installment.refresh_status()
            db.session.commit()

            _log_accounts_activity(
                current_user,
                action="fee_installment_updated",
                description=f"Updated fee installment #{installment.id} ({installment.title})",
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Installment updated",
                        "installment": serialize_installment(installment),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error updating installment")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500

    @login_required
    def delete(self, installment_id):
        current_user, access_error = authorize_accounts_admin("delete")
        if access_error:
            return access_error

        try:
            installment = scoped_get(FeeInstallment, installment_id)
            if not installment:
                return jsonify({"success": False, "error": "Installment not found"}), 404

            if installment.payments.count() > 0:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Cannot delete an installment that already has payments recorded against it. Waive it instead.",
                        }
                    ),
                    409,
                )

            description = (
                f"Deleted fee installment #{installment.id} '{installment.title}' "
                f"(₹{installment.net_payable()}) for student ID {installment.student_id}"
            )

            db.session.delete(installment)
            db.session.commit()

            _alert_super_admins(current_user, action="fee_installment_deleted", description=description)

            return jsonify({"success": True, "message": "Installment deleted"}), 200

        except SQLAlchemyError as e:
            logger.exception("DB error deleting installment")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


class FeePaymentListAPI(MethodView):
    """GET/POST /api/accounts/students/<student_id>/payments"""

    @login_required
    def get(self, student_id):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        payments = (
            FeePayment.query.filter_by(school_id=current_school_id(), student_id=student_id)
            .order_by(FeePayment.payment_date.desc(), FeePayment.id.desc())
            .all()
        )
        return jsonify({"success": True, "payments": [serialize_payment(p) for p in payments]}), 200

    @login_required
    def post(self, student_id):
        current_user, access_error = authorize_accounts_admin("write")
        if access_error:
            return access_error

        try:
            student = scoped_get(Student, student_id)
            if not student:
                return jsonify({"success": False, "error": "Student not found"}), 404

            data = request.get_json(silent=True) or {}

            amount = _parse_amount(data.get("amount"))
            if amount is None or amount <= 0:
                return jsonify({"success": False, "error": "A valid amount is required"}), 400

            installment = None
            installment_id = data.get("installment_id")
            if installment_id:
                installment = scoped_get(FeeInstallment, installment_id)
                if not installment or installment.student_id != int(student_id):
                    return jsonify({"success": False, "error": "Installment not found for this student"}), 404

                if amount > installment.balance() + 0.01:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": f"Amount exceeds the outstanding balance of {installment.balance()}",
                            }
                        ),
                        400,
                    )

            payment = FeePayment(
                school_id=current_school_id(),
                student_id=student_id,
                installment_id=installment.id if installment else None,
                receipt_number=_gen_reference("RCPT"),
                amount=amount,
                payment_mode=_clean_str(data.get("payment_mode")) or "Cash",
                transaction_ref=_clean_str(data.get("transaction_ref")) or None,
                payment_date=_parse_date(data.get("payment_date")) or date.today(),
                remarks=_clean_str(data.get("remarks")) or None,
                received_by=getattr(current_user, "id", None),
            )

            db.session.add(payment)

            if installment:
                installment.paid_amount = round(float(installment.paid_amount or 0) + amount, 2)
                installment.refresh_status()

            db.session.commit()

            _log_accounts_activity(
                current_user,
                action="fee_payment_recorded",
                description=(
                    f"Recorded payment of ₹{amount} ({payment.payment_mode}, "
                    f"receipt #{payment.receipt_number}) for student #{student.student_id}"
                ),
            )

            _notify_student(
                student,
                title="Payment Slip Generated",
                message=(
                    f"Payment of ₹{amount} received via {payment.payment_mode}. "
                    f"Receipt #{payment.receipt_number}."
                    + (f" Balance remaining: ₹{installment.balance()}." if installment else "")
                ),
                notif_type="payment_received",
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Payment recorded",
                        "payment": serialize_payment(payment),
                        "installment": serialize_installment(installment) if installment else None,
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error recording payment")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


class FeePaymentDetailAPI(MethodView):
    """GET/DELETE /api/accounts/payments/<payment_id>  (delete = void/refund)"""

    @login_required
    def get(self, payment_id):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        payment = scoped_get(FeePayment, payment_id)
        if not payment:
            return jsonify({"success": False, "error": "Payment not found"}), 404

        return jsonify({"success": True, "payment": serialize_payment(payment)}), 200

    @login_required
    def delete(self, payment_id):
        current_user, access_error = authorize_accounts_admin("delete")
        if access_error:
            return access_error

        try:
            payment = scoped_get(FeePayment, payment_id)
            if not payment:
                return jsonify({"success": False, "error": "Payment not found"}), 404

            payment.status = "Refunded"

            if payment.installment_id:
                installment = scoped_get(FeeInstallment, payment.installment_id)
                if installment:
                    installment.paid_amount = round(
                        max(float(installment.paid_amount or 0) - float(payment.amount or 0), 0), 2
                    )
                    installment.refresh_status()

            description = (
                f"Refunded/voided payment #{payment.id} (₹{payment.amount}, "
                f"receipt #{payment.receipt_number}) for student ID {payment.student_id}"
            )

            db.session.commit()

            _alert_super_admins(current_user, action="fee_payment_refunded", description=description)

            return jsonify({"success": True, "message": "Payment marked as refunded"}), 200

        except SQLAlchemyError as e:
            logger.exception("DB error voiding payment")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


class FeeDashboardSummaryAPI(MethodView):
    """
    GET /api/accounts/fees/summary

    School-wide fee stats for the dashboard/stat cards: total collected
    this month, total outstanding, overdue count, recent payments.
    """

    @login_required
    def get(self):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        try:
            _refresh_overdue_installments()

            today = date.today()

            total_outstanding = (
                db.session.query(
                    func.coalesce(func.sum(FeeInstallment.amount + FeeInstallment.late_fee
                                            - FeeInstallment.discount - FeeInstallment.paid_amount), 0)
                )
                .filter(FeeInstallment.status.in_(["Pending", "Partial", "Overdue"]))
                .scalar()
            )

            overdue_count = FeeInstallment.query.filter_by(school_id=current_school_id(), status="Overdue").count()

            month_collected = (
                db.session.query(func.coalesce(func.sum(FeePayment.amount), 0))
                .filter(
                    FeePayment.status == "Success",
                    func.extract("month", FeePayment.payment_date) == today.month,
                    func.extract("year", FeePayment.payment_date) == today.year,
                )
                .scalar()
            )

            recent_payments = (
                FeePayment.query.filter_by(school_id=current_school_id(), status="Success")
                .order_by(FeePayment.payment_date.desc(), FeePayment.id.desc())
                .limit(10)
                .all()
            )

            recent_with_names = []
            for payment in recent_payments:
                student = scoped_get(Student, payment.student_id)
                row = serialize_payment(payment)
                row["student_name"] = (
                    _clean_str(f"{student.first_name} {student.last_name}")
                    if student
                    else "Unknown"
                )
                row["student_code"] = student.student_id if student else None
                recent_with_names.append(row)

            return (
                jsonify(
                    {
                        "success": True,
                        "summary": {
                            "total_outstanding": round(float(total_outstanding or 0), 2),
                            "overdue_installments": overdue_count,
                            "collected_this_month": round(float(month_collected or 0), 2),
                        },
                        "recent_payments": recent_with_names,
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error building fee summary")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


# =====================================================================
# STAFF PAYROLL
# =====================================================================
class StaffSalaryOverviewAPI(MethodView):
    """
    GET /api/accounts/staff/<record_type>/<record_id>/salary

    Everything the "click on a staff name" modal needs: identity +
    current salary structure + payslip history.
    """

    @login_required
    def get(self, record_type, record_id):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        person = _resolve_staff_person(record_type, record_id)
        if not person:
            return jsonify({"success": False, "error": "Staff member not found"}), 404

        structure = (
            SalaryStructure.query.filter(SalaryStructure.school_id == current_school_id(), 
                record_type=record_type, record_id=record_id, is_current=True
            )
            .order_by(SalaryStructure.effective_from.desc())
            .first()
        )

        payslips = (
            Payslip.query.filter_by(school_id=current_school_id(), record_type=record_type, record_id=record_id)
            .order_by(Payslip.year.desc(), Payslip.month.desc())
            .all()
        )

        paid_this_year = sum(
            float(p.net_salary or 0)
            for p in payslips
            if p.status == "Paid" and p.year == date.today().year
        )

        return (
            jsonify(
                {
                    "success": True,
                    "staff": person,
                    "salary_structure": serialize_salary_structure(structure) if structure else None,
                    "payslips": [serialize_payslip(p) for p in payslips],
                    "summary": {
                        "paid_this_year": round(paid_this_year, 2),
                        "payslip_count": len(payslips),
                        "pending_payslips": sum(1 for p in payslips if p.status in ("Pending", "Processing")),
                    },
                }
            ),
            200,
        )


class SalaryStructureAPI(MethodView):
    """GET/PUT /api/accounts/staff/<record_type>/<record_id>/salary-structure"""

    @login_required
    def get(self, record_type, record_id):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        structure = (
            SalaryStructure.query.filter(SalaryStructure.school_id == current_school_id(), 
                record_type=record_type, record_id=record_id, is_current=True
            )
            .order_by(SalaryStructure.effective_from.desc())
            .first()
        )

        return (
            jsonify(
                {
                    "success": True,
                    "salary_structure": serialize_salary_structure(structure) if structure else None,
                }
            ),
            200,
        )

    @login_required
    def put(self, record_type, record_id):
        current_user, access_error = authorize_accounts_admin("edit")
        if access_error:
            return access_error

        person = _resolve_staff_person(record_type, record_id)
        if not person:
            return jsonify({"success": False, "error": "Staff member not found"}), 404

        try:
            data = request.get_json(silent=True) or {}

            basic = _parse_amount(data.get("basic"))
            if basic is None or basic <= 0:
                return jsonify({"success": False, "error": "A valid basic salary is required"}), 400

            # Supersede any previous current structure rather than
            # mutating it, so historic payslips stay tied to the
            # numbers that were actually in effect when they were paid.
            SalaryStructure.query.filter(SalaryStructure.school_id == current_school_id(), 
                record_type=record_type, record_id=record_id, is_current=True
            ).update({"is_current": False})

            structure = SalaryStructure(
                school_id=current_school_id(),
                record_type=record_type,
                record_id=record_id,
                basic=basic,
                hra=_parse_amount(data.get("hra"), 0) or 0,
                da=_parse_amount(data.get("da"), 0) or 0,
                conveyance_allowance=_parse_amount(data.get("conveyance_allowance"), 0) or 0,
                medical_allowance=_parse_amount(data.get("medical_allowance"), 0) or 0,
                other_allowance=_parse_amount(data.get("other_allowance"), 0) or 0,
                provident_fund=_parse_amount(data.get("provident_fund"), 0) or 0,
                professional_tax=_parse_amount(data.get("professional_tax"), 0) or 0,
                income_tax=_parse_amount(data.get("income_tax"), 0) or 0,
                other_deduction=_parse_amount(data.get("other_deduction"), 0) or 0,
                effective_from=_parse_date(data.get("effective_from")) or date.today(),
                created_by=getattr(current_user, "id", None),
            )

            db.session.add(structure)
            db.session.commit()

            _log_accounts_activity(
                current_user,
                action="salary_structure_saved",
                description=(
                    f"Set salary structure for {person['name']} ({record_type} #{record_id}): "
                    f"gross ₹{structure.gross()}, net ₹{structure.net()}"
                ),
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Salary structure saved",
                        "salary_structure": serialize_salary_structure(structure),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error saving salary structure")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


class PayslipListAPI(MethodView):
    """GET/POST /api/accounts/staff/<record_type>/<record_id>/payslips"""

    @login_required
    def get(self, record_type, record_id):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        payslips = (
            Payslip.query.filter_by(school_id=current_school_id(), record_type=record_type, record_id=record_id)
            .order_by(Payslip.year.desc(), Payslip.month.desc())
            .all()
        )
        return jsonify({"success": True, "payslips": [serialize_payslip(p) for p in payslips]}), 200

    @login_required
    def post(self, record_type, record_id):
        """Generate this month's (or a specified month's) payslip from
        the staff member's current salary structure."""
        current_user, access_error = authorize_accounts_admin("write")
        if access_error:
            return access_error

        person = _resolve_staff_person(record_type, record_id)
        if not person:
            return jsonify({"success": False, "error": "Staff member not found"}), 404

        try:
            data = request.get_json(silent=True) or {}

            month = int(data.get("month") or date.today().month)
            year = int(data.get("year") or date.today().year)

            if Payslip.query.filter(Payslip.school_id == current_school_id(), 
                record_type=record_type, record_id=record_id, month=month, year=year
            ).first():
                return (
                    jsonify({"success": False, "error": "A payslip for this month already exists"}),
                    409,
                )

            structure = (
                SalaryStructure.query.filter(SalaryStructure.school_id == current_school_id(), 
                    record_type=record_type, record_id=record_id, is_current=True
                )
                .order_by(SalaryStructure.effective_from.desc())
                .first()
            )

            if not structure:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "No salary structure is set up for this staff member yet",
                        }
                    ),
                    400,
                )

            lop_days = int(data.get("lop_days") or 0)
            working_days = int(data.get("working_days") or 30)

            gross = structure.gross()
            deductions = structure.total_deductions()

            # Simple LOP proration: dock gross by (lop_days / working_days).
            if lop_days > 0 and working_days > 0:
                per_day = gross / working_days
                gross = round(max(gross - per_day * lop_days, 0), 2)

            net = round(max(gross - deductions, 0), 2)

            payslip = Payslip(
                school_id=current_school_id(),
                record_type=record_type,
                record_id=record_id,
                month=month,
                year=year,
                gross_salary=gross,
                total_deductions=deductions,
                net_salary=net,
                working_days=working_days,
                lop_days=lop_days,
                remarks=_clean_str(data.get("remarks")) or None,
                generated_by=getattr(current_user, "id", None),
            )

            db.session.add(payslip)
            db.session.commit()

            _log_accounts_activity(
                current_user,
                action="payslip_generated",
                description=f"Generated payslip for {record_type} #{record_id} - {date(year, month, 1).strftime('%B %Y')}, net ₹{net}",
            )

            period_label = date(year, month, 1).strftime("%B %Y")
            _notify_staff(
                record_type,
                record_id,
                title="Payslip Generated",
                message=(
                    f"Your payslip for {period_label} is ready: net ₹{net}. "
                    f"Payment is pending."
                ),
                notif_type="payslip_generated",
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Payslip generated",
                        "payslip": serialize_payslip(payslip),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error generating payslip")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


class PayslipDetailAPI(MethodView):
    """GET/PUT /api/accounts/payslips/<payslip_id> (PUT = mark paid / update)"""

    @login_required
    def get(self, payslip_id):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        payslip = scoped_get(Payslip, payslip_id)
        if not payslip:
            return jsonify({"success": False, "error": "Payslip not found"}), 404

        return jsonify({"success": True, "payslip": serialize_payslip(payslip)}), 200

    @login_required
    def put(self, payslip_id):
        current_user, access_error = authorize_accounts_admin("edit")
        if access_error:
            return access_error

        try:
            payslip = scoped_get(Payslip, payslip_id)
            if not payslip:
                return jsonify({"success": False, "error": "Payslip not found"}), 404

            data = request.get_json(silent=True) or {}
            new_status = _clean_str(data.get("status"))
            was_already_paid = payslip.status == "Paid"

            if new_status:
                if new_status not in {"Pending", "Processing", "Paid", "Failed"}:
                    return jsonify({"success": False, "error": "Invalid status"}), 400
                payslip.status = new_status

                if new_status == "Paid":
                    payslip.payment_date = _parse_date(data.get("payment_date")) or date.today()
                    payslip.payment_mode = _clean_str(data.get("payment_mode")) or payslip.payment_mode or "Bank Transfer"
                    payslip.transaction_ref = _clean_str(data.get("transaction_ref")) or payslip.transaction_ref

            if "remarks" in data:
                payslip.remarks = _clean_str(data.get("remarks")) or None

            db.session.commit()

            if new_status:
                _log_accounts_activity(
                    current_user,
                    action="payslip_updated",
                    description=(
                        f"Set payslip #{payslip.id} ({payslip.record_type} #{payslip.record_id}, "
                        f"{date(payslip.year, payslip.month, 1).strftime('%B %Y')}) to {new_status}"
                    ),
                )

            # Only fire on the Pending/Processing -> Paid transition, not
            # on every idempotent re-save of an already-Paid payslip.
            if new_status == "Paid" and not was_already_paid:
                period_label = date(payslip.year, payslip.month, 1).strftime("%B %Y")
                _notify_staff(
                    payslip.record_type,
                    payslip.record_id,
                    title="Salary Credited",
                    message=(
                        f"Your salary for {period_label} has been credited: "
                        f"₹{payslip.net_salary} via {payslip.payment_mode}."
                    ),
                    notif_type="salary_credited",
                )

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Payslip updated",
                        "payslip": serialize_payslip(payslip),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error updating payslip")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


class PayrollSummaryAPI(MethodView):
    """GET /api/accounts/payroll/summary - dashboard-style payroll stats."""

    @login_required
    def get(self):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        try:
            today = date.today()

            month_payslips = Payslip.query.filter_by(school_id=current_school_id(), month=today.month, year=today.year).all()

            paid = [p for p in month_payslips if p.status == "Paid"]
            pending = [p for p in month_payslips if p.status in ("Pending", "Processing")]

            return (
                jsonify(
                    {
                        "success": True,
                        "summary": {
                            "month": today.month,
                            "year": today.year,
                            "total_payslips": len(month_payslips),
                            "paid_count": len(paid),
                            "pending_count": len(pending),
                            "paid_amount": round(sum(float(p.net_salary or 0) for p in paid), 2),
                            "pending_amount": round(sum(float(p.net_salary or 0) for p in pending), 2),
                        },
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error building payroll summary")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


# =====================================================================
# GENERAL LEDGER (other income / expense)
# =====================================================================
class AccountsTransactionListAPI(MethodView):
    """GET/POST /api/accounts/transactions"""

    @login_required
    def get(self):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        entry_type = _clean_str(request.args.get("entry_type"))
        month = request.args.get("month")
        year = request.args.get("year")
        bank_account_id = request.args.get("bank_account_id")

        query = AccountsTransaction.query.filter(AccountsTransaction.school_id == current_school_id())

        if entry_type in ("Income", "Expense"):
            query = query.filter(AccountsTransaction.entry_type == entry_type)
        if month:
            query = query.filter(func.extract("month", AccountsTransaction.transaction_date) == int(month))
        if year:
            query = query.filter(func.extract("year", AccountsTransaction.transaction_date) == int(year))
        if bank_account_id:
            query = query.filter(AccountsTransaction.bank_account_id == int(bank_account_id))

        transactions = query.order_by(AccountsTransaction.transaction_date.desc(), AccountsTransaction.id.desc()).all()

        total_income = sum(float(t.amount or 0) for t in transactions if t.entry_type == "Income")
        total_expense = sum(float(t.amount or 0) for t in transactions if t.entry_type == "Expense")

        return (
            jsonify(
                {
                    "success": True,
                    "transactions": [serialize_transaction(t) for t in transactions],
                    "summary": {
                        "total_income": round(total_income, 2),
                        "total_expense": round(total_expense, 2),
                        "net": round(total_income - total_expense, 2),
                    },
                }
            ),
            200,
        )

    @login_required
    def post(self):
        current_user, access_error = authorize_accounts_admin("write")
        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            entry_type = _clean_str(data.get("entry_type"))
            category = _clean_str(data.get("category"))
            amount = _parse_amount(data.get("amount"))

            if entry_type not in ("Income", "Expense"):
                return jsonify({"success": False, "error": "entry_type must be Income or Expense"}), 400
            if not category:
                return jsonify({"success": False, "error": "Category is required"}), 400
            if amount is None or amount <= 0:
                return jsonify({"success": False, "error": "A valid amount is required"}), 400

            bank_account_id = data.get("bank_account_id")
            if bank_account_id and not scoped_get(BankAccount, int(bank_account_id)):
                return jsonify({"success": False, "error": "Bank account not found"}), 404

            transaction = AccountsTransaction(
                school_id=current_school_id(),
                entry_type=entry_type,
                category=category,
                amount=amount,
                transaction_date=_parse_date(data.get("transaction_date")) or date.today(),
                payment_mode=_clean_str(data.get("payment_mode")) or "Cash",
                reference_no=_clean_str(data.get("reference_no")) or None,
                description=_clean_str(data.get("description")) or None,
                bank_account_id=int(bank_account_id) if bank_account_id else None,
                added_by=getattr(current_user, "id", None),
            )

            db.session.add(transaction)
            db.session.commit()

            description = f"Recorded {entry_type} of ₹{amount} in category '{category}'"

            if entry_type == "Expense" and float(amount) >= LARGE_EXPENSE_ALERT_THRESHOLD:
                _alert_super_admins(current_user, action="large_expense_recorded", description=description)
            else:
                _log_accounts_activity(current_user, action="transaction_recorded", description=description)

            return (
                jsonify(
                    {
                        "success": True,
                        "message": f"{entry_type} recorded",
                        "transaction": serialize_transaction(transaction),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error recording transaction")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


class AccountsTransactionDetailAPI(MethodView):
    """GET/PUT/DELETE /api/accounts/transactions/<transaction_id>"""

    @login_required
    def get(self, transaction_id):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        transaction = scoped_get(AccountsTransaction, transaction_id)
        if not transaction:
            return jsonify({"success": False, "error": "Transaction not found"}), 404

        return jsonify({"success": True, "transaction": serialize_transaction(transaction)}), 200

    @login_required
    def put(self, transaction_id):
        current_user, access_error = authorize_accounts_admin("edit")
        if access_error:
            return access_error

        try:
            transaction = scoped_get(AccountsTransaction, transaction_id)
            if not transaction:
                return jsonify({"success": False, "error": "Transaction not found"}), 404

            data = request.get_json(silent=True) or {}

            if "category" in data:
                transaction.category = _clean_str(data.get("category")) or transaction.category
            if "amount" in data:
                amount = _parse_amount(data.get("amount"))
                if amount is not None:
                    transaction.amount = amount
            if "transaction_date" in data:
                txn_date = _parse_date(data.get("transaction_date"))
                if txn_date:
                    transaction.transaction_date = txn_date
            if "payment_mode" in data:
                transaction.payment_mode = _clean_str(data.get("payment_mode")) or transaction.payment_mode
            if "reference_no" in data:
                transaction.reference_no = _clean_str(data.get("reference_no")) or None
            if "description" in data:
                transaction.description = _clean_str(data.get("description")) or None
            if "bank_account_id" in data:
                bank_account_id = data.get("bank_account_id")
                if bank_account_id and not scoped_get(BankAccount, int(bank_account_id)):
                    return jsonify({"success": False, "error": "Bank account not found"}), 404
                transaction.bank_account_id = int(bank_account_id) if bank_account_id else None

            db.session.commit()

            _log_accounts_activity(
                current_user,
                action="transaction_updated",
                description=f"Updated {transaction.entry_type.lower()} #{transaction.id} ({transaction.category}, ₹{transaction.amount})",
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Transaction updated",
                        "transaction": serialize_transaction(transaction),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error updating transaction")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500

    @login_required
    def delete(self, transaction_id):
        current_user, access_error = authorize_accounts_admin("delete")
        if access_error:
            return access_error

        try:
            transaction = scoped_get(AccountsTransaction, transaction_id)
            if not transaction:
                return jsonify({"success": False, "error": "Transaction not found"}), 404

            description = (
                f"Deleted {transaction.entry_type.lower()} #{transaction.id} "
                f"({transaction.category}, ₹{transaction.amount})"
            )

            db.session.delete(transaction)
            db.session.commit()

            _alert_super_admins(current_user, action="transaction_deleted", description=description)

            return jsonify({"success": True, "message": "Transaction deleted"}), 200

        except SQLAlchemyError as e:
            logger.exception("DB error deleting transaction")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


# =====================================================================
# BATCH OPTIONS (for the Fee Structure "apply to a batch" dropdown)
# =====================================================================
class AccountsBatchOptionsAPI(MethodView):
    """
    GET /api/accounts/batches

    A lightweight batch list for the Fee Structure form's "target
    batch" dropdown. Deliberately separate from AdminBatchesAPI in
    academic.py, which is gated on the "academic" module the Accounts
    Admin role doesn't have - this one is gated on "accounts" instead
    so Accounts doesn't need Academic permissions just to bill a batch.
    """

    @login_required
    def get(self):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        batches = Batch.query.order_by(
            Batch.is_current.desc(), Batch.batch_name.desc()
        ).all()

        return (
            jsonify(
                {
                    "success": True,
                    "batches": [
                        {
                            "id": b.id,
                            "batch_name": b.batch_name,
                            "is_current": b.is_current,
                        }
                        for b in batches
                    ],
                }
            ),
            200,
        )


# =====================================================================
# FEE STRUCTURE TEMPLATES (bulk billing)
# =====================================================================
class FeeStructureListAPI(MethodView):
    """GET/POST /api/accounts/fee-structures"""

    @login_required
    def get(self):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        academic_year = _clean_str(request.args.get("academic_year"))
        batch_id = request.args.get("batch_id")
        active_only = str(request.args.get("active_only") or "").lower() == "true"

        query = FeeStructure.query.filter(FeeStructure.school_id == current_school_id())

        if academic_year:
            query = query.filter(FeeStructure.academic_year == academic_year)
        if batch_id:
            query = query.filter(FeeStructure.batch_id == int(batch_id))
        if active_only:
            query = query.filter(FeeStructure.is_active.is_(True))

        structures = query.order_by(FeeStructure.created_at.desc()).all()

        rows = []
        for structure in structures:
            target_count = len(_students_in_batch(structure.batch_id))
            rows.append(serialize_fee_structure(structure, target_count=target_count))

        return jsonify({"success": True, "fee_structures": rows}), 200

    @login_required
    def post(self):
        current_user, access_error = authorize_accounts_admin("write")
        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            name = _clean_str(data.get("name"))
            amount = _parse_amount(data.get("amount"))
            due_date = _parse_date(data.get("due_date"))

            if not name:
                return jsonify({"success": False, "error": "Name is required"}), 400
            if amount is None or amount <= 0:
                return jsonify({"success": False, "error": "A valid amount is required"}), 400
            if not due_date:
                return jsonify({"success": False, "error": "A valid due_date (YYYY-MM-DD) is required"}), 400

            batch_id = data.get("batch_id")
            if batch_id:
                if not scoped_get(Batch, int(batch_id)):
                    return jsonify({"success": False, "error": "Batch not found"}), 404

            structure = FeeStructure(
                school_id=current_school_id(),
                name=name,
                fee_category=_clean_str(data.get("fee_category")) or "Tuition",
                academic_year=_clean_str(data.get("academic_year")) or None,
                amount=amount,
                due_date=due_date,
                batch_id=int(batch_id) if batch_id else None,
                description=_clean_str(data.get("description")) or None,
                created_by=getattr(current_user, "id", None),
            )

            db.session.add(structure)
            db.session.commit()

            _log_accounts_activity(
                current_user,
                action="fee_structure_created",
                description=f"Created fee structure template '{name}' (₹{amount})",
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Fee structure created",
                        "fee_structure": serialize_fee_structure(
                            structure, target_count=len(_students_in_batch(structure.batch_id))
                        ),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error creating fee structure")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


class FeeStructureDetailAPI(MethodView):
    """PUT/DELETE /api/accounts/fee-structures/<structure_id>"""

    @login_required
    def put(self, structure_id):
        current_user, access_error = authorize_accounts_admin("edit")
        if access_error:
            return access_error

        try:
            structure = scoped_get(FeeStructure, structure_id)
            if not structure:
                return jsonify({"success": False, "error": "Fee structure not found"}), 404

            data = request.get_json(silent=True) or {}

            if "name" in data:
                structure.name = _clean_str(data.get("name")) or structure.name
            if "fee_category" in data:
                structure.fee_category = _clean_str(data.get("fee_category")) or structure.fee_category
            if "academic_year" in data:
                structure.academic_year = _clean_str(data.get("academic_year")) or None
            if "amount" in data:
                amount = _parse_amount(data.get("amount"))
                if amount is not None:
                    structure.amount = amount
            if "due_date" in data:
                due_date = _parse_date(data.get("due_date"))
                if due_date:
                    structure.due_date = due_date
            if "description" in data:
                structure.description = _clean_str(data.get("description")) or None
            if "is_active" in data:
                structure.is_active = bool(data.get("is_active"))

            db.session.commit()

            _log_accounts_activity(
                current_user,
                action="fee_structure_updated",
                description=f"Updated fee structure template '{structure.name}' (#{structure.id})",
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Fee structure updated",
                        "fee_structure": serialize_fee_structure(
                            structure, target_count=len(_students_in_batch(structure.batch_id))
                        ),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error updating fee structure")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500

    @login_required
    def delete(self, structure_id):
        current_user, access_error = authorize_accounts_admin("delete")
        if access_error:
            return access_error

        try:
            structure = scoped_get(FeeStructure, structure_id)
            if not structure:
                return jsonify({"success": False, "error": "Fee structure not found"}), 404

            if structure.installments.count() > 0:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "This template has already been applied to students. Deactivate it instead of deleting.",
                        }
                    ),
                    409,
                )

            name = structure.name
            db.session.delete(structure)
            db.session.commit()

            _log_accounts_activity(
                current_user,
                action="fee_structure_deleted",
                description=f"Deleted unused fee structure template '{name}'",
            )

            return jsonify({"success": True, "message": "Fee structure deleted"}), 200

        except SQLAlchemyError as e:
            logger.exception("DB error deleting fee structure")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


class FeeStructureApplyAPI(MethodView):
    """
    POST /api/accounts/fee-structures/<structure_id>/apply

    Generates one FeeInstallment per target student (every student in
    the template's batch, or every active student if the template has
    no batch). Students who already have an installment from this
    template are skipped, so it's safe to click "Apply" again after
    new students join instead of double-billing everyone.
    """

    @login_required
    def post(self, structure_id):
        current_user, access_error = authorize_accounts_admin("write")
        if access_error:
            return access_error

        try:
            structure = scoped_get(FeeStructure, structure_id)
            if not structure:
                return jsonify({"success": False, "error": "Fee structure not found"}), 404

            if not structure.is_active:
                return jsonify({"success": False, "error": "This fee structure is inactive"}), 400

            students = _students_in_batch(structure.batch_id)

            already_billed_ids = {
                row[0]
                for row in db.session.query(FeeInstallment.student_id)
                .filter(FeeInstallment.source_structure_id == structure.id)
                .all()
            }

            created = 0
            newly_billed_students = []
            for student in students:
                if student.id in already_billed_ids:
                    continue

                installment = FeeInstallment(
                    school_id=current_school_id(),
                    student_id=student.id,
                    source_structure_id=structure.id,
                    title=structure.name,
                    fee_category=structure.fee_category,
                    academic_year=structure.academic_year,
                    amount=structure.amount,
                    due_date=structure.due_date,
                    created_by=getattr(current_user, "id", None),
                )
                installment.refresh_status()
                db.session.add(installment)
                newly_billed_students.append(student)
                created += 1

            db.session.commit()

            for student in newly_billed_students:
                _notify_student(
                    student,
                    title="New Fee Due",
                    message=(
                        f"A new fee has been added to your account: {structure.name} - "
                        f"₹{structure.amount} due by {structure.due_date.strftime('%d %b %Y')}."
                    ),
                    notif_type="fee_due",
                )

            _log_accounts_activity(
                current_user,
                action="fee_structure_applied",
                description=f"Applied fee structure '{structure.name}' to {created} student(s)",
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "message": f"Applied to {created} student(s)",
                        "created_count": created,
                        "skipped_count": len(students) - created,
                        "target_count": len(students),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error applying fee structure")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


# =====================================================================
# PENDING FEES (school-wide view across every student)
# =====================================================================
class PendingFeesListAPI(MethodView):
    """
    GET /api/accounts/fees/pending

    Every unpaid/partially-paid/overdue installment school-wide, with
    the student's name/class attached, for the Pending Fees section.
    Query params: status ("Pending" | "Partial" | "Overdue" | "" for
    all three), search (student name/ID/mobile), batch_id.
    """

    @login_required
    def get(self):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        try:
            _refresh_overdue_installments()

            status = _clean_str(request.args.get("status"))
            search = _clean_str(request.args.get("search"))
            batch_id = request.args.get("batch_id")

            query = FeeInstallment.query.filter(FeeInstallment.school_id == current_school_id()).join(
                Student, Student.id == FeeInstallment.student_id
            )

            if status in ("Pending", "Partial", "Overdue"):
                query = query.filter(FeeInstallment.status == status)
            else:
                query = query.filter(
                    FeeInstallment.status.in_(["Pending", "Partial", "Overdue"])
                )

            if search:
                like = f"%{search}%"
                query = query.filter(
                    or_(
                        Student.first_name.ilike(like),
                        Student.last_name.ilike(like),
                        Student.student_id.ilike(like),
                        Student.mobile.ilike(like),
                    )
                )

            if batch_id:
                student_ids = [s.id for s in _students_in_batch(int(batch_id))]
                query = query.filter(FeeInstallment.student_id.in_(student_ids))

            installments = query.order_by(
                FeeInstallment.status.desc(), FeeInstallment.due_date.asc()
            ).all()

            rows = []
            total_pending_amount = 0.0
            overdue_count = 0

            for installment in installments:
                student = scoped_get(Student, installment.student_id)
                row = serialize_installment(installment)
                row["student_name"] = (
                    _clean_str(f"{student.first_name} {student.last_name}")
                    if student
                    else "Unknown"
                )
                row["student_code"] = student.student_id if student else None
                row["student_mobile"] = student.mobile if student else None
                row.update(
                    {
                        f"class_{k}": v
                        for k, v in _student_class_details(installment.student_id).items()
                    }
                )
                rows.append(row)

                total_pending_amount += installment.balance()
                if installment.status == "Overdue":
                    overdue_count += 1

            return (
                jsonify(
                    {
                        "success": True,
                        "pending_fees": rows,
                        "summary": {
                            "count": len(rows),
                            "overdue_count": overdue_count,
                            "total_pending_amount": round(total_pending_amount, 2),
                        },
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error loading pending fees")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


class SendFeeRemindersAPI(MethodView):
    """
    POST /api/accounts/fees/send-reminders

    Body (all optional): { "days_ahead": 3 }

    The "due date alert" workflow: there's no scheduler in this app, so
    this is the button that actually sends reminders - hit it manually
    from the Pending Fees screen, or point a daily cron/task scheduler
    at this URL to make it fully automatic. Sends ONE reminder per
    student (not per installment) summarizing everything they owe:
    installments overdue now, plus installments due within
    `days_ahead` days (default 3).

    De-duplicated per calendar day: a student who already got a
    fee_due/fee_overdue reminder today won't get a second one from a
    repeat click, but will get a fresh one tomorrow if still unpaid.
    """

    @login_required
    def post(self):
        current_user, access_error = authorize_accounts_admin("write")
        if access_error:
            return access_error

        try:
            _refresh_overdue_installments()

            data = request.get_json(silent=True) or {}
            days_ahead = int(data.get("days_ahead") or 3)
            today = date.today()
            horizon = today + timedelta(days=days_ahead)

            installments = FeeInstallment.query.filter(FeeInstallment.school_id == current_school_id(), 
                FeeInstallment.status.in_(["Pending", "Partial", "Overdue"]),
                FeeInstallment.due_date <= horizon,
            ).all()

            by_student = {}
            for inst in installments:
                by_student.setdefault(inst.student_id, []).append(inst)

            today_start = datetime.combine(today, datetime.min.time())
            already_reminded_today = {
                row[0]
                for row in db.session.query(Notification.student_id)
                .filter(
                    Notification.type.in_(["fee_due", "fee_overdue"]),
                    Notification.created_at >= today_start,
                    Notification.student_id.isnot(None),
                )
                .all()
            }

            sent = 0
            skipped = 0

            for student_id, insts in by_student.items():
                if student_id in already_reminded_today:
                    skipped += 1
                    continue

                student = scoped_get(Student, student_id)
                if not student:
                    continue

                total_due = round(sum(i.balance() for i in insts), 2)
                overdue_insts = [i for i in insts if i.status == "Overdue"]

                if overdue_insts:
                    title = "Fee Overdue"
                    notif_type = "fee_overdue"
                    message = (
                        f"You have {len(overdue_insts)} overdue fee item(s) "
                        f"totalling ₹{total_due}. Please pay at the earliest to "
                        f"avoid late fees."
                    )
                else:
                    soonest = min(i.due_date for i in insts)
                    title = "Fee Due Reminder"
                    notif_type = "fee_due"
                    message = (
                        f"You have ₹{total_due} in fees due by "
                        f"{soonest.strftime('%d %b %Y')}. Please pay on time to "
                        f"avoid late fees."
                    )

                _notify_student(student, title=title, message=message, notif_type=notif_type)
                sent += 1

            _log_accounts_activity(
                current_user,
                action="fee_reminders_sent",
                description=f"Sent fee due/overdue reminders to {sent} student(s)",
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "message": f"Reminders sent to {sent} student(s)",
                        "sent_count": sent,
                        "skipped_count": skipped,
                        "students_with_dues": len(by_student),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error sending fee reminders")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


# =====================================================================
# FEE REPORTS (aggregate views across every student)
# =====================================================================
class FeeReportsAPI(MethodView):
    """
    GET /api/accounts/fees/reports

    Everything the Fee Reports section needs in one call: headline
    totals + collection rate, a 12-month collection trend, billed vs
    collected by fee category, collections by payment mode, billed vs
    collected by batch, and the top 10 students by outstanding balance.

    All computed in Python over the (school-scale) installment/payment
    tables rather than heavy grouped SQL, matching how
    FeeDashboardSummaryAPI already aggregates elsewhere in this module.

    Optional query param: academic_year - scopes billed/collected/trend
    figures to installments tagged with that year (unallocated
    payments, which aren't tied to any installment, are excluded from
    the collected total when this filter is active, since there's no
    year to match them against).
    """

    @login_required
    def get(self):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        try:
            _refresh_overdue_installments()

            academic_year = _clean_str(request.args.get("academic_year"))

            installment_query = FeeInstallment.query.filter(FeeInstallment.school_id == current_school_id())
            if academic_year:
                installment_query = installment_query.filter(
                    FeeInstallment.academic_year == academic_year
                )
            installments = installment_query.all()
            installment_by_id = {i.id: i for i in installments}

            all_payments = FeePayment.query.filter(FeePayment.school_id == current_school_id(), FeePayment.status == "Success").all()

            if academic_year:
                relevant_payments = [
                    p for p in all_payments if p.installment_id in installment_by_id
                ]
            else:
                relevant_payments = all_payments

            # ---------------- SUMMARY ----------------
            total_billed = sum(i.net_payable() for i in installments)
            total_collected = sum(float(p.amount or 0) for p in relevant_payments)
            total_outstanding = round(max(total_billed - total_collected, 0), 2)
            collection_rate = (
                round((total_collected / total_billed) * 100, 1) if total_billed > 0 else 0.0
            )

            # ---------------- MONTHLY TREND (last 12 months) ----------------
            today = date.today()
            months = []
            y, m = today.year, today.month
            for _ in range(12):
                months.append((y, m))
                m -= 1
                if m == 0:
                    m = 12
                    y -= 1
            months.reverse()

            monthly_totals = {key: 0.0 for key in months}
            for p in relevant_payments:
                if not p.payment_date:
                    continue
                key = (p.payment_date.year, p.payment_date.month)
                if key in monthly_totals:
                    monthly_totals[key] += float(p.amount or 0)

            monthly_trend = [
                {
                    "year": y,
                    "month": m,
                    "label": date(y, m, 1).strftime("%b %Y"),
                    "collected": round(monthly_totals[(y, m)], 2),
                }
                for (y, m) in months
            ]

            # ---------------- CATEGORY BREAKDOWN ----------------
            categories = {}
            for inst in installments:
                cat = inst.fee_category or "Miscellaneous"
                bucket = categories.setdefault(cat, {"billed": 0.0, "collected": 0.0})
                bucket["billed"] += inst.net_payable()

            for p in relevant_payments:
                inst = installment_by_id.get(p.installment_id)
                cat = inst.fee_category if inst else "Unallocated"
                bucket = categories.setdefault(cat, {"billed": 0.0, "collected": 0.0})
                bucket["collected"] += float(p.amount or 0)

            category_breakdown = [
                {
                    "category": cat,
                    "billed": round(v["billed"], 2),
                    "collected": round(v["collected"], 2),
                    "outstanding": round(max(v["billed"] - v["collected"], 0), 2),
                }
                for cat, v in sorted(categories.items(), key=lambda kv: -kv[1]["billed"])
            ]

            # ---------------- PAYMENT MODE BREAKDOWN ----------------
            modes = {}
            for p in relevant_payments:
                bucket = modes.setdefault(
                    p.payment_mode or "Other", {"amount": 0.0, "count": 0}
                )
                bucket["amount"] += float(p.amount or 0)
                bucket["count"] += 1

            payment_mode_breakdown = [
                {"mode": mode, "amount": round(v["amount"], 2), "count": v["count"]}
                for mode, v in sorted(modes.items(), key=lambda kv: -kv[1]["amount"])
            ]

            # ---------------- BATCH-WISE BREAKDOWN ----------------
            student_ids = {i.student_id for i in installments}
            batch_lookup = {}
            if student_ids:
                rows = (
                    db.session.query(Student.id, Batch.batch_name)
                    .join(
                        StudentAcademicRecord,
                        StudentAcademicRecord.student_id == Student.id,
                    )
                    .join(
                        AcademicClass,
                        AcademicClass.id == StudentAcademicRecord.academic_class_id,
                    )
                    .join(Batch, Batch.id == AcademicClass.batch_id)
                    .filter(
                        StudentAcademicRecord.is_current.is_(True),
                        Student.id.in_(student_ids),
                    )
                    .all()
                )
                batch_lookup = {row[0]: row[1] for row in rows}

            batches = {}
            for inst in installments:
                batch_name = batch_lookup.get(inst.student_id, "Not Assigned")
                bucket = batches.setdefault(
                    batch_name, {"billed": 0.0, "collected": 0.0, "students": set()}
                )
                bucket["billed"] += inst.net_payable()
                bucket["students"].add(inst.student_id)

            for p in relevant_payments:
                inst = installment_by_id.get(p.installment_id)
                if not inst:
                    continue
                batch_name = batch_lookup.get(inst.student_id, "Not Assigned")
                bucket = batches.setdefault(
                    batch_name, {"billed": 0.0, "collected": 0.0, "students": set()}
                )
                bucket["collected"] += float(p.amount or 0)

            batch_breakdown = [
                {
                    "batch_name": name,
                    "billed": round(v["billed"], 2),
                    "collected": round(v["collected"], 2),
                    "outstanding": round(max(v["billed"] - v["collected"], 0), 2),
                    "student_count": len(v["students"]),
                }
                for name, v in sorted(batches.items(), key=lambda kv: -kv[1]["billed"])
            ]

            # ---------------- TOP DEFAULTERS ----------------
            balances = {}
            for inst in installments:
                if inst.status in ("Pending", "Partial", "Overdue"):
                    balances[inst.student_id] = (
                        balances.get(inst.student_id, 0.0) + inst.balance()
                    )

            top_defaulters = []
            for student_id, balance in sorted(
                balances.items(), key=lambda kv: -kv[1]
            )[:10]:
                if balance <= 0:
                    continue
                student = scoped_get(Student, student_id)
                if not student:
                    continue
                top_defaulters.append(
                    {
                        "student_id": student_id,
                        "student_name": _clean_str(
                            f"{student.first_name} {student.last_name}"
                        ),
                        "student_code": student.student_id,
                        "class_name": batch_lookup.get(student_id, "Not Assigned"),
                        "balance": round(balance, 2),
                    }
                )

            return (
                jsonify(
                    {
                        "success": True,
                        "summary": {
                            "total_billed": round(total_billed, 2),
                            "total_collected": round(total_collected, 2),
                            "total_outstanding": total_outstanding,
                            "collection_rate": collection_rate,
                        },
                        "monthly_trend": monthly_trend,
                        "category_breakdown": category_breakdown,
                        "payment_mode_breakdown": payment_mode_breakdown,
                        "batch_breakdown": batch_breakdown,
                        "top_defaulters": top_defaulters,
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error building fee reports")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


# =====================================================================
# EXPENSE CATEGORIES
# =====================================================================
class ExpenseCategoryListAPI(MethodView):
    """GET/POST /api/accounts/expense-categories"""

    @login_required
    def get(self):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        active_only = str(request.args.get("active_only") or "").lower() == "true"

        query = ExpenseCategory.query.filter(ExpenseCategory.school_id == current_school_id())
        if active_only:
            query = query.filter(ExpenseCategory.is_active.is_(True))

        categories = query.order_by(ExpenseCategory.name.asc()).all()

        today = date.today()
        spent_by_category = dict(
            db.session.query(
                AccountsTransaction.category, func.coalesce(func.sum(AccountsTransaction.amount), 0)
            )
            .filter(
                AccountsTransaction.entry_type == "Expense",
                func.extract("month", AccountsTransaction.transaction_date) == today.month,
                func.extract("year", AccountsTransaction.transaction_date) == today.year,
            )
            .group_by(AccountsTransaction.category)
            .all()
        )

        rows = [
            serialize_expense_category(
                c, spent=float(spent_by_category.get(c.name, 0))
            )
            for c in categories
        ]

        return jsonify({"success": True, "expense_categories": rows}), 200

    @login_required
    def post(self):
        current_user, access_error = authorize_accounts_admin("write")
        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            name = _clean_str(data.get("name"))
            if not name:
                return jsonify({"success": False, "error": "Name is required"}), 400

            if ExpenseCategory.query.filter(ExpenseCategory.school_id == current_school_id(), func.lower(ExpenseCategory.name) == name.lower()).first():
                return jsonify({"success": False, "error": "A category with this name already exists"}), 409

            category = ExpenseCategory(
                school_id=current_school_id(),
                name=name,
                description=_clean_str(data.get("description")) or None,
                monthly_budget=_parse_amount(data.get("monthly_budget"), None),
                created_by=getattr(current_user, "id", None),
            )

            db.session.add(category)
            db.session.commit()

            _log_accounts_activity(
                current_user,
                action="expense_category_created",
                description=f"Created expense category '{name}'",
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Expense category created",
                        "expense_category": serialize_expense_category(category, spent=0),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error creating expense category")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


class ExpenseCategoryDetailAPI(MethodView):
    """PUT/DELETE /api/accounts/expense-categories/<category_id>"""

    @login_required
    def put(self, category_id):
        current_user, access_error = authorize_accounts_admin("edit")
        if access_error:
            return access_error

        try:
            category = scoped_get(ExpenseCategory, category_id)
            if not category:
                return jsonify({"success": False, "error": "Category not found"}), 404

            data = request.get_json(silent=True) or {}

            if "name" in data:
                new_name = _clean_str(data.get("name"))
                if new_name and new_name.lower() != category.name.lower():
                    if ExpenseCategory.query.filter(ExpenseCategory.school_id == current_school_id(), 
                        func.lower(ExpenseCategory.name) == new_name.lower()
                    ).first():
                        return jsonify({"success": False, "error": "A category with this name already exists"}), 409
                    category.name = new_name
            if "description" in data:
                category.description = _clean_str(data.get("description")) or None
            if "monthly_budget" in data:
                category.monthly_budget = _parse_amount(data.get("monthly_budget"), None)
            if "is_active" in data:
                category.is_active = bool(data.get("is_active"))

            db.session.commit()

            _log_accounts_activity(
                current_user,
                action="expense_category_updated",
                description=f"Updated expense category '{category.name}' (#{category.id})",
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Category updated",
                        "expense_category": serialize_expense_category(category),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error updating expense category")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500

    @login_required
    def delete(self, category_id):
        current_user, access_error = authorize_accounts_admin("delete")
        if access_error:
            return access_error

        try:
            category = scoped_get(ExpenseCategory, category_id)
            if not category:
                return jsonify({"success": False, "error": "Category not found"}), 404

            in_use = AccountsTransaction.query.filter(AccountsTransaction.school_id == current_school_id(), 
                AccountsTransaction.category == category.name
            ).first()

            if in_use:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "This category has expenses recorded against it. Deactivate it instead of deleting.",
                        }
                    ),
                    409,
                )

            name = category.name
            db.session.delete(category)
            db.session.commit()

            _log_accounts_activity(
                current_user,
                action="expense_category_deleted",
                description=f"Deleted unused expense category '{name}'",
            )

            return jsonify({"success": True, "message": "Category deleted"}), 200

        except SQLAlchemyError as e:
            logger.exception("DB error deleting expense category")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


# =====================================================================
# SALARY MANAGEMENT (whole-roster payroll view)
# =====================================================================
class PayrollStaffListAPI(MethodView):
    """
    GET /api/accounts/payroll/staff

    Every teacher + non-teaching staff + admin with their salary setup
    status attached, for the Salary Management section. Query params:
    search, category ("teaching" | "non-teaching" | "admin" | ""),
    setup ("set" | "not_set" | "").
    """

    @login_required
    def get(self):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        search = _clean_str(request.args.get("search")).lower()
        category = _clean_str(request.args.get("category")).lower()
        setup_filter = _clean_str(request.args.get("setup")).lower()

        category_map = {"teaching": "teacher", "non-teaching": "staff", "admin": "admin"}

        people = _all_staff_persons()

        if category in category_map:
            people = [p for p in people if p["record_type"] == category_map[category]]

        if search:
            people = [
                p
                for p in people
                if search in (p["name"] or "").lower()
                or search in (p["staff_code"] or "").lower()
            ]

        structures = SalaryStructure.query.filter_by(school_id=current_school_id(), is_current=True).all()
        structure_lookup = {(s.record_type, s.record_id): s for s in structures}

        rows = []
        for person in people:
            structure = structure_lookup.get((person["record_type"], person["id"]))

            has_structure = structure is not None
            if setup_filter == "set" and not has_structure:
                continue
            if setup_filter == "not_set" and has_structure:
                continue

            row = dict(person)
            row["has_salary_structure"] = has_structure
            row["gross"] = structure.gross() if structure else None
            row["net"] = structure.net() if structure else None
            rows.append(row)

        rows.sort(key=lambda r: (r["name"] or "").lower())

        return (
            jsonify(
                {
                    "success": True,
                    "staff": rows,
                    "stats": {
                        "total": len(rows),
                        "set_up": sum(1 for r in rows if r["has_salary_structure"]),
                        "not_set_up": sum(1 for r in rows if not r["has_salary_structure"]),
                    },
                }
            ),
            200,
        )


# =====================================================================
# PAYSLIPS (whole-roster view + bulk payroll run)
# =====================================================================
class PayslipsAllListAPI(MethodView):
    """
    GET /api/accounts/payslips

    Every payslip school-wide, with the owning staff member's name
    attached, for the Payslips section. Query params: month, year,
    status, record_type.
    """

    @login_required
    def get(self):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        try:
            month = request.args.get("month")
            year = request.args.get("year")
            status = _clean_str(request.args.get("status"))
            record_type = _clean_str(request.args.get("record_type")).lower()

            query = Payslip.query.filter(Payslip.school_id == current_school_id())

            if month:
                query = query.filter(Payslip.month == int(month))
            if year:
                query = query.filter(Payslip.year == int(year))
            if status in ("Pending", "Processing", "Paid", "Failed"):
                query = query.filter(Payslip.status == status)
            if record_type in ("teacher", "staff", "admin"):
                query = query.filter(Payslip.record_type == record_type)

            payslips = query.order_by(Payslip.year.desc(), Payslip.month.desc()).all()

            rows = []
            for slip in payslips:
                person = _resolve_staff_person(slip.record_type, slip.record_id)
                row = serialize_payslip(slip)
                row["staff_name"] = person["name"] if person else "Unknown"
                row["staff_code"] = person["staff_code"] if person else None
                row["designation"] = person["designation"] if person else None
                rows.append(row)

            return (
                jsonify(
                    {
                        "success": True,
                        "payslips": rows,
                        "summary": {
                            "count": len(rows),
                            "paid_amount": round(
                                sum(float(r["net_salary"] or 0) for r in rows if r["status"] == "Paid"), 2
                            ),
                            "pending_amount": round(
                                sum(
                                    float(r["net_salary"] or 0)
                                    for r in rows
                                    if r["status"] in ("Pending", "Processing")
                                ),
                                2,
                            ),
                        },
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error loading payslips")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


class RunPayrollAPI(MethodView):
    """
    POST /api/accounts/payroll/run

    Bulk-generates a payslip for the given month/year for every staff
    member who has a salary structure set up and doesn't already have
    one for that period - the "Run Payroll" button, so accounts doesn't
    have to open each person's modal individually every month.
    """

    @login_required
    def post(self):
        current_user, access_error = authorize_accounts_admin("write")
        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            month = int(data.get("month") or date.today().month)
            year = int(data.get("year") or date.today().year)
            working_days = int(data.get("working_days") or 30)

            structures = SalaryStructure.query.filter_by(school_id=current_school_id(), is_current=True).all()

            already_generated = {
                (p.record_type, p.record_id)
                for p in Payslip.query.filter_by(school_id=current_school_id(), month=month, year=year).all()
            }

            created = 0
            skipped = 0
            generated_for = []

            for structure in structures:
                key = (structure.record_type, structure.record_id)
                if key in already_generated:
                    skipped += 1
                    continue

                gross = structure.gross()
                deductions = structure.total_deductions()
                net = round(max(gross - deductions, 0), 2)

                payslip = Payslip(
                    school_id=current_school_id(),
                    record_type=structure.record_type,
                    record_id=structure.record_id,
                    month=month,
                    year=year,
                    gross_salary=gross,
                    total_deductions=deductions,
                    net_salary=net,
                    working_days=working_days,
                    lop_days=0,
                    generated_by=getattr(current_user, "id", None),
                )
                db.session.add(payslip)
                generated_for.append((structure.record_type, structure.record_id, net))
                created += 1

            db.session.commit()

            _log_accounts_activity(
                current_user,
                action="payroll_run",
                description=f"Ran payroll for {date(year, month, 1).strftime('%B %Y')}: {created} payslip(s) generated",
            )

            period_label = date(year, month, 1).strftime("%B %Y")
            for record_type, record_id, net in generated_for:
                _notify_staff(
                    record_type,
                    record_id,
                    title="Payslip Generated",
                    message=(
                        f"Your payslip for {period_label} is ready: net ₹{net}. "
                        f"Payment is pending."
                    ),
                    notif_type="payslip_generated",
                )

            return (
                jsonify(
                    {
                        "success": True,
                        "message": f"Payroll run complete: {created} payslip(s) generated",
                        "created_count": created,
                        "skipped_count": skipped,
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error running payroll")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


# =====================================================================
# BANK ACCOUNTS
# =====================================================================
def _bank_account_balance(account):
    """opening_balance + every Income linked to this account - every
    Expense linked to this account. Computed on read rather than
    stored, so it's always correct against whatever transactions exist."""
    income = (
        db.session.query(func.coalesce(func.sum(AccountsTransaction.amount), 0))
        .filter(
            AccountsTransaction.bank_account_id == account.id,
            AccountsTransaction.entry_type == "Income",
        )
        .scalar()
    )
    expense = (
        db.session.query(func.coalesce(func.sum(AccountsTransaction.amount), 0))
        .filter(
            AccountsTransaction.bank_account_id == account.id,
            AccountsTransaction.entry_type == "Expense",
        )
        .scalar()
    )
    return float(account.opening_balance or 0) + float(income or 0) - float(expense or 0)


class BankAccountListAPI(MethodView):
    """GET/POST /api/accounts/bank-accounts"""

    @login_required
    def get(self):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        active_only = str(request.args.get("active_only") or "").lower() == "true"

        query = BankAccount.query.filter(BankAccount.school_id == current_school_id())
        if active_only:
            query = query.filter(BankAccount.is_active.is_(True))

        accounts = query.order_by(BankAccount.account_name.asc()).all()

        rows = []
        total_balance = 0.0
        for account in accounts:
            balance = _bank_account_balance(account)
            total_balance += balance if account.is_active else 0

            recent = (
                account.transactions.order_by(
                    AccountsTransaction.transaction_date.desc(),
                    AccountsTransaction.id.desc(),
                )
                .limit(5)
                .all()
            )

            rows.append(
                serialize_bank_account(
                    account,
                    current_balance=balance,
                    recent_transactions=[serialize_transaction(t) for t in recent],
                )
            )

        return (
            jsonify(
                {
                    "success": True,
                    "bank_accounts": rows,
                    "summary": {
                        "total_accounts": len(rows),
                        "active_accounts": sum(1 for a in accounts if a.is_active),
                        "total_balance": round(total_balance, 2),
                    },
                }
            ),
            200,
        )

    @login_required
    def post(self):
        current_user, access_error = authorize_accounts_admin("write")
        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            account_name = _clean_str(data.get("account_name"))
            bank_name = _clean_str(data.get("bank_name"))
            account_number = _clean_str(data.get("account_number"))

            if not account_name:
                return jsonify({"success": False, "error": "Account name is required"}), 400
            if not bank_name:
                return jsonify({"success": False, "error": "Bank name is required"}), 400
            if not account_number:
                return jsonify({"success": False, "error": "Account number is required"}), 400

            if BankAccount.query.filter(BankAccount.school_id == current_school_id(), 
                BankAccount.account_number == account_number
            ).first():
                return jsonify({"success": False, "error": "An account with this number already exists"}), 409

            account = BankAccount(
                school_id=current_school_id(),
                account_name=account_name,
                bank_name=bank_name,
                account_number=account_number,
                ifsc_code=_clean_str(data.get("ifsc_code")) or None,
                account_type=_clean_str(data.get("account_type")) or "Current",
                opening_balance=_parse_amount(data.get("opening_balance"), 0) or 0,
                notes=_clean_str(data.get("notes")) or None,
                created_by=getattr(current_user, "id", None),
            )

            db.session.add(account)
            db.session.commit()

            _alert_super_admins(
                current_user,
                action="bank_account_created",
                description=f"Added bank account '{account_name}' at {bank_name} (opening balance ₹{account.opening_balance})",
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Bank account added",
                        "bank_account": serialize_bank_account(
                            account, current_balance=float(account.opening_balance or 0), recent_transactions=[]
                        ),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error creating bank account")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


class BankAccountDetailAPI(MethodView):
    """PUT/DELETE /api/accounts/bank-accounts/<account_id>"""

    @login_required
    def put(self, account_id):
        current_user, access_error = authorize_accounts_admin("edit")
        if access_error:
            return access_error

        try:
            account = scoped_get(BankAccount, account_id)
            if not account:
                return jsonify({"success": False, "error": "Bank account not found"}), 404

            data = request.get_json(silent=True) or {}

            if "account_name" in data:
                account.account_name = _clean_str(data.get("account_name")) or account.account_name
            if "bank_name" in data:
                account.bank_name = _clean_str(data.get("bank_name")) or account.bank_name
            if "account_number" in data:
                new_number = _clean_str(data.get("account_number"))
                if new_number and new_number != account.account_number:
                    if BankAccount.query.filter(BankAccount.school_id == current_school_id(), 
                        BankAccount.account_number == new_number,
                        BankAccount.id != account.id,
                    ).first():
                        return jsonify({"success": False, "error": "An account with this number already exists"}), 409
                    account.account_number = new_number
            if "ifsc_code" in data:
                account.ifsc_code = _clean_str(data.get("ifsc_code")) or None
            if "account_type" in data:
                account.account_type = _clean_str(data.get("account_type")) or account.account_type
            if "opening_balance" in data:
                account.opening_balance = _parse_amount(
                    data.get("opening_balance"), account.opening_balance
                )
            if "notes" in data:
                account.notes = _clean_str(data.get("notes")) or None
            if "is_active" in data:
                account.is_active = bool(data.get("is_active"))

            db.session.commit()

            _log_accounts_activity(
                current_user,
                action="bank_account_updated",
                description=f"Updated bank account '{account.account_name}' (#{account.id})",
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Bank account updated",
                        "bank_account": serialize_bank_account(
                            account, current_balance=_bank_account_balance(account)
                        ),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error updating bank account")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500

    @login_required
    def delete(self, account_id):
        current_user, access_error = authorize_accounts_admin("delete")
        if access_error:
            return access_error

        try:
            account = scoped_get(BankAccount, account_id)
            if not account:
                return jsonify({"success": False, "error": "Bank account not found"}), 404

            if account.transactions.count() > 0:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "This account has transactions recorded against it. Deactivate it instead of deleting.",
                        }
                    ),
                    409,
                )

            name = account.account_name
            db.session.delete(account)
            db.session.commit()

            _alert_super_admins(
                current_user,
                action="bank_account_deleted",
                description=f"Deleted bank account '{name}' (#{account_id})",
            )

            return jsonify({"success": True, "message": "Bank account deleted"}), 200

        except SQLAlchemyError as e:
            logger.exception("DB error deleting bank account")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


# =====================================================================
# FINANCIAL REPORTS (fees + payroll + general ledger, combined)
# =====================================================================
class FinancialOverviewAPI(MethodView):
    """
    GET /api/accounts/financial-overview?month=&year=

    The one number that "Net Balance" on the dashboard home couldn't
    give honestly, because fees live in a separate table from the
    general ledger: true revenue (fee collections + other income) vs
    true cost (payroll + other expenses) for a period, plus a 6-month
    combined trend.
    """

    @login_required
    def get(self):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        try:
            _refresh_overdue_installments()

            today = date.today()
            month = int(request.args.get("month") or today.month)
            year = int(request.args.get("year") or today.year)

            # ---------------- FEES (this period) ----------------
            fee_collected = (
                db.session.query(func.coalesce(func.sum(FeePayment.amount), 0))
                .filter(
                    FeePayment.status == "Success",
                    func.extract("month", FeePayment.payment_date) == month,
                    func.extract("year", FeePayment.payment_date) == year,
                )
                .scalar()
            )

            fee_outstanding = (
                db.session.query(
                    func.coalesce(
                        func.sum(
                            FeeInstallment.amount
                            + FeeInstallment.late_fee
                            - FeeInstallment.discount
                            - FeeInstallment.paid_amount
                        ),
                        0,
                    )
                )
                .filter(FeeInstallment.status.in_(["Pending", "Partial", "Overdue"]))
                .scalar()
            )

            # ---------------- PAYROLL (this period) ----------------
            month_payslips = Payslip.query.filter_by(school_id=current_school_id(), month=month, year=year).all()
            payroll_paid = sum(
                float(p.net_salary or 0) for p in month_payslips if p.status == "Paid"
            )
            payroll_pending = sum(
                float(p.net_salary or 0)
                for p in month_payslips
                if p.status in ("Pending", "Processing")
            )

            # ---------------- GENERAL LEDGER (this period) ----------------
            other_income = (
                db.session.query(func.coalesce(func.sum(AccountsTransaction.amount), 0))
                .filter(
                    AccountsTransaction.entry_type == "Income",
                    func.extract("month", AccountsTransaction.transaction_date) == month,
                    func.extract("year", AccountsTransaction.transaction_date) == year,
                )
                .scalar()
            )
            other_expense = (
                db.session.query(func.coalesce(func.sum(AccountsTransaction.amount), 0))
                .filter(
                    AccountsTransaction.entry_type == "Expense",
                    func.extract("month", AccountsTransaction.transaction_date) == month,
                    func.extract("year", AccountsTransaction.transaction_date) == year,
                )
                .scalar()
            )

            total_revenue = round(float(fee_collected or 0) + float(other_income or 0), 2)
            total_cost = round(payroll_paid + float(other_expense or 0), 2)
            net = round(total_revenue - total_cost, 2)

            # ---------------- 6-MONTH COMBINED TREND ----------------
            months = []
            y, m = year, month
            for _ in range(6):
                months.append((y, m))
                m -= 1
                if m == 0:
                    m = 12
                    y -= 1
            months.reverse()

            trend = []
            for (ty, tm) in months:
                m_fee = (
                    db.session.query(func.coalesce(func.sum(FeePayment.amount), 0))
                    .filter(
                        FeePayment.status == "Success",
                        func.extract("month", FeePayment.payment_date) == tm,
                        func.extract("year", FeePayment.payment_date) == ty,
                    )
                    .scalar()
                )
                m_income = (
                    db.session.query(func.coalesce(func.sum(AccountsTransaction.amount), 0))
                    .filter(
                        AccountsTransaction.entry_type == "Income",
                        func.extract("month", AccountsTransaction.transaction_date) == tm,
                        func.extract("year", AccountsTransaction.transaction_date) == ty,
                    )
                    .scalar()
                )
                m_payroll = sum(
                    float(p.net_salary or 0)
                    for p in Payslip.query.filter_by(school_id=current_school_id(), month=tm, year=ty, status="Paid").all()
                )
                m_expense = (
                    db.session.query(func.coalesce(func.sum(AccountsTransaction.amount), 0))
                    .filter(
                        AccountsTransaction.entry_type == "Expense",
                        func.extract("month", AccountsTransaction.transaction_date) == tm,
                        func.extract("year", AccountsTransaction.transaction_date) == ty,
                    )
                    .scalar()
                )

                m_revenue = round(float(m_fee or 0) + float(m_income or 0), 2)
                m_cost = round(m_payroll + float(m_expense or 0), 2)

                trend.append(
                    {
                        "year": ty,
                        "month": tm,
                        "label": date(ty, tm, 1).strftime("%b %Y"),
                        "revenue": m_revenue,
                        "cost": m_cost,
                        "net": round(m_revenue - m_cost, 2),
                    }
                )

            return (
                jsonify(
                    {
                        "success": True,
                        "period": {"month": month, "year": year},
                        "summary": {
                            "fee_collected": round(float(fee_collected or 0), 2),
                            "fee_outstanding": round(float(fee_outstanding or 0), 2),
                            "payroll_paid": round(payroll_paid, 2),
                            "payroll_pending": round(payroll_pending, 2),
                            "other_income": round(float(other_income or 0), 2),
                            "other_expense": round(float(other_expense or 0), 2),
                            "total_revenue": total_revenue,
                            "total_cost": total_cost,
                            "net": net,
                        },
                        "trend": trend,
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error building financial overview")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


class ProfitLossAPI(MethodView):
    """
    GET /api/accounts/profit-loss?month=&year=

    A classic P&L statement for one month: revenue broken into fee
    collections + other income by category, expenses broken into
    payroll + other expenses by category, and the net result - plus
    the same figures for the previous month for a quick delta.
    """

    @login_required
    def get(self):
        _, access_error = authorize_accounts_admin("read")
        if access_error:
            return access_error

        try:
            today = date.today()
            month = int(request.args.get("month") or today.month)
            year = int(request.args.get("year") or today.year)

            def period_statement(m, y):
                fee_collected = (
                    db.session.query(func.coalesce(func.sum(FeePayment.amount), 0))
                    .filter(
                        FeePayment.status == "Success",
                        func.extract("month", FeePayment.payment_date) == m,
                        func.extract("year", FeePayment.payment_date) == y,
                    )
                    .scalar()
                )

                income_rows = (
                    db.session.query(
                        AccountsTransaction.category,
                        func.coalesce(func.sum(AccountsTransaction.amount), 0),
                    )
                    .filter(
                        AccountsTransaction.entry_type == "Income",
                        func.extract("month", AccountsTransaction.transaction_date) == m,
                        func.extract("year", AccountsTransaction.transaction_date) == y,
                    )
                    .group_by(AccountsTransaction.category)
                    .all()
                )

                expense_rows = (
                    db.session.query(
                        AccountsTransaction.category,
                        func.coalesce(func.sum(AccountsTransaction.amount), 0),
                    )
                    .filter(
                        AccountsTransaction.entry_type == "Expense",
                        func.extract("month", AccountsTransaction.transaction_date) == m,
                        func.extract("year", AccountsTransaction.transaction_date) == y,
                    )
                    .group_by(AccountsTransaction.category)
                    .all()
                )

                payroll_paid = sum(
                    float(p.net_salary or 0)
                    for p in Payslip.query.filter_by(school_id=current_school_id(), month=m, year=y, status="Paid").all()
                )

                other_income_total = sum(float(r[1]) for r in income_rows)
                other_expense_total = sum(float(r[1]) for r in expense_rows)

                total_revenue = round(float(fee_collected or 0) + other_income_total, 2)
                total_expense = round(payroll_paid + other_expense_total, 2)

                return {
                    "revenue": {
                        "fee_collections": round(float(fee_collected or 0), 2),
                        "other_income": [
                            {"category": r[0], "amount": round(float(r[1]), 2)}
                            for r in income_rows
                        ],
                        "total": total_revenue,
                    },
                    "expenses": {
                        "payroll": round(payroll_paid, 2),
                        "other_expenses": [
                            {"category": r[0], "amount": round(float(r[1]), 2)}
                            for r in expense_rows
                        ],
                        "total": total_expense,
                    },
                    "net_profit": round(total_revenue - total_expense, 2),
                }

            prev_month, prev_year = month - 1, year
            if prev_month == 0:
                prev_month, prev_year = 12, year - 1

            current = period_statement(month, year)
            previous = period_statement(prev_month, prev_year)

            return (
                jsonify(
                    {
                        "success": True,
                        "period": {
                            "month": month,
                            "year": year,
                            "label": date(year, month, 1).strftime("%B %Y"),
                        },
                        "statement": current,
                        "previous_period": {
                            "label": date(prev_year, prev_month, 1).strftime("%B %Y"),
                            "net_profit": previous["net_profit"],
                            "total_revenue": previous["revenue"]["total"],
                            "total_expense": previous["expenses"]["total"],
                        },
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error building profit & loss statement")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500


# =====================================================================
# ACTIVITY LOGS (Super Admin oversight of the Accounts Admin)
# =====================================================================
def _require_super_admin():
    """Stricter than authorize_accounts_admin(): being a Super Admin is
    the ONLY thing that passes here, not "has the accounts module
    permission". An Accounts Admin - even one with full read/write/edit
    on every accounts module - must never be able to read this back."""
    current_user = getattr(request, "user", None)

    if not isinstance(current_user, Admin):
        return None, (jsonify({"success": False, "error": "Admin access required"}), 403)

    role = (getattr(current_user, "role", "") or "").strip().lower()
    admin_type = (getattr(current_user, "admin_type", "") or "").strip()

    is_super_admin = role == "super_admin" or admin_type == "Super Admin"

    if not is_super_admin:
        return None, (
            jsonify(
                {
                    "success": False,
                    "error": "Only a Super Admin can view Activity Logs",
                }
            ),
            403,
        )

    return current_user, None


class AccountsActivityLogsAPI(MethodView):
    """
    GET /api/accounts/activity-logs

    Every logged action taken by an Accounts Admin (admin_type =
    "Accounts Admin"), newest first. Super-Admin-only - see
    _require_super_admin() above. Query params: search, action
    (exact match), admin_id, days (defaults to last 30).
    """

    @login_required
    def get(self):
        _, access_error = _require_super_admin()
        if access_error:
            return access_error

        try:
            search = _clean_str(request.args.get("search"))
            action_filter = _clean_str(request.args.get("action"))
            admin_id = request.args.get("admin_id")
            days = int(request.args.get("days") or 30)

            since = datetime.utcnow() - timedelta(days=days)

            query = (
                db.session.query(ActivityLog, Admin)
                .join(Admin, Admin.id == ActivityLog.user_id)
                .filter(
                    ActivityLog.role == "admin",
                    Admin.admin_type == "Accounts Admin",
                    ActivityLog.created_at >= since,
                )
            )

            if admin_id:
                query = query.filter(Admin.id == int(admin_id))
            if action_filter:
                query = query.filter(ActivityLog.action == action_filter)
            if search:
                like = f"%{search}%"
                query = query.filter(
                    or_(
                        ActivityLog.description.ilike(like),
                        ActivityLog.action.ilike(like),
                    )
                )

            rows = query.order_by(ActivityLog.created_at.desc()).limit(500).all()

            logs = []
            alert_count = 0
            for log, admin_row in rows:
                is_alert = log.action == "accounts_alert" or "⚠️" in (log.description or "")
                if is_alert:
                    alert_count += 1

                logs.append(
                    {
                        "id": log.id,
                        "action": log.action,
                        "description": log.description,
                        "is_alert": is_alert,
                        "created_at": log.created_at.isoformat() if log.created_at else None,
                        "admin_id": admin_row.id,
                        "admin_name": _clean_str(
                            f"{admin_row.first_name} {admin_row.last_name}"
                        ),
                        "admin_code": admin_row.admin_id,
                    }
                )

            distinct_admins = db.session.query(Admin.id, Admin.first_name, Admin.last_name).filter(
                Admin.admin_type == "Accounts Admin", Admin.is_deleted.is_(False)
            ).all()

            return (
                jsonify(
                    {
                        "success": True,
                        "logs": logs,
                        "summary": {
                            "total": len(logs),
                            "alert_count": alert_count,
                            "period_days": days,
                        },
                        "accounts_admins": [
                            {"id": a[0], "name": _clean_str(f"{a[1]} {a[2]}")}
                            for a in distinct_admins
                        ],
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("DB error loading activity logs")
            db.session.rollback()
            return jsonify({"success": False, "error": "Database error"}), 500
