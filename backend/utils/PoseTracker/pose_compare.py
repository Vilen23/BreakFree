import numpy as np
from dtw import dtw

UPPER_BODY_JOINTS = [
    "nose",
    "left_eye",
    "right_eye",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
]


def normalize_keypoints(frame):
    vector = []
    for name in UPPER_BODY_JOINTS:
        kp = next(
            (p for p in frame if p.get("name") == name and p.get("score", 0) > 0.2),
            None,
        )
        if kp:
            vector.extend([kp["x"], kp["y"]])
        else:
            vector.extend([0.0, 0.0])
    return np.array(vector, dtype=np.float32)


def normalize_frame(vec):
    vec2 = vec.reshape(-1, 2)
    min_xy = vec2.min(axis=0)
    max_xy = vec2.max(axis=0)
    scale = max((max_xy - min_xy).max(), 1e-6)
    return ((vec2 - min_xy) / scale).flatten()


def sliding_window_dtw(ref_seq, user_seq, window=60):
    """Compare user_seq to all sliding windows of ref_seq (window ≈ user length)"""
    if not ref_seq or not user_seq:
        return 0.0
    ref_vecs = np.stack([normalize_frame(normalize_keypoints(f)) for f in ref_seq])
    user_vecs = np.stack([normalize_frame(normalize_keypoints(f)) for f in user_seq])

    len_ref, len_user = len(ref_vecs), len(user_vecs)
    if len_ref < len_user:
        return 0.0

    best_dist = float("inf")
    step = max(1, len_user // 5)
    for start in range(0, len_ref - len_user + 1, step):
        ref_window = ref_vecs[start : start + len_user]
        alignment = dtw(
            ref_window, user_vecs, dist_method=lambda x, y: np.linalg.norm(x - y)
        )
        dist = getattr(alignment, "distance", alignment)
        if dist < best_dist:
            best_dist = dist

    score = float(np.exp(-best_dist / (len_user + 1e-8)))
    return score


def compare_pose_sequences(ref_seq, user_seq, window=60):
    """Compare pose sequences using sliding window DTW"""
    return sliding_window_dtw(ref_seq, user_seq, window)
