# app/llm_repair.py
from __future__ import annotations

import os
import json
from typing import List, Dict, Any, Tuple

def is_gemini_ready() -> Tuple[bool, str]:
    """
    Returns (True, "") if GEMINI_API_KEY appears valid and the lib is importable.
    We don't actually ping the API here—just a cheap check.
    """
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return False, "GEMINI_API_KEY is not set"

    try:
        import google.generativeai as _  # noqa: F401
    except Exception as e:
        return False, f"google-generativeai not installed/usable: {e}"

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")
    if not model:
        return False, "GEMINI_MODEL is empty"
    return True, ""


def _safe_load_json(text: str) -> Any:
    try:
        return json.loads(text)
    except Exception:
        return None


def repair_due_items(full_text: str, seed_items: List[Dict[str, Any]] | None = None) -> Dict[str, Any]:
    """
    Sends the page text and any seed items to Gemini and asks for a cleaned list:
      [{title, due_date_raw, due_date_iso, page?, source?}]
    On any problem, returns the seed_items unchanged with an 'error'.
    """
    ok, reason = is_gemini_ready()
    if not ok:
        return {"items": seed_items or [], "error": reason}

    try:
        import google.generativeai as genai

        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")
        model = genai.GenerativeModel(model_name)

        system = (
            "You are a strict JSON generator. "
            "Given the raw text of a syllabus (or OCR of a screenshot), output ONLY JSON:\n"
            "{ \"items\": [ {\"title\": str, \"due_date_raw\": str, \"due_date_iso\": str} ... ] }\n"
            "If you cannot find anything, output {\"items\": []}."
        )

        seed_json = json.dumps(seed_items or [], ensure_ascii=False)
        user = (
            f"RAW_TEXT:\n{full_text}\n\n"
            f"SEED_ITEMS:\n{seed_json}\n\n"
            "Rules:\n"
            "- Keep titles concise.\n"
            "- If you know a clean calendar date (YYYY-MM-DD), set 'due_date_iso', else empty string.\n"
            "- If multiple similar items exist, deduplicate.\n"
            "Output ONLY valid JSON."
        )

        resp = model.generate_content([system, user])
        # Defensive: some responses can be empty or have no text parts
        try:
            if not resp or not getattr(resp, "candidates", None):
                return {"items": seed_items or [], "error": "Empty LLM response"}
            cand = resp.candidates[0]
            # finish_reason 2 = SAFETY or other stop; still may contain text, so try to parse anyway.
            text = ""
            if cand and getattr(cand, "content", None) and getattr(cand.content, "parts", None):
                # concatenate all text parts
                pieces = []
                for p in cand.content.parts:
                    if hasattr(p, "text") and p.text:
                        pieces.append(p.text)
                text = "\n".join(pieces).strip()
            if not text:
                return {"items": seed_items or [], "error": f"No text in LLM response (finish_reason={getattr(cand, 'finish_reason', None)})"}

            parsed = _safe_load_json(text)
            if not isinstance(parsed, dict) or "items" not in parsed:
                return {"items": seed_items or [], "error": "LLM did not return expected JSON object"}

            items = parsed.get("items") or []
            if not isinstance(items, list):
                return {"items": seed_items or [], "error": "LLM 'items' is not a list"}

            # Keep only fields we expect
            cleaned = []
            for it in items:
                if not isinstance(it, dict):
                    continue
                cleaned.append({
                    "title": (it.get("title") or "").strip()[:300],
                    "due_date_raw": (it.get("due_date_raw") or "").strip()[:100],
                    "due_date_iso": (it.get("due_date_iso") or "").strip()[:20],
                })
            return {"items": cleaned, "error": None}

        except Exception as inner:
            return {"items": seed_items or [], "error": f"Parse error: {inner}"}

    except Exception as e:
        return {"items": seed_items or [], "error": f"LLM error: {e}"}
