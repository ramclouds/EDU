from datetime import date, datetime, timedelta
import re

from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload
import logging

from utils.auth import db, Admin, Student
from utils.auth_middleware import login_required, get_current_user
from utils.rolePermissionManagement import user_has_permission
from utils.studentDetails import (
    StudentAcademicRecord,
    AcademicClass,
    Batch,
    Division,
    Section,
)

logger = logging.getLogger(__name__)


def clean_text(value):
    return re.sub(r"\s+", " ", str(value or "").strip())


def get_student_academic_details(student):

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

    academic_class = db.session.get(AcademicClass, academic_record.academic_class_id)

    if not academic_class:
        return {
            "academic_record_id": academic_record.id,
            "academic_class_id": academic_record.academic_class_id,
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

    batch = db.session.get(Batch, academic_class.batch_id)
    division = db.session.get(Division, academic_class.division_id)
    section = db.session.get(Section, academic_class.section_id)

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


# ============================= MODELS =============================
class Hostel(db.Model):
    __tablename__ = "hostels"

    id = db.Column(db.Integer, primary_key=True)

    hostel_name = db.Column(db.String(100), nullable=False, unique=True)

    # NEW: useful admin-facing fields.
    hostel_type = db.Column(
        db.Enum("Boys", "Girls", "Co-ed"),
        default="Boys",
    )
    address = db.Column(db.String(255))
    status = db.Column(
        db.Enum("Active", "Inactive"),
        default="Active",
        nullable=False,
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    blocks = db.relationship(
        "HostelBlock",
        backref="hostel",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )


class HostelBlock(db.Model):
    __tablename__ = "hostel_blocks"
    __table_args__ = (
        db.UniqueConstraint("hostel_id", "block_name", name="uq_block_hostel_name"),
    )

    id = db.Column(db.Integer, primary_key=True)

    hostel_id = db.Column(
        db.Integer,
        db.ForeignKey("hostels.id", ondelete="CASCADE"),
        nullable=False,
    )

    block_name = db.Column(db.String(10), nullable=False)

    # NEW: useful admin-facing fields.
    description = db.Column(db.String(255))
    status = db.Column(
        db.Enum("Active", "Inactive"),
        default="Active",
        nullable=False,
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    floors = db.relationship(
        "HostelFloor",
        backref="block",
        cascade="all, delete-orphan",
        lazy="dynamic",
        order_by="HostelFloor.floor_number",
    )


class HostelFloor(db.Model):
    __tablename__ = "hostel_floors"
    __table_args__ = (
        db.UniqueConstraint("block_id", "floor_number", name="uq_floor_block_number"),
    )

    id = db.Column(db.Integer, primary_key=True)

    block_id = db.Column(
        db.Integer,
        db.ForeignKey("hostel_blocks.id", ondelete="CASCADE"),
        nullable=False,
    )

    floor_number = db.Column(db.Integer, nullable=False)
    floor_name = db.Column(db.String(50))  # e.g. "Ground Floor", optional

    status = db.Column(
        db.Enum("Active", "Inactive"),
        default="Active",
        nullable=False,
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    rooms = db.relationship(
        "Room",
        backref="floor",
        cascade="all, delete-orphan",
        lazy="dynamic",
        order_by="Room.room_number",
    )


class Room(db.Model):
    __tablename__ = "rooms"
    __table_args__ = (
        db.UniqueConstraint("floor_id", "room_number", name="uq_room_floor_number"),
    )

    id = db.Column(db.Integer, primary_key=True)
    floor_id = db.Column(
        db.Integer,
        db.ForeignKey("hostel_floors.id", ondelete="CASCADE"),
        nullable=False,
    )

    room_number = db.Column(db.String(10), nullable=False)

    room_type = db.Column(
        db.Enum("Single", "Double", "Triple", "Dorm"),
        default="Double",
    )

    # NEW: useful admin-facing fields.
    status = db.Column(
        db.Enum("Active", "Maintenance", "Inactive"),
        default="Active",
        nullable=False,
    )
    monthly_rent = db.Column(db.Numeric(10, 2))
    description = db.Column(db.String(255))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    beds = db.relationship(
        "Bed",
        backref="room",
        cascade="all, delete-orphan",
        lazy="dynamic",
        order_by="Bed.bed_number",
    )

    @property
    def capacity(self):

        return self.beds.count()

    @property
    def occupied_count(self):
        return self.beds.filter(Bed.status == "Occupied").count()

    @property
    def available_count(self):
        return self.beds.filter(Bed.status == "Vacant").count()


class Bed(db.Model):
    __tablename__ = "beds"
    __table_args__ = (
        db.UniqueConstraint("room_id", "bed_number", name="uq_bed_room_number"),
    )

    id = db.Column(db.Integer, primary_key=True)

    room_id = db.Column(
        db.Integer,
        db.ForeignKey("rooms.id", ondelete="CASCADE"),
        nullable=False,
    )

    bed_number = db.Column(db.String(10), nullable=False)  # "A", "B", "1"...

    bed_type = db.Column(
        db.Enum("Standard", "Premium"),
        default="Standard",
    )

    status = db.Column(
        db.Enum("Vacant", "Occupied", "Maintenance", "Reserved"),
        default="Vacant",
        nullable=False,
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    allocations = db.relationship(
        "HostelAllocation",
        backref="bed",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )


class Warden(db.Model):
    __tablename__ = "wardens"

    id = db.Column(db.Integer, primary_key=True)

    first_name = db.Column(db.String(100))
    middle_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))

    mobile = db.Column(db.String(15))
    email = db.Column(db.String(100))


class RoomWarden(db.Model):
    __tablename__ = "room_wardens"

    id = db.Column(db.Integer, primary_key=True)

    room_id = db.Column(
        db.Integer,
        db.ForeignKey("rooms.id", ondelete="CASCADE"),
    )

    warden_id = db.Column(
        db.Integer,
        db.ForeignKey("wardens.id", ondelete="CASCADE"),
    )


class HostelAllocation(db.Model):
    __tablename__ = "hostel_allocations"

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id", ondelete="CASCADE"),
    )
    bed_id = db.Column(
        db.Integer,
        db.ForeignKey("beds.id", ondelete="CASCADE"),
        nullable=False,
    )

    check_in_date = db.Column(db.Date)
    check_out_date = db.Column(db.Date)

    is_active = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class HostelFeeStructure(db.Model):

    __tablename__ = "hostel_fee_structures"

    id = db.Column(db.Integer, primary_key=True)

    fee_type = db.Column(
        db.Enum(
            "Admission",
            "Monthly",
            "Quarterly",
            "Annual",
            "Security Deposit",
            "Mess Fee",
            "Other",
        ),
        nullable=False,
        default="Monthly",
    )

    hostel_id = db.Column(
        db.Integer,
        db.ForeignKey("hostels.id", ondelete="SET NULL"),
    )

    amount = db.Column(db.Numeric(10, 2), nullable=False)
    academic_year = db.Column(db.String(20))
    description = db.Column(db.String(255))

    status = db.Column(
        db.Enum("Active", "Inactive"),
        default="Active",
        nullable=False,
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    hostel = db.relationship("Hostel", foreign_keys=[hostel_id])


class HostelFee(db.Model):
    __tablename__ = "hostel_fees"

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id", ondelete="CASCADE"),
    )

    amount = db.Column(db.Numeric(10, 2))

    status = db.Column(
        db.Enum("Pending", "Paid", "Overdue"),
        default="Pending",
    )
    fee_structure_id = db.Column(
        db.Integer,
        db.ForeignKey("hostel_fee_structures.id", ondelete="SET NULL"),
    )
    fee_type = db.Column(
        db.Enum(
            "Admission",
            "Monthly",
            "Quarterly",
            "Annual",
            "Security Deposit",
            "Mess Fee",
            "Other",
        ),
    )
    due_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    fee_structure = db.relationship(
        "HostelFeeStructure", foreign_keys=[fee_structure_id]
    )
    payments = db.relationship(
        "HostelFeePayment",
        backref="fee",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )


class HostelFeePayment(db.Model):
    __tablename__ = "hostel_fee_payments"

    id = db.Column(db.Integer, primary_key=True)

    fee_id = db.Column(
        db.Integer,
        db.ForeignKey("hostel_fees.id", ondelete="CASCADE"),
        nullable=False,
    )

    amount = db.Column(db.Numeric(10, 2), nullable=False)

    payment_method = db.Column(
        db.Enum("Cash", "Card", "UPI", "Bank Transfer", "Cheque", "Other"),
        default="Cash",
    )

    transaction_reference = db.Column(db.String(100))
    notes = db.Column(db.String(255))

    payment_date = db.Column(db.Date, default=date.today)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class HostelActivityLog(db.Model):

    __tablename__ = "hostel_activity_logs"

    id = db.Column(db.Integer, primary_key=True)

    admin_id = db.Column(
        db.Integer,
        db.ForeignKey("admins.id", ondelete="SET NULL"),
    )
    admin_name = db.Column(db.String(150))

    category = db.Column(
        db.Enum(
            "Allocation",
            "Payment",
            "Complaint",
            "Maintenance",
            "Leave",
            "Staff",
            "Visitor",
            "Structure",
        ),
        nullable=False,
    )

    action = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class HostelComplaint(db.Model):
    __tablename__ = "hostel_complaints"

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id", ondelete="CASCADE"),
    )

    room_id = db.Column(
        db.Integer,
        db.ForeignKey("rooms.id", ondelete="SET NULL"),
    )

    issue = db.Column(db.Text)

    status = db.Column(
        db.Enum("Pending", "In Progress", "Resolved"),
        default="Pending",
    )

    # these) keeps working unchanged.
    category = db.Column(
        db.Enum("Electrical", "Plumbing", "Cleaning", "Furniture", "Internet", "Other"),
        default="Other",
    )
    priority = db.Column(
        db.Enum("Low", "Medium", "High", "Urgent"),
        default="Medium",
    )
    resolution_notes = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime)


class HostelMaintenanceRequest(db.Model):

    __tablename__ = "hostel_maintenance_requests"

    id = db.Column(db.Integer, primary_key=True)

    room_id = db.Column(
        db.Integer,
        db.ForeignKey("rooms.id", ondelete="SET NULL"),
    )

    block_id = db.Column(
        db.Integer,
        db.ForeignKey("hostel_blocks.id", ondelete="SET NULL"),
    )

    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)

    category = db.Column(
        db.Enum("Electrical", "Plumbing", "Carpentry", "HVAC", "Painting", "Other"),
        default="Other",
    )

    priority = db.Column(
        db.Enum("Low", "Medium", "High", "Urgent"),
        default="Medium",
    )

    status = db.Column(
        db.Enum("Open", "In Progress", "Resolved", "Cancelled"),
        default="Open",
        nullable=False,
    )

    assigned_staff_id = db.Column(
        db.Integer,
        db.ForeignKey("hostel_staff.id", ondelete="SET NULL"),
    )

    resolution_notes = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime)

    room = db.relationship("Room", foreign_keys=[room_id])
    block = db.relationship("HostelBlock", foreign_keys=[block_id])
    assigned_staff = db.relationship("HostelStaff", foreign_keys=[assigned_staff_id])


class HostelStaff(db.Model):

    __tablename__ = "hostel_staff"

    id = db.Column(db.Integer, primary_key=True)

    staff_code = db.Column(db.String(20), unique=True, nullable=False)

    first_name = db.Column(db.String(100), nullable=False)
    middle_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))

    role = db.Column(
        db.Enum(
            "Warden",
            "Security Guard",
            "Cleaner",
            "Cook",
            "Maintenance",
            "Other",
        ),
        nullable=False,
        default="Other",
    )

    # block.
    block_id = db.Column(
        db.Integer,
        db.ForeignKey("hostel_blocks.id", ondelete="SET NULL"),
        nullable=True,
    )

    shift = db.Column(
        db.Enum("Morning", "Evening", "Night"),
        default="Morning",
    )

    mobile = db.Column(db.String(15))
    email = db.Column(db.String(100))

    status = db.Column(
        db.Enum("Active", "On Leave", "Inactive"),
        default="Active",
        nullable=False,
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    block = db.relationship("HostelBlock")


class HostelVisitor(db.Model):
    __tablename__ = "hostel_visitors"

    id = db.Column(db.Integer, primary_key=True)

    visitor_code = db.Column(db.String(20), unique=True, nullable=False)
    visitor_name = db.Column(db.String(150), nullable=False)
    visitor_mobile = db.Column(db.String(15))

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
    )

    relation = db.Column(
        db.Enum("Parent", "Guardian", "Friend", "Relative", "Other"),
        default="Other",
        nullable=False,
    )

    purpose = db.Column(db.String(255))

    status = db.Column(
        db.Enum("Pending", "Approved", "Rejected", "Checked Out"),
        default="Pending",
        nullable=False,
    )

    check_in_time = db.Column(db.DateTime)
    check_out_time = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class HostelAttendance(db.Model):
    __tablename__ = "hostel_attendance"
    __table_args__ = (
        db.UniqueConstraint(
            "student_id", "attendance_date", name="uq_attendance_student_date"
        ),
    )

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
    )

    attendance_date = db.Column(db.Date, nullable=False, default=date.today)

    status = db.Column(
        db.Enum("Present", "Absent", "On Leave", "Late Entry"),
        nullable=False,
        default="Present",
    )

    check_in_time = db.Column(db.DateTime)
    remarks = db.Column(db.String(255))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class HostelMovement(db.Model):

    __tablename__ = "hostel_movements"

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
    )

    check_out_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    expected_return_time = db.Column(db.DateTime)
    check_in_time = db.Column(db.DateTime)

    purpose = db.Column(db.String(255))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def status(self):
        if not self.check_in_time:
            return "Outside Hostel"

        if self.expected_return_time and self.check_in_time > self.expected_return_time:
            return "Late Entry"

        return "Returned"


class HostelLeaveRequest(db.Model):

    __tablename__ = "hostel_leave_requests"

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
    )

    leave_type = db.Column(
        db.Enum("Weekend Leave", "Medical Leave", "Emergency Leave", "Other"),
        nullable=False,
        default="Other",
    )

    from_date = db.Column(db.Date, nullable=False)
    to_date = db.Column(db.Date, nullable=False)
    reason = db.Column(db.String(255))

    status = db.Column(
        db.Enum("Pending", "Approved", "Rejected", "Returned"),
        nullable=False,
        default="Pending",
    )

    actual_return_date = db.Column(db.Date)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class HostelMessMenu(db.Model):
    __tablename__ = "hostel_mess_menu"
    __table_args__ = (
        db.UniqueConstraint("day_of_week", "meal_type", name="uq_mess_menu_day_meal"),
    )

    id = db.Column(db.Integer, primary_key=True)

    day_of_week = db.Column(
        db.Enum(
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ),
        nullable=False,
    )

    meal_type = db.Column(
        db.Enum("Breakfast", "Lunch", "Snacks", "Dinner"),
        nullable=False,
    )

    items = db.Column(db.Text)  # newline or comma-separated dish names
    timing = db.Column(db.String(30))  # e.g. "7:30 AM - 9:00 AM", optional

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class HostelMealAttendance(db.Model):
    __tablename__ = "hostel_meal_attendance"
    __table_args__ = (
        db.UniqueConstraint(
            "student_id",
            "meal_date",
            "meal_type",
            name="uq_meal_attendance_student_date_meal",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
    )

    meal_date = db.Column(db.Date, nullable=False, default=date.today)

    meal_type = db.Column(
        db.Enum("Breakfast", "Lunch", "Snacks", "Dinner"),
        nullable=False,
    )

    status = db.Column(
        db.Enum("Present", "Absent"),
        nullable=False,
        default="Present",
    )

    marked_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ============================= HELPERS =============================
def safe_full_name(first_name=None, middle_name=None, last_name=None):
    parts = [
        first_name or "",
        middle_name or "",
        last_name or "",
    ]

    return " ".join(part.strip() for part in parts if part).strip()


def get_student_room_info(student_id):
    allocation = HostelAllocation.query.filter_by(
        student_id=student_id, is_active=True
    ).first()

    bed = allocation.bed if allocation else None
    room = bed.room if bed else None
    floor = room.floor if room else None
    block = floor.block if floor else None

    return {
        "room_number": room.room_number if room else None,
        "block_name": block.block_name if block else None,
        "bed_number": bed.bed_number if bed else None,
    }


# ============================= RBAC (READ / WRITE) =============================
def get_fee_payment_summary(fee):
    """
    The real, always-correct status/balance for a fee invoice, derived
    live from its payments rather than trusting a manually-set status
    column that could drift out of sync as installments come in.
    """

    paid = sum(float(p.amount) for p in fee.payments)
    amount = float(fee.amount or 0)
    balance = round(amount - paid, 2)

    if balance <= 0:
        status = "Paid"
    elif paid > 0:
        status = "Partially Paid"
    elif fee.due_date and fee.due_date < date.today():
        status = "Overdue"
    else:
        status = "Pending"

    return {"paid_amount": round(paid, 2), "balance": max(balance, 0), "status": status}


def serialize_fee(fee):
    student = Student.query.get(fee.student_id) if fee.student_id else None
    room_info = get_student_room_info(fee.student_id) if fee.student_id else {}
    summary = get_fee_payment_summary(fee)

    return {
        "id": fee.id,
        "student_id": fee.student_id,
        "student_code": (
            getattr(student, "student_id", student.id) if student else None
        ),
        "student_name": (
            safe_full_name(
                student.first_name,
                getattr(student, "middle_name", None),
                student.last_name,
            )
            if student
            else "Unknown student"
        ),
        "room_number": room_info.get("room_number"),
        "block_name": room_info.get("block_name"),
        "fee_type": fee.fee_type or "Other",
        "amount": float(fee.amount) if fee.amount is not None else 0,
        "paid_amount": summary["paid_amount"],
        "balance": summary["balance"],
        "status": summary["status"],
        "due_date": fee.due_date.isoformat() if fee.due_date else None,
        "created_at": fee.created_at.isoformat() if fee.created_at else None,
    }


def serialize_fee_structure(structure):
    return {
        "id": structure.id,
        "fee_type": structure.fee_type,
        "hostel_id": structure.hostel_id,
        "hostel_name": structure.hostel.hostel_name if structure.hostel else None,
        "amount": float(structure.amount) if structure.amount is not None else 0,
        "academic_year": structure.academic_year,
        "description": structure.description,
        "status": structure.status,
        "created_at": (
            structure.created_at.isoformat() if structure.created_at else None
        ),
    }


def serialize_payment(payment):
    fee = payment.fee
    student = Student.query.get(fee.student_id) if fee and fee.student_id else None

    return {
        "id": payment.id,
        "fee_id": payment.fee_id,
        "student_id": fee.student_id if fee else None,
        "student_code": (
            getattr(student, "student_id", student.id) if student else None
        ),
        "student_name": (
            safe_full_name(
                student.first_name,
                getattr(student, "middle_name", None),
                student.last_name,
            )
            if student
            else "Unknown student"
        ),
        "fee_type": fee.fee_type if fee else None,
        "amount": float(payment.amount) if payment.amount is not None else 0,
        "payment_method": payment.payment_method,
        "transaction_reference": payment.transaction_reference,
        "notes": payment.notes,
        "payment_date": (
            payment.payment_date.isoformat() if payment.payment_date else None
        ),
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
    }


def log_hostel_activity(category, action, description):
    current_user = getattr(request, "user", None)

    admin_name = (
        safe_full_name(
            getattr(current_user, "first_name", None),
            getattr(current_user, "middle_name", None),
            getattr(current_user, "last_name", None),
        )
        if current_user
        else ""
    ) or "System"

    db.session.add(
        HostelActivityLog(
            admin_id=getattr(current_user, "id", None),
            admin_name=admin_name,
            category=category,
            action=action,
            description=description,
        )
    )


def serialize_activity_log(log):
    return {
        "id": log.id,
        "admin_name": log.admin_name,
        "category": log.category,
        "action": log.action,
        "description": log.description,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }


def authorize_hostel_admin(required_right="read"):
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

    role = (getattr(current_user, "role", "") or "").strip().lower()

    admin_type = (getattr(current_user, "admin_type", "") or "").strip().lower()

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
        "hostel",
        required_action,
    )

    if not has_permission:
        return None, (
            jsonify(
                {
                    "success": False,
                    "error": "Permission denied",
                    "required_permission": {
                        "module": "hostel",
                        "action": required_action,
                    },
                }
            ),
            403,
        )

    return current_user, None


# ============================= SERIALIZERS =============================
def serialize_hostel(hostel, include_stats=False):
    data = {
        "id": hostel.id,
        "hostel_name": hostel.hostel_name,
        "hostel_type": hostel.hostel_type,
        "address": hostel.address,
        "status": hostel.status,
        "created_at": (hostel.created_at.isoformat() if hostel.created_at else None),
    }

    if include_stats:
        blocks = hostel.blocks.all()
        floors = [floor for block in blocks for floor in block.floors]
        rooms = [room for floor in floors for room in floor.rooms]
        beds = [bed for room in rooms for bed in room.beds]

        data["stats"] = {
            "blocks": len(blocks),
            "floors": len(floors),
            "rooms": len(rooms),
            "beds": len(beds),
            "occupied_beds": sum(1 for bed in beds if bed.status == "Occupied"),
            "available_beds": sum(1 for bed in beds if bed.status == "Vacant"),
        }

    return data


def serialize_block(block, include_floor_count=True):
    data = {
        "id": block.id,
        "hostel_id": block.hostel_id,
        "hostel_name": block.hostel.hostel_name if block.hostel else None,
        "block_name": block.block_name,
        "description": block.description,
        "status": block.status,
        "created_at": (block.created_at.isoformat() if block.created_at else None),
    }

    if include_floor_count:
        data["floor_count"] = block.floors.count()

    return data


def serialize_floor(floor, include_room_count=True):
    data = {
        "id": floor.id,
        "block_id": floor.block_id,
        "block_name": floor.block.block_name if floor.block else None,
        "hostel_id": (floor.block.hostel_id if floor.block else None),
        "hostel_name": (
            floor.block.hostel.hostel_name
            if floor.block and floor.block.hostel
            else None
        ),
        "floor_number": floor.floor_number,
        "floor_name": floor.floor_name,
        "status": floor.status,
        "created_at": (floor.created_at.isoformat() if floor.created_at else None),
    }

    if include_room_count:
        data["room_count"] = floor.rooms.count()

    return data


def serialize_bed(bed, include_occupant=True):
    data = {
        "id": bed.id,
        "room_id": bed.room_id,
        "bed_number": bed.bed_number,
        "bed_type": bed.bed_type,
        "status": bed.status,
        "created_at": bed.created_at.isoformat() if bed.created_at else None,
        "occupant": None,
    }

    if include_occupant and bed.status == "Occupied":
        allocation = (
            HostelAllocation.query.filter_by(bed_id=bed.id, is_active=True)
            .order_by(HostelAllocation.id.desc())
            .first()
        )

        if allocation:
            student = Student.query.get(allocation.student_id)

            if student:
                data["occupant"] = {
                    "allocation_id": allocation.id,
                    "student_id": student.id,
                    "student_code": getattr(student, "student_id", student.id),
                    "name": safe_full_name(
                        student.first_name,
                        getattr(student, "middle_name", None),
                        student.last_name,
                    ),
                    "check_in_date": (
                        allocation.check_in_date.isoformat()
                        if allocation.check_in_date
                        else None
                    ),
                }

    return data


def serialize_room(room, include_beds=False):
    data = {
        "id": room.id,
        "floor_id": room.floor_id,
        "floor_number": room.floor.floor_number if room.floor else None,
        "floor_name": room.floor.floor_name if room.floor else None,
        "block_id": (room.floor.block_id if room.floor else None),
        "block_name": (
            room.floor.block.block_name if room.floor and room.floor.block else None
        ),
        "hostel_id": (
            room.floor.block.hostel_id if room.floor and room.floor.block else None
        ),
        "hostel_name": (
            room.floor.block.hostel.hostel_name
            if room.floor and room.floor.block and room.floor.block.hostel
            else None
        ),
        "room_number": room.room_number,
        "room_type": room.room_type,
        "status": room.status,
        "monthly_rent": (
            float(room.monthly_rent) if room.monthly_rent is not None else None
        ),
        "description": room.description,
        "capacity": room.capacity,
        "occupied_count": room.occupied_count,
        "available_count": room.available_count,
        "created_at": (room.created_at.isoformat() if room.created_at else None),
    }

    room_wardens = RoomWarden.query.filter_by(room_id=room.id).all()
    wardens = []

    for rw in room_wardens:
        warden = Warden.query.get(rw.warden_id)

        if warden:
            wardens.append(
                {
                    "id": warden.id,
                    "name": safe_full_name(
                        warden.first_name, warden.middle_name, warden.last_name
                    ),
                    "mobile": warden.mobile,
                    "email": warden.email,
                }
            )

    data["wardens"] = wardens

    if include_beds:
        data["beds"] = [
            serialize_bed(bed) for bed in room.beds.order_by(Bed.bed_number)
        ]

    return data


# ============================= STUDENT HOSTEL DETAILS =============================
class StudentHostelDetails(MethodView):

    @login_required
    def get(self, student_id):

        try:
            # ================= STUDENT =================
            student = Student.query.get(student_id)

            if not student:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Student not found",
                        }
                    ),
                    404,
                )

            # ================= ALLOCATION =================
            allocation = HostelAllocation.query.filter_by(
                student_id=student.id,
                is_active=True,
            ).first()

            # NO ACTIVE HOSTEL
            if not allocation:
                return (
                    jsonify(
                        {
                            "success": True,
                            "message": "No hostel allocation found",
                            "data": {
                                "room_number": None,
                                "room_type": None,
                                "block": None,
                                "floor": None,
                                "bed_number": None,
                                "check_in_date": None,
                                "check_out_date": None,
                                "warden": None,
                                "roommates": [],
                                "complaints": [],
                                "fee_status": None,
                            },
                        }
                    ),
                    200,
                )

            # ================= ROOM (via Bed) =================
            bed = Bed.query.get(allocation.bed_id)
            room = bed.room if bed else None

            if not room:
                logger.warning(f"Room not found for allocation_id={allocation.id}")

            # ================= BLOCK / FLOOR =================
            floor = room.floor if room else None
            block = floor.block if floor else None

            # ================= WARDEN =================
            rw = None
            warden = None

            if room:
                rw = RoomWarden.query.filter_by(room_id=room.id).first()

            if rw:
                warden = Warden.query.get(rw.warden_id)

            # ================= ROOMMATES =================
            roommates = []

            if room:
                roommates_query = (
                    HostelAllocation.query.join(Bed, HostelAllocation.bed_id == Bed.id)
                    .filter(
                        Bed.room_id == room.id,
                        HostelAllocation.student_id != student.id,
                        HostelAllocation.is_active == True,
                    )
                    .all()
                )

                for r in roommates_query:

                    roommate_student = Student.query.get(r.student_id)

                    if roommate_student:
                        roommates.append(
                            {
                                "id": roommate_student.id,
                                # fallback safe handling
                                "student_id": getattr(
                                    roommate_student,
                                    "student_id",
                                    roommate_student.id,
                                ),
                                "name": safe_full_name(
                                    roommate_student.first_name,
                                    getattr(roommate_student, "middle_name", None),
                                    roommate_student.last_name,
                                ),
                                "bed_number": r.bed.bed_number if r.bed else None,
                            }
                        )

            # ================= COMPLAINTS =================
            complaints_query = (
                HostelComplaint.query.filter_by(student_id=student.id)
                .order_by(HostelComplaint.id.desc())
                .all()
            )

            complaints = []

            for c in complaints_query:
                complaints.append(
                    {
                        "id": c.id,
                        "issue": c.issue,
                        "status": c.status,
                    }
                )

            # ================= FEES =================
            fee = HostelFee.query.filter_by(student_id=student.id).first()

            # ================= RESPONSE =================
            response_data = {
                "room_number": room.room_number if room else None,
                "room_type": room.room_type if room else None,
                "block": block.block_name if block else None,
                "floor": floor.floor_number if floor else None,
                "floor_name": floor.floor_name if floor else None,
                "capacity": room.capacity if room else None,
                "bed_number": bed.bed_number if bed else None,
                "check_in_date": (
                    allocation.check_in_date.isoformat()
                    if allocation.check_in_date
                    else None
                ),
                "check_out_date": (
                    allocation.check_out_date.isoformat()
                    if allocation.check_out_date
                    else None
                ),
                "warden": (
                    {
                        "id": warden.id,
                        "name": safe_full_name(
                            warden.first_name,
                            warden.middle_name,
                            warden.last_name,
                        ),
                        "mobile": warden.mobile,
                        "email": warden.email,
                    }
                    if warden
                    else None
                ),
                "roommates": roommates,
                "complaints": complaints,
                "fee_status": fee.status if fee else None,
                "fee_amount": (
                    float(fee.amount) if fee and fee.amount is not None else None
                ),
            }

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Hostel details fetched successfully",
                        "data": response_data,
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception(
                f"Database error while fetching hostel details for student_id={student_id}"
            )

            db.session.rollback()

            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Database error occurred",
                        "error": str(e),
                    }
                ),
                500,
            )

        except Exception as e:
            logger.exception(
                f"Unexpected error while fetching hostel details for student_id={student_id}"
            )

            db.session.rollback()

            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Something went wrong",
                        "error": str(e),
                    }
                ),
                500,
            )


# ============================= CREATE COMPLAINT =============================
class CreateHostelComplaint(MethodView):

    @login_required
    def post(self, student_id):

        try:
            data = request.get_json()

            if not data:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Request body is required",
                        }
                    ),
                    400,
                )

            issue = data.get("issue", "").strip()

            if not issue:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Issue is required",
                        }
                    ),
                    400,
                )

            # ================= STUDENT CHECK =================
            student = Student.query.get(student_id)

            if not student:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Student not found",
                        }
                    ),
                    404,
                )

            # ================= ALLOCATION =================
            allocation = HostelAllocation.query.filter_by(
                student_id=student_id,
                is_active=True,
            ).first()

            complaint = HostelComplaint(
                student_id=student_id,
                room_id=(
                    allocation.bed.room_id if allocation and allocation.bed else None
                ),
                issue=issue,
            )

            db.session.add(complaint)
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Complaint submitted successfully",
                        "data": {
                            "complaint_id": complaint.id,
                            "issue": complaint.issue,
                            "status": complaint.status,
                        },
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception(
                f"Database error while creating complaint for student_id={student_id}"
            )

            db.session.rollback()

            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Database error occurred",
                        "error": str(e),
                    }
                ),
                500,
            )

        except Exception as e:
            logger.exception(
                f"Unexpected error while creating complaint for student_id={student_id}"
            )

            db.session.rollback()

            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Something went wrong",
                        "error": str(e),
                    }
                ),
                500,
            )


# ============================= INPUT HELPERS =============================
def _clean_str(value):
    if value is None:
        return ""

    return str(value).strip()


def _parse_int(value, default=None):
    try:
        if value is None or str(value).strip() == "":
            return default

        return int(value)
    except (TypeError, ValueError):
        return default


def _parse_decimal(value):
    if value is None or str(value).strip() == "":
        return None

    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return None


def _parse_date(value):
    if not value:
        return None

    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


# ============================= HOSTELS =============================
class HostelListAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            hostels = Hostel.query.order_by(Hostel.hostel_name.asc()).all()

            return (
                jsonify(
                    {
                        "success": True,
                        "hostels": [
                            serialize_hostel(hostel, include_stats=True)
                            for hostel in hostels
                        ],
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while listing hostels")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def post(self):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            hostel_name = _clean_str(data.get("hostel_name"))

            if not hostel_name:
                return (
                    jsonify({"success": False, "error": "Hostel name is required"}),
                    400,
                )

            if Hostel.query.filter(
                func.lower(Hostel.hostel_name) == hostel_name.lower()
            ).first():
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": f'A hostel named "{hostel_name}" already exists',
                        }
                    ),
                    409,
                )

            hostel_type = _clean_str(data.get("hostel_type")) or "Boys"

            if hostel_type not in {"Boys", "Girls", "Co-ed"}:
                return (
                    jsonify({"success": False, "error": "Invalid hostel_type"}),
                    400,
                )

            hostel = Hostel(
                hostel_name=hostel_name,
                hostel_type=hostel_type,
                address=_clean_str(data.get("address")) or None,
                status=_clean_str(data.get("status")) or "Active",
            )

            db.session.add(hostel)
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Hostel created successfully",
                        "hostel": serialize_hostel(hostel, include_stats=True),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while creating hostel")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelDetailAPI(MethodView):

    @login_required
    def get(self, hostel_id):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        hostel = Hostel.query.get(hostel_id)

        if not hostel:
            return jsonify({"success": False, "error": "Hostel not found"}), 404

        return (
            jsonify(
                {
                    "success": True,
                    "hostel": serialize_hostel(hostel, include_stats=True),
                }
            ),
            200,
        )

    @login_required
    def put(self, hostel_id):
        _, access_error = authorize_hostel_admin("edit")

        if access_error:
            return access_error

        hostel = Hostel.query.get(hostel_id)

        if not hostel:
            return jsonify({"success": False, "error": "Hostel not found"}), 404

        try:
            data = request.get_json(silent=True) or {}

            hostel_name = _clean_str(data.get("hostel_name"))

            if hostel_name:
                duplicate = Hostel.query.filter(
                    func.lower(Hostel.hostel_name) == hostel_name.lower(),
                    Hostel.id != hostel.id,
                ).first()

                if duplicate:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": f'A hostel named "{hostel_name}" already exists',
                            }
                        ),
                        409,
                    )

                hostel.hostel_name = hostel_name

            if data.get("hostel_type") is not None:
                hostel_type = _clean_str(data.get("hostel_type"))

                if hostel_type not in {"Boys", "Girls", "Co-ed"}:
                    return (
                        jsonify({"success": False, "error": "Invalid hostel_type"}),
                        400,
                    )

                hostel.hostel_type = hostel_type

            if data.get("address") is not None:
                hostel.address = _clean_str(data.get("address")) or None

            if data.get("status") is not None:
                status = _clean_str(data.get("status"))

                if status not in {"Active", "Inactive"}:
                    return jsonify({"success": False, "error": "Invalid status"}), 400

                hostel.status = status

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Hostel updated successfully",
                        "hostel": serialize_hostel(hostel, include_stats=True),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while updating hostel")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def delete(self, hostel_id):
        _, access_error = authorize_hostel_admin("delete")

        if access_error:
            return access_error

        hostel = Hostel.query.get(hostel_id)

        if not hostel:
            return jsonify({"success": False, "error": "Hostel not found"}), 404

        try:
            if hostel.blocks.count() > 0:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": (
                                "This hostel still has blocks under it. Delete or "
                                "move those blocks first."
                            ),
                        }
                    ),
                    409,
                )

            db.session.delete(hostel)
            db.session.commit()

            return (
                jsonify({"success": True, "message": "Hostel deleted successfully"}),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while deleting hostel")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= BLOCKS =============================
class HostelBlockListAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            hostel_id = _parse_int(request.args.get("hostel_id"))

            query = HostelBlock.query

            if hostel_id:
                query = query.filter(HostelBlock.hostel_id == hostel_id)

            blocks = query.order_by(HostelBlock.block_name.asc()).all()

            return (
                jsonify(
                    {
                        "success": True,
                        "blocks": [serialize_block(block) for block in blocks],
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while listing blocks")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def post(self):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            hostel_id = _parse_int(data.get("hostel_id"))
            block_name = _clean_str(data.get("block_name"))

            if not hostel_id or not block_name:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "hostel_id and block_name are required",
                        }
                    ),
                    400,
                )

            hostel = Hostel.query.get(hostel_id)

            if not hostel:
                return jsonify({"success": False, "error": "Hostel not found"}), 404

            if HostelBlock.query.filter(
                HostelBlock.hostel_id == hostel_id,
                func.lower(HostelBlock.block_name) == block_name.lower(),
            ).first():
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": f'Block "{block_name}" already exists in this hostel',
                        }
                    ),
                    409,
                )

            block = HostelBlock(
                hostel_id=hostel_id,
                block_name=block_name,
                description=_clean_str(data.get("description")) or None,
                status=_clean_str(data.get("status")) or "Active",
            )

            db.session.add(block)
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Block created successfully",
                        "block": serialize_block(block),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while creating block")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelBlockDetailAPI(MethodView):

    @login_required
    def get(self, block_id):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        block = HostelBlock.query.get(block_id)

        if not block:
            return jsonify({"success": False, "error": "Block not found"}), 404

        return jsonify({"success": True, "block": serialize_block(block)}), 200

    @login_required
    def put(self, block_id):
        _, access_error = authorize_hostel_admin("edit")

        if access_error:
            return access_error

        block = HostelBlock.query.get(block_id)

        if not block:
            return jsonify({"success": False, "error": "Block not found"}), 404

        try:
            data = request.get_json(silent=True) or {}

            block_name = _clean_str(data.get("block_name"))

            if block_name:
                duplicate = HostelBlock.query.filter(
                    HostelBlock.hostel_id == block.hostel_id,
                    func.lower(HostelBlock.block_name) == block_name.lower(),
                    HostelBlock.id != block.id,
                ).first()

                if duplicate:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": f'Block "{block_name}" already exists in this hostel',
                            }
                        ),
                        409,
                    )

                block.block_name = block_name

            if data.get("description") is not None:
                block.description = _clean_str(data.get("description")) or None

            if data.get("status") is not None:
                status = _clean_str(data.get("status"))

                if status not in {"Active", "Inactive"}:
                    return jsonify({"success": False, "error": "Invalid status"}), 400

                block.status = status

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Block updated successfully",
                        "block": serialize_block(block),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while updating block")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def delete(self, block_id):
        _, access_error = authorize_hostel_admin("delete")

        if access_error:
            return access_error

        block = HostelBlock.query.get(block_id)

        if not block:
            return jsonify({"success": False, "error": "Block not found"}), 404

        try:
            if block.floors.count() > 0:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": (
                                "This block still has floors under it. Delete "
                                "those floors first."
                            ),
                        }
                    ),
                    409,
                )

            db.session.delete(block)
            db.session.commit()

            return (
                jsonify({"success": True, "message": "Block deleted successfully"}),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while deleting block")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= FLOORS =============================
class HostelFloorListAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            block_id = _parse_int(request.args.get("block_id"))
            hostel_id = _parse_int(request.args.get("hostel_id"))

            query = HostelFloor.query

            if block_id:
                query = query.filter(HostelFloor.block_id == block_id)
            elif hostel_id:
                query = query.join(HostelBlock).filter(
                    HostelBlock.hostel_id == hostel_id
                )

            floors = query.order_by(HostelFloor.floor_number.asc()).all()

            return (
                jsonify(
                    {
                        "success": True,
                        "floors": [serialize_floor(floor) for floor in floors],
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while listing floors")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def post(self):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            block_id = _parse_int(data.get("block_id"))
            floor_number = _parse_int(data.get("floor_number"))

            if not block_id or floor_number is None:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "block_id and floor_number are required",
                        }
                    ),
                    400,
                )

            block = HostelBlock.query.get(block_id)

            if not block:
                return jsonify({"success": False, "error": "Block not found"}), 404

            if HostelFloor.query.filter(
                HostelFloor.block_id == block_id,
                HostelFloor.floor_number == floor_number,
            ).first():
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": (
                                f"Floor {floor_number} already exists in this block"
                            ),
                        }
                    ),
                    409,
                )

            floor = HostelFloor(
                block_id=block_id,
                floor_number=floor_number,
                floor_name=_clean_str(data.get("floor_name")) or None,
                status=_clean_str(data.get("status")) or "Active",
            )

            db.session.add(floor)
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Floor created successfully",
                        "floor": serialize_floor(floor),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while creating floor")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelFloorDetailAPI(MethodView):

    @login_required
    def get(self, floor_id):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        floor = HostelFloor.query.get(floor_id)

        if not floor:
            return jsonify({"success": False, "error": "Floor not found"}), 404

        return jsonify({"success": True, "floor": serialize_floor(floor)}), 200

    @login_required
    def put(self, floor_id):
        _, access_error = authorize_hostel_admin("edit")

        if access_error:
            return access_error

        floor = HostelFloor.query.get(floor_id)

        if not floor:
            return jsonify({"success": False, "error": "Floor not found"}), 404

        try:
            data = request.get_json(silent=True) or {}

            if data.get("floor_number") is not None:
                floor_number = _parse_int(data.get("floor_number"))

                if floor_number is None:
                    return (
                        jsonify({"success": False, "error": "Invalid floor_number"}),
                        400,
                    )

                duplicate = HostelFloor.query.filter(
                    HostelFloor.block_id == floor.block_id,
                    HostelFloor.floor_number == floor_number,
                    HostelFloor.id != floor.id,
                ).first()

                if duplicate:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": (
                                    f"Floor {floor_number} already exists in this block"
                                ),
                            }
                        ),
                        409,
                    )

                floor.floor_number = floor_number

            if data.get("floor_name") is not None:
                floor.floor_name = _clean_str(data.get("floor_name")) or None

            if data.get("status") is not None:
                status = _clean_str(data.get("status"))

                if status not in {"Active", "Inactive"}:
                    return jsonify({"success": False, "error": "Invalid status"}), 400

                floor.status = status

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Floor updated successfully",
                        "floor": serialize_floor(floor),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while updating floor")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def delete(self, floor_id):
        _, access_error = authorize_hostel_admin("delete")

        if access_error:
            return access_error

        floor = HostelFloor.query.get(floor_id)

        if not floor:
            return jsonify({"success": False, "error": "Floor not found"}), 404

        try:
            if floor.rooms.count() > 0:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": (
                                "This floor still has rooms under it. Delete "
                                "those rooms first."
                            ),
                        }
                    ),
                    409,
                )

            db.session.delete(floor)
            db.session.commit()

            return (
                jsonify({"success": True, "message": "Floor deleted successfully"}),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while deleting floor")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= ROOMS =============================
class HostelRoomListAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            floor_id = _parse_int(request.args.get("floor_id"))
            block_id = _parse_int(request.args.get("block_id"))
            hostel_id = _parse_int(request.args.get("hostel_id"))
            search = _clean_str(request.args.get("search"))
            status = _clean_str(request.args.get("status"))
            room_type = _clean_str(request.args.get("room_type"))

            query = Room.query.options(
                joinedload(Room.floor)
                .joinedload(HostelFloor.block)
                .joinedload(HostelBlock.hostel)
            )

            if floor_id:
                query = query.filter(Room.floor_id == floor_id)
            elif block_id:
                query = query.join(HostelFloor).filter(HostelFloor.block_id == block_id)
            elif hostel_id:
                query = (
                    query.join(HostelFloor)
                    .join(HostelBlock)
                    .filter(HostelBlock.hostel_id == hostel_id)
                )

            if search:
                query = query.filter(Room.room_number.ilike(f"%{search}%"))

            if status:
                query = query.filter(Room.status == status)

            if room_type:
                query = query.filter(Room.room_type == room_type)

            rooms = query.order_by(Room.room_number.asc()).all()

            return (
                jsonify(
                    {
                        "success": True,
                        "rooms": [serialize_room(room) for room in rooms],
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while listing rooms")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def post(self):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            floor_id = _parse_int(data.get("floor_id"))
            room_number = _clean_str(data.get("room_number"))
            room_type = _clean_str(data.get("room_type")) or "Double"

            if not floor_id or not room_number:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "floor_id and room_number are required",
                        }
                    ),
                    400,
                )

            floor = HostelFloor.query.get(floor_id)

            if not floor:
                return jsonify({"success": False, "error": "Floor not found"}), 404

            if room_type not in {"Single", "Double", "Triple", "Dorm"}:
                return jsonify({"success": False, "error": "Invalid room_type"}), 400

            if Room.query.filter(
                Room.floor_id == floor_id,
                func.lower(Room.room_number) == room_number.lower(),
            ).first():
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": f'Room "{room_number}" already exists on this floor',
                        }
                    ),
                    409,
                )

            monthly_rent = _parse_decimal(data.get("monthly_rent"))

            room = Room(
                floor_id=floor_id,
                room_number=room_number,
                room_type=room_type,
                status=_clean_str(data.get("status")) or "Active",
                monthly_rent=monthly_rent,
                description=_clean_str(data.get("description")) or None,
            )

            db.session.add(room)
            db.session.flush()  # room.id is now available

            initial_bed_count = _parse_int(data.get("initial_bed_count"), 0) or 0
            initial_bed_count = max(0, min(initial_bed_count, 12))

            bed_labels = "ABCDEFGHIJKL"

            for index in range(initial_bed_count):
                db.session.add(
                    Bed(
                        room_id=room.id,
                        bed_number=bed_labels[index],
                        status="Vacant",
                    )
                )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Room created successfully",
                        "room": serialize_room(room, include_beds=True),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while creating room")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelRoomDetailAPI(MethodView):

    @login_required
    def get(self, room_id):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        room = Room.query.get(room_id)

        if not room:
            return jsonify({"success": False, "error": "Room not found"}), 404

        return (
            jsonify({"success": True, "room": serialize_room(room, include_beds=True)}),
            200,
        )

    @login_required
    def put(self, room_id):
        _, access_error = authorize_hostel_admin("edit")

        if access_error:
            return access_error

        room = Room.query.get(room_id)

        if not room:
            return jsonify({"success": False, "error": "Room not found"}), 404

        try:
            data = request.get_json(silent=True) or {}

            room_number = _clean_str(data.get("room_number"))

            if room_number:
                duplicate = Room.query.filter(
                    Room.floor_id == room.floor_id,
                    func.lower(Room.room_number) == room_number.lower(),
                    Room.id != room.id,
                ).first()

                if duplicate:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": (
                                    f'Room "{room_number}" already exists on this floor'
                                ),
                            }
                        ),
                        409,
                    )

                room.room_number = room_number

            if data.get("room_type") is not None:
                room_type = _clean_str(data.get("room_type"))

                if room_type not in {"Single", "Double", "Triple", "Dorm"}:
                    return (
                        jsonify({"success": False, "error": "Invalid room_type"}),
                        400,
                    )

                room.room_type = room_type

            if data.get("status") is not None:
                status = _clean_str(data.get("status"))

                if status not in {"Active", "Maintenance", "Inactive"}:
                    return jsonify({"success": False, "error": "Invalid status"}), 400

                room.status = status

            if "monthly_rent" in data:
                room.monthly_rent = _parse_decimal(data.get("monthly_rent"))

            if data.get("description") is not None:
                room.description = _clean_str(data.get("description")) or None

            if data.get("floor_id") is not None:
                new_floor_id = _parse_int(data.get("floor_id"))
                new_floor = (
                    HostelFloor.query.get(new_floor_id) if new_floor_id else None
                )

                if not new_floor:
                    return jsonify({"success": False, "error": "Floor not found"}), 404

                room.floor_id = new_floor_id

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Room updated successfully",
                        "room": serialize_room(room, include_beds=True),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while updating room")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def delete(self, room_id):
        _, access_error = authorize_hostel_admin("delete")

        if access_error:
            return access_error

        room = Room.query.get(room_id)

        if not room:
            return jsonify({"success": False, "error": "Room not found"}), 404

        try:
            if room.occupied_count > 0:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": (
                                "This room still has an occupied bed. Vacate "
                                "every bed in this room first."
                            ),
                        }
                    ),
                    409,
                )

            db.session.delete(room)
            db.session.commit()

            return (
                jsonify({"success": True, "message": "Room deleted successfully"}),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while deleting room")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= BEDS =============================
class HostelBedListAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            room_id = _parse_int(request.args.get("room_id"))
            floor_id = _parse_int(request.args.get("floor_id"))
            block_id = _parse_int(request.args.get("block_id"))
            status = _clean_str(request.args.get("status"))

            query = Bed.query

            if room_id:
                query = query.filter(Bed.room_id == room_id)
            elif floor_id:
                query = query.join(Room).filter(Room.floor_id == floor_id)
            elif block_id:
                query = (
                    query.join(Room)
                    .join(HostelFloor)
                    .filter(HostelFloor.block_id == block_id)
                )

            if status:
                query = query.filter(Bed.status == status)

            beds = query.order_by(Bed.room_id.asc(), Bed.bed_number.asc()).all()

            return (
                jsonify(
                    {"success": True, "beds": [serialize_bed(bed) for bed in beds]}
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while listing beds")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def post(self):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            room_id = _parse_int(data.get("room_id"))
            bed_number = _clean_str(data.get("bed_number"))

            if not room_id or not bed_number:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "room_id and bed_number are required",
                        }
                    ),
                    400,
                )

            room = Room.query.get(room_id)

            if not room:
                return jsonify({"success": False, "error": "Room not found"}), 404

            if Bed.query.filter(
                Bed.room_id == room_id,
                func.lower(Bed.bed_number) == bed_number.lower(),
            ).first():
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": f'Bed "{bed_number}" already exists in this room',
                        }
                    ),
                    409,
                )

            bed_type = _clean_str(data.get("bed_type")) or "Standard"

            if bed_type not in {"Standard", "Premium"}:
                return jsonify({"success": False, "error": "Invalid bed_type"}), 400

            bed = Bed(
                room_id=room_id,
                bed_number=bed_number,
                bed_type=bed_type,
                status="Vacant",
            )

            db.session.add(bed)
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Bed created successfully",
                        "bed": serialize_bed(bed),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while creating bed")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelBedDetailAPI(MethodView):

    @login_required
    def get(self, bed_id):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        bed = Bed.query.get(bed_id)

        if not bed:
            return jsonify({"success": False, "error": "Bed not found"}), 404

        return jsonify({"success": True, "bed": serialize_bed(bed)}), 200

    @login_required
    def put(self, bed_id):
        _, access_error = authorize_hostel_admin("edit")

        if access_error:
            return access_error

        bed = Bed.query.get(bed_id)

        if not bed:
            return jsonify({"success": False, "error": "Bed not found"}), 404

        try:
            data = request.get_json(silent=True) or {}

            bed_number = _clean_str(data.get("bed_number"))

            if bed_number:
                duplicate = Bed.query.filter(
                    Bed.room_id == bed.room_id,
                    func.lower(Bed.bed_number) == bed_number.lower(),
                    Bed.id != bed.id,
                ).first()

                if duplicate:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": (
                                    f'Bed "{bed_number}" already exists in this room'
                                ),
                            }
                        ),
                        409,
                    )

                bed.bed_number = bed_number

            if data.get("bed_type") is not None:
                bed_type = _clean_str(data.get("bed_type"))

                if bed_type not in {"Standard", "Premium"}:
                    return jsonify({"success": False, "error": "Invalid bed_type"}), 400

                bed.bed_type = bed_type

            if data.get("status") is not None:
                status = _clean_str(data.get("status"))

                if status not in {"Vacant", "Occupied", "Maintenance", "Reserved"}:
                    return jsonify({"success": False, "error": "Invalid status"}), 400

                if bed.status == "Occupied" and status != "Occupied":
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": (
                                    "This bed is currently occupied. Vacate the "
                                    "student before changing its status."
                                ),
                            }
                        ),
                        409,
                    )

                if status == "Occupied":
                    return (
                        jsonify(
                            {
                                "success": False,
                                "error": (
                                    "Use the Allocate action to occupy a bed, "
                                    "not a direct status edit."
                                ),
                            }
                        ),
                        400,
                    )

                bed.status = status

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Bed updated successfully",
                        "bed": serialize_bed(bed),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while updating bed")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def delete(self, bed_id):
        _, access_error = authorize_hostel_admin("delete")

        if access_error:
            return access_error

        bed = Bed.query.get(bed_id)

        if not bed:
            return jsonify({"success": False, "error": "Bed not found"}), 404

        try:
            if bed.status == "Occupied":
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Vacate this bed before deleting it",
                        }
                    ),
                    409,
                )

            db.session.delete(bed)
            db.session.commit()

            return (
                jsonify({"success": True, "message": "Bed deleted successfully"}),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while deleting bed")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelBedAllocateAPI(MethodView):
    """Assign a student to a specific vacant bed (check-in)."""

    @login_required
    def post(self, bed_id):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        bed = Bed.query.get(bed_id)

        if not bed:
            return jsonify({"success": False, "error": "Bed not found"}), 404

        try:
            data = request.get_json(silent=True) or {}

            student_id = _parse_int(data.get("student_id"))

            if not student_id:
                return (
                    jsonify({"success": False, "error": "student_id is required"}),
                    400,
                )

            student = Student.query.get(student_id)

            if not student:
                return jsonify({"success": False, "error": "Student not found"}), 404

            if bed.status != "Vacant":
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": f"This bed is currently {bed.status}, not Vacant",
                        }
                    ),
                    409,
                )

            existing_allocation = HostelAllocation.query.filter_by(
                student_id=student_id, is_active=True
            ).first()

            if existing_allocation:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": (
                                "This student already has an active hostel "
                                "allocation. Vacate it first before reassigning."
                            ),
                        }
                    ),
                    409,
                )

            check_in_date = _parse_date(data.get("check_in_date")) or date.today()

            allocation = HostelAllocation(
                student_id=student_id,
                bed_id=bed.id,
                check_in_date=check_in_date,
                is_active=True,
            )

            bed.status = "Occupied"

            db.session.add(allocation)

            log_hostel_activity(
                "Allocation",
                "bed_allocated",
                f"Allocated bed {bed.bed_number} to "
                f"{safe_full_name(student.first_name, getattr(student, 'middle_name', None), student.last_name)}",
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Student allocated to bed successfully",
                        "bed": serialize_bed(bed),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while allocating bed")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelBedVacateAPI(MethodView):
    """End the active allocation on a bed (check-out)."""

    @login_required
    def post(self, bed_id):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        bed = Bed.query.get(bed_id)

        if not bed:
            return jsonify({"success": False, "error": "Bed not found"}), 404

        try:
            data = request.get_json(silent=True) or {}

            allocation = HostelAllocation.query.filter_by(
                bed_id=bed.id, is_active=True
            ).first()

            if not allocation:
                return (
                    jsonify(
                        {"success": False, "error": "This bed has no active occupant"}
                    ),
                    409,
                )

            allocation.is_active = False
            allocation.check_out_date = (
                _parse_date(data.get("check_out_date")) or date.today()
            )

            new_status = _clean_str(data.get("new_status")) or "Vacant"

            if new_status not in {"Vacant", "Maintenance", "Reserved"}:
                new_status = "Vacant"

            bed.status = new_status

            log_hostel_activity(
                "Allocation",
                "bed_vacated",
                f"Vacated bed {bed.bed_number} (student id {allocation.student_id})",
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Bed vacated successfully",
                        "bed": serialize_bed(bed),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while vacating bed")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= STRUCTURE OVERVIEW =============================
class HostelStructureOverviewAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            hostel_id = _parse_int(request.args.get("hostel_id"))

            hostels_query = Hostel.query

            if hostel_id:
                hostels_query = hostels_query.filter(Hostel.id == hostel_id)

            hostels = hostels_query.order_by(Hostel.hostel_name.asc()).all()

            tree = []

            total_blocks = 0
            total_floors = 0
            total_rooms = 0
            total_beds = 0
            total_occupied = 0

            for hostel in hostels:
                blocks_payload = []

                for block in hostel.blocks.order_by(HostelBlock.block_name.asc()):
                    total_blocks += 1
                    floors_payload = []

                    for floor in block.floors:
                        total_floors += 1
                        rooms_payload = []

                        for room in floor.rooms:
                            total_rooms += 1

                            beds = list(room.beds)
                            total_beds += len(beds)
                            total_occupied += sum(
                                1 for bed in beds if bed.status == "Occupied"
                            )

                            rooms_payload.append(
                                serialize_room(room, include_beds=True)
                            )

                        floors_payload.append(
                            {
                                **serialize_floor(floor, include_room_count=False),
                                "rooms": rooms_payload,
                            }
                        )

                    blocks_payload.append(
                        {
                            **serialize_block(block, include_floor_count=False),
                            "floors": floors_payload,
                        }
                    )

                tree.append(
                    {
                        **serialize_hostel(hostel),
                        "blocks": blocks_payload,
                    }
                )

            return (
                jsonify(
                    {
                        "success": True,
                        "hostels": tree,
                        "stats": {
                            "hostels": len(hostels),
                            "blocks": total_blocks,
                            "floors": total_floors,
                            "rooms": total_rooms,
                            "beds": total_beds,
                            "occupied_beds": total_occupied,
                            "available_beds": total_beds - total_occupied,
                        },
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while loading hostel structure")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= STUDENT SEARCH (FOR ALLOCATION) =============================
class HostelUnallocatedStudentsAPI(MethodView):
    """Search students without a current active hostel allocation, for the Allocate-a-bed modal."""

    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            search = _clean_str(request.args.get("search"))

            allocated_student_ids = {
                row.student_id
                for row in HostelAllocation.query.filter_by(is_active=True).all()
            }

            query = Student.query

            if search:
                like = f"%{search}%"

                query = query.filter(
                    db.or_(
                        Student.first_name.ilike(like),
                        Student.last_name.ilike(like),
                        (
                            Student.student_id.ilike(like)
                            if hasattr(Student, "student_id")
                            else False
                        ),
                    )
                )

            students = query.order_by(Student.first_name.asc()).limit(25).all()

            results = [
                {
                    "id": student.id,
                    "student_code": getattr(student, "student_id", student.id),
                    "name": safe_full_name(
                        student.first_name,
                        getattr(student, "middle_name", None),
                        student.last_name,
                    ),
                    "class_name": get_student_academic_details(student)["class_name"],
                }
                for student in students
                if student.id not in allocated_student_ids
            ]

            return jsonify({"success": True, "students": results}), 200

        except SQLAlchemyError as e:
            logger.exception("Database error while searching students")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelStudentSearchAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            search = _clean_str(request.args.get("search"))

            query = Student.query

            if search:
                like = f"%{search}%"

                query = query.filter(
                    db.or_(
                        Student.first_name.ilike(like),
                        Student.last_name.ilike(like),
                        (
                            Student.student_id.ilike(like)
                            if hasattr(Student, "student_id")
                            else False
                        ),
                    )
                )

            students = query.order_by(Student.first_name.asc()).limit(25).all()

            active_allocations = {
                row.student_id: row
                for row in HostelAllocation.query.filter(
                    HostelAllocation.student_id.in_([s.id for s in students]),
                    HostelAllocation.is_active == True,
                ).all()
            }

            results = []

            for student in students:
                allocation = active_allocations.get(student.id)
                room = allocation.bed.room if allocation and allocation.bed else None

                results.append(
                    {
                        "id": student.id,
                        "student_code": getattr(student, "student_id", student.id),
                        "name": safe_full_name(
                            student.first_name,
                            getattr(student, "middle_name", None),
                            student.last_name,
                        ),
                        "class_name": get_student_academic_details(student)[
                            "class_name"
                        ],
                        "room_number": room.room_number if room else None,
                        "is_hostel_resident": allocation is not None,
                    }
                )

            return jsonify({"success": True, "students": results}), 200

        except SQLAlchemyError as e:
            logger.exception("Database error while searching students")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= ALLOCATIONS (STUDENTS / ROOM ALLOTMENT) =============================
def serialize_allocation(allocation):
    student = Student.query.get(allocation.student_id)
    bed = allocation.bed
    room = bed.room if bed else None
    floor = room.floor if room else None
    block = floor.block if floor else None
    hostel = block.hostel if block else None

    fee = HostelFee.query.filter_by(student_id=allocation.student_id).first()
    academic = get_student_academic_details(student) if student else None

    return {
        "id": allocation.id,
        "student_id": allocation.student_id,
        "student_code": (
            getattr(student, "student_id", student.id) if student else None
        ),
        "student_name": (
            safe_full_name(
                student.first_name,
                getattr(student, "middle_name", None),
                student.last_name,
            )
            if student
            else "Unknown student"
        ),
        "course": (academic["class_name"] if academic else None),
        "batch_name": (academic["batch_name"] if academic else None),
        "division_name": (academic["division_name"] if academic else None),
        "section_name": (academic["section_name"] if academic else None),
        "roll_number": (academic["roll_number"] if academic else None),
        "bed_id": allocation.bed_id,
        "bed_number": bed.bed_number if bed else None,
        "room_id": room.id if room else None,
        "room_number": room.room_number if room else None,
        "room_type": room.room_type if room else None,
        "floor_id": floor.id if floor else None,
        "floor_number": floor.floor_number if floor else None,
        "floor_name": floor.floor_name if floor else None,
        "block_id": block.id if block else None,
        "block_name": block.block_name if block else None,
        "hostel_id": hostel.id if hostel else None,
        "hostel_name": hostel.hostel_name if hostel else None,
        "check_in_date": (
            allocation.check_in_date.isoformat() if allocation.check_in_date else None
        ),
        "check_out_date": (
            allocation.check_out_date.isoformat() if allocation.check_out_date else None
        ),
        "is_active": allocation.is_active,
        "fee_status": fee.status if fee else None,
        "fee_amount": (float(fee.amount) if fee and fee.amount is not None else None),
    }


class HostelAllocationListAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            search = _clean_str(request.args.get("search"))
            block_id = _parse_int(request.args.get("block_id"))
            floor_id = _parse_int(request.args.get("floor_id"))
            room_type = _clean_str(request.args.get("room_type"))
            # "active" (default) | "checked_out" | "all"
            status = _clean_str(request.args.get("status")) or "active"

            query = (
                HostelAllocation.query.join(Bed, HostelAllocation.bed_id == Bed.id)
                .join(Room, Bed.room_id == Room.id)
                .join(HostelFloor, Room.floor_id == HostelFloor.id)
                .join(HostelBlock, HostelFloor.block_id == HostelBlock.id)
            )

            if status == "active":
                query = query.filter(HostelAllocation.is_active == True)
            elif status == "checked_out":
                query = query.filter(HostelAllocation.is_active == False)

            if block_id:
                query = query.filter(HostelBlock.id == block_id)

            if floor_id:
                query = query.filter(HostelFloor.id == floor_id)

            if room_type:
                query = query.filter(Room.room_type == room_type)

            allocations = query.order_by(HostelAllocation.id.desc()).all()

            rows = [serialize_allocation(allocation) for allocation in allocations]

            if search:
                needle = search.lower()

                rows = [
                    row
                    for row in rows
                    if needle in (row["student_name"] or "").lower()
                    or needle in str(row["student_code"] or "").lower()
                    or needle in (row["room_number"] or "").lower()
                ]

            stats = {
                "total": len(rows),
                "active": sum(1 for row in rows if row["is_active"]),
                "checked_out": sum(1 for row in rows if not row["is_active"]),
                "fee_pending": sum(
                    1 for row in rows if row["fee_status"] in {"Pending", "Overdue"}
                ),
            }

            return jsonify({"success": True, "allocations": rows, "stats": stats}), 200

        except SQLAlchemyError as e:
            logger.exception("Database error while listing hostel allocations")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelAllocationCheckoutAPI(MethodView):
    """Check a student out by allocation id (same effect as vacating their bed)."""

    @login_required
    def post(self, allocation_id):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        allocation = HostelAllocation.query.get(allocation_id)

        if not allocation:
            return jsonify({"success": False, "error": "Allocation not found"}), 404

        if not allocation.is_active:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "This allocation is already checked out",
                    }
                ),
                409,
            )

        try:
            data = request.get_json(silent=True) or {}

            bed = allocation.bed

            allocation.is_active = False
            allocation.check_out_date = (
                _parse_date(data.get("check_out_date")) or date.today()
            )

            if bed:
                bed.status = "Vacant"

            student = Student.query.get(allocation.student_id)

            log_hostel_activity(
                "Allocation",
                "student_checked_out",
                f"Checked out "
                f"{safe_full_name(student.first_name, getattr(student, 'middle_name', None), student.last_name) if student else 'a student'} "
                f"from Room {bed.room.room_number if bed and bed.room else '—'}",
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Student checked out successfully",
                        "allocation": serialize_allocation(allocation),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while checking out allocation")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelAllocationTransferAPI(MethodView):
    """Move a student from their current bed to a different vacant bed."""

    @login_required
    def post(self, allocation_id):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        allocation = HostelAllocation.query.get(allocation_id)

        if not allocation:
            return jsonify({"success": False, "error": "Allocation not found"}), 404

        if not allocation.is_active:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "This student has already checked out - allocate a new bed instead",
                    }
                ),
                409,
            )

        try:
            data = request.get_json(silent=True) or {}

            new_bed_id = _parse_int(data.get("new_bed_id"))

            if not new_bed_id:
                return (
                    jsonify({"success": False, "error": "new_bed_id is required"}),
                    400,
                )

            new_bed = Bed.query.get(new_bed_id)

            if not new_bed:
                return jsonify({"success": False, "error": "Target bed not found"}), 404

            if new_bed.status != "Vacant":
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": f"Target bed is currently {new_bed.status}, not Vacant",
                        }
                    ),
                    409,
                )

            old_bed = allocation.bed

            # Close out the old allocation and free the old bed...
            allocation.is_active = False
            allocation.check_out_date = date.today()

            if old_bed:
                old_bed.status = "Vacant"

            new_allocation = HostelAllocation(
                student_id=allocation.student_id,
                bed_id=new_bed.id,
                check_in_date=date.today(),
                is_active=True,
            )

            new_bed.status = "Occupied"

            db.session.add(new_allocation)

            student = Student.query.get(allocation.student_id)

            log_hostel_activity(
                "Allocation",
                "student_transferred",
                f"Transferred "
                f"{safe_full_name(student.first_name, getattr(student, 'middle_name', None), student.last_name) if student else 'a student'} "
                f"from bed {old_bed.bed_number if old_bed else '—'} to bed {new_bed.bed_number}",
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Student transferred successfully",
                        "allocation": serialize_allocation(new_allocation),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while transferring allocation")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= HOSTEL STAFF =============================
def serialize_staff(staff):
    return {
        "id": staff.id,
        "staff_code": staff.staff_code,
        "name": safe_full_name(staff.first_name, staff.middle_name, staff.last_name),
        "role": staff.role,
        "block_id": staff.block_id,
        "block_name": staff.block.block_name if staff.block else None,
        "shift": staff.shift,
        "mobile": staff.mobile,
        "email": staff.email,
        "status": staff.status,
        "created_at": staff.created_at.isoformat() if staff.created_at else None,
    }


class HostelStaffListAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            search = _clean_str(request.args.get("search"))
            role = _clean_str(request.args.get("role"))
            block_id = _parse_int(request.args.get("block_id"))
            status = _clean_str(request.args.get("status"))

            query = HostelStaff.query

            if role:
                query = query.filter(HostelStaff.role == role)

            if block_id:
                query = query.filter(HostelStaff.block_id == block_id)

            if status:
                query = query.filter(HostelStaff.status == status)

            staff_members = query.order_by(HostelStaff.id.desc()).all()

            rows = [serialize_staff(staff) for staff in staff_members]

            if search:
                needle = search.lower()

                rows = [
                    row
                    for row in rows
                    if needle in (row["name"] or "").lower()
                    or needle in (row["staff_code"] or "").lower()
                ]

            stats = {
                "total": len(rows),
                "wardens": sum(1 for row in rows if row["role"] == "Warden"),
                "security": sum(1 for row in rows if row["role"] == "Security Guard"),
                "support": sum(
                    1
                    for row in rows
                    if row["role"] in {"Cleaner", "Cook", "Maintenance", "Other"}
                ),
            }

            return jsonify({"success": True, "staff": rows, "stats": stats}), 200

        except SQLAlchemyError as e:
            logger.exception("Database error while listing hostel staff")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def post(self):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            first_name = _clean_str(data.get("first_name"))

            if not first_name:
                return (
                    jsonify({"success": False, "error": "First name is required"}),
                    400,
                )

            role = _clean_str(data.get("role")) or "Other"

            if role not in {
                "Warden",
                "Security Guard",
                "Cleaner",
                "Cook",
                "Maintenance",
                "Other",
            }:
                return jsonify({"success": False, "error": "Invalid role"}), 400

            shift = _clean_str(data.get("shift")) or "Morning"

            if shift not in {"Morning", "Evening", "Night"}:
                return jsonify({"success": False, "error": "Invalid shift"}), 400

            block_id = _parse_int(data.get("block_id"))

            if block_id and not HostelBlock.query.get(block_id):
                return jsonify({"success": False, "error": "Block not found"}), 404

            staff = HostelStaff(
                staff_code="PENDING",
                first_name=first_name,
                middle_name=_clean_str(data.get("middle_name")) or None,
                last_name=_clean_str(data.get("last_name")) or None,
                role=role,
                block_id=block_id,
                shift=shift,
                mobile=_clean_str(data.get("mobile")) or None,
                email=_clean_str(data.get("email")) or None,
                status=_clean_str(data.get("status")) or "Active",
            )

            db.session.add(staff)
            db.session.flush()  # staff.id now available

            staff.staff_code = f"STF{1000 + staff.id}"

            log_hostel_activity(
                "Staff",
                "staff_added",
                f"Added staff member "
                f"{safe_full_name(staff.first_name, staff.middle_name, staff.last_name)} "
                f"({staff.role})",
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Staff member added successfully",
                        "staff": serialize_staff(staff),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while creating hostel staff")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelStaffDetailAPI(MethodView):

    @login_required
    def get(self, staff_id):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        staff = HostelStaff.query.get(staff_id)

        if not staff:
            return jsonify({"success": False, "error": "Staff member not found"}), 404

        return jsonify({"success": True, "staff": serialize_staff(staff)}), 200

    @login_required
    def put(self, staff_id):
        _, access_error = authorize_hostel_admin("edit")

        if access_error:
            return access_error

        staff = HostelStaff.query.get(staff_id)

        if not staff:
            return jsonify({"success": False, "error": "Staff member not found"}), 404

        try:
            data = request.get_json(silent=True) or {}

            if data.get("first_name") is not None:
                first_name = _clean_str(data.get("first_name"))

                if not first_name:
                    return (
                        jsonify({"success": False, "error": "First name is required"}),
                        400,
                    )

                staff.first_name = first_name

            if data.get("middle_name") is not None:
                staff.middle_name = _clean_str(data.get("middle_name")) or None

            if data.get("last_name") is not None:
                staff.last_name = _clean_str(data.get("last_name")) or None

            if data.get("role") is not None:
                role = _clean_str(data.get("role"))

                if role not in {
                    "Warden",
                    "Security Guard",
                    "Cleaner",
                    "Cook",
                    "Maintenance",
                    "Other",
                }:
                    return jsonify({"success": False, "error": "Invalid role"}), 400

                staff.role = role

            if data.get("shift") is not None:
                shift = _clean_str(data.get("shift"))

                if shift not in {"Morning", "Evening", "Night"}:
                    return jsonify({"success": False, "error": "Invalid shift"}), 400

                staff.shift = shift

            if "block_id" in data:
                block_id = _parse_int(data.get("block_id"))

                if block_id and not HostelBlock.query.get(block_id):
                    return jsonify({"success": False, "error": "Block not found"}), 404

                staff.block_id = block_id

            if data.get("mobile") is not None:
                staff.mobile = _clean_str(data.get("mobile")) or None

            if data.get("email") is not None:
                staff.email = _clean_str(data.get("email")) or None

            if data.get("status") is not None:
                status = _clean_str(data.get("status"))

                if status not in {"Active", "On Leave", "Inactive"}:
                    return jsonify({"success": False, "error": "Invalid status"}), 400

                staff.status = status

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Staff member updated successfully",
                        "staff": serialize_staff(staff),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while updating hostel staff")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def delete(self, staff_id):
        _, access_error = authorize_hostel_admin("delete")

        if access_error:
            return access_error

        staff = HostelStaff.query.get(staff_id)

        if not staff:
            return jsonify({"success": False, "error": "Staff member not found"}), 404

        try:
            staff_name = safe_full_name(
                staff.first_name, staff.middle_name, staff.last_name
            )

            db.session.delete(staff)

            log_hostel_activity(
                "Staff", "staff_removed", f"Removed staff member {staff_name}"
            )

            db.session.commit()

            return (
                jsonify(
                    {"success": True, "message": "Staff member removed successfully"}
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while deleting hostel staff")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= HOSTEL VISITORS =============================
def serialize_visitor(visitor):
    student = Student.query.get(visitor.student_id)

    allocation = HostelAllocation.query.filter_by(
        student_id=visitor.student_id, is_active=True
    ).first()

    bed = allocation.bed if allocation else None
    room = bed.room if bed else None
    floor = room.floor if room else None
    block = floor.block if floor else None

    return {
        "id": visitor.id,
        "visitor_code": visitor.visitor_code,
        "visitor_name": visitor.visitor_name,
        "visitor_mobile": visitor.visitor_mobile,
        "student_id": visitor.student_id,
        "student_name": (
            safe_full_name(
                student.first_name,
                getattr(student, "middle_name", None),
                student.last_name,
            )
            if student
            else "Unknown student"
        ),
        "student_code": (
            getattr(student, "student_id", student.id) if student else None
        ),
        "relation": visitor.relation,
        "purpose": visitor.purpose,
        "room_number": room.room_number if room else None,
        "block_name": block.block_name if block else None,
        "status": visitor.status,
        "check_in_time": (
            visitor.check_in_time.isoformat() if visitor.check_in_time else None
        ),
        "check_out_time": (
            visitor.check_out_time.isoformat() if visitor.check_out_time else None
        ),
        "created_at": visitor.created_at.isoformat() if visitor.created_at else None,
    }


class HostelVisitorListAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            search = _clean_str(request.args.get("search"))
            relation = _clean_str(request.args.get("relation"))
            status = _clean_str(request.args.get("status"))
            block_id = _parse_int(request.args.get("block_id"))

            query = HostelVisitor.query

            if relation:
                query = query.filter(HostelVisitor.relation == relation)

            if status:
                query = query.filter(HostelVisitor.status == status)

            visitors = query.order_by(HostelVisitor.id.desc()).all()

            rows = [serialize_visitor(visitor) for visitor in visitors]

            if block_id:
                rows = [row for row in rows if row.get("block_name")]
                block = HostelBlock.query.get(block_id)
                if block:
                    rows = [
                        row for row in rows if row["block_name"] == block.block_name
                    ]

            if search:
                needle = search.lower()

                rows = [
                    row
                    for row in rows
                    if needle in (row["visitor_name"] or "").lower()
                    or needle in (row["student_name"] or "").lower()
                    or needle in str(row["student_code"] or "").lower()
                ]

            today = date.today().isoformat()

            stats = {
                "today": sum(
                    1
                    for row in rows
                    if (row["check_in_time"] or row["created_at"] or "").startswith(
                        today
                    )
                ),
                "inside": sum(
                    1
                    for row in rows
                    if row["status"] == "Approved" and not row["check_out_time"]
                ),
                "approved": sum(1 for row in rows if row["status"] == "Approved"),
                "pending": sum(1 for row in rows if row["status"] == "Pending"),
            }

            return jsonify({"success": True, "visitors": rows, "stats": stats}), 200

        except SQLAlchemyError as e:
            logger.exception("Database error while listing hostel visitors")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def post(self):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            visitor_name = _clean_str(data.get("visitor_name"))
            student_id = _parse_int(data.get("student_id"))

            if not visitor_name or not student_id:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "visitor_name and student_id are required",
                        }
                    ),
                    400,
                )

            student = Student.query.get(student_id)

            if not student:
                return jsonify({"success": False, "error": "Student not found"}), 404

            relation = _clean_str(data.get("relation")) or "Other"

            if relation not in {"Parent", "Guardian", "Friend", "Relative", "Other"}:
                return jsonify({"success": False, "error": "Invalid relation"}), 400

            visitor = HostelVisitor(
                visitor_code="PENDING",
                visitor_name=visitor_name,
                visitor_mobile=_clean_str(data.get("visitor_mobile")) or None,
                student_id=student_id,
                relation=relation,
                purpose=_clean_str(data.get("purpose")) or None,
                status="Pending",
            )

            db.session.add(visitor)
            db.session.flush()  # visitor.id now available

            visitor.visitor_code = f"VIS{1000 + visitor.id}"

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Visitor request logged successfully",
                        "visitor": serialize_visitor(visitor),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while creating hostel visitor")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelVisitorDetailAPI(MethodView):

    @login_required
    def get(self, visitor_id):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        visitor = HostelVisitor.query.get(visitor_id)

        if not visitor:
            return jsonify({"success": False, "error": "Visitor not found"}), 404

        return jsonify({"success": True, "visitor": serialize_visitor(visitor)}), 200

    @login_required
    def delete(self, visitor_id):
        _, access_error = authorize_hostel_admin("delete")

        if access_error:
            return access_error

        visitor = HostelVisitor.query.get(visitor_id)

        if not visitor:
            return jsonify({"success": False, "error": "Visitor not found"}), 404

        try:
            db.session.delete(visitor)
            db.session.commit()

            return (
                jsonify(
                    {"success": True, "message": "Visitor record deleted successfully"}
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while deleting hostel visitor")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelVisitorApproveAPI(MethodView):
    """Approve a pending visit and mark the visitor as checked in now."""

    @login_required
    def post(self, visitor_id):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        visitor = HostelVisitor.query.get(visitor_id)

        if not visitor:
            return jsonify({"success": False, "error": "Visitor not found"}), 404

        if visitor.status != "Pending":
            return (
                jsonify(
                    {
                        "success": False,
                        "error": f"This visit is already {visitor.status}",
                    }
                ),
                409,
            )

        try:
            visitor.status = "Approved"
            visitor.check_in_time = datetime.utcnow()

            log_hostel_activity(
                "Visitor",
                "visitor_approved",
                f"Approved visit from {visitor.visitor_name}",
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Visitor approved",
                        "visitor": serialize_visitor(visitor),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while approving hostel visitor")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelVisitorRejectAPI(MethodView):
    """Reject a pending visit."""

    @login_required
    def post(self, visitor_id):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        visitor = HostelVisitor.query.get(visitor_id)

        if not visitor:
            return jsonify({"success": False, "error": "Visitor not found"}), 404

        if visitor.status != "Pending":
            return (
                jsonify(
                    {
                        "success": False,
                        "error": f"This visit is already {visitor.status}",
                    }
                ),
                409,
            )

        try:
            visitor.status = "Rejected"

            log_hostel_activity(
                "Visitor",
                "visitor_rejected",
                f"Rejected visit from {visitor.visitor_name}",
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Visitor request rejected",
                        "visitor": serialize_visitor(visitor),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while rejecting hostel visitor")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelVisitorCheckoutAPI(MethodView):
    """Mark an approved, currently-inside visitor as checked out."""

    @login_required
    def post(self, visitor_id):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        visitor = HostelVisitor.query.get(visitor_id)

        if not visitor:
            return jsonify({"success": False, "error": "Visitor not found"}), 404

        if visitor.status != "Approved" or visitor.check_out_time:
            return (
                jsonify(
                    {"success": False, "error": "This visitor is not currently inside"}
                ),
                409,
            )

        try:
            visitor.check_out_time = datetime.utcnow()
            visitor.status = "Checked Out"

            log_hostel_activity(
                "Visitor",
                "visitor_checked_out",
                f"Checked out visitor {visitor.visitor_name}",
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Visitor checked out",
                        "visitor": serialize_visitor(visitor),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while checking out hostel visitor")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= ATTENDANCE =============================
def serialize_attendance_row(student, record):
    room_info = get_student_room_info(student.id)

    return {
        "attendance_id": record.id if record else None,
        "student_id": student.id,
        "student_code": getattr(student, "student_id", student.id),
        "student_name": safe_full_name(
            student.first_name,
            getattr(student, "middle_name", None),
            student.last_name,
        ),
        "room_number": room_info["room_number"],
        "block_name": room_info["block_name"],
        "attendance_date": (
            record.attendance_date.isoformat()
            if record and record.attendance_date
            else None
        ),
        "status": record.status if record else "Not Marked",
        "check_in_time": (
            record.check_in_time.isoformat()
            if record and record.check_in_time
            else None
        ),
        "remarks": record.remarks if record else None,
    }


class HostelAttendanceListAPI(MethodView):
    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            attendance_date = _parse_date(request.args.get("date")) or date.today()
            search = _clean_str(request.args.get("search"))
            block_id = _parse_int(request.args.get("block_id"))
            status_filter = _clean_str(request.args.get("status"))

            allocation_query = HostelAllocation.query.filter_by(is_active=True)

            if block_id:
                allocation_query = (
                    allocation_query.join(Bed, HostelAllocation.bed_id == Bed.id)
                    .join(Room, Bed.room_id == Room.id)
                    .join(HostelFloor, Room.floor_id == HostelFloor.id)
                    .filter(HostelFloor.block_id == block_id)
                )

            resident_student_ids = [row.student_id for row in allocation_query.all()]

            students = (
                Student.query.filter(Student.id.in_(resident_student_ids))
                .order_by(Student.first_name.asc())
                .all()
                if resident_student_ids
                else []
            )

            existing_records = (
                {
                    record.student_id: record
                    for record in HostelAttendance.query.filter(
                        HostelAttendance.attendance_date == attendance_date,
                        HostelAttendance.student_id.in_(resident_student_ids),
                    ).all()
                }
                if resident_student_ids
                else {}
            )

            rows = [
                serialize_attendance_row(student, existing_records.get(student.id))
                for student in students
            ]

            if search:
                needle = search.lower()

                rows = [
                    row
                    for row in rows
                    if needle in (row["student_name"] or "").lower()
                    or needle in str(row["student_code"] or "").lower()
                    or needle in (row["room_number"] or "").lower()
                ]

            if status_filter:
                rows = [row for row in rows if row["status"] == status_filter]

            stats = {
                "total": len(students),
                "present": sum(1 for r in rows if r["status"] == "Present"),
                "absent": sum(1 for r in rows if r["status"] == "Absent"),
                "on_leave": sum(1 for r in rows if r["status"] == "On Leave"),
                "late_entry": sum(1 for r in rows if r["status"] == "Late Entry"),
            }

            return (
                jsonify(
                    {
                        "success": True,
                        "attendance": rows,
                        "stats": stats,
                        "date": attendance_date.isoformat(),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while loading attendance")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelAttendanceMarkAPI(MethodView):
    """Upsert one student's attendance status for one date."""

    @login_required
    def post(self):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            student_id = _parse_int(data.get("student_id"))
            attendance_date = _parse_date(data.get("attendance_date")) or date.today()
            status = _clean_str(data.get("status")) or "Present"

            if not student_id:
                return (
                    jsonify({"success": False, "error": "student_id is required"}),
                    400,
                )

            if status not in {"Present", "Absent", "On Leave", "Late Entry"}:
                return jsonify({"success": False, "error": "Invalid status"}), 400

            student = Student.query.get(student_id)

            if not student:
                return jsonify({"success": False, "error": "Student not found"}), 404

            record = HostelAttendance.query.filter_by(
                student_id=student_id, attendance_date=attendance_date
            ).first()

            if not record:
                record = HostelAttendance(
                    student_id=student_id, attendance_date=attendance_date
                )
                db.session.add(record)

            record.status = status
            record.remarks = _clean_str(data.get("remarks")) or None

            if status in {"Present", "Late Entry"}:
                record.check_in_time = (
                    datetime.utcnow()
                    if not record.check_in_time
                    else record.check_in_time
                )
            else:
                record.check_in_time = None

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Attendance updated",
                        "attendance": serialize_attendance_row(student, record),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while marking attendance")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= MOVEMENTS (CHECK-IN / CHECK-OUT) =============================
def serialize_movement(movement):
    student = Student.query.get(movement.student_id)
    room_info = get_student_room_info(movement.student_id)

    return {
        "id": movement.id,
        "student_id": movement.student_id,
        "student_code": (
            getattr(student, "student_id", student.id) if student else None
        ),
        "student_name": (
            safe_full_name(
                student.first_name,
                getattr(student, "middle_name", None),
                student.last_name,
            )
            if student
            else "Unknown student"
        ),
        "room_number": room_info["room_number"],
        "block_name": room_info["block_name"],
        "purpose": movement.purpose,
        "check_out_time": (
            movement.check_out_time.isoformat() if movement.check_out_time else None
        ),
        "expected_return_time": (
            movement.expected_return_time.isoformat()
            if movement.expected_return_time
            else None
        ),
        "check_in_time": (
            movement.check_in_time.isoformat() if movement.check_in_time else None
        ),
        "status": movement.status,
        "created_at": (
            movement.created_at.isoformat() if movement.created_at else None
        ),
    }


class HostelMovementListAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            search = _clean_str(request.args.get("search"))
            status_filter = _clean_str(request.args.get("status"))
            movement_date = _parse_date(request.args.get("date"))

            query = HostelMovement.query

            if movement_date:
                query = query.filter(
                    func.date(HostelMovement.check_out_time) == movement_date
                )

            movements = (
                query.order_by(HostelMovement.check_out_time.desc()).limit(200).all()
            )

            rows = [serialize_movement(movement) for movement in movements]

            if search:
                needle = search.lower()

                rows = [
                    row
                    for row in rows
                    if needle in (row["student_name"] or "").lower()
                    or needle in str(row["student_code"] or "").lower()
                    or needle in (row["room_number"] or "").lower()
                ]

            if status_filter:
                rows = [row for row in rows if row["status"] == status_filter]

            stats = {
                "inside": HostelAllocation.query.filter_by(is_active=True).count()
                - sum(1 for r in rows if r["status"] == "Outside Hostel"),
                "checked_out": sum(1 for r in rows if r["status"] == "Outside Hostel"),
                "late_entries": sum(1 for r in rows if r["status"] == "Late Entry"),
                "returned": sum(1 for r in rows if r["status"] == "Returned"),
            }

            return jsonify({"success": True, "movements": rows, "stats": stats}), 200

        except SQLAlchemyError as e:
            logger.exception("Database error while loading movements")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def post(self):
        """Log a new check-out."""

        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            student_id = _parse_int(data.get("student_id"))

            if not student_id:
                return (
                    jsonify({"success": False, "error": "student_id is required"}),
                    400,
                )

            student = Student.query.get(student_id)

            if not student:
                return jsonify({"success": False, "error": "Student not found"}), 404

            existing_open = HostelMovement.query.filter(
                HostelMovement.student_id == student_id,
                HostelMovement.check_in_time.is_(None),
            ).first()

            if existing_open:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "This student is already checked out and hasn't returned yet",
                        }
                    ),
                    409,
                )

            expected_return_raw = data.get("expected_return_time")
            expected_return_time = None

            if expected_return_raw:
                try:
                    expected_return_time = datetime.fromisoformat(expected_return_raw)
                except ValueError:
                    expected_return_time = None

            movement = HostelMovement(
                student_id=student_id,
                check_out_time=datetime.utcnow(),
                expected_return_time=expected_return_time,
                purpose=_clean_str(data.get("purpose")) or None,
            )

            db.session.add(movement)
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Check-out recorded",
                        "movement": serialize_movement(movement),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while recording check-out")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelMovementCheckInAPI(MethodView):
    """Mark an open movement's return - completes the check-out record."""

    @login_required
    def post(self, movement_id):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        movement = HostelMovement.query.get(movement_id)

        if not movement:
            return (
                jsonify({"success": False, "error": "Movement record not found"}),
                404,
            )

        if movement.check_in_time:
            return (
                jsonify(
                    {"success": False, "error": "This student has already checked in"}
                ),
                409,
            )

        try:
            movement.check_in_time = datetime.utcnow()
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Check-in recorded",
                        "movement": serialize_movement(movement),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while recording check-in")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= LEAVE REQUESTS =============================
def serialize_leave_request(leave):
    student = Student.query.get(leave.student_id)
    room_info = get_student_room_info(leave.student_id)

    return {
        "id": leave.id,
        "student_id": leave.student_id,
        "student_code": (
            getattr(student, "student_id", student.id) if student else None
        ),
        "student_name": (
            safe_full_name(
                student.first_name,
                getattr(student, "middle_name", None),
                student.last_name,
            )
            if student
            else "Unknown student"
        ),
        "room_number": room_info["room_number"],
        "block_name": room_info["block_name"],
        "leave_type": leave.leave_type,
        "from_date": leave.from_date.isoformat() if leave.from_date else None,
        "to_date": leave.to_date.isoformat() if leave.to_date else None,
        "reason": leave.reason,
        "status": leave.status,
        "actual_return_date": (
            leave.actual_return_date.isoformat() if leave.actual_return_date else None
        ),
        "created_at": leave.created_at.isoformat() if leave.created_at else None,
    }


class HostelLeaveRequestListAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            search = _clean_str(request.args.get("search"))
            status_filter = _clean_str(request.args.get("status"))

            query = HostelLeaveRequest.query

            if status_filter:
                query = query.filter(HostelLeaveRequest.status == status_filter)

            leaves = query.order_by(HostelLeaveRequest.id.desc()).limit(200).all()

            rows = [serialize_leave_request(leave) for leave in leaves]

            if search:
                needle = search.lower()

                rows = [
                    row
                    for row in rows
                    if needle in (row["student_name"] or "").lower()
                    or needle in str(row["student_code"] or "").lower()
                ]

            stats = {
                "total": len(rows),
                "pending": sum(1 for r in rows if r["status"] == "Pending"),
                "approved": sum(1 for r in rows if r["status"] == "Approved"),
                "rejected": sum(1 for r in rows if r["status"] == "Rejected"),
            }

            return (
                jsonify({"success": True, "leave_requests": rows, "stats": stats}),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while loading leave requests")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def post(self):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            student_id = _parse_int(data.get("student_id"))
            from_date = _parse_date(data.get("from_date"))
            to_date = _parse_date(data.get("to_date"))
            leave_type = _clean_str(data.get("leave_type")) or "Other"

            if not student_id or not from_date or not to_date:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "student_id, from_date and to_date are required",
                        }
                    ),
                    400,
                )

            if to_date < from_date:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "to_date cannot be before from_date",
                        }
                    ),
                    400,
                )

            if leave_type not in {
                "Weekend Leave",
                "Medical Leave",
                "Emergency Leave",
                "Other",
            }:
                return jsonify({"success": False, "error": "Invalid leave_type"}), 400

            student = Student.query.get(student_id)

            if not student:
                return jsonify({"success": False, "error": "Student not found"}), 404

            leave = HostelLeaveRequest(
                student_id=student_id,
                leave_type=leave_type,
                from_date=from_date,
                to_date=to_date,
                reason=_clean_str(data.get("reason")) or None,
                status="Pending",
            )

            db.session.add(leave)
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Leave request submitted",
                        "leave_request": serialize_leave_request(leave),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while creating leave request")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelLeaveRequestDetailAPI(MethodView):

    @login_required
    def delete(self, leave_id):
        _, access_error = authorize_hostel_admin("delete")

        if access_error:
            return access_error

        leave = HostelLeaveRequest.query.get(leave_id)

        if not leave:
            return jsonify({"success": False, "error": "Leave request not found"}), 404

        try:
            db.session.delete(leave)
            db.session.commit()

            return jsonify({"success": True, "message": "Leave request deleted"}), 200

        except SQLAlchemyError as e:
            logger.exception("Database error while deleting leave request")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelLeaveRequestApproveAPI(MethodView):

    @login_required
    def post(self, leave_id):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        leave = HostelLeaveRequest.query.get(leave_id)

        if not leave:
            return jsonify({"success": False, "error": "Leave request not found"}), 404

        if leave.status != "Pending":
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Only a pending request can be approved",
                    }
                ),
                409,
            )

        try:
            leave.status = "Approved"

            student = Student.query.get(leave.student_id)

            log_hostel_activity(
                "Leave",
                "leave_approved",
                f"Approved {leave.leave_type} for "
                f"{safe_full_name(student.first_name, getattr(student, 'middle_name', None), student.last_name) if student else 'a student'}",
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Leave request approved",
                        "leave_request": serialize_leave_request(leave),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while approving leave request")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelLeaveRequestRejectAPI(MethodView):

    @login_required
    def post(self, leave_id):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        leave = HostelLeaveRequest.query.get(leave_id)

        if not leave:
            return jsonify({"success": False, "error": "Leave request not found"}), 404

        if leave.status != "Pending":
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Only a pending request can be rejected",
                    }
                ),
                409,
            )

        try:
            leave.status = "Rejected"

            student = Student.query.get(leave.student_id)

            log_hostel_activity(
                "Leave",
                "leave_rejected",
                f"Rejected {leave.leave_type} for "
                f"{safe_full_name(student.first_name, getattr(student, 'middle_name', None), student.last_name) if student else 'a student'}",
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Leave request rejected",
                        "leave_request": serialize_leave_request(leave),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while rejecting leave request")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelLeaveRequestReturnAPI(MethodView):
    """Mark an approved leave as completed - the student is confirmed back."""

    @login_required
    def post(self, leave_id):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        leave = HostelLeaveRequest.query.get(leave_id)

        if not leave:
            return jsonify({"success": False, "error": "Leave request not found"}), 404

        if leave.status != "Approved":
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "Only an approved leave can be marked returned",
                    }
                ),
                409,
            )

        try:
            data = request.get_json(silent=True) or {}

            leave.status = "Returned"
            leave.actual_return_date = (
                _parse_date(data.get("actual_return_date")) or date.today()
            )

            student = Student.query.get(leave.student_id)

            log_hostel_activity(
                "Leave",
                "leave_return_marked",
                f"Marked "
                f"{safe_full_name(student.first_name, getattr(student, 'middle_name', None), student.last_name) if student else 'a student'} "
                f"as returned from leave",
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Student marked as returned",
                        "leave_request": serialize_leave_request(leave),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while marking leave returned")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= MESS MENU =============================
DAY_ORDER = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]

MEAL_ORDER = ["Breakfast", "Lunch", "Snacks", "Dinner"]


def serialize_mess_menu_entry(entry):
    return {
        "id": entry.id,
        "day_of_week": entry.day_of_week,
        "meal_type": entry.meal_type,
        "items": entry.items,
        "timing": entry.timing,
        "updated_at": entry.updated_at.isoformat() if entry.updated_at else None,
    }


class HostelMessMenuListAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            entries = {
                (entry.day_of_week, entry.meal_type): entry
                for entry in HostelMessMenu.query.all()
            }

            grid = []

            for day in DAY_ORDER:
                meals = {}

                for meal_type in MEAL_ORDER:
                    entry = entries.get((day, meal_type))

                    meals[meal_type] = (
                        serialize_mess_menu_entry(entry)
                        if entry
                        else {
                            "id": None,
                            "day_of_week": day,
                            "meal_type": meal_type,
                            "items": "",
                            "timing": "",
                            "updated_at": None,
                        }
                    )

                grid.append({"day_of_week": day, "meals": meals})

            configured = len(entries)
            total_slots = len(DAY_ORDER) * len(MEAL_ORDER)

            return (
                jsonify(
                    {
                        "success": True,
                        "menu": grid,
                        "stats": {
                            "configured": configured,
                            "total_slots": total_slots,
                            "missing": total_slots - configured,
                        },
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while loading mess menu")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def post(self):
        """Upsert one (day, meal) cell of the menu."""

        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            day_of_week = _clean_str(data.get("day_of_week"))
            meal_type = _clean_str(data.get("meal_type"))

            if day_of_week not in DAY_ORDER:
                return jsonify({"success": False, "error": "Invalid day_of_week"}), 400

            if meal_type not in MEAL_ORDER:
                return jsonify({"success": False, "error": "Invalid meal_type"}), 400

            entry = HostelMessMenu.query.filter_by(
                day_of_week=day_of_week, meal_type=meal_type
            ).first()

            if not entry:
                entry = HostelMessMenu(day_of_week=day_of_week, meal_type=meal_type)
                db.session.add(entry)

            entry.items = _clean_str(data.get("items")) or None
            entry.timing = _clean_str(data.get("timing")) or None

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Menu updated",
                        "entry": serialize_mess_menu_entry(entry),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while updating mess menu")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelMessMenuDetailAPI(MethodView):

    @login_required
    def delete(self, entry_id):
        _, access_error = authorize_hostel_admin("delete")

        if access_error:
            return access_error

        entry = HostelMessMenu.query.get(entry_id)

        if not entry:
            return jsonify({"success": False, "error": "Menu entry not found"}), 404

        try:
            db.session.delete(entry)
            db.session.commit()

            return jsonify({"success": True, "message": "Menu entry cleared"}), 200

        except SQLAlchemyError as e:
            logger.exception("Database error while deleting mess menu entry")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= MEAL ATTENDANCE =============================
def serialize_meal_attendance_row(student, record):
    room_info = get_student_room_info(student.id)

    return {
        "meal_attendance_id": record.id if record else None,
        "student_id": student.id,
        "student_code": getattr(student, "student_id", student.id),
        "student_name": safe_full_name(
            student.first_name,
            getattr(student, "middle_name", None),
            student.last_name,
        ),
        "room_number": room_info["room_number"],
        "block_name": room_info["block_name"],
        "meal_date": (
            record.meal_date.isoformat() if record and record.meal_date else None
        ),
        "meal_type": record.meal_type if record else None,
        "status": record.status if record else "Not Marked",
        "marked_at": (
            record.marked_at.isoformat() if record and record.marked_at else None
        ),
    }


class HostelMealAttendanceListAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            meal_date = _parse_date(request.args.get("date")) or date.today()
            meal_type = _clean_str(request.args.get("meal_type")) or "Breakfast"
            search = _clean_str(request.args.get("search"))
            block_id = _parse_int(request.args.get("block_id"))
            status_filter = _clean_str(request.args.get("status"))

            if meal_type not in MEAL_ORDER:
                meal_type = "Breakfast"

            allocation_query = HostelAllocation.query.filter_by(is_active=True)

            if block_id:
                allocation_query = (
                    allocation_query.join(Bed, HostelAllocation.bed_id == Bed.id)
                    .join(Room, Bed.room_id == Room.id)
                    .join(HostelFloor, Room.floor_id == HostelFloor.id)
                    .filter(HostelFloor.block_id == block_id)
                )

            resident_student_ids = [row.student_id for row in allocation_query.all()]

            students = (
                Student.query.filter(Student.id.in_(resident_student_ids))
                .order_by(Student.first_name.asc())
                .all()
                if resident_student_ids
                else []
            )

            existing_records = (
                {
                    record.student_id: record
                    for record in HostelMealAttendance.query.filter(
                        HostelMealAttendance.meal_date == meal_date,
                        HostelMealAttendance.meal_type == meal_type,
                        HostelMealAttendance.student_id.in_(resident_student_ids),
                    ).all()
                }
                if resident_student_ids
                else {}
            )

            rows = [
                serialize_meal_attendance_row(student, existing_records.get(student.id))
                for student in students
            ]

            if search:
                needle = search.lower()

                rows = [
                    row
                    for row in rows
                    if needle in (row["student_name"] or "").lower()
                    or needle in str(row["student_code"] or "").lower()
                    or needle in (row["room_number"] or "").lower()
                ]

            if status_filter:
                rows = [row for row in rows if row["status"] == status_filter]

            stats = {
                "total": len(students),
                "present": sum(1 for r in rows if r["status"] == "Present"),
                "absent": sum(1 for r in rows if r["status"] == "Absent"),
                "not_marked": sum(1 for r in rows if r["status"] == "Not Marked"),
            }

            return (
                jsonify(
                    {
                        "success": True,
                        "meal_attendance": rows,
                        "stats": stats,
                        "date": meal_date.isoformat(),
                        "meal_type": meal_type,
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while loading meal attendance")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelMealAttendanceMarkAPI(MethodView):

    @login_required
    def post(self):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            student_id = _parse_int(data.get("student_id"))
            meal_date = _parse_date(data.get("meal_date")) or date.today()
            meal_type = _clean_str(data.get("meal_type"))
            status = _clean_str(data.get("status")) or "Present"

            if not student_id:
                return (
                    jsonify({"success": False, "error": "student_id is required"}),
                    400,
                )

            if meal_type not in MEAL_ORDER:
                return jsonify({"success": False, "error": "Invalid meal_type"}), 400

            if status not in {"Present", "Absent"}:
                return jsonify({"success": False, "error": "Invalid status"}), 400

            student = Student.query.get(student_id)

            if not student:
                return jsonify({"success": False, "error": "Student not found"}), 404

            record = HostelMealAttendance.query.filter_by(
                student_id=student_id, meal_date=meal_date, meal_type=meal_type
            ).first()

            if not record:
                record = HostelMealAttendance(
                    student_id=student_id, meal_date=meal_date, meal_type=meal_type
                )
                db.session.add(record)

            record.status = status
            record.marked_at = datetime.utcnow()

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Meal attendance updated",
                        "meal_attendance": serialize_meal_attendance_row(
                            student, record
                        ),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while marking meal attendance")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelMealAttendanceBulkMarkAPI(MethodView):

    @login_required
    def post(self):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            meal_date = _parse_date(data.get("meal_date")) or date.today()
            meal_type = _clean_str(data.get("meal_type"))

            if meal_type not in MEAL_ORDER:
                return jsonify({"success": False, "error": "Invalid meal_type"}), 400

            resident_student_ids = [
                row.student_id
                for row in HostelAllocation.query.filter_by(is_active=True).all()
            ]

            already_marked_ids = {
                record.student_id
                for record in HostelMealAttendance.query.filter(
                    HostelMealAttendance.meal_date == meal_date,
                    HostelMealAttendance.meal_type == meal_type,
                    HostelMealAttendance.student_id.in_(resident_student_ids),
                ).all()
            }

            newly_marked = 0

            for student_id in resident_student_ids:
                if student_id in already_marked_ids:
                    continue

                db.session.add(
                    HostelMealAttendance(
                        student_id=student_id,
                        meal_date=meal_date,
                        meal_type=meal_type,
                        status="Present",
                        marked_at=datetime.utcnow(),
                    )
                )
                newly_marked += 1

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": f"{newly_marked} student(s) marked Present",
                        "newly_marked": newly_marked,
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while bulk-marking meal attendance")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= COMPLAINTS (ADMIN) =============================
def serialize_complaint(complaint):
    student = Student.query.get(complaint.student_id) if complaint.student_id else None
    room = Room.query.get(complaint.room_id) if complaint.room_id else None
    floor = room.floor if room else None
    block = floor.block if floor else None

    return {
        "id": complaint.id,
        "student_id": complaint.student_id,
        "student_code": (
            getattr(student, "student_id", student.id) if student else None
        ),
        "student_name": (
            safe_full_name(
                student.first_name,
                getattr(student, "middle_name", None),
                student.last_name,
            )
            if student
            else "Unknown student"
        ),
        "room_id": complaint.room_id,
        "room_number": room.room_number if room else None,
        "block_name": block.block_name if block else None,
        "issue": complaint.issue,
        "category": complaint.category or "Other",
        "priority": complaint.priority or "Medium",
        "status": complaint.status or "Pending",
        "resolution_notes": complaint.resolution_notes,
        "created_at": (
            complaint.created_at.isoformat() if complaint.created_at else None
        ),
        "resolved_at": (
            complaint.resolved_at.isoformat() if complaint.resolved_at else None
        ),
    }


class HostelComplaintListAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            search = _clean_str(request.args.get("search"))
            status = _clean_str(request.args.get("status"))
            category = _clean_str(request.args.get("category"))
            priority = _clean_str(request.args.get("priority"))

            query = HostelComplaint.query

            if status:
                query = query.filter(HostelComplaint.status == status)

            if category:
                query = query.filter(HostelComplaint.category == category)

            if priority:
                query = query.filter(HostelComplaint.priority == priority)

            complaints = query.order_by(HostelComplaint.id.desc()).all()

            rows = [serialize_complaint(complaint) for complaint in complaints]

            if search:
                needle = search.lower()

                rows = [
                    row
                    for row in rows
                    if needle in (row["student_name"] or "").lower()
                    or needle in str(row["student_code"] or "").lower()
                    or needle in (row["room_number"] or "").lower()
                    or needle in (row["issue"] or "").lower()
                ]

            stats = {
                "total": len(rows),
                "pending": sum(1 for r in rows if r["status"] == "Pending"),
                "in_progress": sum(1 for r in rows if r["status"] == "In Progress"),
                "resolved": sum(1 for r in rows if r["status"] == "Resolved"),
                "urgent": sum(1 for r in rows if r["priority"] == "Urgent"),
            }

            return (
                jsonify({"success": True, "complaints": rows, "stats": stats}),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while listing complaints")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelComplaintUpdateAPI(MethodView):

    @login_required
    def put(self, complaint_id):
        _, access_error = authorize_hostel_admin("edit")

        if access_error:
            return access_error

        complaint = HostelComplaint.query.get(complaint_id)

        if not complaint:
            return jsonify({"success": False, "error": "Complaint not found"}), 404

        try:
            data = request.get_json(silent=True) or {}

            if data.get("status") is not None:
                status = _clean_str(data.get("status"))

                if status not in {"Pending", "In Progress", "Resolved"}:
                    return jsonify({"success": False, "error": "Invalid status"}), 400

                complaint.status = status

                if status == "Resolved" and not complaint.resolved_at:
                    complaint.resolved_at = datetime.utcnow()
                elif status != "Resolved":
                    complaint.resolved_at = None

            if data.get("category") is not None:
                category = _clean_str(data.get("category"))

                if category not in {
                    "Electrical",
                    "Plumbing",
                    "Cleaning",
                    "Furniture",
                    "Internet",
                    "Other",
                }:
                    return jsonify({"success": False, "error": "Invalid category"}), 400

                complaint.category = category

            if data.get("priority") is not None:
                priority = _clean_str(data.get("priority"))

                if priority not in {"Low", "Medium", "High", "Urgent"}:
                    return jsonify({"success": False, "error": "Invalid priority"}), 400

                complaint.priority = priority

            if "resolution_notes" in data:
                complaint.resolution_notes = (
                    _clean_str(data.get("resolution_notes")) or None
                )

            student = Student.query.get(complaint.student_id)

            log_hostel_activity(
                "Complaint",
                "complaint_updated",
                f"Updated complaint from "
                f"{safe_full_name(student.first_name, getattr(student, 'middle_name', None), student.last_name) if student else 'a student'} "
                f"to status: {complaint.status}",
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Complaint updated",
                        "complaint": serialize_complaint(complaint),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while updating complaint")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def delete(self, complaint_id):
        _, access_error = authorize_hostel_admin("delete")

        if access_error:
            return access_error

        complaint = HostelComplaint.query.get(complaint_id)

        if not complaint:
            return jsonify({"success": False, "error": "Complaint not found"}), 404

        try:
            db.session.delete(complaint)
            db.session.commit()

            return jsonify({"success": True, "message": "Complaint deleted"}), 200

        except SQLAlchemyError as e:
            logger.exception("Database error while deleting complaint")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= MAINTENANCE (ADMIN) =============================
def serialize_maintenance_request(req):
    return {
        "id": req.id,
        "title": req.title,
        "description": req.description,
        "room_id": req.room_id,
        "room_number": req.room.room_number if req.room else None,
        "block_id": req.block_id,
        "block_name": (
            req.block.block_name
            if req.block
            else (
                req.room.floor.block.block_name if req.room and req.room.floor else None
            )
        ),
        "category": req.category or "Other",
        "priority": req.priority or "Medium",
        "status": req.status or "Open",
        "assigned_staff_id": req.assigned_staff_id,
        "assigned_staff_name": (
            safe_full_name(
                req.assigned_staff.first_name,
                req.assigned_staff.middle_name,
                req.assigned_staff.last_name,
            )
            if req.assigned_staff
            else None
        ),
        "resolution_notes": req.resolution_notes,
        "created_at": req.created_at.isoformat() if req.created_at else None,
        "resolved_at": req.resolved_at.isoformat() if req.resolved_at else None,
    }


class HostelMaintenanceListAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            search = _clean_str(request.args.get("search"))
            status = _clean_str(request.args.get("status"))
            category = _clean_str(request.args.get("category"))
            priority = _clean_str(request.args.get("priority"))

            query = HostelMaintenanceRequest.query

            if status:
                query = query.filter(HostelMaintenanceRequest.status == status)

            if category:
                query = query.filter(HostelMaintenanceRequest.category == category)

            if priority:
                query = query.filter(HostelMaintenanceRequest.priority == priority)

            requests_ = query.order_by(HostelMaintenanceRequest.id.desc()).all()

            rows = [serialize_maintenance_request(req) for req in requests_]

            if search:
                needle = search.lower()

                rows = [
                    row
                    for row in rows
                    if needle in (row["title"] or "").lower()
                    or needle in (row["room_number"] or "").lower()
                    or needle in (row["block_name"] or "").lower()
                ]

            stats = {
                "total": len(rows),
                "open": sum(1 for r in rows if r["status"] == "Open"),
                "in_progress": sum(1 for r in rows if r["status"] == "In Progress"),
                "resolved": sum(1 for r in rows if r["status"] == "Resolved"),
                "urgent": sum(
                    1
                    for r in rows
                    if r["priority"] == "Urgent" and r["status"] != "Resolved"
                ),
            }

            return jsonify({"success": True, "requests": rows, "stats": stats}), 200

        except SQLAlchemyError as e:
            logger.exception("Database error while listing maintenance requests")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def post(self):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            title = _clean_str(data.get("title"))

            if not title:
                return jsonify({"success": False, "error": "Title is required"}), 400

            room_id = _parse_int(data.get("room_id"))
            block_id = _parse_int(data.get("block_id"))

            if room_id and not Room.query.get(room_id):
                return jsonify({"success": False, "error": "Room not found"}), 404

            if block_id and not HostelBlock.query.get(block_id):
                return jsonify({"success": False, "error": "Block not found"}), 404

            category = _clean_str(data.get("category")) or "Other"

            if category not in {
                "Electrical",
                "Plumbing",
                "Carpentry",
                "HVAC",
                "Painting",
                "Other",
            }:
                return jsonify({"success": False, "error": "Invalid category"}), 400

            priority = _clean_str(data.get("priority")) or "Medium"

            if priority not in {"Low", "Medium", "High", "Urgent"}:
                return jsonify({"success": False, "error": "Invalid priority"}), 400

            assigned_staff_id = _parse_int(data.get("assigned_staff_id"))

            if assigned_staff_id and not HostelStaff.query.get(assigned_staff_id):
                return (
                    jsonify({"success": False, "error": "Staff member not found"}),
                    404,
                )

            maintenance_request = HostelMaintenanceRequest(
                title=title,
                description=_clean_str(data.get("description")) or None,
                room_id=room_id,
                block_id=block_id,
                category=category,
                priority=priority,
                status="Open",
                assigned_staff_id=assigned_staff_id,
            )

            db.session.add(maintenance_request)

            log_hostel_activity(
                "Maintenance",
                "maintenance_request_created",
                f"Logged maintenance request: {title}",
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Maintenance request logged",
                        "request": serialize_maintenance_request(maintenance_request),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while creating maintenance request")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelMaintenanceDetailAPI(MethodView):

    @login_required
    def put(self, request_id):
        _, access_error = authorize_hostel_admin("edit")

        if access_error:
            return access_error

        maintenance_request = HostelMaintenanceRequest.query.get(request_id)

        if not maintenance_request:
            return (
                jsonify({"success": False, "error": "Maintenance request not found"}),
                404,
            )

        try:
            data = request.get_json(silent=True) or {}

            if data.get("status") is not None:
                status = _clean_str(data.get("status"))

                if status not in {"Open", "In Progress", "Resolved", "Cancelled"}:
                    return jsonify({"success": False, "error": "Invalid status"}), 400

                maintenance_request.status = status

                if status == "Resolved" and not maintenance_request.resolved_at:
                    maintenance_request.resolved_at = datetime.utcnow()
                elif status != "Resolved":
                    maintenance_request.resolved_at = None

            if data.get("priority") is not None:
                priority = _clean_str(data.get("priority"))

                if priority not in {"Low", "Medium", "High", "Urgent"}:
                    return jsonify({"success": False, "error": "Invalid priority"}), 400

                maintenance_request.priority = priority

            if data.get("category") is not None:
                category = _clean_str(data.get("category"))

                if category not in {
                    "Electrical",
                    "Plumbing",
                    "Carpentry",
                    "HVAC",
                    "Painting",
                    "Other",
                }:
                    return jsonify({"success": False, "error": "Invalid category"}), 400

                maintenance_request.category = category

            if "assigned_staff_id" in data:
                assigned_staff_id = _parse_int(data.get("assigned_staff_id"))

                if assigned_staff_id and not HostelStaff.query.get(assigned_staff_id):
                    return (
                        jsonify({"success": False, "error": "Staff member not found"}),
                        404,
                    )

                maintenance_request.assigned_staff_id = assigned_staff_id

            if "resolution_notes" in data:
                maintenance_request.resolution_notes = (
                    _clean_str(data.get("resolution_notes")) or None
                )

            if data.get("title") is not None:
                title = _clean_str(data.get("title"))

                if not title:
                    return (
                        jsonify({"success": False, "error": "Title is required"}),
                        400,
                    )

                maintenance_request.title = title

            if data.get("description") is not None:
                maintenance_request.description = (
                    _clean_str(data.get("description")) or None
                )

            log_hostel_activity(
                "Maintenance",
                "maintenance_request_updated",
                f'Updated maintenance request "{maintenance_request.title}" '
                f"to status: {maintenance_request.status}",
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Maintenance request updated",
                        "request": serialize_maintenance_request(maintenance_request),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while updating maintenance request")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def delete(self, request_id):
        _, access_error = authorize_hostel_admin("delete")

        if access_error:
            return access_error

        maintenance_request = HostelMaintenanceRequest.query.get(request_id)

        if not maintenance_request:
            return (
                jsonify({"success": False, "error": "Maintenance request not found"}),
                404,
            )

        try:
            db.session.delete(maintenance_request)
            db.session.commit()

            return (
                jsonify({"success": True, "message": "Maintenance request deleted"}),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while deleting maintenance request")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= FEE STRUCTURES (FEE MANAGEMENT) =============================
class HostelFeeStructureListAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            status = _clean_str(request.args.get("status"))
            fee_type = _clean_str(request.args.get("fee_type"))

            query = HostelFeeStructure.query

            if status:
                query = query.filter(HostelFeeStructure.status == status)

            if fee_type:
                query = query.filter(HostelFeeStructure.fee_type == fee_type)

            structures = query.order_by(HostelFeeStructure.id.desc()).all()

            return (
                jsonify(
                    {
                        "success": True,
                        "structures": [serialize_fee_structure(s) for s in structures],
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while listing fee structures")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def post(self):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            fee_type = _clean_str(data.get("fee_type")) or "Monthly"

            if fee_type not in {
                "Admission",
                "Monthly",
                "Quarterly",
                "Annual",
                "Security Deposit",
                "Mess Fee",
                "Other",
            }:
                return jsonify({"success": False, "error": "Invalid fee_type"}), 400

            amount = _parse_decimal(data.get("amount"))

            if amount is None or amount <= 0:
                return (
                    jsonify({"success": False, "error": "A valid amount is required"}),
                    400,
                )

            hostel_id = _parse_int(data.get("hostel_id"))

            if hostel_id and not Hostel.query.get(hostel_id):
                return jsonify({"success": False, "error": "Hostel not found"}), 404

            structure = HostelFeeStructure(
                fee_type=fee_type,
                hostel_id=hostel_id,
                amount=amount,
                academic_year=_clean_str(data.get("academic_year")) or None,
                description=_clean_str(data.get("description")) or None,
                status=_clean_str(data.get("status")) or "Active",
            )

            db.session.add(structure)
            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Fee structure created",
                        "structure": serialize_fee_structure(structure),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while creating fee structure")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelFeeStructureDetailAPI(MethodView):

    @login_required
    def put(self, structure_id):
        _, access_error = authorize_hostel_admin("edit")

        if access_error:
            return access_error

        structure = HostelFeeStructure.query.get(structure_id)

        if not structure:
            return jsonify({"success": False, "error": "Fee structure not found"}), 404

        try:
            data = request.get_json(silent=True) or {}

            if data.get("fee_type") is not None:
                fee_type = _clean_str(data.get("fee_type"))

                if fee_type not in {
                    "Admission",
                    "Monthly",
                    "Quarterly",
                    "Annual",
                    "Security Deposit",
                    "Mess Fee",
                    "Other",
                }:
                    return jsonify({"success": False, "error": "Invalid fee_type"}), 400

                structure.fee_type = fee_type

            if "amount" in data:
                amount = _parse_decimal(data.get("amount"))

                if amount is None or amount <= 0:
                    return (
                        jsonify(
                            {"success": False, "error": "A valid amount is required"}
                        ),
                        400,
                    )

                structure.amount = amount

            if data.get("hostel_id") is not None:
                hostel_id = _parse_int(data.get("hostel_id"))

                if hostel_id and not Hostel.query.get(hostel_id):
                    return jsonify({"success": False, "error": "Hostel not found"}), 404

                structure.hostel_id = hostel_id

            if data.get("academic_year") is not None:
                structure.academic_year = _clean_str(data.get("academic_year")) or None

            if data.get("description") is not None:
                structure.description = _clean_str(data.get("description")) or None

            if data.get("status") is not None:
                status = _clean_str(data.get("status"))

                if status not in {"Active", "Inactive"}:
                    return jsonify({"success": False, "error": "Invalid status"}), 400

                structure.status = status

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Fee structure updated",
                        "structure": serialize_fee_structure(structure),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while updating fee structure")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def delete(self, structure_id):
        _, access_error = authorize_hostel_admin("delete")

        if access_error:
            return access_error

        structure = HostelFeeStructure.query.get(structure_id)

        if not structure:
            return jsonify({"success": False, "error": "Fee structure not found"}), 404

        try:
            db.session.delete(structure)
            db.session.commit()

            return jsonify({"success": True, "message": "Fee structure deleted"}), 200

        except SQLAlchemyError as e:
            logger.exception("Database error while deleting fee structure")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelFeeGenerateAPI(MethodView):

    @login_required
    def post(self):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            structure_id = _parse_int(data.get("fee_structure_id"))
            structure = (
                HostelFeeStructure.query.get(structure_id) if structure_id else None
            )

            if not structure:
                return (
                    jsonify({"success": False, "error": "Fee structure not found"}),
                    404,
                )

            due_date = _parse_date(data.get("due_date"))

            allocation_query = HostelAllocation.query.filter_by(is_active=True)

            if structure.hostel_id:
                allocation_query = (
                    allocation_query.join(Bed, HostelAllocation.bed_id == Bed.id)
                    .join(Room, Bed.room_id == Room.id)
                    .join(HostelFloor, Room.floor_id == HostelFloor.id)
                    .join(HostelBlock, HostelFloor.block_id == HostelBlock.id)
                    .filter(HostelBlock.hostel_id == structure.hostel_id)
                )

            student_ids = {a.student_id for a in allocation_query.all()}

            existing_student_ids = {
                fee.student_id
                for fee in HostelFee.query.filter(
                    HostelFee.fee_structure_id == structure.id,
                    HostelFee.student_id.in_(student_ids) if student_ids else False,
                ).all()
            }

            created = 0

            for student_id in student_ids - existing_student_ids:
                db.session.add(
                    HostelFee(
                        student_id=student_id,
                        fee_structure_id=structure.id,
                        fee_type=structure.fee_type,
                        amount=structure.amount,
                        due_date=due_date,
                        status="Pending",
                    )
                )
                created += 1

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": (
                            f"Generated {created} new fee invoice(s). "
                            f"{len(existing_student_ids)} student(s) already had one."
                        ),
                        "created": created,
                        "skipped": len(existing_student_ids),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while generating fee invoices")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= FEE INVOICES (FEE MANAGEMENT OVERVIEW / PENDING DUES) =============================
class HostelFeeListAPI(MethodView):

    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            search = _clean_str(request.args.get("search"))
            status = _clean_str(request.args.get("status"))
            fee_type = _clean_str(request.args.get("fee_type"))
            # "dues_only=true" is what the Pending Dues section uses -
            # anything with balance > 0.
            dues_only = _clean_str(request.args.get("dues_only")).lower() == "true"

            query = HostelFee.query

            if fee_type:
                query = query.filter(HostelFee.fee_type == fee_type)

            fees = query.order_by(HostelFee.id.desc()).all()

            rows = [serialize_fee(fee) for fee in fees]

            if status:
                rows = [row for row in rows if row["status"] == status]

            if dues_only:
                rows = [row for row in rows if row["balance"] > 0]

            if search:
                needle = search.lower()

                rows = [
                    row
                    for row in rows
                    if needle in (row["student_name"] or "").lower()
                    or needle in str(row["student_code"] or "").lower()
                    or needle in (row["room_number"] or "").lower()
                ]

            stats = {
                "total_invoices": len(rows),
                "total_amount": round(sum(r["amount"] for r in rows), 2),
                "total_collected": round(sum(r["paid_amount"] for r in rows), 2),
                "total_pending": round(sum(r["balance"] for r in rows), 2),
                "overdue_count": sum(1 for r in rows if r["status"] == "Overdue"),
            }

            return jsonify({"success": True, "fees": rows, "stats": stats}), 200

        except SQLAlchemyError as e:
            logger.exception("Database error while listing fee invoices")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


class HostelFeeDetailAPI(MethodView):

    @login_required
    def get(self, fee_id):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        fee = HostelFee.query.get(fee_id)

        if not fee:
            return jsonify({"success": False, "error": "Fee invoice not found"}), 404

        payments = [
            serialize_payment(p)
            for p in fee.payments.order_by(HostelFeePayment.payment_date.desc())
        ]

        return (
            jsonify({"success": True, "fee": serialize_fee(fee), "payments": payments}),
            200,
        )

    @login_required
    def delete(self, fee_id):
        _, access_error = authorize_hostel_admin("delete")

        if access_error:
            return access_error

        fee = HostelFee.query.get(fee_id)

        if not fee:
            return jsonify({"success": False, "error": "Fee invoice not found"}), 404

        try:
            if fee.payments.count() > 0:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": (
                                "This invoice has recorded payments against it "
                                "and can't be deleted."
                            ),
                        }
                    ),
                    409,
                )

            db.session.delete(fee)
            db.session.commit()

            return jsonify({"success": True, "message": "Fee invoice deleted"}), 200

        except SQLAlchemyError as e:
            logger.exception("Database error while deleting fee invoice")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= PAYMENTS =============================
class HostelFeePaymentListAPI(MethodView):
    """Payment transaction history, and recording a new payment
    against a fee invoice."""

    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            search = _clean_str(request.args.get("search"))
            payment_method = _clean_str(request.args.get("payment_method"))

            query = HostelFeePayment.query

            if payment_method:
                query = query.filter(HostelFeePayment.payment_method == payment_method)

            payments = query.order_by(HostelFeePayment.id.desc()).all()

            rows = [serialize_payment(p) for p in payments]

            if search:
                needle = search.lower()

                rows = [
                    row
                    for row in rows
                    if needle in (row["student_name"] or "").lower()
                    or needle in str(row["student_code"] or "").lower()
                    or needle in (row["transaction_reference"] or "").lower()
                ]

            stats = {
                "total_payments": len(rows),
                "total_collected": round(sum(r["amount"] for r in rows), 2),
            }

            return jsonify({"success": True, "payments": rows, "stats": stats}), 200

        except SQLAlchemyError as e:
            logger.exception("Database error while listing payments")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )

    @login_required
    def post(self):
        _, access_error = authorize_hostel_admin("write")

        if access_error:
            return access_error

        try:
            data = request.get_json(silent=True) or {}

            fee_id = _parse_int(data.get("fee_id"))
            fee = HostelFee.query.get(fee_id) if fee_id else None

            if not fee:
                return (
                    jsonify({"success": False, "error": "Fee invoice not found"}),
                    404,
                )

            amount = _parse_decimal(data.get("amount"))

            if amount is None or amount <= 0:
                return (
                    jsonify({"success": False, "error": "A valid amount is required"}),
                    400,
                )

            current_balance = get_fee_payment_summary(fee)["balance"]

            if amount > current_balance + 0.01:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": (
                                f"Amount exceeds the remaining balance of "
                                f"₹{current_balance}"
                            ),
                        }
                    ),
                    400,
                )

            payment_method = _clean_str(data.get("payment_method")) or "Cash"

            if payment_method not in {
                "Cash",
                "Card",
                "UPI",
                "Bank Transfer",
                "Cheque",
                "Other",
            }:
                return (
                    jsonify({"success": False, "error": "Invalid payment_method"}),
                    400,
                )

            payment = HostelFeePayment(
                fee_id=fee.id,
                amount=amount,
                payment_method=payment_method,
                transaction_reference=(
                    _clean_str(data.get("transaction_reference")) or None
                ),
                notes=_clean_str(data.get("notes")) or None,
                payment_date=_parse_date(data.get("payment_date")) or date.today(),
            )

            db.session.add(payment)
            db.session.flush()
            fee.status = get_fee_payment_summary(fee)["status"]

            student = Student.query.get(fee.student_id)

            log_hostel_activity(
                "Payment",
                "payment_recorded",
                f"Recorded ₹{amount} ({payment_method}) payment from "
                f"{safe_full_name(student.first_name, getattr(student, 'middle_name', None), student.last_name) if student else 'a student'} "
                f"towards {fee.fee_type or 'a fee'}",
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Payment recorded",
                        "payment": serialize_payment(payment),
                        "fee": serialize_fee(fee),
                    }
                ),
                201,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while recording payment")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= ACTIVITY LOGS =============================
class HostelActivityLogListAPI(MethodView):
    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            search = _clean_str(request.args.get("search"))
            category = _clean_str(request.args.get("category"))
            limit = _parse_int(request.args.get("limit"), 200) or 200
            limit = min(max(limit, 1), 500)

            query = HostelActivityLog.query

            if category:
                query = query.filter(HostelActivityLog.category == category)

            logs = query.order_by(HostelActivityLog.id.desc()).limit(limit).all()

            rows = [serialize_activity_log(log) for log in logs]

            if search:
                needle = search.lower()

                rows = [
                    row
                    for row in rows
                    if needle in (row["description"] or "").lower()
                    or needle in (row["admin_name"] or "").lower()
                    or needle in (row["action"] or "").lower()
                ]

            category_counts = {}

            for row in rows:
                category_counts[row["category"]] = (
                    category_counts.get(row["category"], 0) + 1
                )

            stats = {"total": len(rows), "by_category": category_counts}

            return jsonify({"success": True, "logs": rows, "stats": stats}), 200

        except SQLAlchemyError as e:
            logger.exception("Database error while listing activity logs")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )


# ============================= REPORTS & ANALYTICS =============================
class HostelReportsAPI(MethodView):
    @login_required
    def get(self):
        _, access_error = authorize_hostel_admin("read")

        if access_error:
            return access_error

        try:
            # ---- Occupancy ----
            total_beds = Bed.query.count()
            occupied_beds = Bed.query.filter(Bed.status == "Occupied").count()
            vacant_beds = Bed.query.filter(Bed.status == "Vacant").count()
            maintenance_beds = Bed.query.filter(Bed.status == "Maintenance").count()

            occupancy_rate = (
                round((occupied_beds / total_beds) * 100, 1) if total_beds else 0
            )

            block_occupancy = []

            for block in HostelBlock.query.order_by(HostelBlock.block_name).all():
                block_beds = (
                    Bed.query.join(Room, Bed.room_id == Room.id)
                    .join(HostelFloor, Room.floor_id == HostelFloor.id)
                    .filter(HostelFloor.block_id == block.id)
                )
                total = block_beds.count()
                occupied = block_beds.filter(Bed.status == "Occupied").count()

                if total:
                    block_occupancy.append(
                        {
                            "block_name": block.block_name,
                            "total_beds": total,
                            "occupied_beds": occupied,
                            "occupancy_rate": round((occupied / total) * 100, 1),
                        }
                    )

            # ---- Fees ----
            all_fees = HostelFee.query.all()
            fee_summaries = [get_fee_payment_summary(fee) for fee in all_fees]

            total_invoiced = round(sum(float(fee.amount or 0) for fee in all_fees), 2)
            total_collected = round(sum(s["paid_amount"] for s in fee_summaries), 2)
            total_pending = round(sum(s["balance"] for s in fee_summaries), 2)
            collection_rate = (
                round((total_collected / total_invoiced) * 100, 1)
                if total_invoiced
                else 0
            )

            # ---- Complaints & Maintenance ----
            complaint_total = HostelComplaint.query.count()
            complaint_resolved = HostelComplaint.query.filter(
                HostelComplaint.status == "Resolved"
            ).count()
            complaint_resolution_rate = (
                round((complaint_resolved / complaint_total) * 100, 1)
                if complaint_total
                else 0
            )

            maintenance_total = HostelMaintenanceRequest.query.count()
            maintenance_resolved = HostelMaintenanceRequest.query.filter(
                HostelMaintenanceRequest.status == "Resolved"
            ).count()

            # ---- Attendance (last 7 days, daily roll-call) ----
            attendance_trend = []

            for offset in range(6, -1, -1):
                day = date.today() - timedelta(days=offset)

                day_records = HostelAttendance.query.filter(
                    HostelAttendance.attendance_date == day
                ).all()

                present = sum(1 for r in day_records if r.status == "Present")
                absent = sum(1 for r in day_records if r.status == "Absent")

                attendance_trend.append(
                    {
                        "date": day.isoformat(),
                        "present": present,
                        "absent": absent,
                        "marked": len(day_records),
                    }
                )

            # ---- Movement ----
            outside_now = HostelMovement.query.filter(
                HostelMovement.check_in_time.is_(None)
            ).count()

            # ---- Students ----
            active_residents = HostelAllocation.query.filter_by(is_active=True).count()

            return (
                jsonify(
                    {
                        "success": True,
                        "occupancy": {
                            "total_beds": total_beds,
                            "occupied_beds": occupied_beds,
                            "vacant_beds": vacant_beds,
                            "maintenance_beds": maintenance_beds,
                            "occupancy_rate": occupancy_rate,
                            "active_residents": active_residents,
                            "by_block": block_occupancy,
                        },
                        "fees": {
                            "total_invoiced": total_invoiced,
                            "total_collected": total_collected,
                            "total_pending": total_pending,
                            "collection_rate": collection_rate,
                        },
                        "complaints": {
                            "total": complaint_total,
                            "resolved": complaint_resolved,
                            "resolution_rate": complaint_resolution_rate,
                        },
                        "maintenance": {
                            "total": maintenance_total,
                            "resolved": maintenance_resolved,
                        },
                        "attendance_trend": attendance_trend,
                        "movement": {"currently_outside": outside_now},
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while generating hostel report")
            db.session.rollback()

            return (
                jsonify(
                    {"success": False, "error": "Database error", "detail": str(e)}
                ),
                500,
            )
