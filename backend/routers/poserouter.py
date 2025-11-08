from fastapi import APIRouter
from utils.PoseTracker.pose_compare import compare_pose_sequences
from utils.PoseTracker.reference_loader import load_reference_pose
from utils.models import PoseCompareRequest
from datetime import datetime
import os
import json

router = APIRouter(prefix="/pose", tags=["pose"])

USER_POSE_DIR = "user_poses"
os.makedirs(USER_POSE_DIR, exist_ok=True)

@router.post("/compare")
def compare_pose(req: PoseCompareRequest):
    try:
        # Load reference pose sequence
        reference_seq = load_reference_pose(req.task_id)

        # Save user's sequence for inspection
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        out_path = os.path.join(
            USER_POSE_DIR, f"user_task{req.task_id}_{timestamp}.json"
        )
        with open(out_path, "w") as f:
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

        # Compare
        score = compare_pose_sequences(reference_seq, req.user_pose_sequence)

        # Return score + file reference
        return {
            "score": score,
            "saved_user_pose": out_path,
            "message": "Pose data saved for debugging",
        }

    except Exception as e:
        return {"error": str(e)}
