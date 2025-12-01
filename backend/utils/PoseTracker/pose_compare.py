import numpy as np
from dtw import dtw
from typing import List, Set, Dict, Any, Tuple
import os
import json
import requests


def get_all_visible_points(seq: List[List[dict]], min_score: float = 0.2) -> Set[str]:
    """
    Get all point names that are visible (score > threshold) in a sequence.
    Returns a set of point names.
    """
    points: Set[str] = set()
    for frame in seq:
        for kp in frame:
            if kp.get("score", 0) > min_score:
                points.add(kp.get("name"))
    return points


def get_common_visible_points(
    ref_seq: List[List[dict]], user_seq: List[List[dict]], min_score: float = 0.2
) -> List[str]:
    """
    Find all point names that are visible (score > threshold) in both sequences.
    Returns a sorted list of common point names.
    """
    # Collect all point names that appear with sufficient score in reference sequence
    ref_points = get_all_visible_points(ref_seq, min_score)

    # Collect all point names that appear with sufficient score in user sequence
    user_points = get_all_visible_points(user_seq, min_score)

    # Return intersection - points visible in both sequences
    common_points = sorted(list(ref_points.intersection(user_points)))
    return common_points


def check_point_coverage_threshold(
    ref_seq: List[List[dict]],
    user_seq: List[List[dict]],
    min_coverage: float = 0.5,
    min_score: float = 0.2,
) -> Tuple[bool, float]:
    """
    Check if user sequence has sufficient point coverage compared to reference.
    Returns (is_valid, coverage_ratio) where:
    - is_valid: True if coverage >= min_coverage
    - coverage_ratio: Percentage of reference points present in user sequence (0.0 to 1.0)
    """
    ref_points = get_all_visible_points(ref_seq, min_score)
    user_points = get_all_visible_points(user_seq, min_score)

    if not ref_points:
        print("[PoseCompare] Warning: Reference sequence has no visible points")
        return True, 1.0  # Can't validate if reference has no points

    # Calculate coverage: how many reference points are present in user sequence
    common_points = ref_points.intersection(user_points)
    coverage_ratio = len(common_points) / len(ref_points)

    is_valid = coverage_ratio >= min_coverage

    print(
        f"[PoseCompare] Point coverage: {len(common_points)}/{len(ref_points)} reference points detected "
        f"({coverage_ratio*100:.1f}%), threshold: {min_coverage*100:.1f}%, valid: {is_valid}"
    )

    return is_valid, coverage_ratio


def normalize_keypoints(
    frame: List[dict], point_names: List[str], min_score: float = 0.2
):
    """
    Extract and normalize keypoints for the given point names.
    Only includes points that are visible (score > threshold).
    """
    vector = []
    for name in point_names:
        kp = next(
            (
                p
                for p in frame
                if p.get("name") == name and p.get("score", 0) > min_score
            ),
            None,
        )
        if kp:
            vector.extend([kp["x"], kp["y"]])
        else:
            # Point not visible in this frame - use zero
            vector.extend([0.0, 0.0])
    return np.array(vector, dtype=np.float32)


def normalize_frame(vec):
    vec2 = vec.reshape(-1, 2)
    min_xy = vec2.min(axis=0)
    max_xy = vec2.max(axis=0)
    scale = max((max_xy - min_xy).max(), 1e-6)
    return ((vec2 - min_xy) / scale).flatten()


def sliding_window_dtw(
    ref_seq: List[List[dict]],
    user_seq: List[List[dict]],
    window=60,
    min_point_coverage: float = 0.5,
):
    """
    Compare user_seq to all sliding windows of ref_seq (window ≈ user length).
    Only compares points that are visible in both sequences.
    Returns improved score based on motion similarity.
    """
    if not ref_seq or not user_seq:
        print("[PoseCompare] Empty sequences")
        return 0.0

    # Check point coverage threshold first
    is_valid, coverage_ratio = check_point_coverage_threshold(
        ref_seq, user_seq, min_point_coverage
    )
    if not is_valid:
        # Penalize score significantly if insufficient points detected
        penalty = coverage_ratio * 0.3  # Max score of 0.3 if below threshold
        print(
            f"[PoseCompare] Insufficient point coverage, applying penalty. Max score: {penalty:.3f}"
        )
        return penalty

    # Find common visible points across both sequences
    common_points = get_common_visible_points(ref_seq, user_seq)

    if not common_points:
        print("[PoseCompare] No common points found between sequences")
        return 0.0

    print(
        f"[PoseCompare] Comparing {len(common_points)} common points: {common_points}"
    )

    # Normalize sequences using only common points
    ref_vecs = np.stack(
        [normalize_frame(normalize_keypoints(f, common_points)) for f in ref_seq]
    )
    user_vecs = np.stack(
        [normalize_frame(normalize_keypoints(f, common_points)) for f in user_seq]
    )

    len_ref, len_user = len(ref_vecs), len(user_vecs)
    print(f"[PoseCompare] Reference frames: {len_ref}, User frames: {len_user}")

    if len_ref < len_user:
        print(f"[PoseCompare] Reference sequence shorter than user sequence")
        return 0.0

    # Calculate motion vectors (velocity) for better motion comparison
    ref_motion = np.diff(ref_vecs, axis=0)
    user_motion = np.diff(user_vecs, axis=0)

    # Normalize motion vectors
    if len(ref_motion) > 0:
        ref_motion_norm = ref_motion / (
            np.linalg.norm(ref_motion, axis=1, keepdims=True) + 1e-8
        )
    else:
        ref_motion_norm = ref_motion

    if len(user_motion) > 0:
        user_motion_norm = user_motion / (
            np.linalg.norm(user_motion, axis=1, keepdims=True) + 1e-8
        )
    else:
        user_motion_norm = user_motion

    best_dist = float("inf")
    best_motion_dist = float("inf")
    step = max(1, len_user // 5)

    for start in range(0, len_ref - len_user + 1, step):
        ref_window = ref_vecs[start : start + len_user]

        # Position-based DTW
        alignment = dtw(
            ref_window, user_vecs, dist_method=lambda x, y: np.linalg.norm(x - y)
        )
        dist = getattr(alignment, "distance", alignment)

        # Motion-based comparison (if we have motion vectors)
        if (
            start < len(ref_motion_norm)
            and len(ref_motion_norm) > 0
            and len(user_motion_norm) > 0
        ):
            motion_end = min(start + len_user - 1, len(ref_motion_norm))
            ref_motion_window = ref_motion_norm[start:motion_end]
            user_motion_len = min(len(ref_motion_window), len(user_motion_norm))

            if user_motion_len > 0:
                motion_dist = np.mean(
                    [
                        np.linalg.norm(ref_motion_window[i] - user_motion_norm[i])
                        for i in range(user_motion_len)
                    ]
                )
                if motion_dist < best_motion_dist:
                    best_motion_dist = motion_dist

        if dist < best_dist:
            best_dist = dist

    # Improved scoring: combine position and motion similarity
    # Normalize distance by number of points and frames
    num_points = len(common_points)
    normalized_dist = best_dist / (len_user * num_points * 2 + 1e-8)  # 2 for x,y

    # Position similarity score (0-1)
    position_score = float(np.exp(-normalized_dist * 10))  # Adjusted scaling

    # Motion similarity score (0-1)
    if best_motion_dist < float("inf"):
        motion_score = float(np.exp(-best_motion_dist * 5))
    else:
        motion_score = 0.5  # Neutral if no motion data

    # Combined score (weighted: 60% position, 40% motion)
    base_score = 0.6 * position_score + 0.4 * motion_score

    # Apply coverage-based penalty if coverage is below ideal (but above minimum threshold)
    # This ensures that even if we pass the threshold, we still penalize partial coverage
    # Penalty scales from 0.7 (at 50% coverage) to 0.95 (at 80% coverage) to 1.0 (at 100% coverage)
    if coverage_ratio < 0.8:  # If less than 80% of reference points are detected
        # Linear interpolation: 0.5 -> 0.7, 0.8 -> 0.95
        coverage_penalty = 0.7 + (coverage_ratio - 0.5) * (0.95 - 0.7) / (0.8 - 0.5)
        final_score = base_score * coverage_penalty
        print(
            f"[PoseCompare] Coverage penalty applied: {coverage_penalty:.3f} (coverage: {coverage_ratio:.3f})"
        )
    elif coverage_ratio < 1.0:  # Between 80% and 100%
        # Linear interpolation: 0.8 -> 0.95, 1.0 -> 1.0
        coverage_penalty = 0.95 + (coverage_ratio - 0.8) * (1.0 - 0.95) / (1.0 - 0.8)
        final_score = base_score * coverage_penalty
        print(
            f"[PoseCompare] Coverage penalty applied: {coverage_penalty:.3f} (coverage: {coverage_ratio:.3f})"
        )
    else:
        final_score = base_score

    print(
        f"[PoseCompare] Position score: {position_score:.3f}, Motion score: {motion_score:.3f}, "
        f"Base: {base_score:.3f}, Final: {final_score:.3f}"
    )

    return final_score


def analyze_motion_with_gemini(
    ref_seq: List[List[dict]], user_seq: List[List[dict]], task_id: str
) -> float:
    """
    Use Gemini to analyze motion patterns and provide intelligent scoring.
    Falls back to DTW if Gemini is unavailable.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[PoseCompare] No Gemini API key, using DTW only")
        return None

    try:
        # Prepare summary of motion data for Gemini
        common_points = get_common_visible_points(ref_seq, user_seq)
        if not common_points:
            return None

        # Calculate motion statistics
        ref_motions = []
        user_motions = []

        for i in range(len(ref_seq) - 1):
            if i < len(ref_seq) - 1:
                frame1 = {
                    kp["name"]: (kp["x"], kp["y"])
                    for kp in ref_seq[i]
                    if kp["name"] in common_points
                }
                frame2 = {
                    kp["name"]: (kp["x"], kp["y"])
                    for kp in ref_seq[i + 1]
                    if kp["name"] in common_points
                }
                motion = {
                    name: (
                        frame2.get(name, (0, 0))[0] - frame1.get(name, (0, 0))[0],
                        frame2.get(name, (0, 0))[1] - frame1.get(name, (0, 0))[1],
                    )
                    for name in common_points
                    if name in frame1 and name in frame2
                }
                if motion:
                    ref_motions.append(motion)

        for i in range(len(user_seq) - 1):
            if i < len(user_seq) - 1:
                frame1 = {
                    kp["name"]: (kp["x"], kp["y"])
                    for kp in user_seq[i]
                    if kp["name"] in common_points
                }
                frame2 = {
                    kp["name"]: (kp["x"], kp["y"])
                    for kp in user_seq[i + 1]
                    if kp["name"] in common_points
                }
                motion = {
                    name: (
                        frame2.get(name, (0, 0))[0] - frame1.get(name, (0, 0))[0],
                        frame2.get(name, (0, 0))[1] - frame1.get(name, (0, 0))[1],
                    )
                    for name in common_points
                    if name in frame1 and name in frame2
                }
                if motion:
                    user_motions.append(motion)

        # Create a concise summary for Gemini
        summary = {
            "task_id": task_id,
            "tracked_points": common_points,
            "reference_frames": len(ref_seq),
            "user_frames": len(user_seq),
            "reference_motion_samples": len(ref_motions),
            "user_motion_samples": len(user_motions),
        }

        prompt = f"""You are an expert in analyzing human movement and exercise form. 

I have two pose tracking sequences from an exercise video:
- Reference (correct form): {summary['reference_frames']} frames tracking {len(common_points)} body points: {', '.join(common_points)}
- User (performing exercise): {summary['user_frames']} frames tracking the same points

Analyze the motion patterns and provide a similarity score from 0.0 to 1.0 where:
- 1.0 = Perfect match in movement pattern and timing
- 0.8-0.9 = Very similar, minor differences
- 0.6-0.7 = Generally similar but noticeable differences
- 0.4-0.5 = Some similarity but significant differences
- 0.0-0.3 = Very different or no meaningful similarity

Consider:
1. Movement trajectory similarity (how points move over time)
2. Timing and rhythm of movements
3. Overall motion pattern consistency

Respond ONLY with a JSON object: {{"score": 0.85, "reasoning": "brief explanation"}}
"""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 200},
        }

        resp = requests.post(url, json=payload, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )

        # Parse JSON response
        import re

        json_match = re.search(r"\{[^}]+\}", text)
        if json_match:
            result = json.loads(json_match.group())
            score = float(result.get("score", 0.0))
            reasoning = result.get("reasoning", "")
            print(f"[PoseCompare][Gemini] Score: {score:.3f}, Reasoning: {reasoning}")
            return score
        else:
            # Try to extract number
            score_match = re.search(r'"score":\s*([\d.]+)', text)
            if score_match:
                score = float(score_match.group(1))
                print(f"[PoseCompare][Gemini] Extracted score: {score:.3f}")
                return score

    except Exception as e:
        print(f"[PoseCompare][Gemini] Error: {e}")
        return None

    return None


def compare_pose_sequences(
    ref_seq, user_seq, window=60, task_id: str = "", min_point_coverage: float = 0.5
):
    """
    Compare pose sequences using improved DTW and optionally Gemini.
    Returns a score from 0.0 to 1.0.

    Args:
        ref_seq: Reference pose sequence
        user_seq: User pose sequence
        window: Sliding window size
        task_id: Task identifier
        min_point_coverage: Minimum percentage of reference points that must be detected (0.0 to 1.0)
                           Default 0.5 means at least 50% of reference points must be present
    """
    # Check point coverage threshold first (applies to both DTW and Gemini)
    is_valid, coverage_ratio = check_point_coverage_threshold(
        ref_seq, user_seq, min_point_coverage
    )
    if not is_valid:
        # Return low score if insufficient points detected
        penalty = coverage_ratio * 0.3  # Max score of 0.3 if below threshold
        print(
            f"[PoseCompare] Insufficient point coverage, returning penalty score: {penalty:.3f}"
        )
        return penalty

    # First try Gemini for intelligent analysis
    gemini_score = analyze_motion_with_gemini(ref_seq, user_seq, task_id)

    # Always calculate DTW score as well
    dtw_score = sliding_window_dtw(ref_seq, user_seq, window, min_point_coverage)

    # Use Gemini if available and reasonable, otherwise use DTW
    if gemini_score is not None and gemini_score > 0:
        # Apply coverage penalty to Gemini score as well
        if coverage_ratio < 0.8:
            # Linear interpolation: 0.5 -> 0.7, 0.8 -> 0.95
            coverage_penalty = 0.7 + (coverage_ratio - 0.5) * (0.95 - 0.7) / (0.8 - 0.5)
            gemini_score = gemini_score * coverage_penalty
        elif coverage_ratio < 1.0:
            # Linear interpolation: 0.8 -> 0.95, 1.0 -> 1.0
            coverage_penalty = 0.95 + (coverage_ratio - 0.8) * (1.0 - 0.95) / (
                1.0 - 0.8
            )
            gemini_score = gemini_score * coverage_penalty

        # Combine both scores (70% Gemini, 30% DTW) for robustness
        final_score = 0.7 * gemini_score + 0.3 * dtw_score
        print(
            f"[PoseCompare] Combined score (Gemini {gemini_score:.3f} + DTW {dtw_score:.3f}): {final_score:.3f}"
        )
        return final_score
    else:
        print(f"[PoseCompare] Using DTW score only: {dtw_score:.3f}")
        return dtw_score
