# Physical Exercises Database

This document describes the physical exercises database (`exercises.json`) that Gemini can use to select appropriate exercises for users based on their addiction type.

## Structure

The JSON file contains an array of 20 exercises, each with the following structure:

```json
{
  "id": number,
  "name": "Exercise Name",
  "addictions": ["addiction1", "addiction2", ...],
  "exercise_type": "stretch|breathing|movement|balance|yoga|grounding",
  "difficulty": "easy|medium|hard",
  "steps": [
    {
      "step_number": 1,
      "description": "Step 1 description"
    },
    {
      "step_number": 2,
      "description": "Step 2 description"
    },
    {
      "step_number": 3,
      "description": "Step 3 description"
    }
  ]
}
```

## Exercise Types

- **stretch**: Stretching and flexibility exercises
- **breathing**: Breathing-focused exercises
- **movement**: Active movement exercises
- **balance**: Balance and coordination exercises
- **yoga**: Yoga-inspired movements
- **grounding**: Grounding and mindfulness exercises

## Addiction Types

Exercises are tagged with applicable addictions:
- `smoking`: Smoking addiction
- `alcohol`: Alcohol addiction
- `social_media`: Social media addiction
- `phone`: Phone addiction
- `stress`: Stress-related issues
- `anxiety`: Anxiety-related issues
- `anger`: Anger management
- `cravings`: General cravings
- `fatigue`: Fatigue and tiredness
- `focus`: Focus and concentration issues
- `sedentary`: Sedentary lifestyle issues
- `calmness`: Need for calmness
- `all`: Applicable to all addictions

## Usage Example

When Gemini needs to recommend exercises for a user:

1. **Filter by addiction**: Select exercises where the user's addiction is in the `addictions` array (or use exercises tagged with `"all"`)

2. **Return exercise with steps**: Each exercise should be returned with its 3 steps formatted as:
   ```
   Step 1: [description]
   Step 2: [description]
   Step 3: [description]
   ```

3. **Example selection**:
   - User with smoking addiction → Can use exercises with `addictions: ["smoking"]` or `["all"]`
   - User with social media addiction → Can use exercises with `addictions: ["social_media"]` or `["all"]`

## Exercise List

1. Deep Lung Expansion Stretch (Smoking)
2. Craving Punch-Out (Smoking / Alcohol)
3. Neck Roll Reset (Social Media / Stress)
4. Grounding Step March (All Addictions)
5. Shoulder Openers (Smoking / Anxiety)
6. Wall Push Relaxer (Alcohol / Anger Release)
7. Finger Detox Stretch (Social Media Addiction)
8. Slow Balance Stand (Alcohol / Focus Training)
9. Full Back Stretch (Smoking / Cravings Control)
10. Palm Tap Breathing (Social Media / Anxiety)
11. Mini-Squat Reset (All Addictions)
12. Wrist Looseners (Phone Addiction)
13. Foot Pressure Relief (Alcohol / Stress)
14. Side Body Energizer (Smoking / Fatigue)
15. Jaw Release Stretch (All Addictions)
16. Shoulder Tap Cross Crawl (Social Media / Focus+)
17. Mini Sun Salute (Smoking / Calmness)
18. Stress Ball Squeeze (Alcohol / Anger / Cravings)
19. Spine Twist (Social Media / Sedentary Fatigue)
20. Face Splash Reset (All Addictions)

## Integration with Gemini

When generating daily tasks, Gemini should:
1. Load this exercises.json file
2. Filter exercises based on user's addiction type from onboarding
3. Select 2-3 appropriate exercises
4. Format each exercise with its 3 steps for display in the UI
5. Use the exercise structure to generate video references if needed

