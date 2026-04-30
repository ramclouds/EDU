from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError
import logging

from utils.auth import db, Student
from utils.auth_middleware import login_required

logger = logging.getLogger(__name__)


# ============================= MODELS =============================
class Hostel(db.Model):
    __tablename__ = "hostels"

    id = db.Column(db.Integer, primary_key=True)
    hostel_name = db.Column(db.String(100), nullable=False)


class HostelBlock(db.Model):
    __tablename__ = "hostel_blocks"

    id = db.Column(db.Integer, primary_key=True)

    hostel_id = db.Column(
        db.Integer,
        db.ForeignKey("hostels.id", ondelete="CASCADE"),
    )

    block_name = db.Column(db.String(10), nullable=False)


class Room(db.Model):
    __tablename__ = "rooms"

    id = db.Column(db.Integer, primary_key=True)

    block_id = db.Column(
        db.Integer,
        db.ForeignKey("hostel_blocks.id", ondelete="CASCADE"),
    )

    room_number = db.Column(db.String(10), nullable=False)
    floor = db.Column(db.Integer)

    room_type = db.Column(db.Enum("Single", "Double", "Triple", "Dorm"))

    capacity = db.Column(db.Integer)


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

    room_id = db.Column(
        db.Integer,
        db.ForeignKey("rooms.id", ondelete="CASCADE"),
    )

    bed_number = db.Column(db.Integer)

    check_in_date = db.Column(db.Date)
    check_out_date = db.Column(db.Date)

    is_active = db.Column(db.Boolean, default=True)


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


# ============================= HELPERS =============================
def safe_full_name(first_name=None, middle_name=None, last_name=None):
    parts = [
        first_name or "",
        middle_name or "",
        last_name or "",
    ]

    return " ".join(part.strip() for part in parts if part).strip()


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

            # ================= ROOM =================
            room = Room.query.get(allocation.room_id)

            if not room:
                logger.warning(f"Room not found for allocation_id={allocation.id}")

            # ================= BLOCK =================
            block = None

            if room and room.block_id:
                block = HostelBlock.query.get(room.block_id)

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
                roommates_query = HostelAllocation.query.filter(
                    HostelAllocation.room_id == room.id,
                    HostelAllocation.student_id != student.id,
                    HostelAllocation.is_active == True,
                ).all()

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
                                "bed_number": r.bed_number,
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
                "floor": room.floor if room else None,
                "capacity": room.capacity if room else None,
                "bed_number": allocation.bed_number,
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
                room_id=(allocation.room_id if allocation else None),
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
