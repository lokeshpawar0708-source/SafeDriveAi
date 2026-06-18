import os
import hashlib
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables explicitly from backend/.env
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path=ENV_PATH)

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = "safedrive_db"
COLLECTION_NAME = "alerts"
MANAGERS_COLLECTION = "managers"

client = None
db = None
collection = None
managers_col = None

def get_mongodb_connection():
    global client, db, collection, managers_col
    if collection is not None:
        return collection
        
    if not MONGODB_URI:
        print("CRITICAL: MONGODB_URI environment variable is missing! MongoDB database is disabled.")
        return None
        
    try:
        # 5 seconds connection timeout
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        # Trigger validation
        client.admin.command('ping')
        db = client[DB_NAME]
        collection = db[COLLECTION_NAME]
        managers_col = db[MANAGERS_COLLECTION]
        
        # Ensure unique index on username
        managers_col.create_index("username", unique=True)
        
        print("SUCCESS: Connected to MongoDB cluster successfully.")
        return collection
    except Exception as e:
        print(f"WARNING: MongoDB connection failed: {e}. Falling back to CSV logging.")
        return None

def get_managers_collection():
    get_mongodb_connection()
    return managers_col

class MongoDbLogger:
    @staticmethod
    def log_event(event_type, details="", driver_id="Driver_01"):
        col = get_mongodb_connection()
        now = datetime.now()
        doc = {
            "timestamp": now,
            "time_str": now.strftime("%H:%M:%S"),
            "driver_id": driver_id,
            "event": event_type,
            "details": details
        }
        
        if col is not None:
            try:
                col.insert_one(doc)
                return True
            except Exception as e:
                print(f"Error inserting log to MongoDB: {e}")
        return False

    @staticmethod
    def get_logs(limit=100):
        col = get_mongodb_connection()
        if col is not None:
            try:
                cursor = col.find().sort("timestamp", -1).limit(limit)
                logs = []
                for doc in cursor:
                    logs.append({
                        "time": doc.get("time_str", ""),
                        "event": doc.get("event", ""),
                        "details": doc.get("details", ""),
                        "driver_id": doc.get("driver_id", "Driver_01")
                    })
                return logs
            except Exception as e:
                print(f"Error reading logs from MongoDB: {e}")
        
        # Fallback to local CSV logs if MongoDB is not connected
        try:
            from app.models.alert_log import AlertLogger
            local_logs = AlertLogger.get_logs()
            # Ensure each log has 'driver_id' key to avoid KeyError in RAG presenter
            for log in local_logs:
                if "driver_id" not in log:
                    log["driver_id"] = "Driver_01"
            return local_logs
        except Exception as e:
            print(f"Fallback CSV read failed: {e}")
        return []

    @staticmethod
    def clear_logs():
        col = get_mongodb_connection()
        if col is not None:
            try:
                col.delete_many({})
                return True
            except Exception as e:
                print(f"Error clearing logs in MongoDB: {e}")
        
        # Fallback to local CSV logs clear if MongoDB is not connected
        try:
            from app.models.alert_log import AlertLogger
            return AlertLogger.clear_logs()
        except Exception as e:
            print(f"Fallback CSV clear failed: {e}")
        return False

    # --- Manager User Authentication Logic ---
    @staticmethod
    def hash_password(password):
        return hashlib.sha256(password.encode('utf-8')).hexdigest()

    @staticmethod
    def create_manager(username, password):
        col = get_managers_collection()
        username_clean = username.strip().lower()
        password_hash = MongoDbLogger.hash_password(password)

        if col is None:
            # Local in-memory registration fallback
            global mock_users
            if username_clean in mock_users:
                return {"error": "Username already exists"}
            mock_users[username_clean] = password_hash
            print(f"SUCCESS: Manager account '{username_clean}' registered locally in-memory.")
            return {"success": True}
            
        try:
            # Check if user already exists
            existing = col.find_one({"username": username_clean})
            if existing:
                return {"error": "Username already exists"}
                
            col.insert_one({
                "username": username_clean,
                "password_hash": password_hash,
                "created_at": datetime.now()
            })
            return {"success": True}
        except Exception as e:
            return {"error": f"Failed to create manager account: {str(e)}"}

    @staticmethod
    def authenticate_manager(username, password):
        col = get_managers_collection()
        username_clean = username.strip().lower()
        password_hash = MongoDbLogger.hash_password(password)

        if col is None:
            # Local in-memory authentication fallback
            global mock_users
            return mock_users.get(username_clean) == password_hash
            
        try:
            user = col.find_one({"username": username_clean})
            if user and user.get("password_hash") == password_hash:
                return True
        except Exception as e:
            print(f"Authentication error: {e}")
            
        return False

# In-memory fallback dictionary initialized with default admin credentials
mock_users = {
    "admin": hashlib.sha256("admin".encode('utf-8')).hexdigest()
}
