import json
import os
from utils.PoseTracker.extract_pose_from_video import (
    extract_pose_from_video,
)  # import the extractor function

REFERENCE_FOLDER = "reference_poses"
VIDEO_FOLDER = "reference_videos"  # where Veo3 videos are stored


def load_reference_pose(exercise_id: str, video_url: str = None):
    """
    Loads the precomputed reference pose for a given exercise ID.
    If it doesn't exist, automatically generates it from the corresponding video.
    Uses exercise_id to match with exercises.json and find the correct video.
    Can also accept video_url directly to use hosted video URLs.
    """
    import json

    os.makedirs(REFERENCE_FOLDER, exist_ok=True)

    # Try to find the exercise in exercises.json to get the video URL/filename
    exercises_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "exercises.json"
    )
    video_filename = None
    videolink = video_url  # Use provided URL if available

    if os.path.exists(exercises_path):
        try:
            with open(exercises_path, "r") as f:
                exercises_data = json.load(f)

            for exercise in exercises_data.get("exercises", []):
                if str(exercise.get("id")) == str(exercise_id):
                    if not videolink:
                        videolink = exercise.get("videolink", "")
                    if videolink:
                        # Extract filename from URL (e.g., "DeepLung.mp4" from full URL)
                        video_filename = videolink.split("/")[-1]
                        break
        except Exception as e:
            print(f"[ReferenceLoader] Error reading exercises.json: {e}")

    # Use exercise_id-based naming, or video filename if available
    if video_filename:
        # Remove .mp4 extension for pose file
        base_name = video_filename.replace(".mp4", "")
        path = os.path.join(
            REFERENCE_FOLDER, f"exercise_{exercise_id}_{base_name}_pose.json"
        )
        video_path = os.path.join(VIDEO_FOLDER, video_filename)
    else:
        # Fallback to exercise_id-based naming
        path = os.path.join(REFERENCE_FOLDER, f"exercise_{exercise_id}_pose.json")
        video_path = os.path.join(VIDEO_FOLDER, f"exercise_{exercise_id}.mp4")

    # ✅ Case 1 — Try multiple naming patterns to find existing pose file
    possible_paths = [
        path,  # Primary: exercise_{id}_{name}_pose.json or exercise_{id}_pose.json
        os.path.join(
            REFERENCE_FOLDER, f"task_{exercise_id}_pose.json"
        ),  # Legacy: task_{id}_pose.json
        os.path.join(
            REFERENCE_FOLDER, f"exercise_{exercise_id}_pose.json"
        ),  # Alternative
    ]

    if video_filename:
        base_name = video_filename.replace(".mp4", "")
        possible_paths.insert(
            0, os.path.join(REFERENCE_FOLDER, f"{base_name}_pose.json")
        )  # Try video name directly

    for possible_path in possible_paths:
        if os.path.exists(possible_path):
            print(f"[ReferenceLoader] Found existing pose file: {possible_path}")
            with open(possible_path, "r") as f:
                return json.load(f)

    # ✅ Case 2 — Try multiple video paths
    possible_video_paths = []

    # Add paths in order of preference
    if video_filename:
        possible_video_paths.append(
            os.path.join(VIDEO_FOLDER, video_filename)
        )  # Try video name directly
        possible_video_paths.append(video_path)  # Primary path with video_filename

    # Add fallback paths
    possible_video_paths.append(
        os.path.join(VIDEO_FOLDER, f"task_{exercise_id}.mp4")
    )  # Legacy: task_{id}.mp4
    possible_video_paths.append(
        os.path.join(VIDEO_FOLDER, f"exercise_{exercise_id}.mp4")
    )  # Alternative

    # If video_path wasn't added yet (no video_filename), add it
    if video_path not in possible_video_paths:
        possible_video_paths.insert(0, video_path)

    found_video_path = None
    for possible_video in possible_video_paths:
        if possible_video and os.path.exists(possible_video):
            found_video_path = possible_video
            print(f"[ReferenceLoader] Found video file: {found_video_path}")
            break
        elif possible_video:
            print(f"[ReferenceLoader] Video not found at: {possible_video}")

    # If no local file found but we have a video URL, use the URL directly
    if not found_video_path and videolink and videolink.startswith("http"):
        found_video_path = videolink
        print(f"[ReferenceLoader] Using video URL directly: {found_video_path}")

    if not found_video_path:
        # List available video files for debugging
        available_videos = []
        if os.path.exists(VIDEO_FOLDER):
            available_videos = [
                f for f in os.listdir(VIDEO_FOLDER) if f.endswith(".mp4")
            ]

        # If video not found locally, provide helpful error message
        if video_filename and exercises_path and os.path.exists(exercises_path):
            try:
                with open(exercises_path, "r") as f:
                    exercises_data = json.load(f)

                for exercise in exercises_data.get("exercises", []):
                    if str(exercise.get("id")) == str(exercise_id):
                        videolink = exercise.get("videolink", "")
                        if videolink and videolink.startswith("http"):
                            expected_path = (
                                os.path.join(VIDEO_FOLDER, video_filename)
                                if video_filename
                                else os.path.join(
                                    VIDEO_FOLDER, f"exercise_{exercise_id}.mp4"
                                )
                            )
                            error_msg = (
                                f"Reference video not found for exercise {exercise_id} ({exercise.get('name', 'unknown')}).\n"
                                f"Expected video file: {video_filename}\n"
                                f"Expected path: {expected_path}\n"
                                f"Video URL: {videolink}\n"
                                f"Available videos in {VIDEO_FOLDER}: {', '.join(available_videos) if available_videos else 'none'}\n"
                                f"Please download the video from the URL and save it as: {expected_path}"
                            )
                            print(f"[ReferenceLoader] {error_msg}")
                            raise FileNotFoundError(error_msg)
            except FileNotFoundError:
                raise
            except Exception as e:
                print(f"[ReferenceLoader] Error reading exercises.json: {e}")

        # Build error message with all tried paths
        tried_paths = ", ".join([p for p in possible_video_paths if p])
        error_msg = (
            f"Reference pose and video not found for exercise {exercise_id}.\n"
            f"Tried paths: {tried_paths}\n"
            f"Available videos in {VIDEO_FOLDER}: {', '.join(available_videos) if available_videos else 'none'}"
        )
        raise FileNotFoundError(error_msg)

    print(
        f"[ReferenceLoader] Reference JSON not found. Generating from video: {found_video_path}"
    )

    # 🧠 Generate pose keypoints from video and store as JSON
    try:
        frames = extract_pose_from_video(
            video_path=found_video_path,
            out_json_path=path,
            target_fps=15,
            smoothing_window=5,
            max_frames=450,
        )
        print(
            f"[ReferenceLoader] Successfully created reference pose for exercise {exercise_id}"
        )
        return frames
    except Exception as e:
        raise RuntimeError(f"Failed to extract pose for exercise {exercise_id}: {e}")
