from pymongo import MongoClient
from database import db  # Import database connection

# Connect to MongoDB

users_collection = db["users"]  # Use the same database as database.py


class User:
    @staticmethod
    def find_user_by_email(email):
        """Find a user in the database by email"""
        return users_collection.find_one({"email": email})

    @staticmethod
    def create_user(username, email, password):
        
        
        user_data = {
            "username": username,
            "email": email,
            "password": password,
        }
        users_collection.insert_one(user_data)
