from fastapi import APIRouter, Depends
from utils.PoseTracker.pose_compare import compare_pose_sequences
from utils.PoseTracker.reference_loader import load_reference_pose
from utils.models import PoseCompareRequest
from utils import database, auth
from datetime import datetime
import os
import json

router = APIRouter(prefix="/pose", tags=["pose"])

USER_POSE_DIR = "user_poses"
os.makedirs(USER_POSE_DIR, exist_ok=True)


@router.post("/compare")
def compare_pose(
    req: PoseCompareRequest,
    current_user: database.FirestoreUser = Depends(auth.get_current_active_user),
):
    try:
        # Use reference_video_url from request to find the matching exercise
        if not req.reference_video_url:
            return {
                "error": "reference_video_url is required to find the correct reference pose"
            }

        video_url = req.reference_video_url
        print(f"[PoseCompare] Looking up reference pose for video: {video_url}")

        # Find the exercise in exercises.json that matches this video_url
        exercises_path = os.path.join(os.path.dirname(__file__), "..", "exercises.json")
        with open(exercises_path, "r") as f:
            exercises_data = json.load(f)

        matching_exercise = None
        for exercise in exercises_data.get("exercises", []):
            if exercise.get("videolink") == video_url:
                matching_exercise = exercise
                break

        if not matching_exercise:
            return {
                "error": f"No exercise found in exercises.json with videolink: {video_url}"
            }

        exercise_id = matching_exercise.get("id")
        exercise_name = matching_exercise.get("name", "unknown")
        print(
            f"[PoseCompare] Found matching exercise: ID={exercise_id}, Name={exercise_name}"
        )

        # Load reference pose using exercise ID and video URL
        try:
            reference_seq = load_reference_pose(str(exercise_id), video_url=video_url)
            print(
                f"[PoseCompare] Loaded pre-computed reference poses for exercise {exercise_id} (task {req.task_id})"
            )
        except Exception as e:
            print(f"[PoseCompare] Error loading reference poses: {e}")
            return {
                "error": f"Failed to load reference poses for exercise {exercise_id}: {str(e)}"
            }

        # Save user sequence for inspection
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        user_out_path = os.path.join(
            USER_POSE_DIR, f"user_task{req.task_id}_{timestamp}.json"
        )
        with open(user_out_path, "w") as f:
            json.dump(req.user_pose_sequence, f)

        # Print quick debug info
        ref_frames = len(reference_seq)
        user_frames = len(req.user_pose_sequence)
        avg_ref_points = len(reference_seq[0]) if ref_frames else 0
        avg_user_points = len(req.user_pose_sequence[0]) if user_frames else 0
        print(
            f"[PoseCompare] Task={req.task_id} | RefFrames={ref_frames}, UserFrames={user_frames}, "
            f"RefPoints={avg_ref_points}, UserPoints={avg_user_points}"
        )

        # Compare using motion-based analysis (only common visible points)
        # Backend already implements: common points filtering + motion vectors + relative movement
        score = compare_pose_sequences(
            reference_seq, req.user_pose_sequence, task_id=req.task_id
        )

        # Save score to database
        today = datetime.utcnow().strftime("%Y-%m-%d")
        user_id = req.user_id or current_user.id
        database.save_exercise_score(user_id, req.task_id, today, score)

        # Return score + file reference
        return {
            "score": score,
            "saved_user_pose": user_out_path,
            "message": "Pose comparison completed using pre-computed reference poses",
        }

    except Exception as e:
        return {"error": str(e)}
