from pydantic import BaseModel, EmailStr
from typing import Optional, Any, Dict, List
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    firstname: str
    lastname: str
    gender: str


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(UserBase):
    id: str
    is_active: bool = True
    information_stores: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class JournalCreate(BaseModel):
    date: str  # YYYY-MM-DD
    content: str


class JournalEntry(BaseModel):
    id: str
    user_id: str
    date: str  # YYYY-MM-DD
    content: str
    ai_response: Optional[str] = None
    created_at: datetime
    conversation_unlocked: bool = False

    class Config:
        from_attributes = True


class JournalMessageCreate(BaseModel):
    date: str  # YYYY-MM-DD
    content: str
    generate_ai: bool = False


class JournalMessage(BaseModel):
    id: str
    user_id: str
    date: str  # YYYY-MM-DD
    role: str  # "user" | "assistant"
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# Onboarding models
class OnboardingQuestionAnswer(BaseModel):
    question_id: str
    answer: Any
    question_text: Optional[str] = None


class OnboardingCreate(BaseModel):
    addiction: str
    # answers can be either a dict keyed by question_id or a list of detailed answers
    answers: Any


class OnboardingEntry(BaseModel):
    id: str
    user_id: str
    addiction: str
    answers: Any
    created_at: datetime

    class Config:
        from_attributes = True


# Daily tasks models
class DailyTaskItem(BaseModel):
    id: str
    title: str
    description: str
    time: str
    completed: bool
    video_url: Optional[str] = None  # NEW — AI generated or cached video
    exercise_type: Optional[str] = None  # e.g., "stretch", "breathing", etc.
    difficulty: Optional[str] = None  # e.g., "easy", "medium", "hard"
    image: Optional[str] = None  # NEW — AI generated image URL
    steps: Optional[List[str]] = (
        None  # Steps for physical exercises (3 steps from exercises.json)
    )
    accuracy: Optional[float] = None  # Exercise accuracy score (0.0 to 1.0)
    exercise_id: Optional[int] = (
        None  # ID from exercises.json - used for pose comparison
    )


class DailyTasksPlan(BaseModel):
    id: str
    user_id: str
    date: str  # YYYY-MM-DD
    tasks: List[DailyTaskItem]
    created_at: datetime

    class Config:
        from_attributes = True


class PoseCompareRequest(BaseModel):
    task_id: str  # Daily task ID (for reference and saving score)
    reference_video_url: Optional[str] = (
        None  # Video URL from task - used to find reference pose
    )
    user_id: Optional[str] = None  # User ID for storing score
    reference_pose_sequence: Optional[list] = (
        None  # Optional: backend loads from pre-computed files if not provided
    )
    user_pose_sequence: list  # Real-time extracted from user camera


# Contact form models
class ContactFormRequest(BaseModel):
    name: str
    email: EmailStr
    message: str


class ContactFormResponse(BaseModel):
    success: bool
    message: str
