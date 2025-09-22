from fastapi import APIRouter, Depends, HTTPException
from utils import database, models, auth
from utils.gemini import summarize_journal_to_supportive_reply
from typing import List

router = APIRouter(prefix="/journal", tags=["journal"])


@router.get("/dates", response_model=List[str])
async def list_my_journal_dates(
    current_user: database.FirestoreUser = Depends(auth.get_current_active_user),
):
    items = database.list_journals_by_user_unordered(current_user.id)
    # Unique and sort descending by date string (YYYY-MM-DD)
    unique_dates = {i.date for i in items if i.date}
    return sorted(unique_dates, reverse=True)


@router.post("/", response_model=models.JournalEntry)
async def create_journal_entry(
    payload: models.JournalCreate,
    current_user: database.FirestoreUser = Depends(auth.get_current_active_user),
):
    # Check if an entry for this date already exists
    existing = database.get_journal_by_date(current_user.id, payload.date)
    if existing:
        raise HTTPException(
            status_code=400, detail="Journal for this date already exists"
        )

    # Generate AI response via Gemini (with fallback inside utility)
    ai_response = summarize_journal_to_supportive_reply(payload.content)

    entry = database.FirestoreJournal(
        user_id=current_user.id,
        date=payload.date,
        content=payload.content,
        ai_response=ai_response,
    )
    created = database.create_journal(entry)

    return models.JournalEntry(
        id=created.id,
        user_id=created.user_id,
        date=created.date,
        content=created.content,
        ai_response=created.ai_response,
        created_at=created.created_at,
    )


@router.get("/", response_model=List[models.JournalEntry])
async def list_my_journals(
    current_user: database.FirestoreUser = Depends(auth.get_current_active_user),
):
    items = database.list_journals_by_user(current_user.id)
    return [
        models.JournalEntry(
            id=i.id,
            user_id=i.user_id,
            date=i.date,
            content=i.content,
            ai_response=i.ai_response,
            created_at=i.created_at,
        )
        for i in items
    ]


@router.get("/{date}", response_model=models.JournalEntry)
async def get_journal_by_date(
    date: str,
    current_user: database.FirestoreUser = Depends(auth.get_current_active_user),
):
    entry = database.get_journal_by_date(current_user.id, date)
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    return models.JournalEntry(
        id=entry.id,
        user_id=entry.user_id,
        date=entry.date,
        content=entry.content,
        ai_response=entry.ai_response,
        created_at=entry.created_at,
    )


@router.post("/message", response_model=List[models.JournalMessage])
async def add_message(
    payload: models.JournalMessageCreate,
    current_user: database.FirestoreUser = Depends(auth.get_current_active_user),
):
    # Save user message
    user_msg = database.FirestoreJournalMessage(
        user_id=current_user.id,
        date=payload.date,
        role="user",
        content=payload.content,
    )
    database.add_journal_message(user_msg)

    messages: List[models.JournalMessage] = [
        models.JournalMessage(
            id=user_msg.id,
            user_id=user_msg.user_id,
            date=user_msg.date,
            role=user_msg.role,
            content=user_msg.content,
            created_at=user_msg.created_at,
        )
    ]

    # Optionally generate AI response and save
    if payload.generate_ai:
        ai_text = summarize_journal_to_supportive_reply(payload.content)
        ai_msg = database.FirestoreJournalMessage(
            user_id=current_user.id,
            date=payload.date,
            role="assistant",
            content=ai_text,
        )
        database.add_journal_message(ai_msg)
        messages.append(
            models.JournalMessage(
                id=ai_msg.id,
                user_id=ai_msg.user_id,
                date=ai_msg.date,
                role=ai_msg.role,
                content=ai_msg.content,
                created_at=ai_msg.created_at,
            )
        )

    return messages


@router.get("/{date}/messages", response_model=List[models.JournalMessage])
async def get_messages(
    date: str,
    current_user: database.FirestoreUser = Depends(auth.get_current_active_user),
):
    msgs = database.list_journal_messages(current_user.id, date)
    return [
        models.JournalMessage(
            id=m.id,
            user_id=m.user_id,
            date=m.date,
            role=m.role,
            content=m.content,
            created_at=m.created_at,
        )
        for m in msgs
    ]
