# app/llm_repair.py
import os, json
from typing import List, Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv

try:
    import google.generativeai as genai
except Exception:
    genai = None  # library missing is handled below

# Load .env once at import
load_dotenv(Path.cwd() / ".env", override=True)

DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "models/gemini-2.5-pro").strip()

def have_gemini() -> bool:
    if genai is None:
        return False
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return False
    try:
        genai.configure(api_key=key)
        return True
    except Exception:
        return False

def gemini_status() -> Dict[str, Any]:
    return {
        "has_lib": genai is not None,
        "has_key": bool(os.getenv("GEMINI_API_KEY")),
        "model": DEFAULT_MODEL,
    }

def _build_prompt(items: List[Dict[str, Any]],
                  pdf_title: Optional[str],
                  pdf_text_excerpt: str,
                  metadata: Optional[Dict[str, Any]]) -> str:
    """
    Give Gemini plenty of context + a strict JSON-only instruction.
    """
    meta = metadata or {}
    title = pdf_title or ""
    # Limit excerpt to keep requests reasonable
    excerpt = (pdf_text_excerpt or "").strip()
    if len(excerpt) > 8000:
        excerpt = excerpt[:8000]

    return f"""
You are cleaning and normalizing assignment due items extracted from a syllabus PDF.

Rules:
- Keep ONLY concrete graded items with real due dates (homework, problem sets, quizzes, exams, portfolios).
- If the date string is present (e.g., "Oct 2", "December 17th"), map it to ISO YYYY-MM-DD (assume the academic year in the PDF).
- If no due date is given, keep the item with empty due_date fields (the app allows user edits), but remove obvious non-assignments.
- Deduplicate similar rows (e.g., "Problem Set 4", "PS4").
- Do NOT hallucinate dates. If you can't find a date, leave due_date_raw and due_date_iso blank.
- Return JSON only, array of objects with exactly:
  ["title","due_date_raw","due_date_iso","page","source"]

Context:
PDF title: {title}
Metadata (may be empty): {json.dumps(meta) if meta else "{}"}

Nearby text excerpt (to help resolve dates and titles):
\"\"\"{excerpt}\"\"\"


Raw extracted items (JSON):
{json.dumps(items, ensure_ascii=False)}

Now respond with the cleaned JSON array only, no commentary.
    """.strip()

def _parse_json_from_text(txt: str) -> List[Dict[str, Any]]:
    # Extract first JSON array present.
    txt = txt.strip()
    start = txt.find("[")
    end = txt.rfind("]")
    if start != -1 and end != -1 and end > start:
        segment = txt[start:end+1]
        try:
            data = json.loads(segment)
            if isinstance(data, list):
                return data
        except Exception:
            pass
    # fallback: return empty (caller will keep originals)
    return []

def repair_due_items(items: List[Dict[str, Any]],
                     pdf_title: Optional[str] = None,
                     pdf_text_excerpt: str = "",
                     metadata: Optional[Dict[str, Any]] = None,
                     model_name: Optional[str] = None,
                     temperature: float = 0.2) -> List[Dict[str, Any]]:
    """
    Make the extra context optional so older callers won't break.
    """
    if not have_gemini():
        # No key or lib -> return original items unchanged
        return items

    model_name = (model_name or DEFAULT_MODEL).strip()
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

    prompt = _build_prompt(items, pdf_title, pdf_text_excerpt, metadata)
    try:
        model = genai.GenerativeModel(model_name)
        resp = model.generate_content(prompt, generation_config={"temperature": temperature})
        text = (getattr(resp, "text", None) or "").strip()
        cleaned = _parse_json_from_text(text)
        # If LLM fails to return usable JSON, keep originals
        return cleaned if cleaned else items
    except Exception:
        # Never break the API – return originals on error
        return items
