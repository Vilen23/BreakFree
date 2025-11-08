"""
extract_pose_from_video.py

Dependencies:
    pip install mediapipe opencv-python numpy

Outputs:
    JSON file: list of frames, each frame is a list of landmarks:
    [
      [
        {"name": "nose", "x": 0.512, "y": 0.234, "score": 0.98},
        {"name": "left_eye_inner", "x": ..., "y": ..., "score": ...},
        ...
      ],
      ...
    ]
"""

import cv2
import mediapipe as mp
import json
import numpy as np
from typing import List, Dict, Optional
import os


# MediaPipe landmark names in order (33 landmarks)
MP_LANDMARK_NAMES = [
    "nose",
    "left_eye_inner",
    "left_eye",
    "left_eye_outer",
    "right_eye_inner",
    "right_eye",
    "right_eye_outer",
    "left_ear",
    "right_ear",
    "mouth_left",
    "mouth_right",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_pinky",
    "right_pinky",
    "left_index",
    "right_index",
    "left_thumb",
    "right_thumb",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
    "left_heel",
    "right_heel",
    "left_foot_index",
    "right_foot_index",
]


def smooth_sequence(frames: List[List[Dict]], window: int = 3) -> List[List[Dict]]:
    """Simple moving-average smoothing over frames for x,y coordinates and score.
    frames: list of frames; each frame is a list of landmarks (dicts).
    """
    if window <= 1 or len(frames) == 0:
        return frames

    n_frames = len(frames)
    n_landmarks = len(frames[0])
    # convert to arrays shape (n_frames, n_landmarks, 3)
    arr = np.zeros((n_frames, n_landmarks, 3), dtype=float)
    for i, frame in enumerate(frames):
        for j, lm in enumerate(frame):
            arr[i, j, 0] = lm["x"]
            arr[i, j, 1] = lm["y"]
            arr[i, j, 2] = lm["score"]

    # apply moving average along axis 0
    pad = window // 2
    arr_padded = np.pad(arr, ((pad, pad), (0, 0), (0, 0)), mode="edge")
    smoothed = np.zeros_like(arr)
    for i in range(n_frames):
        smoothed[i] = arr_padded[i : i + window].mean(axis=0)

    # convert back to list-of-dicts
    out = []
    for i in range(n_frames):
        frame = []
        for j in range(n_landmarks):
            frame.append(
                {
                    "name": MP_LANDMARK_NAMES[j],
                    "x": float(smoothed[i, j, 0]),
                    "y": float(smoothed[i, j, 1]),
                    "score": float(smoothed[i, j, 2]),
                }
            )
        out.append(frame)
    return out


def extract_pose_from_video(
    video_path: str,
    out_json_path: str,
    target_fps: Optional[float] = None,
    smoothing_window: int = 1,
    max_frames: Optional[int] = None,
) -> List[List[Dict]]:
    """
    Extract pose landmarks from a video and save as JSON.

    Args:
        video_path: path to local MP4 video
        out_json_path: where to write the JSON pose sequence
        target_fps: if set, sample frames to approximately this fps (else use native fps)
        smoothing_window: integer > 1 to smooth landmark trajectories (optional)
        max_frames: optional cap on number of frames to process (useful for testing)

    Returns:
        List of frames; each frame is a list of landmark dicts {name, x, y, score}
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video not found: {video_path}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Failed to open video: {video_path}")

    native_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    frame_interval = 1
    if target_fps and target_fps > 0:
        frame_interval = max(1, int(round(native_fps / target_fps)))

    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(
        static_image_mode=False,
        min_detection_confidence=0.4,
        min_tracking_confidence=0.4,
    )

    frames_output: List[List[Dict]] = []
    frame_idx = 0
    processed = 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_interval == 0:
                # Convert BGR -> RGB
                image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose.process(image_rgb)

                if results.pose_landmarks:
                    # landmarks are normalized (x,y in [0,1]) already by MediaPipe
                    lm_list = []
                    for i, lm in enumerate(results.pose_landmarks.landmark):
                        # some landmarks can be missing; mediapipe gives visibility/confidence
                        lm_list.append(
                            {
                                "name": (
                                    MP_LANDMARK_NAMES[i]
                                    if i < len(MP_LANDMARK_NAMES)
                                    else f"lm_{i}"
                                ),
                                "x": float(
                                    lm.x
                                ),  # already 0..1 relative to image width
                                "y": float(
                                    lm.y
                                ),  # already 0..1 relative to image height
                                "score": float(
                                    lm.visibility
                                    if hasattr(lm, "visibility")
                                    else lm.presence if hasattr(lm, "presence") else 1.0
                                ),
                            }
                        )
                else:
                    # If no detection, create a frame of zeros (so time-series lengths remain comparable)
                    lm_list = [
                        {"name": MP_LANDMARK_NAMES[i], "x": 0.0, "y": 0.0, "score": 0.0}
                        for i in range(len(MP_LANDMARK_NAMES))
                    ]

                frames_output.append(lm_list)
                processed += 1

                if max_frames and processed >= max_frames:
                    break

            frame_idx += 1

    finally:
        pose.close()
        cap.release()

    # Optional smoothing
    if (
        smoothing_window
        and smoothing_window > 1
        and len(frames_output) >= smoothing_window
    ):
        frames_output = smooth_sequence(frames_output, window=smoothing_window)

    # Write JSON to disk
    with open(out_json_path, "w") as f:
        json.dump(frames_output, f)

    print(
        f"Extracted {len(frames_output)} frames from {video_path} -> {out_json_path} (native_fps={native_fps}, sampled interval={frame_interval})"
    )
    return frames_output


# Example call:
if __name__ == "__main__":
    # Example usage:
    video_file = "reference_videos/veo_demo_task1.mp4"
    out_json = "reference_poses/task_1_pose.json"
    # sample at ~15 fps, smooth with window=5, max 450 frames (30s @15fps)
    frames = extract_pose_from_video(
        video_file, out_json, target_fps=15, smoothing_window=5, max_frames=450
    )
