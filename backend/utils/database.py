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
JOURNALS_COLLECTION = "journals"
JOURNAL_MESSAGES_COLLECTION = "journal_messages"


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


class FirestoreJournal:
    def __init__(
        self,
        id: str = None,
        user_id: str = None,
        date: str = None,
        content: str = None,
        ai_response: str = None,
        created_at: datetime = None,
    ):
        self.id = id or str(uuid.uuid4())
        self.user_id = user_id
        self.date = date
        self.content = content
        self.ai_response = ai_response
        self.created_at = created_at or datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "date": self.date,
            "content": self.content,
            "ai_response": self.ai_response,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, doc_id: str, data: Dict[str, Any]) -> "FirestoreJournal":
        return cls(
            id=doc_id,
            user_id=data.get("user_id"),
            date=data.get("date"),
            content=data.get("content"),
            ai_response=data.get("ai_response"),
            created_at=data.get("created_at"),
        )


def create_journal(entry: FirestoreJournal) -> FirestoreJournal:
    doc_ref = db.collection(JOURNALS_COLLECTION).document(entry.id)
    doc_ref.set(entry.to_dict())
    return entry


def list_journals_by_user(user_id: str) -> list[FirestoreJournal]:
    query = (
        db.collection(JOURNALS_COLLECTION)
        .where("user_id", "==", user_id)
        .order_by("date", direction=firestore.Query.DESCENDING)
    )
    docs = query.stream()
    return [FirestoreJournal.from_dict(doc.id, doc.to_dict()) for doc in docs]


def list_journals_by_user_unordered(user_id: str) -> list[FirestoreJournal]:
    """List journals by user without ordering to avoid composite index requirement.

    Sorting can be performed on the application side.
    """
    query = db.collection(JOURNALS_COLLECTION).where("user_id", "==", user_id)
    docs = query.stream()
    return [FirestoreJournal.from_dict(doc.id, doc.to_dict()) for doc in docs]


def get_journal_by_date(user_id: str, date: str) -> Optional[FirestoreJournal]:
    query = (
        db.collection(JOURNALS_COLLECTION)
        .where("user_id", "==", user_id)
        .where("date", "==", date)
        .limit(1)
    )
    docs = list(query.stream())
    if docs:
        doc = docs[0]
        return FirestoreJournal.from_dict(doc.id, doc.to_dict())
    return None


def update_journal(journal_id: str, update_data: Dict[str, Any]) -> bool:
    db.collection(JOURNALS_COLLECTION).document(journal_id).update(update_data)
    return True


class FirestoreJournalMessage:
    def __init__(
        self,
        id: str = None,
        user_id: str = None,
        date: str = None,
        role: str = None,  # "user" or "assistant"
        content: str = None,
        created_at: datetime = None,
    ):
        self.id = id or str(uuid.uuid4())
        self.user_id = user_id
        self.date = date
        self.role = role
        self.content = content
        self.created_at = created_at or datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "date": self.date,
            "role": self.role,
            "content": self.content,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, doc_id: str, data: Dict[str, Any]) -> "FirestoreJournalMessage":
        return cls(
            id=doc_id,
            user_id=data.get("user_id"),
            date=data.get("date"),
            role=data.get("role"),
            content=data.get("content"),
            created_at=data.get("created_at"),
        )


def add_journal_message(message: FirestoreJournalMessage) -> FirestoreJournalMessage:
    doc_ref = db.collection(JOURNAL_MESSAGES_COLLECTION).document(message.id)
    doc_ref.set(message.to_dict())
    return message


def list_journal_messages(user_id: str, date: str) -> list[FirestoreJournalMessage]:
    query = (
        db.collection(JOURNAL_MESSAGES_COLLECTION)
        .where("user_id", "==", user_id)
        .where("date", "==", date)
        .order_by("created_at", direction=firestore.Query.ASCENDING)
    )
    docs = query.stream()
    return [FirestoreJournalMessage.from_dict(doc.id, doc.to_dict()) for doc in docs]
