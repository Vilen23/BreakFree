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
        print(onboarding_context,"onboarding_context")
        url = (
            "https://generativelanguage.googleapis.com/v1beta/"
            "models/gemini-2.0-flash:generateContent"
            f"?key={api_key}"
        )
        print(url,"url")
        print(content,"content")
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
        print(payload,"payload")
        headers = {"Content-Type": "application/json"}
        print(headers,"headers")
        resp = requests.post(url, headers=headers, data=json.dumps(payload), timeout=15)
        resp.raise_for_status()
        print(resp,"resp")

        data = resp.json()
        text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text")
        )
        print(text,"text")
        if text:
            return text.strip()
        else:
            return "I'm here with you. Tell me more about how you're feeling."

    except Exception as e:
        print("Gemini API error (journal summarize):", repr(e))
        return "Thank you for sharing. I'm here with you. What feels most present now?"


def generate_daily_tasks(onboarding: Optional[Any] = None) -> List[Dict[str, Any]]:
    """Generate a list of 5 supportive daily tasks. Fallback to defaults if no API key/errors.

    Returns a list of dicts with keys: id, title, description, time, completed.
    """
    api_key = _get_api_key()
    default_tasks = [
        {
            "id": "1",
            "title": "Morning Mindfulness",
            "description": "Take 10 minutes to breathe and set intentions",
            "time": "8:00 AM",
            "completed": False,
        },
        {
            "id": "2",
            "title": "Hydration Check",
            "description": "Drink a glass of water and stretch",
            "time": "10:00 AM",
            "completed": False,
        },
        {
            "id": "3",
            "title": "Write in Journal",
            "description": "Express your thoughts freely",
            "time": "12:00 PM",
            "completed": False,
        },
        {
            "id": "4",
            "title": "Connect with Support",
            "description": "Text a friend or attend a meeting",
            "time": "3:00 PM",
            "completed": False,
        },
        {
            "id": "5",
            "title": "Evening Reflection",
            "description": "Review your day with gratitude",
            "time": "8:00 PM",
            "completed": False,
        },
    ]
    print(api_key, "api_key")
    if not api_key:
        return default_tasks

    try:
        onboarding_context = _compose_onboarding_context(onboarding)
        print(onboarding_context, "onboarding_context")
        url = (
            "https://generativelanguage.googleapis.com/v1beta/"
            "models/gemini-2.0-flash:generateContent"
            f"?key={api_key}"
        )
        print(url, "url")
        prompt = (
            "You are a supportive recovery coach. Create 5 short, practical daily tasks "
            "personalized to the user's context below. Each task must include a title, a "
            "one-line description, and a reasonable time of day.\n\n"
            "CRITICAL OUTPUT RULES:\n"
            "- Respond with ONLY a JSON array (no code fences, no backticks, no commentary).\n"
            "- Exactly 5 items.\n"
            "- Keys per item: id (1..5), title, description, time, completed=false.\n\n"
            "User context (from onboarding):\n"
            f"{onboarding_context}"
        )
        print(prompt, "prompt")
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.6, "maxOutputTokens": 512},
        }
        print(payload, "payload")
        headers = {"Content-Type": "application/json"}
        resp = requests.post(url, headers=headers, data=json.dumps(payload), timeout=15)
        resp.raise_for_status()
        print(resp, "resp")
        data = resp.json()
        print(data, "data")
        raw_text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text")
        )
        print(
            "[Gemini][daily_tasks] raw_text:",
            (
                (raw_text[:200] + "...")
                if isinstance(raw_text, str) and len(raw_text) > 200
                else raw_text
            ),
        )
        if not raw_text:
            return default_tasks

        # Try parse JSON from model's reply; if it included prose, extract JSON substring
        try:
            text = raw_text.strip()
            # strip code fences like ```json ... ``` or ``` ... ``` if present
            if text.startswith("```"):
                first_newline = text.find("\n")
                if first_newline != -1:
                    text = text[first_newline + 1 :]
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()
            parsed = json.loads(text)
        except Exception:
            # naive extraction of first JSON array
            start = raw_text.find("[")
            end = raw_text.rfind("]") + 1
            parsed = (
                json.loads(raw_text[start:end]) if start != -1 and end != -1 else []
            )

        print(
            "[Gemini][daily_tasks] parsed type/len:",
            type(parsed),
            (len(parsed) if isinstance(parsed, list) else None),
        )
        if isinstance(parsed, list) and len(parsed) >= 3:
            # normalize ids as strings
            for i, item in enumerate(parsed, start=1):
                if "id" not in item:
                    item["id"] = str(i)
                else:
                    item["id"] = str(item["id"])
                item.setdefault("completed", False)
                item.setdefault("time", "8:00 AM")
            print(
                "[Gemini][daily_tasks] using parsed tasks titles:",
                [t.get("title") for t in parsed[:5]],
            )
            return parsed[:5]
        print("[Gemini][daily_tasks] falling back to defaults")
        return default_tasks
    except Exception as e:
        print("Gemini daily tasks error:", repr(e))
        return default_tasks
