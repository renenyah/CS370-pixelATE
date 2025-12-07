from __future__ import annotations

import os
import tempfile
import hashlib
from typing import Any, Dict, Optional, List

import requests
from fastapi import FastAPI, UploadFile, File, Query, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Load .env early so endpoints see keys (useful for local dev)
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

app = FastAPI(title="Syllabus Assignment Extractor", version="1.0.0")

# Import project modules AFTER app is created to avoid circular imports
from .pdf_extractor import (  # noqa: E402
    extract_assignments_from_pdf_bytes,
    extract_assignments_from_text,
)
from .llm_repair import is_gemini_ready, repair_due_items  # noqa: E402

# Optional OCR import
try:
    from .ocr.ocr_processor import ocr_extract_assignments  # noqa: E402
except Exception:
    ocr_extract_assignments = None  # still allow PDF/text endpoints to work


# ------------------------------- CORS -----------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


# -------------------------- Supabase / DB wiring ------------------------------
# These should be NON-public env vars in Render, *not* the EXPO_PUBLIC_ ones
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

SUPABASE_REST_URL = f"{SUPABASE_URL}/rest/v1" if SUPABASE_URL else ""


def has_supabase() -> bool:
    return bool(SUPABASE_REST_URL and SUPABASE_SERVICE_ROLE_KEY)


def _supabase_headers() -> Dict[str, str]:
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        # We want to get created row(s) back so we can read the ID
        "Prefer": "return=representation",
    }


def db_get_upload_by_hash(file_hash: str) -> Optional[Dict[str, Any]]:
    """
    Look up an existing upload in the syllabus_uploads table by hash.
    Returns the first row or None.
    """
    if not has_supabase():
        return None

    try:
        url = f"{SUPABASE_REST_URL}/syllabus_uploads"
        params = {
            "file_hash": f"eq.{file_hash}",
            "select": "id,pdf_name,course_name,created_at,item_count",
        }
        resp = requests.get(
            url,
            headers=_supabase_headers(),
            params=params,
            timeout=10,
        )
        if not resp.ok:
            # Log but don't crash the endpoint
            print(
                "Supabase select error:",
                resp.status_code,
                resp.text,
            )
            return None

        rows = resp.json()
        if isinstance(rows, list) and rows:
            return rows[0]
        return None
    except Exception as e:
        print("Supabase select exception:", repr(e))
        return None


def db_insert_upload(
    file_hash: str,
    pdf_name: str,
    course_name: str,
    item_count: int,
) -> Optional[Dict[str, Any]]:
    """
    Insert a row in syllabus_uploads and return the inserted row.
    """
    if not has_supabase():
        return None

    try:
        url = f"{SUPABASE_REST_URL}/syllabus_uploads"
        payload = {
            "file_hash": file_hash,
            "pdf_name": pdf_name,
            "course_name": course_name,
            "item_count": item_count,
        }
        resp = requests.post(
            url,
            headers=_supabase_headers(),
            json=payload,
            timeout=10,
        )
        if not resp.ok:
            print(
                "Supabase insert error:",
                resp.status_code,
                resp.text,
            )
            return None

        data = resp.json()
        if isinstance(data, list) and data:
            return data[0]
        return None
    except Exception as e:
        print("Supabase insert exception:", repr(e))
        return None


# Fallback in-memory cache for duplicate detection if Supabase isn't configured
_seen_pdf_hashes: set[str] = set()


# ------------------------------- ROOT & HEALTH -------------------------------
@app.get("/")
def root() -> Dict[str, Any]:
    ok, reason = is_gemini_ready()
    return {
        "ok": True,
        "gemini_configured": ok,
        "gemini_reason": ("" if ok else reason),
        "model": os.getenv("GEMINI_MODEL", "gemini-2.5-pro"),
        "supabase_connected": has_supabase(),
    }


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


def _ok(**kwargs) -> Dict[str, Any]:
    return {"status": "ok", **kwargs}


def _err(msg: str, **kwargs) -> Dict[str, Any]:
    d = {"status": "error", "message": msg}
    d.update(kwargs)
    return d


# ------------- date normalization helper to match DB -----------------
def _ensure_due_at(item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize date fields into:
      - due_date_raw: original human string (e.g., "Nov 21, 2025 11:59pm")
      - due_mdy:      MM/DD/YYYY
      - due_time:     HH:MM (24h)
      - due_at:       ISO 8601 with time (YYYY-MM-DDTHH:MM)

    pdf_extractor / ocr_extractor already try to populate:
      due_date_raw, due_date_iso (YYYY-MM-DD), due_mdy, due_time.
    This is just a final safeguard and to add 'due_at' for the DB.
    """
    raw = item.get("due_date_raw") or ""
    mdy = item.get("due_mdy") or ""
    iso = item.get("due_date_iso") or ""
    time_str = item.get("due_time") or "23:59"

    # If we only have a date-only ISO, attach default time 23:59
    if iso and "T" not in iso:
        iso_with_time = f"{iso}T{time_str}"
    elif iso:
        iso_with_time = iso
    else:
        iso_with_time = ""

    out = dict(item)
    if mdy:
        out.setdefault("due_mdy", mdy)
    if time_str:
        out.setdefault("due_time", time_str)
    if iso_with_time:
        out["due_at"] = iso_with_time  # <- ready for timestamptz in DB

    return out


def _normalize_items_for_db(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [_ensure_due_at(it) for it in items]


def _merge_llm_items_with_meta(
    llm_items,
    seed_items,
    course_name: str | None = None,
    default_source: str | None = None,
    default_page: int | None = None,
):
    """
    When we use the LLM, its items won't have 'course', 'page', or 'source'.
    This helper re-attaches that metadata from the original items when possible.
    """
    if not isinstance(llm_items, list):
        return seed_items

    # Build lookup from (title, raw) -> meta
    meta_map = {}
    for it in seed_items or []:
        key = (
            (it.get("title") or "").strip(),
            (it.get("due_date_raw") or "").strip(),
        )
        meta_map[key] = {
            "course": (it.get("course") or "").strip(),
            "page": it.get("page"),
            "source": it.get("source"),
            "assignment_type": it.get("assignment_type") or "Assignment",
            "due_mdy": it.get("due_mdy"),
            "due_time": it.get("due_time"),
        }

    merged = []
    for it in llm_items:
        title = (it.get("title") or "").strip()
        raw = (it.get("due_date_raw") or "").strip()
        key = (title, raw)
        meta = meta_map.get(key, {})  # might be empty

        out = dict(it)  # title, due_date_raw, due_date_iso from LLM

        # prefer meta course, otherwise global course_name
        course = meta.get("course") or (course_name or "")
        if course:
            out["course"] = course

        # assignment type
        if "assignment_type" not in out:
            out["assignment_type"] = meta.get("assignment_type") or "Assignment"

        # date helpers
        if meta.get("due_mdy"):
            out.setdefault("due_mdy", meta["due_mdy"])
        if meta.get("due_time"):
            out.setdefault("due_time", meta["due_time"])

        # page
        page = meta.get("page")
        if page is None and default_page is not None:
            page = default_page
        if page is not None:
            out["page"] = page

        # source
        source = meta.get("source") or default_source
        if source:
            out["source"] = source

        merged.append(_ensure_due_at(out))

    return merged


# ------------------------------- PDF ------------------------------------------
@app.post("/assignments/pdf")
async def assignments_pdf_upload(
    file: UploadFile = File(..., description="Upload a syllabus PDF"),
    use_llm: bool = Query(
        False,
        description="If on and Gemini is configured, try to repair/normalize results.",
    ),
) -> Dict[str, Any]:
    """
    Upload a PDF syllabus, parse assignments, and (optionally) repair with Gemini.

    Returns:
      {
        status: "ok" | "error",
        pdf_name: str,
        course_name: str,
        items: [{
          title,
          due_date_raw,
          due_mdy,
          due_time,
          due_date_iso,
          due_at,
          assignment_type,
          page?,
          course?,
          source?
        }],
        llm_used: bool,
        llm_error: str | null,
        upload_id: uuid | null    # if saved to DB
      }
    """
    try:
        # 1) Read raw bytes
        data = await file.read()
        pdf_name = file.filename or "uploaded.pdf"

        # 2) Hash bytes to detect duplicates
        file_hash = hashlib.sha256(data).hexdigest()

        # 3) Check DB first, then in-memory as fallback
        #    so duplicates are tracked even across restarts.
        existing_row: Optional[Dict[str, Any]] = None

        if has_supabase():
            existing_row = db_get_upload_by_hash(file_hash)
            if existing_row:
                # Let frontend show "this syllabus already uploaded"
                raise HTTPException(
                    status_code=409,
                    detail="This syllabus (or an identical copy) has already been uploaded.",
                )
        else:
            global _seen_pdf_hashes
            if file_hash in _seen_pdf_hashes:
                raise HTTPException(
                    status_code=409,
                    detail="This syllabus (or an identical copy) has already been uploaded (memory).",
                )
            _seen_pdf_hashes.add(file_hash)

        # 4) Parse assignments from the PDF
        pdf_info = extract_assignments_from_pdf_bytes(data)
        course_name = pdf_info.get("course_name") or ""
        items = pdf_info.get("items") or []

        # Mark source for PDF pipeline
        for it in items:
            it.setdefault("source", "pdf")

        llm_used = False
        llm_error: Optional[str] = None

        # 5) Optional Gemini repair
        if use_llm and items:
            ok, reason = is_gemini_ready()
            if ok:
                # Build a simple text blob as context
                text_blob = "\n".join(
                    f"- {it.get('title','')}  (due: {it.get('due_date_raw','')})"
                    for it in items
                )
                result = repair_due_items(text_blob, seed_items=items)
                llm_items = result.get("items", items)
                llm_used = True
                llm_error = result.get("error")

                # Re-attach course/page/source metadata and normalize for DB
                items = _merge_llm_items_with_meta(
                    llm_items,
                    seed_items=items,
                    course_name=course_name,
                    default_source="pdf",
                )
            else:
                llm_error = reason

        # 6) Final pass to guarantee due_at fields exist
        items = _normalize_items_for_db(items)

        # 7) Save upload metadata in Supabase, if configured
        upload_row = None
        if has_supabase():
            upload_row = db_insert_upload(
                file_hash=file_hash,
                pdf_name=pdf_name,
                course_name=course_name,
                item_count=len(items),
            )

        return _ok(
            pdf_name=pdf_name,
            course_name=course_name,
            items=items,
            llm_used=llm_used,
            llm_error=llm_error,
            upload_id=(upload_row or {}).get("id"),
        )
    except HTTPException:
        # Let HTTPException propagate (409, etc.)
        raise
    except Exception as e:
        return _err(f"{type(e).__name__}: {e}")


# ------------------------------- IMAGE / OCR ----------------------------------
@app.post("/assignments/image")
async def assignments_image_upload(
    file: UploadFile = File(..., description="Upload a syllabus screenshot/photo"),
    preprocess: str = Query(
        "adaptive",
        description="Passed through to your OCR (if supported, e.g. 'screenshot').",
    ),
    use_llm: bool = Query(False, description="Repair/normalize with Gemini if configured"),
) -> Dict[str, Any]:
    """
    Upload an image; OCR runs to extract assignments.
    """
    if ocr_extract_assignments is None:
        return _err("OCR not available: could not import app.ocr.ocr_processor")

    try:
        raw = await file.read()
        suffix = os.path.splitext(file.filename or "")[1] or ".png"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(raw)
            path = tmp.name

        items = ocr_extract_assignments(path, preprocess_method=preprocess)
        course_name = ""
        if items:
            course_name = (items[0].get("course") or "").strip()

        llm_used = False
        llm_error: Optional[str] = None

        if use_llm and items:
            ok, reason = is_gemini_ready()
            if ok:
                text_blob = "\n".join(
                    f"- {it.get('title','')}  (due: {it.get('due_date_raw','')})"
                    for it in items
                )
                result = repair_due_items(text_blob, seed_items=items)
                llm_items = result.get("items", items)
                llm_used = True
                llm_error = result.get("error")

                items = _merge_llm_items_with_meta(
                    llm_items,
                    seed_items=items,
                    course_name=course_name,
                    default_source="ocr",
                    default_page=1,
                )
            else:
                llm_error = reason

        try:
            os.unlink(path)
        except Exception:
            pass

        items = _normalize_items_for_db(items)

        return _ok(
            image_name=file.filename,
            course_name=course_name,
            items=items,
            llm_used=llm_used,
            llm_error=llm_error,
        )
    except Exception as e:
        return _err(f"{type(e).__name__}: {e}")


# ------------------------------- PLAIN TEXT (debug) ----------------------------
@app.post("/assignments/text")
def assignments_from_text(
    text: str = Body(..., embed=True, description="Raw text blob to parse"),
) -> Dict[str, Any]:
    """
    Simple text-only extraction (no OCR, no LLM).
    """
    try:
        items = extract_assignments_from_text(text or "")
        for it in items:
            it.setdefault("source", "text")
        items = _normalize_items_for_db(items)
        return _ok(items=items)
    except Exception as e:
        return _err(f"{type(e).__name__}: {e}")
