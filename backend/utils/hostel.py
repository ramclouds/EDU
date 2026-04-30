from flask import jsonify
from flask import request
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError
import logging
from utils.auth import db, Student
from utils.auth_middleware import login_required

logger = logging.getLogger(__name__)


# MODELS
class Hostel(db.Model):
    __tablename__ = "hostels"

    id = db.Column(db.Integer, primary_key=True)
    hostel_name = db.Column(db.String(100), nullable=False)


class HostelBlock(db.Model):
    __tablename__ = "hostel_blocks"

    id = db.Column(db.Integer, primary_key=True)
    hostel_id = db.Column(db.Integer, db.ForeignKey("hostels.id", ondelete="CASCADE"))
    block_name = db.Column(db.String(10), nullable=False)


class Room(db.Model):
    __tablename__ = "rooms"

    id = db.Column(db.Integer, primary_key=True)
    block_id = db.Column(
        db.Integer, db.ForeignKey("hostel_blocks.id", ondelete="CASCADE")
    )

    room_number = db.Column(db.String(10), nullable=False)
    floor = db.Column(db.Integer)

    room_type = db.Column(db.Enum("Single", "Double", "Triple", "Dorm"))
    capacity = db.Column(db.Integer)


class Warden(db.Model):
    __tablename__ = "wardens"

    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    middle_name = db.Column(db.String(100))
    mobile = db.Column(db.String(15))
    email = db.Column(db.String(100))


class RoomWarden(db.Model):
    __tablename__ = "room_wardens"

    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey("rooms.id", ondelete="CASCADE"))
    warden_id = db.Column(db.Integer, db.ForeignKey("wardens.id", ondelete="CASCADE"))


class HostelAllocation(db.Model):
    __tablename__ = "hostel_allocations"

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"))
    room_id = db.Column(db.Integer, db.ForeignKey("rooms.id", ondelete="CASCADE"))

    bed_number = db.Column(db.Integer)
    check_in_date = db.Column(db.Date)
    check_out_date = db.Column(db.Date)

    is_active = db.Column(db.Boolean, default=True)


class HostelFee(db.Model):
    __tablename__ = "hostel_fees"

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"))
    amount = db.Column(db.Numeric(10, 2))

    status = db.Column(db.Enum("Pending", "Paid", "Overdue"), default="Pending")


class HostelComplaint(db.Model):
    __tablename__ = "hostel_complaints"

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"))
    room_id = db.Column(db.Integer, db.ForeignKey("rooms.id", ondelete="SET NULL"))

    issue = db.Column(db.Text)
    status = db.Column(db.Enum("Pending", "In Progress", "Resolved"), default="Pending")


class StudentHostelDetails(MethodView):
    @login_required
    def get(self, student_id):
        try:
            student = Student.query.get(student_id)

            if not student:
                return jsonify({"error": "Student not found"}), 404

            # ALLOCATION
            allocation = HostelAllocation.query.filter_by(
                student_id=student.id, is_active=True
            ).first()

            if not allocation:
                return (
                    jsonify(
                        {
                            "room_number": None,
                            "room_type": None,
                            "block": None,
                            "floor": None,
                            "bed_number": None,
                            "check_in_date": None,
                            "warden": None,
                            "roommates": [],
                            "complaints": [],
                            "fee_status": None,
                        }
                    ),
                    200,
                )

            room = Room.query.get(allocation.room_id)
            block = HostelBlock.query.get(room.block_id) if room else None

            # WARDEN
            rw = RoomWarden.query.filter_by(room_id=room.id).first()
            warden = Warden.query.get(rw.warden_id) if rw else None

            # ROOMMATES
            roommates_query = HostelAllocation.query.filter(
                HostelAllocation.room_id == room.id,
                HostelAllocation.student_id != student.id,
                HostelAllocation.is_active == True,
            ).all()

            roommates = []
            for r in roommates_query:
                s = Student.query.get(r.student_id)
                roommates.append(
                    {
                        "name": s.first_name + " " + s.last_name,
                        "student_id": s.student_id,
                    }
                )

            # COMPLAINTS
            complaints_query = (
                HostelComplaint.query.filter_by(student_id=student.id)
                .order_by(HostelComplaint.id.desc())
                .all()
            )

            complaints = [
                {"issue": c.issue, "status": c.status} for c in complaints_query
            ]

            # FEES
            fee = HostelFee.query.filter_by(student_id=student.id).first()

            return (
                jsonify(
                    {
                        "room_number": room.room_number if room else None,
                        "room_type": room.room_type if room else None,
                        "block": block.block_name if block else None,
                        "floor": room.floor if room else None,
                        "bed_number": allocation.bed_number,
                        "check_in_date": str(allocation.check_in_date),
                        "warden": (
                            {
                                "name": warden.first_name + " " + warden.last_name,
                                "mobile": warden.mobile,
                                "email": warden.email if warden else None,
                                "mobile": warden.mobile if warden else None,
                                "email": warden.email if warden else None,
                            }
                            if warden
                            else None
                        ),
                        "roommates": roommates,
                        "complaints": complaints,
                        "fee_status": fee.status if fee else None,
                    }
                ),
                200,
            )

        except SQLAlchemyError as e:
            logger.error(e)
            return jsonify({"error": "Database error"}), 500


class CreateHostelComplaint(MethodView):
    @login_required
    def post(self, student_id):
        try:
            data = request.get_json()

            issue = data.get("issue")

            if not issue:
                return jsonify({"error": "Issue required"}), 400

            allocation = HostelAllocation.query.filter_by(
                student_id=student_id, is_active=True
            ).first()

            complaint = HostelComplaint(
                student_id=student_id,
                room_id=allocation.room_id if allocation else None,
                issue=issue,
            )

            db.session.add(complaint)
            db.session.commit()

            return jsonify({"message": "Complaint raised"}), 201

        except Exception as e:
            logger.exception(e)
            return jsonify({"error": "Something went wrong"}), 500
