from flask import Flask, Blueprint, jsonify, request
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from flask_cors import CORS
from routes.auth import auth_bp
from config import Config
from pymongo import MongoClient
from bson import ObjectId
import datetime
from datetime import datetime as dt

app = Flask(__name__)
app.config.from_object(Config)

# Simplified CORS configuration
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:8000", "null"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 86400
    }
})

# JWT Configuration
jwt = JWTManager(app)
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'

# MongoDB Connection
client = MongoClient("mongodb://localhost:27017/")
db = client["blood_bank"]
collection = db["blood_inventory"]
bookings_collection = db["bookings"]

# Blueprints
blood_bp = Blueprint('blood', __name__)

@blood_bp.route("/inventory", methods=["GET"])
def get_blood_inventory():
    try:
        blood_data = list(collection.find({}, {"_id": 0}))
        return jsonify({"success": True, "data": blood_data}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/bookings', methods=['POST', 'OPTIONS'])
@jwt_required(optional=True)
def create_booking():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    try:
        current_user = get_jwt_identity()
        if not current_user:
            return jsonify({"success": False, "message": "Unauthorized"}), 401

        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400

        required_fields = ['name', 'email', 'contact', 'bloodType', 'hospital', 'date', 'time']
        if not all(field in data for field in required_fields):
            return jsonify({"success": False, "message": "Missing required fields"}), 400

        booking_data = {
            'user_email': current_user,
            'name': data['name'],
            'email': data['email'],
            'contact': data['contact'],
            'bloodType': data['bloodType'],
            'hospital': data['hospital'],
            'date': data['date'],
            'time': data['time'],
            'status': 'Pending',
            'created_at': dt.utcnow()
        }

        result = bookings_collection.insert_one(booking_data)
        return jsonify({
            "success": True,
            "booking_id": str(result.inserted_id)
        }), 201

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/bookings/<booking_id>', methods=['DELETE'])
@jwt_required()
def delete_booking(booking_id):
    try:
        current_user = get_jwt_identity()
        
        if not ObjectId.is_valid(booking_id):
            return jsonify({"success": False, "message": "Invalid booking ID"}), 400

        result = bookings_collection.delete_one({
            '_id': ObjectId(booking_id),
            'user_email': current_user
        })

        if result.deleted_count == 0:
            return jsonify({"success": False, "message": "Booking not found"}), 404
            
        return jsonify({"success": True}), 200
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/my-bookings', methods=['GET'])
@jwt_required()
def get_user_bookings():
    try:
        user_email = get_jwt_identity()
        
        bookings = list(bookings_collection.find(
            {'user_email': user_email},
            {'_id': 1, 'name': 1, 'email': 1, 'contact': 1, 
             'bloodType': 1, 'hospital': 1, 'date': 1, 'time': 1, 'status': 1}
        ))
        
        # Convert ObjectId to string
        for booking in bookings:
            booking['_id'] = str(booking['_id'])
        
        return jsonify({
            'success': True,
            'bookings': bookings
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@blood_bp.route('/knapsack', methods=['POST'])
@jwt_required()
def knapsack_allocation():
    try:
        data = request.get_json()
        blood_type = data['bloodType']
        units_needed = int(data['unitsNeeded'])
        prioritize_expiry = data.get('prioritizeExpiry', False)

        print(f"Request: blood_type={blood_type}, units_needed={units_needed}, prioritize_expiry={prioritize_expiry}")

        compatible_types = get_compatible_blood_types(blood_type)
        print(f"Compatible types: {compatible_types}")

        available_blood = list(db.blood_inventory.aggregate([
            {
                "$match": {
                    "blood_type": {"$in": compatible_types},
                    "available_units": {"$gt": 0}
                }
            }
        ]))

        print(f"Available blood units: {len(available_blood)}")
        for blood in available_blood:
            print(f"  Hospital: {blood.get('hospital_name')}, Type: {blood.get('blood_type')}, Units: {blood.get('available_units')}, Last Updated: {blood.get('last_updated')}")

        # Calculate days until expiry (42-day shelf life)
        for blood in available_blood:
            try:
                last_updated = dt.strptime(blood.get('last_updated', ''), '%Y-%m-%d')
                days_since_updated = (dt.now() - last_updated).days
                blood['days_until_expiry'] = max(0, 42 - days_since_updated)
                print(f"  Calculated: {blood.get('hospital_name')} -> days_until_expiry={blood['days_until_expiry']}")
            except (ValueError, TypeError) as e:
                blood['days_until_expiry'] = 42
                print(f"  Invalid last_updated for {blood.get('hospital_name')}: {blood.get('last_updated')}, defaulting to days_until_expiry=42")

        # Log units before filtering
        print("Before filtering expired units:")
        for blood in available_blood:
            print(f"  Hospital: {blood.get('hospital_name')}, Type: {blood.get('blood_type')}, Units: {blood.get('available_units')}, Days Until Expiry: {blood['days_until_expiry']}")

        # Filter out expired blood
        available_blood = [b for b in available_blood if b['days_until_expiry'] > 0]
        print(f"After filtering expired: {len(available_blood)} units remain")
        if not available_blood:
            print("No non-expired units available")
            return jsonify({
                "success": True,
                "bloodType": blood_type,
                "requestedUnits": units_needed,
                "allocatedUnits": 0,
                "allocations": []
            }), 200

        # Prioritize exact blood type matches
        for blood in available_blood:
            blood['type_priority'] = 0 if blood['blood_type'] == blood_type else 1
            print(f"  Type priority for {blood.get('hospital_name')}: {blood['type_priority']} (blood_type={blood['blood_type']})")

        # Sort by type_priority, then days_until_expiry
        if prioritize_expiry:
            available_blood.sort(key=lambda x: (x['type_priority'], x['days_until_expiry']))
        else:
            available_blood.sort(key=lambda x: (x['type_priority'], -x['available_units']))

        print("Sorted blood units:")
        for blood in available_blood:
            print(f"  Hospital: {blood.get('hospital_name')}, Type: {blood.get('blood_type')}, Units: {blood.get('available_units')}, Days Until Expiry: {blood['days_until_expiry']}, Type Priority: {blood['type_priority']}")

        allocations = []
        remaining_units = units_needed

        for blood in available_blood:
            if remaining_units <= 0:
                break

            available = blood.get('available_units', 0)
            if available <= 0:
                continue

            allocate_units = min(available, remaining_units)

            allocations.append({
                "hospital": blood.get('hospital_name', 'Unknown'),
                "bloodType": blood.get('blood_type', ''),
                "units": allocate_units,
                "days_until_expiry": blood['days_until_expiry']
            })

            remaining_units -= allocate_units
            print(f"Allocated: {allocate_units} units from {blood.get('hospital_name')} ({blood.get('blood_type')}), remaining: {remaining_units}")

        response = {
            "success": True,
            "bloodType": blood_type,
            "requestedUnits": units_needed,
            "allocatedUnits": units_needed - remaining_units,
            "allocations": allocations
        }
        print(f"Response: {response}")
        return jsonify(response)

    except Exception as e:
        print(f"Error in knapsack_allocation: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(blood_bp, url_prefix='/api')

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Welcome to the Blood Bank API!"}), 200

def get_compatible_blood_types(blood_type):
    compatibility = {
        'O-': ['O-'],
        'O+': ['O+', 'O-'],
        'A-': ['A-', 'O-'],
        'A+': ['A+', 'A-', 'O+', 'O-'],
        'B-': ['B-', 'O-'],
        'B+': ['B+', 'B-', 'O+', 'O-'],
        'AB-': ['AB-', 'A-', 'B-', 'O-'],
        'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-']
    }
    return compatibility.get(blood_type, [])

if __name__ == '__main__':
    app.run(debug=True)