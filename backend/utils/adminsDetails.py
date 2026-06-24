import logging
from datetime import datetime
from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import or_
import bcrypt
from utils.auth import db, Admin
from utils.auth_middleware import login_required

logger = logging.getLogger(__name__)

# COMMON SERIALIZER
def admin_to_dict(admin):
    return {
        "id": admin.id,
        "admin_id": admin.admin_id,
        "user_id": admin.user_id,
        # ================= PERSONAL =================
        "first_name": admin.first_name,
        "middle_name": admin.middle_name,
        "last_name": admin.last_name,
        "profile_image": admin.profile_image,
        "gender": admin.gender,
        "date_of_birth": (
            admin.date_of_birth.isoformat() if admin.date_of_birth else None
        ),
        "blood_group": admin.blood_group,
        # ================= CONTACT =================
        "email": admin.email,
        "mobile": admin.mobile,
        "alternate_mobile": admin.alternate_mobile,
        "username": admin.username,
        # ================= ADDRESS =================
        "address": admin.address,
        "city": admin.city,
        "state": admin.state,
        "country": admin.country,
        "pincode": admin.pincode,
        # ================= ROLE =================
        "role": admin.role,
        "admin_type": admin.admin_type,
        "designation": admin.designation,
        "department": admin.department,
        "permissions": admin.permissions,
        "access_level": admin.access_level,
        # ================= PROFESSIONAL =================
        "qualification": admin.qualification,
        "specialization": admin.specialization,
        "experience_years": admin.experience_years,
        # ================= EMPLOYMENT =================
        "joining_date": (
            admin.joining_date.isoformat() if admin.joining_date else None
        ),
        "employment_type": admin.employment_type,
        "shift": admin.shift,
        "salary": admin.salary,
        # ================= SCHOOL =================
        "school_name": admin.school_name,
        "school_code": admin.school_code,
        "board": admin.board,
        "established_year": admin.established_year,
        # ================= SYSTEM CONTROL =================
        "users_managed": admin.users_managed,
        "active_sessions": admin.active_sessions,
        "modules_enabled": admin.modules_enabled,
        # ================= FINANCE =================
        "fee_access": admin.fee_access,
        "discount_authority": admin.discount_authority,
        "revenue_view": admin.revenue_view,
        # ================= SECURITY =================
        "two_factor_enabled": admin.two_factor_enabled,
        "login_alerts": admin.login_alerts,
        "last_login": (admin.last_login.isoformat() if admin.last_login else None),
        "last_password_change": (
            admin.last_password_change.isoformat()
            if admin.last_password_change
            else None
        ),
        # ================= ACTIVITY =================
        "logins_30d": admin.logins_30d,
        "actions_count": admin.actions_count,
        "last_action": admin.last_action,
        # ================= MEDICAL =================
        "medical_condition": admin.medical_condition,
        # ================= EMERGENCY =================
        "emergency_name": admin.emergency_name,
        "emergency_relation": admin.emergency_relation,
        "emergency_phone": admin.emergency_phone,
        # ================= SYSTEM =================
        "status": admin.status,
        "created_by": admin.created_by,
        "updated_by": admin.updated_by,
        "created_at": (admin.created_at.isoformat() if admin.created_at else None),
        "updated_at": (admin.updated_at.isoformat() if admin.updated_at else None),
    }



# ADMIN PROFILE
class AdminDetails(MethodView):

    @login_required
    def get(self, id):

        try:
            id = int(id)

            if id <= 0:
                return jsonify({"error": "Invalid admin id"}), 400

            admin = Admin.query.filter_by(
                id=id,
                is_deleted=False,
            ).first()

            if not admin:
                return jsonify({"error": "Admin not found"}), 404

            return jsonify(admin_to_dict(admin)), 200

        except ValueError:
            return jsonify({"error": "Admin id must be integer"}), 400

        except SQLAlchemyError as db_err:
            logger.exception(db_err)

            return jsonify({"error": "Database error"}), 500

        except Exception as e:
            logger.exception(e)

            return jsonify({"error": "Something went wrong"}), 500



# UPDATE ADMIN PROFILE
class UpdateAdminProfile(MethodView):

    @login_required
    def put(self, id):

        try:
            id = int(id)

            if id <= 0:
                return jsonify({"error": "Invalid admin id"}), 400

            admin = Admin.query.filter_by(
                id=id,
                is_deleted=False,
            ).first()

            if not admin:
                return jsonify({"error": "Admin not found"}), 404

            data = request.get_json()

            if not data:
                return jsonify({"error": "Invalid JSON"}), 400

            
            # UNIQUE FIELD CHECKS
            new_email = data.get("email")
            new_mobile = data.get("mobile")
            new_username = data.get("username")
            existing_admin = Admin.query.filter(
                Admin.id != id,
                Admin.is_deleted == False,
                or_(
                    Admin.email == new_email if new_email else False,
                    Admin.mobile == new_mobile if new_mobile else False,
                    Admin.username == new_username if new_username else False,
                ),
            ).first()

            if existing_admin:
                if new_email and existing_admin.email == new_email:
                    return jsonify({"error": "Email already exists"}), 400
                if new_mobile and existing_admin.mobile == new_mobile:
                    return jsonify({"error": "Mobile already exists"}), 400
                if new_username and existing_admin.username == new_username:
                    return jsonify({"error": "Username already exists"}), 400

            
            # DATE PARSER   
            def parse_date(date_value):

                try:
                    return (
                        datetime.strptime(date_value, "%Y-%m-%d").date()
                        if date_value
                        else None
                    )

                except Exception:
                    return None

            
            # SAFE FIELD UPDATE
            allowed_fields = [
                # PERSONAL
                "first_name",
                "middle_name",
                "last_name",
                "profile_image",
                "gender",
                "blood_group",
                # CONTACT
                "email",
                "mobile",
                "alternate_mobile",
                "username",
                # ADDRESS
                "address",
                "city",
                "state",
                "country",
                "pincode",
                # ROLE
                "admin_type",
                "designation",
                "department",
                "permissions",
                "access_level",
                # PROFESSIONAL
                "qualification",
                "specialization",
                "experience_years",
                # EMPLOYMENT
                "employment_type",
                "shift",
                "salary",
                # SCHOOL
                "school_name",
                "school_code",
                "board",
                "established_year",
                # SYSTEM CONTROL
                "users_managed",
                "active_sessions",
                "modules_enabled",
                # FINANCE
                "fee_access",
                "discount_authority",
                "revenue_view",
                # SECURITY
                "two_factor_enabled",
                "login_alerts",
                # ACTIVITY
                "logins_30d",
                "actions_count",
                "last_action",
                # MEDICAL
                "medical_condition",
                # EMERGENCY
                "emergency_name",
                "emergency_relation",
                "emergency_phone",
                # SYSTEM
                "status",
                "updated_by",
            ]

            for field in allowed_fields:

                if field in data:
                    setattr(admin, field, data.get(field))

            
            # DATE FIELDS
            

            if "date_of_birth" in data:
                admin.date_of_birth = parse_date(data.get("date_of_birth"))

            if "joining_date" in data:
                admin.joining_date = parse_date(data.get("joining_date"))

            
            # AUTO UPDATE
            
            admin.updated_at = datetime.utcnow()
            db.session.commit()

            return (
                jsonify(
                    {
                        "message": "Admin profile updated successfully",
                        "admin": admin_to_dict(admin),
                    }
                ),
                200,
            )

        except ValueError:
            return jsonify({"error": "Admin id must be integer"}), 400

        except SQLAlchemyError as db_err:

            db.session.rollback()
            logger.exception(db_err)

            return jsonify({"error": "Database error"}), 500

        except Exception as e:

            db.session.rollback()
            logger.exception(e)

            return jsonify({"error": "Something went wrong"}), 500



# CHANGE ADMIN PASSWORD
class ChangeAdminPassword(MethodView):

    @login_required
    def put(self, id):

        try:
            id = int(id)

            if id <= 0:
                return jsonify({"error": "Invalid admin id"}), 400

            admin = Admin.query.filter_by(
                id=id,
                is_deleted=False,
            ).first()

            if not admin:
                return jsonify({"error": "Admin not found"}), 404

            data = request.get_json()

            if not data:
                return jsonify({"error": "Invalid JSON"}), 400

            current_password = data.get("current_password")
            new_password = data.get("new_password")
            confirm_password = data.get("confirm_password")

            
            # VALIDATION
            if not all(
                [
                    current_password,
                    new_password,
                    confirm_password,
                ]
            ):
                return jsonify({"error": "All password fields are required"}), 400

            
            # CHECK CURRENT PASSWORD
            if not bcrypt.checkpw(
                current_password.encode("utf-8"),
                admin.password.encode("utf-8"),
            ):
                return jsonify({"error": "Current password incorrect"}), 400

            
            # MATCH PASSWORD
            if new_password != confirm_password:
                return jsonify({"error": "Passwords do not match"}), 400

            
            # PASSWORD STRENGTH
            if len(new_password) < 8:
                return jsonify({"error": "Password must be at least 8 characters"}), 400

            # HASH PASSWORD
            hashed_password = bcrypt.hashpw(
                new_password.encode("utf-8"),
                bcrypt.gensalt(),
            )

            admin.password = hashed_password.decode("utf-8")
            admin.last_password_change = datetime.utcnow()
            admin.updated_at = datetime.utcnow()
            db.session.commit()

            return (
                jsonify({"message": "Password updated successfully"}),
                200,
            )

        except SQLAlchemyError as db_err:

            db.session.rollback()
            logger.exception(db_err)

            return jsonify({"error": "Database error"}), 500

        except Exception as e:

            db.session.rollback()
            logger.exception(e)

            return jsonify({"error": "Something went wrong"}), 500
