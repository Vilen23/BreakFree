from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
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

    # Get recently used exercises from the last 2 days to avoid repetition
    recent_tasks = database.get_recent_daily_tasks(current_user.id, days=2)
    recently_used_exercises = []
    for task_plan in recent_tasks:
        if task_plan.tasks:
            for task in task_plan.tasks:
                # Only include physical exercises
                if isinstance(task, dict) and task.get("exercise_type") == "physical":
                    exercise_title = task.get("title", "")
                    if exercise_title:
                        recently_used_exercises.append(exercise_title)
                elif (
                    hasattr(task, "exercise_type") and task.exercise_type == "physical"
                ):
                    exercise_title = getattr(task, "title", "")
                    if exercise_title:
                        recently_used_exercises.append(exercise_title)

    print(
        f"[TasksRouter] Found {len(recently_used_exercises)} recently used exercises: {recently_used_exercises}"
    )

    tasks = generate_daily_tasks(onboarding_payload, recently_used_exercises)
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


class TaskUpdateRequest(BaseModel):
    task_id: str
    completed: bool
    date: Optional[str] = None  # If not provided, uses today's date


class TaskAccuracyUpdateRequest(BaseModel):
    task_id: str
    accuracy: float
    date: Optional[str] = None  # If not provided, uses today's date


class MarkDayCompleteRequest(BaseModel):
    date: Optional[str] = None  # If not provided, uses today's date


@router.patch("/task/complete")
async def update_task_completion(
    update_data: TaskUpdateRequest,
    current_user: database.FirestoreUser = Depends(auth.get_current_active_user),
):
    """
    Mark a task as complete or incomplete
    """
    date = update_data.date or datetime.utcnow().strftime("%Y-%m-%d")

    # Get the daily tasks for this date
    daily_tasks = database.get_daily_tasks_by_date(current_user.id, date)
    if not daily_tasks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No daily tasks found for date {date}",
        )

    # Update the task completion status
    tasks = daily_tasks.tasks if daily_tasks.tasks else []
    updated = False

    for i, task in enumerate(tasks):
        task_id = task.get("id") if isinstance(task, dict) else getattr(task, "id", "")
        if str(task_id) == str(update_data.task_id):
            if isinstance(task, dict):
                tasks[i]["completed"] = update_data.completed
            else:
                # Convert to dict if needed
                task_dict = {
                    "id": getattr(task, "id", ""),
                    "title": getattr(task, "title", ""),
                    "description": getattr(task, "description", ""),
                    "time": getattr(task, "time", ""),
                    "completed": update_data.completed,
                    "video_url": getattr(task, "video_url", None),
                    "exercise_type": getattr(task, "exercise_type", None),
                    "difficulty": getattr(task, "difficulty", None),
                    "image": getattr(task, "image", None),
                    "steps": getattr(task, "steps", None),
                    "accuracy": getattr(task, "accuracy", None),
                }
                tasks[i] = task_dict
            updated = True
            break

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {update_data.task_id} not found",
        )

    # Save the updated tasks
    database.update_daily_tasks(daily_tasks.id, {"tasks": tasks})

    return {
        "success": True,
        "message": f"Task marked as {'complete' if update_data.completed else 'incomplete'}",
    }


@router.patch("/task/accuracy")
async def update_task_accuracy(
    update_data: TaskAccuracyUpdateRequest,
    current_user: database.FirestoreUser = Depends(auth.get_current_active_user),
):
    """
    Update the accuracy score for a task (alternative to pose comparison endpoint)
    """
    date = update_data.date or datetime.utcnow().strftime("%Y-%m-%d")

    success = database.save_exercise_score(
        current_user.id, update_data.task_id, date, update_data.accuracy
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Failed to update accuracy for task {update_data.task_id}",
        )

    return {
        "success": True,
        "message": f"Accuracy score updated to {update_data.accuracy:.3f}",
    }


@router.post("/day/complete")
async def mark_day_complete(
    request: MarkDayCompleteRequest,
    current_user: database.FirestoreUser = Depends(auth.get_current_active_user),
):
    """
    Mark all tasks for a day as complete
    """
    target_date = request.date or datetime.utcnow().strftime("%Y-%m-%d")

    # Get the daily tasks for this date
    daily_tasks = database.get_daily_tasks_by_date(current_user.id, target_date)
    if not daily_tasks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No daily tasks found for date {target_date}",
        )

    # Mark all tasks as complete
    tasks = daily_tasks.tasks if daily_tasks.tasks else []
    updated_tasks = []

    for task in tasks:
        if isinstance(task, dict):
            task["completed"] = True
            updated_tasks.append(task)
        else:
            task_dict = {
                "id": getattr(task, "id", ""),
                "title": getattr(task, "title", ""),
                "description": getattr(task, "description", ""),
                "time": getattr(task, "time", ""),
                "completed": True,
                "video_url": getattr(task, "video_url", None),
                "exercise_type": getattr(task, "exercise_type", None),
                "difficulty": getattr(task, "difficulty", None),
                "image": getattr(task, "image", None),
                "steps": getattr(task, "steps", None),
                "accuracy": getattr(task, "accuracy", None),
            }
            updated_tasks.append(task_dict)

    # Save the updated tasks
    database.update_daily_tasks(daily_tasks.id, {"tasks": updated_tasks})

    return {
        "success": True,
        "message": f"All tasks for {target_date} marked as complete",
        "tasks_completed": len(updated_tasks),
    }
