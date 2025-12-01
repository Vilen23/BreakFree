# app/firebase.py
import firebase_admin
from firebase_admin import credentials, firestore
from typing import Optional, Dict, Any, List
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
ONBOARDING_COLLECTION = "onboarding_responses"
DAILY_TASKS_COLLECTION = "daily_tasks"
EXERCISE_SCORES_COLLECTION = "exercise_scores"


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
        information_stores: bool = False,
        created_at: datetime = None,
    ):
        self.id = id or str(uuid.uuid4())
        self.email = email
        self.firstname = firstname
        self.lastname = lastname
        self.gender = gender
        self.hashed_password = hashed_password
        self.is_active = is_active
        self.information_stores = information_stores
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
            "information_stores": self.information_stores,
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
            information_stores=data.get("information_stores", False),
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
        conversation_unlocked: bool = False,
    ):
        self.id = id or str(uuid.uuid4())
        self.user_id = user_id
        self.date = date
        self.content = content
        self.ai_response = ai_response
        self.created_at = created_at or datetime.utcnow()
        self.conversation_unlocked = conversation_unlocked

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "date": self.date,
            "content": self.content,
            "ai_response": self.ai_response,
            "created_at": self.created_at,
            "conversation_unlocked": self.conversation_unlocked,
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
            conversation_unlocked=data.get("conversation_unlocked", False),
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
            content=(
                data.get("content")
                if isinstance(data.get("content"), str) and data.get("content").strip()
                else ""
            ),
            created_at=data.get("created_at"),
        )


def add_journal_message(message: FirestoreJournalMessage) -> FirestoreJournalMessage:
    doc_ref = db.collection(JOURNAL_MESSAGES_COLLECTION).document(message.id)
    doc_ref.set(message.to_dict())
    return message


def list_journal_messages(user_id: str, date: str) -> list[FirestoreJournalMessage]:
    # Avoid composite index requirement by not ordering in Firestore.
    # We'll sort in application code instead.
    query = (
        db.collection(JOURNAL_MESSAGES_COLLECTION)
        .where("user_id", "==", user_id)
        .where("date", "==", date)
    )
    docs = query.stream()
    items = [FirestoreJournalMessage.from_dict(doc.id, doc.to_dict()) for doc in docs]
    items.sort(key=lambda m: m.created_at)
    return items


class FirestoreOnboarding:
    def __init__(
        self,
        id: str = None,
        user_id: str = None,
        addiction: str = None,
        answers: Any = None,
        created_at: datetime = None,
    ):
        self.id = id or str(uuid.uuid4())
        self.user_id = user_id
        self.addiction = addiction
        self.answers = answers if answers is not None else {}
        self.created_at = created_at or datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "addiction": self.addiction,
            "answers": self.answers,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, doc_id: str, data: Dict[str, Any]) -> "FirestoreOnboarding":
        return cls(
            id=doc_id,
            user_id=data.get("user_id"),
            addiction=data.get("addiction"),
            answers=data.get("answers"),
            created_at=data.get("created_at"),
        )


def create_onboarding(entry: FirestoreOnboarding) -> FirestoreOnboarding:
    doc_ref = db.collection(ONBOARDING_COLLECTION).document(entry.id)
    doc_ref.set(entry.to_dict())
    return entry


def list_onboarding_by_user(user_id: str) -> list[FirestoreOnboarding]:
    query = db.collection(ONBOARDING_COLLECTION).where("user_id", "==", user_id)
    docs = query.stream()
    return [FirestoreOnboarding.from_dict(doc.id, doc.to_dict()) for doc in docs]


def get_latest_onboarding_by_user(user_id: str) -> Optional[FirestoreOnboarding]:
    # We avoid server-side order if composite index not present; fetch and sort locally
    items = list_onboarding_by_user(user_id)
    if not items:
        return None
    items.sort(key=lambda x: x.created_at, reverse=True)
    return items[0]


class FirestoreDailyTasks:
    def __init__(
        self,
        id: str = None,
        user_id: str = None,
        date: str = None,
        tasks: Any = None,
        created_at: datetime = None,
    ):
        self.id = id or str(uuid.uuid4())
        self.user_id = user_id
        self.date = date
        self.tasks = tasks if tasks is not None else []
        self.created_at = created_at or datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "date": self.date,
            "tasks": self.tasks,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, doc_id: str, data: Dict[str, Any]) -> "FirestoreDailyTasks":
        return cls(
            id=doc_id,
            user_id=data.get("user_id"),
            date=data.get("date"),
            tasks=data.get("tasks", []),
            created_at=data.get("created_at"),
        )


def get_daily_tasks_by_date(user_id: str, date: str) -> Optional[FirestoreDailyTasks]:
    query = (
        db.collection(DAILY_TASKS_COLLECTION)
        .where("user_id", "==", user_id)
        .where("date", "==", date)
        .limit(1)
    )
    docs = list(query.stream())
    if docs:
        doc = docs[0]
        return FirestoreDailyTasks.from_dict(doc.id, doc.to_dict())
    return None


def create_daily_tasks(entry: FirestoreDailyTasks) -> FirestoreDailyTasks:
    doc_ref = db.collection(DAILY_TASKS_COLLECTION).document(entry.id)
    doc_ref.set(entry.to_dict())
    return entry


def update_daily_tasks(tasks_id: str, update_data: Dict[str, Any]) -> bool:
    doc_ref = db.collection(DAILY_TASKS_COLLECTION).document(tasks_id)
    doc_ref.update(update_data)
    return True


def get_recent_daily_tasks(user_id: str, days: int = 2) -> List[FirestoreDailyTasks]:
    """Get daily tasks from the last N days (excluding today)."""
    from datetime import datetime, timedelta

    recent_tasks = []
    today = datetime.utcnow()

    for i in range(1, days + 1):
        date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        task = get_daily_tasks_by_date(user_id, date)
        if task:
            recent_tasks.append(task)

    return recent_tasks


def save_exercise_score(user_id: str, task_id: str, date: str, score: float) -> bool:
    """
    Save or update exercise score for a user, task, and date.
    If score already exists, it will be updated.
    """
    try:
        # Find the daily tasks for this date
        daily_tasks = get_daily_tasks_by_date(user_id, date)
        if not daily_tasks:
            print(
                f"[ExerciseScore] No daily tasks found for user={user_id}, date={date}"
            )
            return False

        # Update the task with the score
        tasks = daily_tasks.tasks if daily_tasks.tasks else []
        updated = False
        for i, task in enumerate(tasks):
            if isinstance(task, dict):
                if str(task.get("id")) == str(task_id):
                    tasks[i]["accuracy"] = score
                    updated = True
                    break
            elif hasattr(task, "id") and str(getattr(task, "id", "")) == str(task_id):
                if isinstance(tasks[i], dict):
                    tasks[i]["accuracy"] = score
                else:
                    # Convert to dict if needed
                    task_dict = {
                        "id": getattr(task, "id", ""),
                        "title": getattr(task, "title", ""),
                        "description": getattr(task, "description", ""),
                        "time": getattr(task, "time", ""),
                        "completed": getattr(task, "completed", False),
                        "video_url": getattr(task, "video_url", None),
                        "exercise_type": getattr(task, "exercise_type", None),
                        "difficulty": getattr(task, "difficulty", None),
                        "image": getattr(task, "image", None),
                        "steps": getattr(task, "steps", None),
                        "accuracy": score,
                    }
                    tasks[i] = task_dict
                updated = True
                break

        if updated:
            update_daily_tasks(daily_tasks.id, {"tasks": tasks})
            print(
                f"[ExerciseScore] Updated score for user={user_id}, task={task_id}, date={date}, score={score:.3f}"
            )
            return True
        else:
            print(
                f"[ExerciseScore] Task {task_id} not found in daily tasks for user={user_id}, date={date}"
            )
            return False

    except Exception as e:
        print(f"[ExerciseScore] Error saving score: {e}")
        return False
