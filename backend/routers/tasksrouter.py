from fastapi import APIRouter, Depends
from datetime import datetime
from utils import database, models, auth
from utils.gemini import generate_daily_tasks

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/daily", response_model=models.DailyTasksPlan)
async def get_today_tasks(
    current_user: database.FirestoreUser = Depends(auth.get_current_active_user),
    force: bool = False,
):
    today = datetime.utcnow().strftime("%Y-%m-%d")

    # return existing plan if present
    existing = database.get_daily_tasks_by_date(current_user.id, today)
    if existing and not force:
        print(
            f"[TasksRouter] returning existing plan for user={current_user.id} date={today} tasks={len(existing.tasks)}"
        )
        plan = models.DailyTasksPlan(
            id=existing.id,
            user_id=existing.user_id,
            date=existing.date,
            tasks=[models.DailyTaskItem(**t) for t in existing.tasks],
            created_at=existing.created_at,
        )
        print("[TasksRouter] returning tasks titles:", [t.title for t in plan.tasks])
        return plan

    # otherwise generate a new plan via Gemini using latest onboarding context
    onboarding = database.get_latest_onboarding_by_user(current_user.id)
    onboarding_payload = None
    if onboarding:
        onboarding_payload = {
            "addiction": onboarding.addiction,
            "answers": onboarding.answers,
        }
    tasks = generate_daily_tasks(onboarding_payload)
    print(
        f"[TasksRouter] generated tasks for user={current_user.id} date={today} tasks={len(tasks)}"
    )

    if existing and force:
        database.update_daily_tasks(
            existing.id, {"tasks": tasks, "created_at": datetime.utcnow()}
        )
        updated = database.get_daily_tasks_by_date(current_user.id, today)
        print(f"[TasksRouter] updated existing plan id={existing.id}")
        plan = models.DailyTasksPlan(
            id=updated.id,  # type: ignore
            user_id=updated.user_id,  # type: ignore
            date=updated.date,  # type: ignore
            tasks=[
                models.DailyTaskItem(**t) for t in (updated.tasks if updated else [])
            ],
            created_at=updated.created_at,  # type: ignore
        )
        print("[TasksRouter] updated tasks titles:", [t.title for t in plan.tasks])
        return plan

    entry = database.FirestoreDailyTasks(
        user_id=current_user.id,
        date=today,
        tasks=tasks,
    )
    created = database.create_daily_tasks(entry)
    print(f"[TasksRouter] stored new plan id={created.id}")

    plan = models.DailyTasksPlan(
        id=created.id,
        user_id=created.user_id,
        date=created.date,
        tasks=[models.DailyTaskItem(**t) for t in created.tasks],
        created_at=created.created_at,
    )
    print("[TasksRouter] created tasks titles:", [t.title for t in plan.tasks])
    return plan
