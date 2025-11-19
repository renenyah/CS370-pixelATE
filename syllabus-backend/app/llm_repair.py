# app/llm_repair.py
from __future__ import annotations

import os
import json
import re
from typing import List, Dict, Any, Tuple, Optional


def is_gemini_ready() -> Tuple[bool, str]:
    """
    Returns (True, "") if GEMINI_API_KEY appears set and the SDK is importable.
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


# ---------------- parsing helpers ----------------

_CODE_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL | re.IGNORECASE)

def _strip_code_fences(text: str) -> str:
    m = _CODE_FENCE_RE.search(text or "")
    return m.group(1).strip() if m else (text or "").strip()

def _first_json_block(text: str) -> Optional[str]:
    """
    Try to extract the first top-level JSON object/array substring.
    """
    if not text:
        return None
    # quick wins
    s = text.find("{")
    e = text.rfind("}")
    if s != -1 and e != -1 and e > s:
        return text[s:e+1].strip()
    s = text.find("[")
    e = text.rfind("]")
    if s != -1 and e != -1 and e > s:
        return text[s:e+1].strip()
    return None

def _safe_load_json(text: str) -> Any:
    try:
        return json.loads(text)
    except Exception:
        return None


# ---------------- main LLM function ----------------

def repair_due_items(full_text: str, seed_items: List[Dict[str, Any]] | None = None) -> Dict[str, Any]:
    """
    Ask Gemini to produce clean JSON items from `full_text` + optional `seed_items`.
    Returns: {"items": [...], "error": str|None}
    """
    ok, reason = is_gemini_ready()
    if not ok:
        return {"items": seed_items or [], "error": reason}

    try:
        import google.generativeai as genai

        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")

        # Force JSON-only response
        generation_config = {
            "temperature": 0.2,
            "top_p": 0.9,
            "response_mime_type": "application/json",
        }

        # Keep schema simple and explicit
        schema_hint = {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "due_date_raw": {"type": "string"},
                            "due_date_iso": {"type": "string"},
                        },
                        "required": ["title", "due_date_raw", "due_date_iso"],
                    },
                }
            },
            "required": ["items"],
        }

        # You can pass a "tools" schema in newer SDKs; here we keep it simple and rely on mime type.
        model = genai.GenerativeModel(model_name, generation_config=generation_config)

        seed_json = json.dumps(seed_items or [], ensure_ascii=False)
        prompt = (
            "You are a strict JSON generator.\n"
            "Given the raw text of a syllabus (or OCR of a screenshot), output ONLY JSON matching:\n"
            "{ \"items\": [ {\"title\": str, \"due_date_raw\": str, \"due_date_iso\": str} ... ] }\n"
            "Rules:\n"
            "- Keep titles concise (<= 300 chars).\n"
            "- If a clean calendar date is known, set 'due_date_iso' in YYYY-MM-DD, else empty string.\n"
            "- Deduplicate similar items.\n"
            "- Output nothing except valid JSON.\n"
            "\n"
            f"SEED_ITEMS (may be empty):\n{seed_json}\n"
            "\n"
            "RAW_TEXT:\n"
            f"{full_text}\n"
        )

        resp = model.generate_content(prompt)

        # Extract text safely: prefer resp.text, fall back to parts
        raw_text = getattr(resp, "text", "") or ""
        if not raw_text and getattr(resp, "candidates", None):
            parts = []
            cand = resp.candidates[0]
            if getattr(cand, "content", None) and getattr(cand.content, "parts", None):
                for p in cand.content.parts:
                    if hasattr(p, "text") and p.text:
                        parts.append(p.text)
            raw_text = "\n".join(parts).strip()

        if not raw_text:
            # Try to surface finish_reason if present
            fin = None
            if getattr(resp, "candidates", None):
                fin = getattr(resp.candidates[0], "finish_reason", None)
            return {"items": seed_items or [], "error": f"No text in LLM response (finish_reason={fin})"}

        # Clean & parse
        cleaned = _strip_code_fences(raw_text)
        blob = _first_json_block(cleaned) or cleaned
        parsed = _safe_load_json(blob)

        # Accept either {"items":[...]} or bare list
        if isinstance(parsed, list):
            parsed = {"items": parsed}
        if not isinstance(parsed, dict) or "items" not in parsed or not isinstance(parsed["items"], list):
            return {"items": seed_items or [], "error": "LLM did not return expected JSON object"}

        # Final sanitize
        out: List[Dict[str, str]] = []
        for it in parsed["items"]:
            if not isinstance(it, dict):
                continue
            out.append({
                "title": (it.get("title") or "").strip()[:300],
                "due_date_raw": (it.get("due_date_raw") or "").strip()[:120],
                "due_date_iso": (it.get("due_date_iso") or "").strip()[:20],
            })

        return {"items": out, "error": None}

    except Exception as e:
        return {"items": seed_items or [], "error": f"LLM error: {e}"}
