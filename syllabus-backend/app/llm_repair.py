from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional, Tuple

# Optional Gemini integration
try:
    from google import genai
except Exception:
    genai = None


def is_gemini_ready() -> Tuple[bool, str]:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return False, "GEMINI_API_KEY (or GOOGLE_API_KEY) not set"
    if genai is None:
        return False, "google-genai package not installed"
    return True, ""


def _client() -> Any:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key or genai is None:
        raise RuntimeError("Gemini not configured")
    return genai.Client(api_key=api_key)


SYSTEM_PROMPT = """
You help normalize assignment due dates from a syllabus.

You will be given:
- The *full* syllabus text (or relevant pages)
- A JSON array of seed items that were extracted with a rule-based parser.

Each seed item looks like:
  {
    "title": "Problem Set 1",
    "due_date_raw": "September 12",
    "due_date_iso": "2025-09-12",
    "due_mdy": "09/12/2025",
    "due_time": "23:59",
    "assignment_type": "Assignment"
  }

Your job:
1. Clean up obvious OCR noise in titles (remove stray numbers, cut off headers/footers).
2. If the same assignment appears multiple times, keep only ONE version.
3. Fix any clearly wrong dates if the syllabus context makes it obvious.
4. Keep fields:
   - title
   - due_date_raw
   - due_date_iso (YYYY-MM-DD or full ISO if time is known)
   - assignment_type (Assignment, Quiz, Test, Presentation, etc.)

Do NOT invent assignments that are not present in the text.

Return ONLY a JSON object:
  {
    "items": [... cleaned items ...]
  }
No explanation, no prose.
""".strip()


def repair_due_items(
    full_text: str,
    seed_items: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Attempt to 'repair' and normalize assignment items with Gemini.
    If Gemini is not configured or any error occurs, this falls back to the
    original seed_items and returns an 'error' string describing what happened.

    Returns:
      {
        "items": [...],
        "error": str | None
      }
    """
    seed_items = seed_items or []
    ok, reason = is_gemini_ready()
    if not ok:
        return {"items": seed_items, "error": reason}

    try:
        client = _client()
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")

        payload = {
            "full_text": full_text[:12000],  # safety truncate
            "seed_items": seed_items,
        }

        prompt = (
            SYSTEM_PROMPT
            + "\n\n--- FULL TEXT BELOW ---\n\n"
            + payload["full_text"]
            + "\n\n--- SEED ITEMS BELOW (JSON) ---\n\n"
            + json.dumps(payload["seed_items"], ensure_ascii=False, indent=2)
            + "\n\nReturn the cleaned JSON only."
        )

        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
        )

        raw_text = getattr(response, "text", None)
        if not raw_text:
            try:
                c0 = response.candidates[0]
                parts = getattr(c0, "content", c0).parts
                raw_text = "".join(getattr(p, "text", "") for p in parts)
            except Exception:
                raw_text = ""

        if not raw_text:
            return {"items": seed_items, "error": "Empty response from Gemini"}

        raw_text = raw_text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.strip("`")
            if raw_text.lower().startswith("json"):
                raw_text = raw_text[4:].lstrip()

        data = json.loads(raw_text)
        items = data.get("items")
        if not isinstance(items, list):
            return {"items": seed_items, "error": "Gemini JSON missing 'items' list"}

        cleaned = []
        for it in items:
            if not isinstance(it, dict):
                continue
            title = (it.get("title") or "").strip()
            if not title:
                continue
            out = {
                "title": title[:300],
                "due_date_raw": (it.get("due_date_raw") or "").strip(),
                "due_date_iso": (it.get("due_date_iso") or "").strip(),
                "assignment_type": (it.get("assignment_type") or "Assignment").strip()
                or "Assignment",
            }
            cleaned.append(out)

        if not cleaned:
            return {"items": seed_items, "error": "Gemini returned no usable items"}

        return {"items": cleaned, "error": None}

    except Exception as e:
        return {
            "items": seed_items,
            "error": f"{type(e).__name__}: {e}",
        }
