"""
Optional Gemini repair/filter step.
- If no API key/model, it simply returns the original items with llm_used=False.
- If available, it prompts Gemini to:
  * merge duplicates
  * fix/normalize titles (e.g., "Problem Set 2" vs "PS2")
  * keep or correct date mapping when plausible from context
"""

from __future__ import annotations
import os
from typing import List, Dict, Tuple, Optional

def have_gemini() -> bool:
    return bool(os.getenv("GEMINI_API_KEY", "").strip())

def _model():
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
    model_name = os.getenv("GEMINI_MODEL", "models/gemini-2.5-pro")
    return genai.GenerativeModel(model_name)

def repair_due_items(items: List[Dict],
                     pdf_text_excerpt: str,
                     metadata: Optional[Dict] = None) -> Tuple[List[Dict], bool, Optional[str]]:
    """
    Returns: (new_items, llm_used, error_message_or_None)
    Each item in/out uses the API shape:
      {"title","due_date_raw","due_date_iso","page","source"}
    """
    if not have_gemini():
        return items, False, None

    try:
        m = _model()
        sys_prompt = (
            "You will receive:\n"
            "1) a short excerpt of a course syllabus (plain text),\n"
            "2) a JSON array of items with title/due_date_raw/due_date_iso/source.\n"
            "Your job:\n"
            "- Remove obvious duplicates.\n"
            "- If the title is truncated, fix it using context.\n"
            "- If due_date_raw and due_date_iso disagree slightly, prefer the calendar-correct ISO but keep due_date_raw.\n"
            "- Only return items that clearly look like assignments/exams/quizzes with dates.\n"
            "- Preserve keys: title, due_date_raw, due_date_iso, page (if present or null), source.\n"
            "Return a compact JSON array only (no commentary)."
        )
        user_payload = {
            "excerpt": pdf_text_excerpt[:6000] if pdf_text_excerpt else "",
            "items": items,
            "meta": metadata or {}
        }
        resp = m.generate_content([{"role": "system", "parts": [sys_prompt]},
                                   {"role": "user", "parts": [str(user_payload)]}])
        txt = resp.candidates[0].content.parts[0].text  # type: ignore
        # The model often returns JSON fenced by ```; strip that
        cleaned = txt.strip().strip("`")
        # quick-and-safe json parsing
        import json
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].lstrip()
        new_items = json.loads(cleaned)
        # Ensure each dict has keys we expect
        out = []
        for it in new_items:
            out.append({
                "title": it.get("title", "").strip(),
                "due_date_raw": it.get("due_date_raw", "").strip(),
                "due_date_iso": it.get("due_date_iso", "").strip(),
                "page": it.get("page", None),
                "source": it.get("source", "llm_repair")
            })
        return out, True, None
    except Exception as e:
        # fall back to original items
        return items, False, f"{type(e).__name__}: {e}"
