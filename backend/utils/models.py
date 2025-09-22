from pydantic import BaseModel, EmailStr
from typing import Optional
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
