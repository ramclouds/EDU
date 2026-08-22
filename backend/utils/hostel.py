from datetime import date, datetime
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
    """
    Load the student's current academic assignment from
    studentDetails.py models - Student -> StudentAcademicRecord ->
    AcademicClass -> Batch / Division / Section. Mirrors library.py's
    helper of the same name exactly, so "course"/class info shows up
    identically across every admin dashboard instead of being guessed
    per-module.
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
        db.UniqueConstraint(
            "hostel_id", "block_name", name="uq_block_hostel_name"
        ),
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
    """
    NEW MODEL. Floors used to only exist as a bare integer column on
    Room, so a "Floor & Block" management section had nothing real to
    manage - you couldn't name a floor, disable it, or see per-floor
    stats without a room already existing on it. Floor is now a first
    class entity between Block and Room, matching the "Block -> Floor
    -> Room -> Bed" hierarchy the dashboard already describes.
    """

    __tablename__ = "hostel_floors"
    __table_args__ = (
        db.UniqueConstraint(
            "block_id", "floor_number", name="uq_floor_block_number"
        ),
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
        db.UniqueConstraint(
            "floor_id", "room_number", name="uq_room_floor_number"
        ),
    )

    id = db.Column(db.Integer, primary_key=True)

    # CHANGED: rooms now belong to a HostelFloor (which itself belongs to
    # a HostelBlock), instead of a bare block_id + integer `floor` column.
    # This is what actually makes the Block -> Floor -> Room hierarchy
    # real and lets a floor be managed as its own thing.
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
        """
        BUG FIX: capacity used to be a manually-typed integer that had
        no real relationship to the beds that actually existed, so it
        could silently drift out of sync (e.g. capacity=3 but only 2
        Bed rows really existed, or vice versa). Capacity is now always
        derived live from the real bed count, so it can never lie.
        """

        return self.beds.count()

    @property
    def occupied_count(self):
        return self.beds.filter(Bed.status == "Occupied").count()

    @property
    def available_count(self):
        return self.beds.filter(Bed.status == "Vacant").count()


class Bed(db.Model):
    """
    NEW MODEL. Beds used to be an implicit, unvalidated integer
    (`bed_number`) directly on HostelAllocation - there was no bed
    record to manage, no way to mark a bed "under maintenance", and
    nothing stopped two students from being allocated the same
    room + bed_number at once. Beds are now a real, independently
    manageable entity.
    """

    __tablename__ = "beds"
    __table_args__ = (
        db.UniqueConstraint(
            "room_id", "bed_number", name="uq_bed_room_number"
        ),
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

    # CHANGED: allocations now point at a real Bed row instead of a bare
    # room_id + unvalidated bed_number integer. The room is reached via
    # bed.room, so it can never disagree with which bed was actually
    # assigned. See allocate_bed_to_student() for the one-active-
    # allocation-per-bed enforcement (SQLAlchemy/MySQL can't express a
    # "unique while is_active=True" constraint declaratively).
    bed_id = db.Column(
        db.Integer,
        db.ForeignKey("beds.id", ondelete="CASCADE"),
        nullable=False,
    )

    check_in_date = db.Column(db.Date)
    check_out_date = db.Column(db.Date)

    is_active = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


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


class HostelStaff(db.Model):
    """NEW MODEL. Wardens, security guards, cleaners, cooks and
    maintenance staff who work at the hostel - separate from Warden
    (which only tracks the person a room's day-to-day contact is)."""

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

    # Which block this staff member is primarily assigned to. Nullable -
    # some roles (e.g. a hostel-wide chief warden) aren't tied to one
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
    """NEW MODEL. Every visitor entry request/log for a hostel student -
    who they are, who they're visiting, and their approval/entry
    status."""

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
    """NEW MODEL. One daily attendance record per resident student -
    Present/Absent/On Leave/Late Entry. Upserted (one row per
    student+date) rather than appended, so re-marking a student on the
    same day updates the existing row instead of creating duplicates."""

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
    """NEW MODEL. A single out-and-back movement log for a resident
    student - when they left, when they were expected back, and when
    they actually returned (if at all yet). Status is derived, not
    stored, so it can never drift out of sync with the timestamps:
    no check_in_time -> "Outside Hostel"; checked in after
    expected_return_time -> "Late Entry"; otherwise -> "Returned"."""

    __tablename__ = "hostel_movements"

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
    )

    check_out_time = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow
    )
    expected_return_time = db.Column(db.DateTime)
    check_in_time = db.Column(db.DateTime)

    purpose = db.Column(db.String(255))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def status(self):
        if not self.check_in_time:
            return "Outside Hostel"

        if (
            self.expected_return_time
            and self.check_in_time > self.expected_return_time
        ):
            return "Late Entry"

        return "Returned"


class HostelLeaveRequest(db.Model):
    """NEW MODEL. A student's leave application and its approval
    workflow: Pending -> Approved/Rejected, and once an approved leave
    ends, Returned once the student is confirmed back."""

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
    """NEW MODEL. The weekly mess menu - one row per (day_of_week,
    meal_type) combination, e.g. Monday + Lunch. Upserted rather than
    appended, so editing a day's menu updates the existing row instead
    of piling up duplicates."""

    __tablename__ = "hostel_mess_menu"
    __table_args__ = (
        db.UniqueConstraint(
            "day_of_week", "meal_type", name="uq_mess_menu_day_meal"
        ),
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
    """NEW MODEL. One record per student, per date, per meal - did they
    eat that meal or not. Same upsert-by-unique-constraint pattern as
    HostelAttendance, just scoped to a specific meal instead of the
    whole day."""

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
    """
    Shared lookup: a resident student's current active bed -> room ->
    floor -> block, in one place instead of duplicated inline in every
    serializer that needs "which room/block is this student in"
    (visitors, attendance, movements, leave requests). Returns a dict
    of Nones if the student has no active allocation.
    """

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
# Mirrors library.py's authorize_library_admin() exactly, gated on the
# "hostel" RBAC module instead of "library". "read" only ever needs
# view=True; "write"/"edit"/"delete" need the matching CRUD flag, which
# is only ever granted together as "Full Access" from Role & Permission
# Management (see dashboardActionsFromAccessLevel on the frontend).
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

    admin_type = (
        getattr(current_user, "admin_type", "") or ""
    ).strip().lower()

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
        "created_at": (
            hostel.created_at.isoformat() if hostel.created_at else None
        ),
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
            "occupied_beds": sum(
                1 for bed in beds if bed.status == "Occupied"
            ),
            "available_beds": sum(
                1 for bed in beds if bed.status == "Vacant"
            ),
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
        "created_at": (
            block.created_at.isoformat() if block.created_at else None
        ),
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
        "created_at": (
            floor.created_at.isoformat() if floor.created_at else None
        ),
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
                    "student_code": getattr(
                        student, "student_id", student.id
                    ),
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
            room.floor.block.block_name
            if room.floor and room.floor.block
            else None
        ),
        "hostel_id": (
            room.floor.block.hostel_id
            if room.floor and room.floor.block
            else None
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
        "created_at": (
            room.created_at.isoformat() if room.created_at else None
        ),
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
            # CHANGED: allocation now points at a Bed, not a room_id +
            # bare bed_number - the room is reached through the bed.
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
                    HostelAllocation.query.join(
                        Bed, HostelAllocation.bed_id == Bed.id
                    )
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
                    allocation.bed.room_id
                    if allocation and allocation.bed
                    else None
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                {"success": True, "hostel": serialize_hostel(hostel, include_stats=True)}
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                joinedload(Room.floor).joinedload(HostelFloor.block).joinedload(
                    HostelBlock.hostel
                )
            )

            if floor_id:
                query = query.filter(Room.floor_id == floor_id)
            elif block_id:
                query = query.join(HostelFloor).filter(
                    HostelFloor.block_id == block_id
                )
            elif hostel_id:
                query = query.join(HostelFloor).join(HostelBlock).filter(
                    HostelBlock.hostel_id == hostel_id
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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

            # Convenience: auto-create beds for a brand new room instead of
            # forcing the admin to immediately jump to the Beds section and
            # add each one by hand. Skipped entirely if not requested -
            # capacity is always just len(room.beds), never a typed number.
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
            jsonify(
                {"success": True, "room": serialize_room(room, include_beds=True)}
            ),
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
                new_floor = HostelFloor.query.get(new_floor_id) if new_floor_id else None

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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                query = query.join(Room).join(HostelFloor).filter(
                    HostelFloor.block_id == block_id
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                return jsonify({"success": False, "error": "student_id is required"}), 400

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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
                500,
            )


# ============================= STRUCTURE OVERVIEW =============================
class HostelStructureOverviewAPI(MethodView):
    """
    Powers the "Floors & Blocks" page in one call: every hostel with its
    blocks/floors/rooms nested underneath, plus aggregate stats for the
    stat cards at the top - instead of the frontend firing N+1 requests
    (one per block, one per floor, ...) to build the same tree.
    """

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

                            rooms_payload.append(serialize_room(room, include_beds=True))

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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                        Student.student_id.ilike(like)
                        if hasattr(Student, "student_id")
                        else False,
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
                500,
            )


class HostelStudentSearchAPI(MethodView):
    """
    Search every student (allocated or not), for features where any
    student is a valid target - e.g. the Visitors section, where a
    visitor can be there to see a student who already lives in the
    hostel. Deliberately does NOT exclude allocated students the way
    HostelUnallocatedStudentsAPI does - that endpoint is specifically
    for the Allocate-a-bed flow, where an already-housed student isn't
    a valid choice. Reusing it here was the bug: a student with an
    active bed (e.g. already checked in) would silently never show up
    in a visitor search.
    """

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
                        Student.student_id.ilike(like)
                        if hasattr(Student, "student_id")
                        else False,
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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

    # BUG FIX: "course" used to be a guess across a few differently-named
    # Student columns (course/class_name/program) that don't actually
    # exist on this schema, so it always came back null. The real
    # source of truth is StudentDetails.py's academic assignment chain
    # (Student -> StudentAcademicRecord -> AcademicClass -> Batch /
    # Division / Section), same as every other dashboard already uses.
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
            allocation.check_in_date.isoformat()
            if allocation.check_in_date
            else None
        ),
        "check_out_date": (
            allocation.check_out_date.isoformat()
            if allocation.check_out_date
            else None
        ),
        "is_active": allocation.is_active,
        "fee_status": fee.status if fee else None,
        "fee_amount": (
            float(fee.amount) if fee and fee.amount is not None else None
        ),
    }


class HostelAllocationListAPI(MethodView):
    """
    Every hostel student allocation, joined with student/room/block/floor/
    bed/fee info in one call. Powers both the "Students" and "Room
    Allotment" dashboard sections - they show the same underlying
    allocation records with a different column emphasis, so one endpoint
    keeps both views always in sync instead of drifting apart.
    """

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

            query = HostelAllocation.query.join(
                Bed, HostelAllocation.bed_id == Bed.id
            ).join(Room, Bed.room_id == Room.id).join(
                HostelFloor, Room.floor_id == HostelFloor.id
            ).join(HostelBlock, HostelFloor.block_id == HostelBlock.id)

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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "This allocation is already checked out"}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                return jsonify({"success": False, "error": "new_bed_id is required"}), 400

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

            # ...then open a fresh allocation on the new bed, preserving
            # a continuous stay history instead of overwriting it.
            new_allocation = HostelAllocation(
                student_id=allocation.student_id,
                bed_id=new_bed.id,
                check_in_date=date.today(),
                is_active=True,
            )

            new_bed.status = "Occupied"

            db.session.add(new_allocation)
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                "security": sum(
                    1 for row in rows if row["role"] == "Security Guard"
                ),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                return jsonify({"success": False, "error": "First name is required"}), 400

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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
            db.session.delete(staff)
            db.session.commit()

            return (
                jsonify({"success": True, "message": "Staff member removed successfully"}),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while deleting hostel staff")
            db.session.rollback()

            return (
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                # block_id filtering happens post-serialize since block is
                # resolved via the student's live allocation, not stored
                # directly on the visitor row.
                block = HostelBlock.query.get(block_id)
                if block:
                    rows = [row for row in rows if row["block_name"] == block.block_name]

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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": True, "message": "Visitor record deleted successfully"}),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while deleting hostel visitor")
            db.session.rollback()

            return (
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                    {"success": False, "error": f"This visit is already {visitor.status}"}
                ),
                409,
            )

        try:
            visitor.status = "Approved"
            visitor.check_in_time = datetime.utcnow()

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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                    {"success": False, "error": f"This visit is already {visitor.status}"}
                ),
                409,
            )

        try:
            visitor.status = "Rejected"

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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
    """
    Every currently-resident student for the given date (default
    today), left-joined with their attendance record for that date if
    one has been marked yet. This is a roster, not a plain attendance
    table - a student who hasn't been marked yet still shows up as
    "Not Marked" instead of silently disappearing.
    """

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

            resident_student_ids = [
                row.student_id for row in allocation_query.all()
            ]

            students = (
                Student.query.filter(Student.id.in_(resident_student_ids))
                .order_by(Student.first_name.asc())
                .all()
                if resident_student_ids
                else []
            )

            existing_records = {
                record.student_id: record
                for record in HostelAttendance.query.filter(
                    HostelAttendance.attendance_date == attendance_date,
                    HostelAttendance.student_id.in_(resident_student_ids),
                ).all()
            } if resident_student_ids else {}

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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                return jsonify({"success": False, "error": "student_id is required"}), 400

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
                    datetime.utcnow() if not record.check_in_time else record.check_in_time
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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

            movements = query.order_by(HostelMovement.check_out_time.desc()).limit(200).all()

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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                return jsonify({"success": False, "error": "student_id is required"}), 400

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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
            return jsonify({"success": False, "error": "Movement record not found"}), 404

        if movement.check_in_time:
            return (
                jsonify({"success": False, "error": "This student has already checked in"}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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

            return jsonify({"success": True, "leave_requests": rows, "stats": stats}), 200

        except SQLAlchemyError as e:
            logger.exception("Database error while loading leave requests")
            db.session.rollback()

            return (
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                    jsonify({"success": False, "error": "to_date cannot be before from_date"}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Only a pending request can be approved"}),
                409,
            )

        try:
            leave.status = "Approved"
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Only a pending request can be rejected"}),
                409,
            )

        try:
            leave.status = "Rejected"
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Only an approved leave can be marked returned"}),
                409,
            )

        try:
            data = request.get_json(silent=True) or {}

            leave.status = "Returned"
            leave.actual_return_date = (
                _parse_date(data.get("actual_return_date")) or date.today()
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
    """
    Full weekly menu grid in one call: every (day, meal) combination,
    including ones that haven't been set yet (returned as an empty
    entry) so the frontend can render a complete 7x4 grid without
    guessing which cells exist.
    """

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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
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
    """
    Every currently-resident student for the given date + meal type
    (default today / Breakfast), left-joined with their meal
    attendance record if one has been marked yet. Same roster pattern
    as HostelAttendanceListAPI, scoped to one meal at a time.
    """

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

            resident_student_ids = [
                row.student_id for row in allocation_query.all()
            ]

            students = (
                Student.query.filter(Student.id.in_(resident_student_ids))
                .order_by(Student.first_name.asc())
                .all()
                if resident_student_ids
                else []
            )

            existing_records = {
                record.student_id: record
                for record in HostelMealAttendance.query.filter(
                    HostelMealAttendance.meal_date == meal_date,
                    HostelMealAttendance.meal_type == meal_type,
                    HostelMealAttendance.student_id.in_(resident_student_ids),
                ).all()
            } if resident_student_ids else {}

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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
                500,
            )


class HostelMealAttendanceMarkAPI(MethodView):
    """Upsert one student's attendance status for one date + meal."""

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
                return jsonify({"success": False, "error": "student_id is required"}), 400

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
                        "meal_attendance": serialize_meal_attendance_row(student, record),
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.exception("Database error while marking meal attendance")
            db.session.rollback()

            return (
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
                500,
            )


class HostelMealAttendanceBulkMarkAPI(MethodView):
    """Mark every not-yet-marked resident Present for the given date +
    meal in one call - a quick head-count shortcut so the mess staff
    don't have to tap Present on every single row one at a time."""

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
                jsonify({"success": False, "error": "Database error", "detail": str(e)}),
                500,
            )
