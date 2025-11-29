import os
import json
import requests
import random
from pathlib import Path
from utils import firebase_utils
from utils.PoseTracker.extract_pose_from_video import extract_pose_from_video
from typing import Optional, Any, Dict, List


def _get_api_key() -> Optional[str]:
    return os.getenv("GEMINI_API_KEY")


def _load_exercises() -> List[Dict[str, Any]]:
    """Load exercises from exercises.json file."""
    try:
        # Get the path to exercises.json relative to this file
        current_dir = Path(__file__).parent.parent
        exercises_path = current_dir / "exercises.json"

        if not exercises_path.exists():
            print(f"[Exercises] exercises.json not found at {exercises_path}")
            return []

        with open(exercises_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            exercises = data.get("exercises", [])
            print(f"[Exercises] Loaded {len(exercises)} exercises from exercises.json")
            return exercises
    except Exception as e:
        print(f"[Exercises] Error loading exercises.json: {e}")
        return []


def _get_user_addiction(onboarding: Optional[Any]) -> Optional[str]:
    """Extract addiction type from onboarding data."""
    if not onboarding:
        return None

    try:
        if isinstance(onboarding, dict):
            addiction = onboarding.get("addiction") or onboarding.get("primary_issue")
        else:
            addiction = getattr(onboarding, "addiction", None)

        if addiction:
            # Normalize addiction string to match JSON format
            addiction_lower = str(addiction).lower().strip()
            # Map common variations
            mapping = {
                "smoking": "smoking",
                "cigarettes": "smoking",
                "tobacco": "smoking",
                "alcohol": "alcohol",
                "drinking": "alcohol",
                "social media": "social_media",
                "socialmedia": "social_media",
                "phone": "phone",
                "smartphone": "phone",
                "stress": "stress",
                "anxiety": "anxiety",
            }
            return mapping.get(addiction_lower, addiction_lower)
        return None
    except Exception:
        return None


def _filter_exercises_by_addiction(
    exercises: List[Dict[str, Any]], addiction: Optional[str]
) -> List[Dict[str, Any]]:
    """Filter exercises that match the user's addiction or are applicable to all."""
    if not addiction:
        # If no addiction specified, return exercises tagged with "all"
        return [ex for ex in exercises if "all" in ex.get("addictions", [])]

    addiction_normalized = addiction.lower().strip()
    filtered = []

    for exercise in exercises:
        addictions = exercise.get("addictions", [])
        # Include if addiction matches or exercise is for "all"
        if (
            addiction_normalized in [a.lower() for a in addictions]
            or "all" in addictions
        ):
            filtered.append(exercise)

    print(f"[Exercises] Filtered {len(filtered)} exercises for addiction: {addiction}")
    return filtered


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


def generate_daily_tasks(
    onboarding: Optional[Any] = None,
    recently_used_exercises: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """Generate 5 daily wellness tasks: 2 physical exercises + 3 normal tasks.

    Args:
        onboarding: User onboarding data
        recently_used_exercises: List of exercise titles used in the last 2 days (to avoid repetition)
    """

    api_key = _get_api_key()
    if not api_key:
        print("[Gemini] Missing API key, returning defaults.")
        return _default_tasks()

    onboarding_context = _compose_onboarding_context(onboarding)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"

    try:
        # 🏋️ Load and filter exercises from exercises.json
        all_exercises = _load_exercises()
        user_addiction = _get_user_addiction(onboarding)
        filtered_exercises = _filter_exercises_by_addiction(
            all_exercises, user_addiction
        )

        # Filter out exercises used in the last 2 days
        if recently_used_exercises:
            recently_used_set = {ex.lower().strip() for ex in recently_used_exercises}
            original_count = len(filtered_exercises)
            filtered_exercises = [
                ex
                for ex in filtered_exercises
                if ex.get("name", "").lower().strip() not in recently_used_set
            ]
            print(
                f"[Exercises] Filtered out {len(recently_used_exercises)} recently used exercises. {len(filtered_exercises)} exercises remaining (from {original_count})."
            )

            # If we filtered out too many and have less than 2 exercises, use all exercises as fallback
            if len(filtered_exercises) < 2:
                print(
                    "[Exercises] Warning: Too few exercises after filtering. Using all available exercises."
                )
                filtered_exercises = _filter_exercises_by_addiction(
                    all_exercises, user_addiction
                )

        # If no filtered exercises, use exercises tagged with "all" as fallback
        if not filtered_exercises:
            print(
                "[Exercises] No exercises matched addiction, using exercises for 'all'"
            )
            filtered_exercises = [
                ex for ex in all_exercises if "all" in ex.get("addictions", [])
            ]
            if not filtered_exercises:
                filtered_exercises = all_exercises[:10]  # Use first 10 as fallback

        # 🏋️ Call 1: Have Gemini select 2 exercises from the filtered list
        exercises_list_text = "\n".join(
            [
                f"{i+1}. {ex['name']} - {ex.get('exercise_type', 'stretch')} (for: {', '.join(ex.get('addictions', []))})\n   Steps: {' | '.join([s.get('description', '') for s in ex.get('steps', [])[:2]])}"
                for i, ex in enumerate(
                    filtered_exercises[:15]
                )  # Limit to 15 for prompt size
            ]
        )

        exercise_prompt = f"""
        You are a wellness coach designing daily recovery routines.

        Select 2 physical exercises from the list below that would be most helpful for this user.
        Consider the user's addiction and current needs when selecting.

        Available exercises:
        {exercises_list_text}

        Return ONLY a JSON array with exactly 2 objects, each containing:
        - "exercise_id": the number from the list above (1-{min(15, len(filtered_exercises))})
        - "time": "morning" or "afternoon" or "evening"

        User context:
        {onboarding_context}
        """

        exercise_payload = {
            "contents": [{"role": "user", "parts": [{"text": exercise_prompt}]}],
            "generationConfig": {"temperature": 0.6, "maxOutputTokens": 200},
        }
        exercise_resp = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            data=json.dumps(exercise_payload),
            timeout=20,
        )
        exercise_resp.raise_for_status()
        exercise_raw_text = (
            exercise_resp.json()
            .get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text")
        )

        selected_exercises_data = _safe_json_parse(exercise_raw_text)

        # Build exercise_tasks from selected exercises using their predefined steps
        exercise_tasks = []
        if (
            isinstance(selected_exercises_data, list)
            and len(selected_exercises_data) >= 2
        ):
            for selection in selected_exercises_data[:2]:
                exercise_id = selection.get("exercise_id") or selection.get("id")
                if exercise_id and 1 <= exercise_id <= len(filtered_exercises):
                    # Get the exercise from filtered list (exercise_id is 1-indexed)
                    selected_ex = filtered_exercises[exercise_id - 1]

                    # Format steps as array of strings from the JSON file
                    steps = [
                        step.get("description", "")
                        for step in selected_ex.get("steps", [])
                    ]

                    # Create a longer description with all steps
                    description = selected_ex.get("name", "")
                    if steps:
                        description += f". {'. '.join(steps)}"
                    else:
                        description += " - A physical exercise to help with recovery."

                    exercise_tasks.append(
                        {
                            "id": str(len(exercise_tasks) + 1),
                            "title": selected_ex.get("name", ""),
                            "description": description,
                            "time": selection.get("time", "morning"),
                            "exercise_type": "physical",
                            "difficulty": selected_ex.get("difficulty", "easy"),
                            "completed": False,
                            "steps": steps,  # Include all 3 steps from JSON
                            "exercise_type_detail": selected_ex.get(
                                "exercise_type", "stretch"
                            ),
                        }
                    )

        # Fallback if Gemini selection failed - randomly select from filtered exercises
        if len(exercise_tasks) < 2:
            print(
                "[Gemini] Failed to parse exercise selections, using random selection from filtered exercises."
            )
            random_selected = random.sample(
                filtered_exercises, min(2, len(filtered_exercises))
            )
            exercise_tasks = []
            for ex in random_selected:
                steps = [step.get("description", "") for step in ex.get("steps", [])]

                # Create a longer description with all steps
                description = ex.get("name", "")
                if steps:
                    description += f". {'. '.join(steps)}"
                else:
                    description += " - A physical exercise to help with recovery."

                exercise_tasks.append(
                    {
                        "id": str(len(exercise_tasks) + 1),
                        "title": ex.get("name", ""),
                        "description": description,
                        "time": random.choice(["morning", "afternoon", "evening"]),
                        "exercise_type": "physical",
                        "difficulty": ex.get("difficulty", "easy"),
                        "completed": False,
                        "steps": steps,  # Include all 3 steps from JSON
                        "exercise_type_detail": ex.get("exercise_type", "stretch"),
                    }
                )

        # 🧠 Call 2: Generate 3 normal (mind/social) tasks
        normal_prompt = f"""
        You are a wellness coach designing daily recovery routines.

        Create 3 supportive, non-physical tasks for the user below.
        These should be mindfulness, social connection, or self-care activities (NOT physical exercises).

        Each task must include:
        - id (1..3)
        - title
        - description (1–2 short sentences)
        - time (morning/afternoon/evening)
        - difficulty: "easy" or "medium"
        - completed = false

        Return ONLY a JSON array of exactly 3 tasks.

        User context:
        {onboarding_context}
        """

        normal_payload = {
            "contents": [{"role": "user", "parts": [{"text": normal_prompt}]}],
            "generationConfig": {"temperature": 0.6, "maxOutputTokens": 400},
        }
        normal_resp = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            data=json.dumps(normal_payload),
            timeout=20,
        )
        normal_resp.raise_for_status()
        normal_raw_text = (
            normal_resp.json()
            .get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text")
        )

        normal_tasks = _safe_json_parse(normal_raw_text)
        if not isinstance(normal_tasks, list) or len(normal_tasks) < 3:
            print("[Gemini] Failed to parse normal tasks, using fallback.")
            normal_tasks = [
                {
                    "id": "1",
                    "title": "Hydration Check",
                    "description": "Drink a glass of water and take a moment to check in with yourself.",
                    "time": "morning",
                    "difficulty": "easy",
                    "completed": False,
                },
                {
                    "id": "2",
                    "title": "Journal Reflection",
                    "description": "Write down three things you're grateful for today.",
                    "time": "afternoon",
                    "difficulty": "easy",
                    "completed": False,
                },
                {
                    "id": "3",
                    "title": "Connect with Support",
                    "description": "Reach out to a friend or attend a support meeting.",
                    "time": "evening",
                    "difficulty": "medium",
                    "completed": False,
                },
            ]

        # 🔹 Process physical exercises: enrich with video and image
        processed_exercises = []
        for idx, item in enumerate(exercise_tasks[:2]):
            item["id"] = str(len(processed_exercises) + 1)
            item.setdefault("completed", False)
            item.setdefault("time", "morning")
            item.setdefault("type", "exercise")

            # Set exercise_type to "physical" for all physical exercises
            item["exercise_type"] = "physical"

            # Preserve steps from JSON file if they exist
            existing_steps = item.get("steps", [])

            # Try to generate video for physical exercises
            try:
                print(f"🎥 Generating Veo3 demo for: {item['title']}")
                enriched = _generate_exercise_with_video(
                    item.get("title", ""), item.get("description", "")
                )
                # Update item but preserve steps
                video_url = enriched.get("video_url")
                pose_json_url = enriched.get("pose_json_url")
                item["video_url"] = video_url
                item["pose_json_url"] = pose_json_url
                # Always use existing steps from JSON if available, otherwise use generated steps
                if existing_steps:
                    item["steps"] = existing_steps
                elif enriched.get("steps"):
                    item["steps"] = enriched.get("steps")
                # Ensure exercise_type is "physical"
                item["exercise_type"] = "physical"
            except Exception as e:
                print(f"[ExerciseGen] Failed for {item.get('title', 'unknown')}: {e}")
                # Still mark as exercise even if video generation fails
                item["type"] = "exercise"
                item["video_url"] = None
                item["pose_json_url"] = None
                # Always preserve steps from JSON if available
                item["steps"] = existing_steps if existing_steps else []
                item["exercise_type"] = "physical"

            # Generate image for the exercise task
            try:
                print(f"🖼️ Generating image for: {item['title']}")
                image_url = _generate_and_upload_task_image(
                    item.get("title", ""), item.get("description", ""), "physical"
                )
                if image_url:
                    item["image"] = image_url
                    print(
                        f"[ImageGen] ✓ Successfully generated image for '{item['title']}': {image_url}"
                    )
                else:
                    print(
                        f"[ImageGen] ✗ No image generated for '{item['title']}' (returned None)"
                    )
                    item["image"] = None
            except Exception as e:
                import traceback

                print(
                    f"[ImageGen] ✗ Exception generating image for {item.get('title', 'unknown')}: {e}"
                )
                print(f"[ImageGen] Traceback: {traceback.format_exc()}")
                item["image"] = None

            # Ensure steps are always present in the response (use existing_steps if available)
            if "steps" not in item:
                item["steps"] = existing_steps if existing_steps else []
            elif not item.get("steps") and existing_steps:
                item["steps"] = existing_steps

            processed_exercises.append(item)

        # 🔹 Process normal tasks: generate images, no video needed
        processed_normal = []
        for idx, item in enumerate(normal_tasks[:3]):
            item["id"] = str(len(processed_exercises) + len(processed_normal) + 1)
            item.setdefault("completed", False)
            item.setdefault("time", "morning")

            # Generate image for the normal task
            try:
                print(f"🖼️ Generating image for: {item['title']}")
                image_url = _generate_and_upload_task_image(
                    item.get("title", ""), item.get("description", ""), "mindfulness"
                )
                if image_url:
                    item["image"] = image_url
                    print(
                        f"[ImageGen] ✓ Successfully generated image for '{item['title']}': {image_url}"
                    )
                else:
                    print(
                        f"[ImageGen] ✗ No image generated for '{item['title']}' (returned None)"
                    )
                    item["image"] = None
            except Exception as e:
                import traceback

                print(
                    f"[ImageGen] ✗ Exception generating image for {item.get('title', 'unknown')}: {e}"
                )
                print(f"[ImageGen] Traceback: {traceback.format_exc()}")
                item["image"] = None

            processed_normal.append(item)

        # 🔹 Combine and shuffle for variety
        all_tasks = processed_exercises + processed_normal
        random.shuffle(all_tasks)

        # Reassign IDs after shuffle
        for idx, task in enumerate(all_tasks, 1):
            task["id"] = str(idx)

        print(
            f"[Gemini] Generated {len(processed_exercises)} exercises and {len(processed_normal)} normal tasks"
        )
        return all_tasks

    except Exception as e:
        print("[Gemini][daily_tasks] Error:", repr(e))
        return _default_tasks()


def _detect_exercise_type(title: str, description: str = "") -> str:
    """Detect exercise type from title and description."""
    text = (title + " " + description).lower()

    if any(word in text for word in ["neck", "head", "cervical"]):
        return "stretch"
    elif any(word in text for word in ["shoulder", "arm", "wrist", "hand"]):
        return "stretch"
    elif any(word in text for word in ["breath", "inhale", "exhale", "pranayama"]):
        return "breathing"
    elif any(word in text for word in ["roll", "rotate", "circle"]):
        return "stretch"
    elif any(word in text for word in ["yoga", "pose", "asana"]):
        return "yoga"
    elif any(word in text for word in ["walk", "step", "move"]):
        return "movement"
    else:
        return "stretch"  # default


def _generate_exercise_with_video(title: str, description: str = "") -> Dict[str, Any]:
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
      "duration_seconds": 8,
      "exercise_type": "stretch" or "breathing" or "yoga" or "movement"
    }}

    Activity: "{title}"
    Description: "{description}"
    """

    try:
        g_payload = {
            "contents": [{"role": "user", "parts": [{"text": g_prompt}]}],
            "generationConfig": {"temperature": 0.5, "maxOutputTokens": 250},
        }
        g_resp = requests.post(
            g_url,
            headers={"Content-Type": "application/json"},
            data=json.dumps(g_payload),
        )
        g_data = g_resp.json()
        raw_text = (
            g_data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text")
        )
        spec = _safe_json_parse(raw_text) or {}

        # All physical exercises have exercise_type "physical"
        exercise_type = "physical"

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
        pose_path = firebase_utils.upload_json(
            pose_json, f"poses/{title.replace(' ', '_')}.json"
        )

        # 🔹 Upload video to Firebase
        video_path = firebase_utils.upload_file_from_url(
            video_url, f"videos/{title.replace(' ', '_')}.mp4"
        )

        return {
            "type": "exercise",
            "exercise_type": exercise_type,
            "video_url": video_path,
            "pose_json_url": pose_path,
            "steps": spec.get("steps", []),
            "one_liner": spec.get("one_liner", "A short, relaxing exercise."),
            "duration_seconds": spec.get("duration_seconds", 8),
        }

    except Exception as e:
        print(f"[ExerciseGen] Error for {title}: {e}")
        # Even if video generation fails, mark it as an exercise
        return {
            "type": "exercise",
            "exercise_type": "physical",
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


def _generate_image_with_gemini(
    title: str, description: str, task_type: str = "general"
) -> Optional[str]:
    """Generate an image using Gemini's Imagen API - sends task info directly to image model."""
    api_key = _get_api_key()
    if not api_key:
        print("[ImageGen] Missing API key, skipping image generation")
        return None

    try:
        # Build a direct, specific image prompt from the task information
        # Send the exercise/task directly to the image generation model
        if task_type == "physical":
            # For physical exercises, emphasize showing the movement/pose
            prompt_text = f"""A detailed illustration or photograph showing a person performing the exercise: "{title}". 

{description}

The image must clearly show:
- A person (full body or upper body) actively performing this specific exercise
- The exact movements, poses, or actions described: {title}
- Calming, positive, and motivational atmosphere
- Clean, simple composition
- Professional illustration or realistic photography style
- Soft, warm lighting
- No text, words, or labels anywhere in the image
- Focus entirely on visualizing the exercise being performed

Make sure the image directly represents and shows someone doing the exercise "{title}" - not a generic wellness scene."""

        else:
            # For mindfulness/wellness activities, show the specific activity
            prompt_text = f"""A detailed illustration or photograph showing a person doing this activity: "{title}".

{description}

The image must clearly show:
- A person engaged in the specific activity: {title}
- The exact actions or setting described
- Calming, positive, and motivational atmosphere  
- Clean, simple composition
- Professional illustration or realistic photography style
- Soft, warm lighting
- No text, words, or labels anywhere in the image
- Focus entirely on visualizing the activity being done

Make sure the image directly represents and shows someone doing the activity "{title}" - not a generic wellness scene."""

        print(f"[ImageGen] Direct image prompt for '{title}': {prompt_text[:150]}...")

        # Use Gemini's image generation model (gemini-2.5-flash-image or gemini-2.0-flash-preview-image-generation)
        # Try gemini-2.5-flash-image first (Nano Banana), fallback to preview version
        image_model = "gemini-2.5-flash-image"
        image_url = f"https://generativelanguage.googleapis.com/v1beta/models/{image_model}:generateContent?key={api_key}"

        image_payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt_text}]}],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 256,
            },
        }

        print(f"[ImageGen] Generating image using {image_model}...")
        image_resp = requests.post(
            image_url,
            headers={"Content-Type": "application/json"},
            data=json.dumps(image_payload),
            timeout=30,
        )

        # If the model is not available, try the preview version
        if image_resp.status_code == 404:
            print(f"[ImageGen] {image_model} not available, trying preview version...")
            image_model = "gemini-2.0-flash-preview-image-generation"
            image_url = f"https://generativelanguage.googleapis.com/v1beta/models/{image_model}:generateContent?key={api_key}"
            image_resp = requests.post(
                image_url,
                headers={"Content-Type": "application/json"},
                data=json.dumps(image_payload),
                timeout=30,
            )

        # Log response for debugging
        print(f"[ImageGen] Image API response status: {image_resp.status_code}")
        if image_resp.status_code != 200:
            print(f"[ImageGen] Image API error response: {image_resp.text[:500]}")

        image_resp.raise_for_status()
        image_data = image_resp.json()
        print(f"[ImageGen] Image API response data keys: {list(image_data.keys())}")

        # Extract image URL or base64 data from response
        candidates = image_data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            for part in parts:
                # Check if there's an image URL in the response
                if "inlineData" in part:
                    # Image is returned as base64, need to handle this
                    image_data_b64 = part["inlineData"].get("data")
                    mime_type = part["inlineData"].get("mimeType", "image/png")
                    if image_data_b64:
                        # Return a special marker to indicate we have base64 data
                        print(f"[ImageGen] Received base64 image data for '{title}'")
                        return {
                            "type": "base64",
                            "data": image_data_b64,
                            "mime_type": mime_type,
                        }

                # Check for image URL
                if "url" in part:
                    image_url_result = part["url"]
                    print(
                        f"[ImageGen] Generated image URL for '{title}': {image_url_result}"
                    )
                    return image_url_result

        print(f"[ImageGen] No image data found in response for '{title}'")
        return None

    except requests.exceptions.HTTPError as e:
        if e.response:
            status_code = e.response.status_code
            error_text = (
                e.response.text[:500] if hasattr(e.response, "text") else str(e)
            )
            if status_code == 404:
                print(
                    f"[ImageGen] Image generation model not available (404). "
                    f"Please enable image generation in your Gemini API. "
                    f"Error: {error_text}"
                )
            else:
                print(
                    f"[ImageGen] HTTP error {status_code} generating image for '{title}': {error_text}"
                )
        else:
            print(f"[ImageGen] HTTP error generating image for '{title}': {e}")
        return None
    except Exception as e:
        import traceback

        print(f"[ImageGen] Error generating image for '{title}': {e}")
        print(f"[ImageGen] Traceback: {traceback.format_exc()}")
        return None


def _generate_placeholder_image_url(title: str, description: str) -> Optional[str]:
    """Generate a placeholder image URL using a free image service.

    NOTE: This is a fallback that provides generic placeholder images, not task-specific images.
    In production, consider using Unsplash API with task-related keywords for better relevance.
    """
    try:
        # Use Picsum Photos (Lorem Picsum) as a placeholder service
        # This provides random placeholder images - good for testing only
        # Note: These images are NOT related to the task content

        # Create a deterministic seed from title for consistent images per task
        import hashlib

        seed = hashlib.md5(f"{title}{description}".encode()).hexdigest()[:8]

        # Picsum Photos with seed for consistency (width=800, height=600)
        placeholder_url = f"https://picsum.photos/seed/{seed}/800/600"
        print(
            f"[ImageGen] Using placeholder image for '{title}' (not task-specific): {placeholder_url}"
        )
        return placeholder_url
    except Exception as e:
        print(f"[ImageGen] Error generating placeholder for '{title}': {e}")
        return None


def _generate_and_upload_task_image(
    title: str, description: str, task_type: str = "general"
) -> Optional[str]:
    """Generate an image for a task and upload it to Firebase Storage."""
    try:
        import base64

        # Generate image using Gemini
        image_result = _generate_image_with_gemini(title, description, task_type)

        if not image_result:
            # Fallback: Use placeholder image service
            print(
                f"[ImageGen] Gemini image generation failed for '{title}', using placeholder..."
            )
            placeholder_url = _generate_placeholder_image_url(title, description)
            if placeholder_url:
                # Upload placeholder to Firebase Storage for consistency
                safe_title = (
                    title.replace(" ", "_").replace("/", "_").replace("'", "")[:50]
                )
                image_path = f"images/tasks/{safe_title}.png"
                try:
                    uploaded_url = firebase_utils.upload_file_from_url(
                        placeholder_url, image_path, content_type="image/jpeg"
                    )
                    print(
                        f"[ImageGen] Uploaded placeholder image for '{title}' to {uploaded_url}"
                    )
                    return uploaded_url
                except Exception as e:
                    print(f"[ImageGen] Failed to upload placeholder for '{title}': {e}")
                    # Return the placeholder URL directly if upload fails
                    return placeholder_url
            # Return None, frontend will use placeholder
            return None

        # Upload to Firebase Storage
        safe_title = title.replace(" ", "_").replace("/", "_").replace("'", "")[:50]
        image_path = f"images/tasks/{safe_title}.png"

        # Handle base64 image data
        if isinstance(image_result, dict) and image_result.get("type") == "base64":
            # Upload base64 image directly
            image_data = base64.b64decode(image_result["data"])
            mime_type = image_result.get("mime_type", "image/png")

            # Determine file extension from mime type
            ext = "png"
            if "jpeg" in mime_type or "jpg" in mime_type:
                ext = "jpg"

            image_path = f"images/tasks/{safe_title}.{ext}"

            uploaded_url = firebase_utils.upload_file_from_bytes(
                image_data, image_path, content_type=mime_type
            )
            print(f"[ImageGen] Uploaded base64 image for '{title}' to {uploaded_url}")
            return uploaded_url

        # Handle image URL
        if isinstance(image_result, str) and image_result.startswith("http"):
            uploaded_url = firebase_utils.upload_file_from_url(
                image_result, image_path, content_type="image/png"
            )
            print(f"[ImageGen] Uploaded image URL for '{title}' to {uploaded_url}")
            return uploaded_url

        return None

    except Exception as e:
        print(f"[ImageGen] Error in image generation/upload for '{title}': {e}")
        return None


def _default_tasks() -> List[Dict[str, Any]]:
    return [
        {
            "id": "1",
            "title": "Morning Stretch",
            "description": "5 minutes of deep breathing and stretching",
            "time": "8:00 AM",
            "completed": False,
            "type": "exercise",
            "exercise_type": "physical",
            "video_url": None,
            "difficulty": "easy",
            "image": None,
        },
        {
            "id": "2",
            "title": "Hydration",
            "description": "Drink a glass of water",
            "time": "10:00 AM",
            "completed": False,
            "image": None,
        },
        {
            "id": "3",
            "title": "Journaling",
            "description": "Reflect for 5 minutes",
            "time": "2:00 PM",
            "completed": False,
            "image": None,
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
