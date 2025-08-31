from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

inventory_bp = Blueprint('inventory', __name__)

@inventory_bp.route('/view', methods=['GET'])
@jwt_required()  # Protect this route
def view_inventory():
    current_user = get_jwt_identity()  # Get the logged-in user's email
    return jsonify({"message": f"Hello {current_user}, here is your inventory data!"}), 200
