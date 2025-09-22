import os
from typing import Optional


def _get_api_key() -> Optional[str]:
    return os.getenv("GEMINI_API_KEY")


def summarize_journal_to_supportive_reply(content: str) -> str:
    """Call Gemini to produce a short, supportive reflection. Fallback to stub."""
    api_key = _get_api_key()
    if not api_key:
        return "Thank you for sharing. I'm here with you. What feels most present now?"

    try:
        import requests

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            "gemini-1.5-flash:generateContent?key=" + api_key
        )
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": (
                                "You are a gentle, supportive mental well-being companion. "
                                "Given the user's journal text below, respond briefly (2-4 sentences) "
                                "with empathy, validation, and one gentle reflective prompt.\n\n"
                                f"Journal: {content}"
                            )
                        }
                    ]
                }
            ]
        }
        resp = requests.post(url, json=payload, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [{}])
            if parts and parts[0].get("text"):
                return parts[0]["text"].strip()
    except Exception:
        pass

    return "Thank you for sharing. I'm here with you. What feels most present now?"
