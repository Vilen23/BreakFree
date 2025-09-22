# app/firebase.py
import firebase_admin
from firebase_admin import credentials, firestore
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

# Load credentials
cred = credentials.Certificate(
    r"C:\Users\shiva\Desktop\BreakFree\backend\breakfree-a7269-firebase-adminsdk-fbsvc-1f3670017a.json"
)

# Initialize Firebase Admin SDK (only if not already initialized)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

# Get Firestore client
db = firestore.client()

# Collection names
USERS_COLLECTION = "users"


class FirestoreUser:
    """User model for Firestore operations"""

    def __init__(
        self,
        id: str = None,
        email: str = None,
        firstname: str = None,
        lastname: str = None,
        gender: str = None,
        hashed_password: str = None,
        is_active: bool = True,
        created_at: datetime = None,
    ):
        self.id = id or str(uuid.uuid4())
        self.email = email
        self.firstname = firstname
        self.lastname = lastname
        self.gender = gender
        self.hashed_password = hashed_password
        self.is_active = is_active
        self.created_at = created_at or datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Convert user to dictionary for Firestore"""
        return {
            "email": self.email,
            "firstname": self.firstname,
            "lastname": self.lastname,
            "gender": self.gender,
            "hashed_password": self.hashed_password,
            "is_active": self.is_active,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, doc_id: str, data: Dict[str, Any]) -> "FirestoreUser":
        """Create user from Firestore document"""
        return cls(
            id=doc_id,
            email=data.get("email"),
            firstname=data.get("firstname"),
            lastname=data.get("lastname"),
            gender=data.get("gender"),
            hashed_password=data.get("hashed_password"),
            is_active=data.get("is_active", True),
            created_at=data.get("created_at"),
        )


# Firestore operations
def get_user_by_email(email: str) -> Optional[FirestoreUser]:
    """Get user by email from Firestore"""
    users_ref = db.collection(USERS_COLLECTION)
    query = users_ref.where("email", "==", email).limit(1)
    docs = query.stream()

    for doc in docs:
        return FirestoreUser.from_dict(doc.id, doc.to_dict())
    return None


def get_user_by_id(user_id: str) -> Optional[FirestoreUser]:
    """Get user by ID from Firestore"""
    doc_ref = db.collection(USERS_COLLECTION).document(user_id)
    doc = doc_ref.get()

    if doc.exists:
        return FirestoreUser.from_dict(doc.id, doc.to_dict())
    return None


def create_user(user: FirestoreUser) -> FirestoreUser:
    """Create a new user in Firestore"""
    doc_ref = db.collection(USERS_COLLECTION).document(user.id)
    doc_ref.set(user.to_dict())
    return user


def update_user(user_id: str, update_data: Dict[str, Any]) -> bool:
    """Update user in Firestore"""
    doc_ref = db.collection(USERS_COLLECTION).document(user_id)
    doc_ref.update(update_data)
    return True


def delete_user(user_id: str) -> bool:
    """Delete user from Firestore"""
    doc_ref = db.collection(USERS_COLLECTION).document(user_id)
    doc_ref.delete()
    return True
