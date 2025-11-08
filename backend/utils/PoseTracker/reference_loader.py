import json
import os
from utils.PoseTracker.extract_pose_from_video import (
    extract_pose_from_video,
)  # import the extractor function

REFERENCE_FOLDER = "reference_poses"
VIDEO_FOLDER = "reference_videos"  # where Veo3 videos are stored


def load_reference_pose(task_id: str):
    """
    Loads the precomputed reference pose for a given task.
    If it doesn't exist, automatically generates it from the corresponding video.
    """
    os.makedirs(REFERENCE_FOLDER, exist_ok=True)
    path = os.path.join(REFERENCE_FOLDER, f"task_{task_id}_pose.json")
    video_path = os.path.join(VIDEO_FOLDER, f"task_{task_id}.mp4")

    # ✅ Case 1 — If JSON already exists, just load it
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)

    # ✅ Case 2 — If missing, check for the source video
    if not os.path.exists(video_path):
        raise FileNotFoundError(
            f"Reference pose and video not found for task {task_id}. Expected: {video_path}"
        )

    print(
        f"[ReferenceLoader] Reference JSON not found. Generating from video: {video_path}"
    )

    # 🧠 Generate pose keypoints from video and store as JSON
    try:
        frames = extract_pose_from_video(
            video_path=video_path,
            out_json_path=path,
            target_fps=15,
            smoothing_window=5,
            max_frames=450,
        )
        print(
            f"[ReferenceLoader] Successfully created reference pose for task {task_id}"
        )
        return frames
    except Exception as e:
        raise RuntimeError(f"Failed to extract pose for task {task_id}: {e}")
