from flask import Blueprint, request, jsonify
from models.user import User
from flask_jwt_extended import create_access_token

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.json
    if User.find_user_by_email(data['email']):
        return jsonify({"error": "User already exists"}), 400

    User.create_user(data['username'], data['email'], data['password'])
    return jsonify({"message": "User registered successfully"}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.find_user_by_email(data['email'])

    if user and user['password'] == data['password']:  # Plain text check
        access_token = create_access_token(identity=user['email'])
    
        return jsonify({
            "token": access_token,
            "username": user.get("username"),
        }), 200

    return jsonify({"error": "Invalid credentials"}), 401
