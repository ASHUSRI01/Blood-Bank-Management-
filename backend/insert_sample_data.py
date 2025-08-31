from pymongo import MongoClient
from datetime import datetime

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["blood_bank"]
collection = db["blood_inventory"]

# Sample Blood Inventory Data
sample_data = [
    {
        "blood_type": "A+",
        "available_units": 10,
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "status": "Available",
        "donor_name": "Rahul Sharma",
        "hospital_name": "City Hospital",
        "contact_number": "9876543210"
    },
    {
        "blood_type": "B-",
        "available_units": 5,
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "status": "Low Stock",
        "donor_name": "Priya Verma",
        "hospital_name": "Apollo Clinic",
        "contact_number": "8765432109"
    },
    {
        "blood_type": "O+",
        "available_units": 15,
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "status": "Available",
        "donor_name": "Amit Kumar",
        "hospital_name": "Fortis Hospital",
        "contact_number": "7654321098"
    }
]

# Insert Sample Data into MongoDB
collection.insert_many(sample_data)
print("Sample data inserted successfully!")
