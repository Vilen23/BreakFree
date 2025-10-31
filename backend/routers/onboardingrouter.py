from fastapi import APIRouter, Depends
from utils import database, models, auth
from datetime import datetime
from typing import List
from utils.gemini import generate_daily_tasks

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("/", response_model=models.OnboardingEntry)
async def save_onboarding_response(
    payload: models.OnboardingCreate,
    current_user: database.FirestoreUser = Depends(auth.get_current_active_user),
):
    entry = database.FirestoreOnboarding(
        user_id=current_user.id,
        addiction=payload.addiction,
        answers=payload.answers,
    )
    created = database.create_onboarding(entry)
    # Mark that the user has stored their information
    database.update_user(current_user.id, {"information_stores": True})
    return models.OnboardingEntry(
        id=created.id,
        user_id=created.user_id,
        addiction=created.addiction,
        answers=created.answers,
        created_at=created.created_at,
    )
