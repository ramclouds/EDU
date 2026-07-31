import logging
from datetime import datetime
from flask import jsonify, request
from flask.views import MethodView
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import or_

from utils.auth import db
from utils.auth_middleware import login_required

logger = logging.getLogger(__name__)

# =========================================================
# ASSET MODEL
# =========================================================
class Asset(db.Model):

    __tablename__ = "assets"

    id = db.Column(db.BigInteger, primary_key=True)

    asset_id = db.Column(db.String(50), unique=True, nullable=False)
    asset_code = db.Column(db.String(50), unique=True, nullable=False)

    asset_name = db.Column(db.String(150), nullable=False)
    asset_description = db.Column(db.Text)

    category = db.Column(db.String(100), nullable=False)
    sub_category = db.Column(db.String(100))

    brand = db.Column(db.String(100))
    model_number = db.Column(db.String(100))
    serial_number = db.Column(db.String(150), unique=True)

    barcode = db.Column(db.String(150))
    qr_code = db.Column(db.String(255))

    purchase_date = db.Column(db.Date)
    purchase_cost = db.Column(db.Float, default=0)

    vendor_name = db.Column(db.String(150))
    invoice_number = db.Column(db.String(100))

    warranty_start_date = db.Column(db.Date)
    warranty_end_date = db.Column(db.Date)

    depreciation_method = db.Column(db.String(50))
    depreciation_rate = db.Column(db.Float, default=0)

    current_book_value = db.Column(db.Float, default=0)

    location = db.Column(db.String(150))
    building_name = db.Column(db.String(100))
    floor_number = db.Column(db.String(50))
    room_number = db.Column(db.String(50))

    condition_status = db.Column(db.String(50), default="Good")

    status = db.Column(db.String(50), default="Available")

    assigned_to_admin_id = db.Column(
        db.String(50),
        db.ForeignKey("admins.admin_id"),
        nullable=True,
    )

    last_maintenance_date = db.Column(db.Date)
    next_maintenance_date = db.Column(db.Date)

    maintenance_notes = db.Column(db.Text)

    insurance_provider = db.Column(db.String(150))
    insurance_policy_number = db.Column(db.String(100))
    insurance_expiry_date = db.Column(db.Date)

    asset_image = db.Column(db.String(255))

    remarks = db.Column(db.Text)

    # =========================================================
    # CATEGORY SPECIFIC FIELDS
    # =========================================================

    # VEHICLES
    vehicle_number = db.Column(db.String(100))
    vehicle_type = db.Column(db.String(100))
    registration_number = db.Column(db.String(100))
    fuel_type = db.Column(db.String(50))
    engine_number = db.Column(db.String(100))
    chassis_number = db.Column(db.String(100))
    insurance_expiry = db.Column(db.Date)

    # ELECTRONICS
    processor = db.Column(db.String(100))
    ram = db.Column(db.String(100))
    storage = db.Column(db.String(100))
    operating_system = db.Column(db.String(100))

    # FURNITURE
    material = db.Column(db.String(100))
    color = db.Column(db.String(100))
    dimensions = db.Column(db.String(100))

    # LAB EQUIPMENT
    calibration_date = db.Column(db.Date)
    equipment_accuracy = db.Column(db.String(100))

    school_name = db.Column(db.String(150))
    school_code = db.Column(db.String(50))

    created_by = db.Column(db.String(50))
    updated_by = db.Column(db.String(50))

    is_deleted = db.Column(db.Boolean, default=False)

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


# =========================================================
# ASSET HISTORY MODEL
# =========================================================
class AssetHistory(db.Model):

    __tablename__ = "asset_history"

    id = db.Column(db.BigInteger, primary_key=True)
    asset_id = db.Column(db.String(100))
    asset_code = db.Column(db.String(100))
    action = db.Column(db.String(50))
    performed_by = db.Column(db.String(100))
    action_time = db.Column(
        db.DateTime,
        default=datetime.utcnow,
    )
    snapshot = db.Column(db.JSON)


# =========================================================
# SERIALIZER
# =========================================================
def asset_to_dict(asset):

    return {
        "id": asset.id,
        "asset_id": asset.asset_id,
        "asset_code": asset.asset_code,
        "asset_name": asset.asset_name,
        "asset_description": asset.asset_description,
        "category": asset.category,
        "sub_category": asset.sub_category,
        "brand": asset.brand,
        "model_number": asset.model_number,
        "serial_number": asset.serial_number,
        "barcode": asset.barcode,
        "qr_code": asset.qr_code,
        "purchase_date": (
            asset.purchase_date.isoformat() if asset.purchase_date else None
        ),
        "purchase_cost": asset.purchase_cost,
        "vendor_name": asset.vendor_name,
        "invoice_number": asset.invoice_number,
        "warranty_start_date": (
            asset.warranty_start_date.isoformat() if asset.warranty_start_date else None
        ),
        "warranty_end_date": (
            asset.warranty_end_date.isoformat() if asset.warranty_end_date else None
        ),
        "depreciation_method": asset.depreciation_method,
        "depreciation_rate": asset.depreciation_rate,
        "current_book_value": asset.current_book_value,
        "location": asset.location,
        "building_name": asset.building_name,
        "floor_number": asset.floor_number,
        "room_number": asset.room_number,
        "condition_status": asset.condition_status,
        "status": asset.status,
        "assigned_to_admin_id": asset.assigned_to_admin_id,
        "last_maintenance_date": (
            asset.last_maintenance_date.isoformat()
            if asset.last_maintenance_date
            else None
        ),
        "next_maintenance_date": (
            asset.next_maintenance_date.isoformat()
            if asset.next_maintenance_date
            else None
        ),
        "maintenance_notes": asset.maintenance_notes,
        "insurance_provider": asset.insurance_provider,
        "insurance_policy_number": asset.insurance_policy_number,
        "insurance_expiry_date": (
            asset.insurance_expiry_date.isoformat()
            if asset.insurance_expiry_date
            else None
        ),
        "asset_image": asset.asset_image,
        "remarks": asset.remarks,
        # VEHICLE
        "vehicle_number": asset.vehicle_number,
        "vehicle_type": asset.vehicle_type,
        "registration_number": asset.registration_number,
        "fuel_type": asset.fuel_type,
        "engine_number": asset.engine_number,
        "chassis_number": asset.chassis_number,
        "insurance_expiry": (
            asset.insurance_expiry.isoformat() if asset.insurance_expiry else None
        ),
        # ELECTRONICS
        "processor": asset.processor,
        "ram": asset.ram,
        "storage": asset.storage,
        "operating_system": asset.operating_system,
        # FURNITURE
        "material": asset.material,
        "color": asset.color,
        "dimensions": asset.dimensions,
        # LAB
        "calibration_date": (
            asset.calibration_date.isoformat() if asset.calibration_date else None
        ),
        "equipment_accuracy": asset.equipment_accuracy,
        "school_name": asset.school_name,
        "school_code": asset.school_code,
        "created_by": asset.created_by,
        "updated_by": asset.updated_by,
        "created_at": (asset.created_at.isoformat() if asset.created_at else None),
        "updated_at": (asset.updated_at.isoformat() if asset.updated_at else None),
    }


# =========================================================
# SAVE HISTORY
# =========================================================
def create_asset_history(asset, action, performed_by=None):

    history = AssetHistory(
        asset_id=asset.asset_id,
        asset_code=asset.asset_code,
        action=action,
        performed_by=performed_by,
        snapshot=asset_to_dict(asset),
    )

    db.session.add(history)


# =========================================================
# DATE PARSER
# =========================================================
def parse_date(value):

    try:

        return datetime.strptime(value, "%Y-%m-%d").date() if value else None

    except Exception:
        return None


# =========================================================
# CREATE ASSET
# =========================================================
class CreateAssetAPI(MethodView):

    @login_required
    def post(self):

        try:

            data = request.get_json()

            if not data:
                return jsonify({"error": "Invalid JSON"}), 400

            # =====================================================
            # SAFE VALUE PARSERS
            # =====================================================
            def safe_float(value, default=0):

                try:

                    if value in ["", None, "null"]:
                        return default

                    return float(value)

                except Exception:
                    return default

            def safe_string(value):

                if value in [None, "null"]:
                    return ""

                return str(value).strip()

            # =====================================================
            # REQUIRED FIELDS
            # =====================================================
            asset_id = safe_string(data.get("asset_id"))
            asset_code = safe_string(data.get("asset_code"))
            asset_name = safe_string(data.get("asset_name"))
            category = safe_string(data.get("category"))

            if not asset_id:
                return jsonify({"error": "Asset ID is required"}), 400

            if not asset_code:
                return jsonify({"error": "Asset Code is required"}), 400

            if not asset_name:
                return jsonify({"error": "Asset Name is required"}), 400

            if not category:
                return jsonify({"error": "Category is required"}), 400

            serial_number = safe_string(data.get("serial_number"))

            # =====================================================
            # DUPLICATE CHECK
            # =====================================================
            query = Asset.query.filter(
                or_(
                    Asset.asset_id == asset_id,
                    Asset.asset_code == asset_code,
                )
            )

            if serial_number:
                query = query.union(
                    Asset.query.filter(Asset.serial_number == serial_number)
                )

            existing = query.first()

            if existing:

                return jsonify({"error": "Asset already exists"}), 400

            # =====================================================
            # CREATE ASSET
            # =====================================================
            asset = Asset(
                asset_id=asset_id,
                asset_code=asset_code,
                asset_name=asset_name,
                asset_description=safe_string(data.get("asset_description")),
                category=category,
                sub_category=safe_string(data.get("sub_category")),
                brand=safe_string(data.get("brand")),
                model_number=safe_string(data.get("model_number")),
                serial_number=serial_number or None,
                barcode=safe_string(data.get("barcode")),
                qr_code=safe_string(data.get("qr_code")),
                purchase_date=parse_date(data.get("purchase_date")),
                purchase_cost=safe_float(
                    data.get("purchase_cost"),
                    0,
                ),
                vendor_name=safe_string(data.get("vendor_name")),
                invoice_number=safe_string(data.get("invoice_number")),
                warranty_start_date=parse_date(data.get("warranty_start_date")),
                warranty_end_date=parse_date(data.get("warranty_end_date")),
                depreciation_method=safe_string(data.get("depreciation_method")),
                depreciation_rate=safe_float(
                    data.get("depreciation_rate"),
                    0,
                ),
                current_book_value=safe_float(
                    data.get("current_book_value"),
                    0,
                ),
                location=safe_string(data.get("location")),
                building_name=safe_string(data.get("building_name")),
                floor_number=safe_string(data.get("floor_number")),
                room_number=safe_string(data.get("room_number")),
                condition_status=safe_string(data.get("condition_status")) or "Good",
                status=safe_string(data.get("status")) or "Available",
                assigned_to_admin_id=safe_string(data.get("assigned_to_admin_id"))
                or None,
                last_maintenance_date=parse_date(data.get("last_maintenance_date")),
                next_maintenance_date=parse_date(data.get("next_maintenance_date")),
                maintenance_notes=safe_string(data.get("maintenance_notes")),
                insurance_provider=safe_string(data.get("insurance_provider")),
                insurance_policy_number=safe_string(
                    data.get("insurance_policy_number")
                ),
                insurance_expiry_date=parse_date(data.get("insurance_expiry_date")),
                asset_image=safe_string(data.get("asset_image")),
                remarks=safe_string(data.get("remarks")),
                # VEHICLE
                vehicle_number=safe_string(data.get("vehicle_number")),
                vehicle_type=safe_string(data.get("vehicle_type")),
                registration_number=safe_string(data.get("registration_number")),
                fuel_type=safe_string(data.get("fuel_type")),
                engine_number=safe_string(data.get("engine_number")),
                chassis_number=safe_string(data.get("chassis_number")),
                insurance_expiry=parse_date(data.get("insurance_expiry")),
                # ELECTRONICS
                processor=safe_string(data.get("processor")),
                ram=safe_string(data.get("ram")),
                storage=safe_string(data.get("storage")),
                operating_system=safe_string(data.get("operating_system")),
                # FURNITURE
                material=safe_string(data.get("material")),
                color=safe_string(data.get("color")),
                dimensions=safe_string(data.get("dimensions")),
                # LAB
                calibration_date=parse_date(data.get("calibration_date")),
                equipment_accuracy=safe_string(data.get("equipment_accuracy")),
                school_name=safe_string(data.get("school_name")),
                school_code=safe_string(data.get("school_code")),
                created_by=safe_string(data.get("created_by")) or None,
                updated_by=safe_string(data.get("updated_by")) or None,
            )

            db.session.add(asset)

            create_asset_history(
                asset,
                "CREATED",
                asset.created_by,
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "message": "Asset created successfully",
                        "asset": asset_to_dict(asset),
                    }
                ),
                201,
            )

        except SQLAlchemyError as db_err:

            db.session.rollback()

            logger.exception(db_err)

            return (
                jsonify(
                    {
                        "error": "Database error",
                        "details": str(db_err),
                    }
                ),
                500,
            )

        except Exception as e:

            db.session.rollback()

            logger.exception(e)

            return (
                jsonify(
                    {
                        "error": "Something went wrong",
                        "details": str(e),
                    }
                ),
                500,
            )


# =========================================================
# GET ALL ASSETS
# =========================================================
class GetAssetsAPI(MethodView):

    @login_required
    def get(self):

        try:

            search = request.args.get("search")

            query = Asset.query.filter_by(is_deleted=False)

            if search:

                query = query.filter(
                    or_(
                        Asset.asset_name.ilike(f"%{search}%"),
                        Asset.asset_code.ilike(f"%{search}%"),
                        Asset.category.ilike(f"%{search}%"),
                    )
                )

            assets = query.order_by(Asset.created_at.desc()).all()

            return jsonify([asset_to_dict(a) for a in assets]), 200

        except Exception as e:

            logger.exception(e)

            return jsonify({"error": "Something went wrong"}), 500


# =========================================================
# GET SINGLE ASSET
# =========================================================
class AssetDetailsAPI(MethodView):

    @login_required
    def get(self, id):

        try:

            asset = Asset.query.filter_by(
                id=id,
                is_deleted=False,
            ).first()

            if not asset:

                return jsonify({"error": "Asset not found"}), 404

            return jsonify(asset_to_dict(asset)), 200

        except Exception as e:

            logger.exception(e)

            return jsonify({"error": "Something went wrong"}), 500


# =========================================================
# UPDATE ASSET
# =========================================================
class UpdateAssetAPI(MethodView):

    @login_required
    def put(self, id):

        try:

            asset = Asset.query.filter_by(
                id=id,
                is_deleted=False,
            ).first()

            if not asset:

                return jsonify({"error": "Asset not found"}), 404

            data = request.get_json()

            if not data:

                return jsonify({"error": "Invalid JSON"}), 400

            # =====================================================
            # SAFE HELPERS
            # =====================================================
            def safe_float(value, default=0):

                try:

                    if value in ["", None, "null"]:
                        return default

                    return float(value)

                except Exception:
                    return default

            def safe_string(value):

                if value in [None, "null"]:
                    return ""

                return str(value).strip()

            # =====================================================
            # ALLOWED FIELDS
            # =====================================================
            allowed_fields = [
                "asset_name",
                "asset_description",
                "category",
                "sub_category",
                "brand",
                "model_number",
                "serial_number",
                "barcode",
                "qr_code",
                "purchase_cost",
                "vendor_name",
                "invoice_number",
                "depreciation_method",
                "depreciation_rate",
                "current_book_value",
                "location",
                "building_name",
                "floor_number",
                "room_number",
                "condition_status",
                "status",
                "assigned_to_admin_id",
                "maintenance_notes",
                "insurance_provider",
                "insurance_policy_number",
                "asset_image",
                "remarks",
                # VEHICLE
                "vehicle_number",
                "vehicle_type",
                "registration_number",
                "fuel_type",
                "engine_number",
                "chassis_number",
                # ELECTRONICS
                "processor",
                "ram",
                "storage",
                "operating_system",
                # FURNITURE
                "material",
                "color",
                "dimensions",
                # LAB
                "equipment_accuracy",
                "updated_by",
            ]

            # =====================================================
            # FLOAT FIELDS
            # =====================================================
            float_fields = [
                "purchase_cost",
                "depreciation_rate",
                "current_book_value",
            ]

            # =====================================================
            # UPDATE NORMAL FIELDS
            # =====================================================
            for field in allowed_fields:

                if field in data:

                    value = data.get(field)

                    # FLOAT CONVERSION
                    if field in float_fields:

                        value = safe_float(
                            value,
                            0,
                        )

                    else:

                        value = safe_string(value)

                    # EMPTY SERIAL -> NULL
                    if field == "serial_number" and value == "":
                        value = None

                    # EMPTY ASSIGNED ADMIN -> NULL
                    if field == "assigned_to_admin_id" and value == "":
                        value = None

                    setattr(
                        asset,
                        field,
                        value,
                    )

            # =====================================================
            # DATE FIELDS
            # =====================================================
            date_fields = [
                "purchase_date",
                "warranty_start_date",
                "warranty_end_date",
                "last_maintenance_date",
                "next_maintenance_date",
                "insurance_expiry_date",
                "insurance_expiry",
                "calibration_date",
            ]

            for field in date_fields:

                if field in data:

                    setattr(
                        asset,
                        field,
                        parse_date(data.get(field)),
                    )

            # =====================================================
            # CHECK DUPLICATE SERIAL NUMBER
            # =====================================================
            if "serial_number" in data and asset.serial_number:

                existing_serial = Asset.query.filter(
                    Asset.serial_number == asset.serial_number,
                    Asset.id != asset.id,
                ).first()

                if existing_serial:

                    return jsonify({"error": "Serial number already exists"}), 400

            # =====================================================
            # UPDATE TIMESTAMP
            # =====================================================
            asset.updated_at = datetime.utcnow()

            create_asset_history(
                asset,
                "UPDATED",
                asset.updated_by,
            )

            db.session.commit()

            return (
                jsonify(
                    {
                        "message": "Asset updated successfully",
                        "asset": asset_to_dict(asset),
                    }
                ),
                200,
            )

        except SQLAlchemyError as db_err:

            db.session.rollback()

            logger.exception(db_err)

            return (
                jsonify(
                    {
                        "error": "Database error",
                        "details": str(db_err),
                    }
                ),
                500,
            )

        except Exception as e:

            db.session.rollback()
            logger.exception(e)
            return (
                jsonify(
                    {
                        "error": "Something went wrong",
                        "details": str(e),
                    }
                ),
                500,
            )


# =========================================================
# RESTORE ASSET
# =========================================================
class RestoreAssetAPI(MethodView):

    @login_required
    def post(self, id):

        try:

            asset = Asset.query.filter_by(
                id=id,
                is_deleted=True,
            ).first()

            if not asset:

                return jsonify({"error": "Deleted asset not found"}), 404

            asset.is_deleted = False

            create_asset_history(
                asset,
                "RESTORED",
                asset.updated_by,
            )

            db.session.commit()

            return jsonify({"message": "Asset restored successfully"}), 200

        except Exception as e:

            db.session.rollback()
            logger.exception(e)

            return jsonify({"error": "Something went wrong"}), 500


# =========================================================
# DELETE ASSET
# =========================================================
class DeleteAssetAPI(MethodView):
    @login_required
    def delete(self, id):

        try:

            asset = Asset.query.filter_by(
                id=id,
                is_deleted=False,
            ).first()

            if not asset:

                return jsonify({"error": "Asset not found"}), 404

            create_asset_history(
                asset,
                "DELETED",
                asset.updated_by,
            )

            asset.is_deleted = True
            asset.updated_at = datetime.utcnow()

            db.session.commit()

            return jsonify({"message": "Asset deleted successfully"}), 200

        except SQLAlchemyError as db_err:

            db.session.rollback()

            logger.exception(db_err)

            return jsonify({"error": "Database error"}), 500

        except Exception as e:

            db.session.rollback()

            logger.exception(e)

            return jsonify({"error": "Something went wrong"}), 500


class GetDeletedAssetsAPI(MethodView):
    @login_required
    def get(self):

        assets = (
            Asset.query.filter_by(is_deleted=True)
            .order_by(Asset.updated_at.desc())
            .all()
        )

        return jsonify([asset_to_dict(a) for a in assets])
