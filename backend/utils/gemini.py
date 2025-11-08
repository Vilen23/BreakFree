import os
import json
import requests
from typing import Optional, Any, Dict, List


def _get_api_key() -> Optional[str]:
    return os.getenv("GEMINI_API_KEY")


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


def generate_daily_tasks(onboarding: Optional[Any] = None) -> List[Dict[str, Any]]:
    """
    Generate 5 daily movement or mindfulness tasks, optionally with Veo3-generated videos.
    """

    api_key = _get_api_key()
    default_tasks = [...]  # keep your old defaults

    if not api_key:
        return default_tasks

    try:
        onboarding_context = _compose_onboarding_context(onboarding)
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"

        # 🧠 Modified prompt for exercise-type tasks:
        prompt = f"""
        You are a supportive wellness coach. Create 5 short, light exercise or mindfulness activities
        for the user's context below.

        Each task should have:
        - id (1..5)
        - title
        - description (briefly describe the action)
        - time (morning/afternoon/evening)
        - exercise_type (e.g. 'stretch', 'yoga', 'breathing', 'movement')
        - difficulty ('easy', 'medium', 'hard')
        - completed = false

        Respond with ONLY a JSON array. 
        User context:
        {onboarding_context}
        """

        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 512},
        }
        headers = {"Content-Type": "application/json"}
        resp = requests.post(url, headers=headers, data=json.dumps(payload), timeout=15)
        resp.raise_for_status()
        data = resp.json()
        raw_text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text")
        )

        # parse JSON output (reuse your old parsing code)
        parsed = _safe_json_parse(raw_text)  # You can reuse your extraction logic
        if not isinstance(parsed, list) or len(parsed) < 3:
            return default_tasks

        # Now enrich with Veo3 videos
        tasks = []
        for item in parsed[:5]:
            item["id"] = str(item.get("id", len(tasks) + 1))
            item.setdefault("completed", False)
            item.setdefault("time", "8:00 AM")
            title = item["title"]

            # 🪄 Generate video with Veo3 (or cached)
            try:
                video_prompt = (
                    f"Generate a 15-second 1080p video of a fitness instructor demonstrating: {title}. "
                    "Make the background bright and clean, focus on body movements clearly."
                )
                video_url = generate_veo3_video(video_prompt)
                item["video_url"] = video_url
            except Exception as e:
                print(f"Veo3 generation failed for {title}: {e}")
                item["video_url"] = None

            tasks.append(item)

        return tasks

    except Exception as e:
        print("Gemini daily tasks error:", repr(e))
        return default_tasks


def generate_veo3_video(prompt: str) -> str:
    """
    Send text prompt to Veo3 or compatible API and return a downloadable video URL.
    """
    veo_key = os.getenv("VEO_API_KEY")
    if not veo_key:
        raise ValueError("Missing Veo API key")

    url = "https://api.google.com/veo/v1beta/generate"  # adjust if different
    payload = {"prompt": prompt, "duration": 15, "resolution": "1080p"}
    headers = {"Authorization": f"Bearer {veo_key}", "Content-Type": "application/json"}

    resp = requests.post(url, headers=headers, data=json.dumps(payload), timeout=60)
    resp.raise_for_status()
    data = resp.json()
    # Assuming it returns something like {'video_url': 'https://...'}
    return data.get("video_url")
