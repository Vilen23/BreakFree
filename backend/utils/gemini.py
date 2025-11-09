import os
import json
import requests
import random
from utils import firebase_utils 
from utils.PoseTracker.extract_pose_from_video import extract_pose_from_video
from typing import Optional, Any, Dict, List


def _get_api_key() -> Optional[str]:
    return os.getenv("GEMINI_API_KEY")


def _compose_onboarding_context(onboarding: Optional[Any]) -> str:
    if not onboarding:
        return ""
    try:
        addiction = getattr(onboarding, "addiction", None) or onboarding.get(
            "addiction"
        )
        answers = getattr(onboarding, "answers", None) or onboarding.get("answers", [])
        context = f"User recovering from {addiction}. Answers summary: {answers[:3]}"
        return context
    except Exception:
        return ""


def _format_onboarding_summary(answers: Any) -> str:
    # Compactly summarize arbitrary onboarding answers structure
    try:
        if isinstance(answers, dict):
            items = []
            for k, v in list(answers.items())[:6]:
                items.append(f"{k}: {v}")
            return "; ".join(items)
        if isinstance(answers, list):
            parts = []
            for item in answers[:6]:
                if isinstance(item, dict):
                    q = (
                        item.get("question_text")
                        or item.get("question_id")
                        or "question"
                    )
                    a = item.get("answer")
                    parts.append(f"{q}: {a}")
                else:
                    parts.append(str(item))
            return "; ".join(parts)
        return str(answers)[:300]
    except Exception:
        return ""


def _safe_json_parse(text: Optional[str]) -> Optional[Any]:
    """Safely parse JSON from text, handling markdown code blocks and errors."""
    if not text:
        return None

    try:
        # Remove markdown code blocks if present
        text = text.strip()
        if text.startswith("```"):
            # Remove opening ```json or ```
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            # Remove closing ```
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines)

        # Try to parse JSON
        return json.loads(text)
    except (json.JSONDecodeError, ValueError, AttributeError) as e:
        print(f"JSON parse error: {e}")
        return None


def _compose_onboarding_context(onboarding: Optional[Any]) -> str:
    if onboarding is None:
        return ""
    try:
        # If a preformatted string was passed
        if isinstance(onboarding, str):
            return onboarding
        # If a mapping/dict-like object was passed
        if isinstance(onboarding, dict):
            addiction = onboarding.get("addiction") or onboarding.get("primary_issue")
            answers = onboarding.get("answers")
        else:
            # Fallback for simple objects with attributes (e.g., FirestoreOnboarding)
            addiction = getattr(onboarding, "addiction", None)
            answers = getattr(onboarding, "answers", None)
        summary = _format_onboarding_summary(answers)
        if addiction or summary:
            return (
                f"User context — primary issue: {addiction}. "
                f"Relevant details: {summary}.\n\n"
            )
        return ""
    except Exception:
        return ""


def summarize_journal_to_supportive_reply(
    content: str, onboarding: Optional[Any] = None
) -> str:
    """Call Gemini 2.0 Flash to produce a short, supportive reflection. Fallback to stub."""
    api_key = _get_api_key()
    if not api_key:
        return "Thank you for sharing. I'm here with you. What feels most present now?"

    try:
        onboarding_context = _compose_onboarding_context(onboarding)
        print(onboarding_context, "onboarding_context")
        url = (
            "https://generativelanguage.googleapis.com/v1beta/"
            "models/gemini-2.0-flash:generateContent"
            f"?key={api_key}"
        )
        print(url, "url")
        print(content, "content")
        prompt = (
            "You are a gentle, supportive mental well-being companion. "
            "Your ONLY goal is to help the user explore emotions, needs, coping strategies, and motivation. "
            "Always personalize your response using the user's context below. Explicitly acknowledge their primary issue. "
            "If the input is a factual/technical question (e.g., math, coding, trivia) or unrelated to feelings, "
            "do NOT answer it directly—briefly empathize and redirect back to their inner experience "
            "(e.g., sensations, emotions, needs, values). Avoid medical, legal, crisis, or diagnostic claims. "
            "Keep responses brief (2–4 sentences), validating, concrete, and end with one soft reflective prompt.\n\n"
            "User context (from onboarding):\n"
            f"{onboarding_context}"
            "\nInput:\n"
            f"Journal: {content}"
        )

        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.6, "maxOutputTokens": 180},
        }
        print(payload, "payload")
        headers = {"Content-Type": "application/json"}
        print(headers, "headers")
        resp = requests.post(url, headers=headers, data=json.dumps(payload), timeout=15)
        resp.raise_for_status()
        print(resp, "resp")

        data = resp.json()
        text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text")
        )
        print(text, "text")
        if text:
            return text.strip()
        else:
            return "I'm here with you. Tell me more about how you're feeling."

    except Exception as e:
        print("Gemini API error (journal summarize):", repr(e))
        return "Thank you for sharing. I'm here with you. What feels most present now?"


# def generate_daily_tasks(onboarding: Optional[Any] = None) -> List[Dict[str, Any]]:
#     """
#     Generate 5 daily movement or mindfulness tasks, optionally with Veo3-generated videos.
#     """

#     api_key = _get_api_key()
#     default_tasks = [...]  # keep your old defaults

#     if not api_key:
#         return default_tasks

#     try:
#         onboarding_context = _compose_onboarding_context(onboarding)
#         url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"

#         # 🧠 Modified prompt for exercise-type tasks:
#         prompt = f"""
#         You are a supportive wellness coach. Create 5 short, light exercise or mindfulness activities
#         for the user's context below.

#         Each task should have:
#         - id (1..5)
#         - title
#         - description (briefly describe the action)
#         - time (morning/afternoon/evening)
#         - exercise_type (e.g. 'stretch', 'yoga', 'breathing', 'movement')
#         - difficulty ('easy', 'medium', 'hard')
#         - completed = false

#         Respond with ONLY a JSON array.
#         User context:
#         {onboarding_context}
#         """

#         payload = {
#             "contents": [{"role": "user", "parts": [{"text": prompt}]}],
#             "generationConfig": {"temperature": 0.7, "maxOutputTokens": 512},
#         }
#         headers = {"Content-Type": "application/json"}
#         resp = requests.post(url, headers=headers, data=json.dumps(payload), timeout=15)
#         resp.raise_for_status()
#         data = resp.json()
#         raw_text = (
#             data.get("candidates", [{}])[0]
#             .get("content", {})
#             .get("parts", [{}])[0]
#             .get("text")
#         )

#         # parse JSON output (reuse your old parsing code)
#         parsed = _safe_json_parse(raw_text)  # You can reuse your extraction logic
#         if not isinstance(parsed, list) or len(parsed) < 3:
#             return default_tasks

#         # Now enrich with Veo3 videos
#         tasks = []
#         for item in parsed[:5]:
#             item["id"] = str(item.get("id", len(tasks) + 1))
#             item.setdefault("completed", False)
#             item.setdefault("time", "8:00 AM")
#             title = item["title"]

#             # 🪄 Generate video with Veo3 (or cached)
#             try:
#                 video_prompt = (
#                     f"Generate a 15-second 1080p video of a fitness instructor demonstrating: {title}. "
#                     "Make the background bright and clean, focus on body movements clearly."
#                 )
#                 video_url = generate_veo3_video(video_prompt)
#                 item["video_url"] = video_url
#             except Exception as e:
#                 print(f"Veo3 generation failed for {title}: {e}")
#                 item["video_url"] = None

#             tasks.append(item)

#         return tasks

#     except Exception as e:
#         print("Gemini daily tasks error:", repr(e))
#         return default_tasks


def generate_daily_tasks(onboarding: Optional[Any] = None) -> List[Dict[str, Any]]:
    """Generate 5 daily wellness tasks (1–2 easy 8s exercise demos)."""

    api_key = _get_api_key()
    if not api_key:
        print("[Gemini] Missing API key, returning defaults.")
        return _default_tasks()

    onboarding_context = _compose_onboarding_context(onboarding)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"

    # 🧠 Gemini prompt — short, easy, repetitive tasks
    prompt = f"""
    You are a wellness coach designing daily recovery routines.

    Create 5 very short, light, supportive tasks for the user below.
    Some (1–2 max) should be *simple physical exercises* (stretching, breathing, hand movement, shoulder rolls, etc.)
    that can be demonstrated within 8 seconds — no equipment, no floor work, suitable for sitting or standing.
    Exercises should be easy and repetitive, not strenuous.

    Each task must include:
    - id (1..5)
    - title
    - description (1–2 short sentences)
    - time (morning/afternoon/evening)
    - type: "mind", "social", or "exercise"
    - difficulty: "easy" or "medium"
    - completed = false

    Return ONLY a JSON array of exactly 5 tasks.

    User context:
    {onboarding_context}
    """

    try:
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.6, "maxOutputTokens": 600},
        }
        headers = {"Content-Type": "application/json"}
        resp = requests.post(url, headers=headers, data=json.dumps(payload), timeout=20)
        resp.raise_for_status()
        raw_text = (
            resp.json()
            .get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text")
        )

        parsed = _safe_json_parse(raw_text)
        if not isinstance(parsed, list):
            print("[Gemini] Failed to parse task JSON.")
            return _default_tasks()

        tasks = []
        for item in parsed[:5]:
            item["id"] = str(item.get("id", len(tasks) + 1))
            item.setdefault("completed", False)
            item.setdefault("time", "morning")

            # 🔹 40% chance to turn into an exercise (if not already)
            if item.get("type") == "exercise" or random.random() < 0.4:
                try:
                    print(f"🎥 Generating Veo3 demo for: {item['title']}")
                    enriched = _generate_exercise_with_video(item["title"])
                    item.update(enriched)
                except Exception as e:
                    print(f"[ExerciseGen] Failed for {item['title']}: {e}")
                    item["video_url"] = None
                    item["pose_json_url"] = None
                    item["steps"] = []

            tasks.append(item)

        return tasks

    except Exception as e:
        print("[Gemini][daily_tasks] Error:", repr(e))
        return _default_tasks()



def _generate_exercise_with_video(title: str) -> Dict[str, Any]:
    """Use Gemini + Veo3 to create a short exercise video + pose reference."""

    gemini_key = _get_api_key()
    g_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_key}"

    g_prompt = f"""
    Convert this into a short, simple exercise routine that lasts around 6–8 seconds.

    The exercise should:
    - be easy and safe for all users,
    - require no equipment,
    - involve small, clear, repetitive movements (neck rolls, shoulder shrugs, wrist rotations, slow breathing),
    - be done while standing or sitting upright.

    Return JSON with:
    {{
      "title": "...",
      "one_liner": "...",
      "steps": ["...", "...", "..."],
      "duration_seconds": 8
    }}

    Activity: "{title}"
    """

    try:
        g_payload = {
            "contents": [{"role": "user", "parts": [{"text": g_prompt}]}],
            "generationConfig": {"temperature": 0.5, "maxOutputTokens": 250},
        }
        g_resp = requests.post(g_url, headers={"Content-Type": "application/json"}, data=json.dumps(g_payload))
        g_data = g_resp.json()
        raw_text = (
            g_data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text")
        )
        spec = _safe_json_parse(raw_text) or {}

        veo_prompt = (
            f"Generate an 8-second, 720p video of a calm fitness instructor demonstrating: "
            f"{spec.get('title', title)}. "
            f"Steps: {', '.join(spec.get('steps', []))}. "
            "Keep background simple and focus on upper-body movement. "
            "The motion should be repetitive and clearly visible."
        )

        # 🔹 Generate video using Veo3
        video_url = _generate_veo3_video(veo_prompt)

        # 🔹 Extract pose keypoints and upload
        pose_json = extract_pose_from_video(video_url)
        pose_path = firebase_utils.upload_json(pose_json, f"poses/{title.replace(' ', '_')}.json")

        # 🔹 Upload video to Firebase
        video_path = firebase_utils.upload_file_from_url(video_url, f"videos/{title.replace(' ', '_')}.mp4")

        return {
            "type": "exercise",
            "video_url": video_path,
            "pose_json_url": pose_path,
            "steps": spec.get("steps", []),
            "one_liner": spec.get("one_liner", "A short, relaxing exercise."),
            "duration_seconds": spec.get("duration_seconds", 8),
        }

    except Exception as e:
        print(f"[ExerciseGen] Error for {title}: {e}")
        return {
            "type": "exercise",
            "video_url": None,
            "pose_json_url": None,
            "steps": [],
            "one_liner": "Short 8s exercise demo.",
            "duration_seconds": 8,
        }



def _generate_veo3_video(prompt: str) -> str:
    veo_key = os.getenv("VEO_API_KEY")
    if not veo_key:
        raise ValueError("Missing Veo API key")

    url = "https://api.google.com/veo/v1beta/generate"
    payload = {"prompt": prompt, "duration": 10, "resolution": "720p"}
    headers = {"Authorization": f"Bearer {veo_key}", "Content-Type": "application/json"}

    print(f"[Veo3] Generating video for prompt: {prompt}")
    resp = requests.post(url, headers=headers, data=json.dumps(payload), timeout=60)
    resp.raise_for_status()
    data = resp.json()

    return data.get("video_url") or ""


def _default_tasks() -> List[Dict[str, Any]]:
    return [
        {
            "id": "1",
            "title": "Morning Stretch",
            "description": "5 minutes of deep breathing and stretching",
            "time": "8:00 AM",
            "completed": False,
            "type": "exercise",
        },
        {
            "id": "2",
            "title": "Hydration",
            "description": "Drink a glass of water",
            "time": "10:00 AM",
            "completed": False,
        },
        {
            "id": "3",
            "title": "Journaling",
            "description": "Reflect for 5 minutes",
            "time": "2:00 PM",
            "completed": False,
        },
    ]


def _safe_json_parse(text: Optional[str]) -> Optional[Any]:
    if not text:
        return None
    try:
        text = text.strip().strip("`")
        return json.loads(text)
    except Exception:
        # fallback: extract first [ ... ]
        start, end = text.find("["), text.rfind("]")
        return json.loads(text[start : end + 1]) if start != -1 and end != -1 else None
