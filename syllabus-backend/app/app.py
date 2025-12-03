from __future__ import annotations

import os
import tempfile
from typing import Any, Dict, Optional

from fastapi import FastAPI, UploadFile, File, Query, Body
from fastapi.middleware.cors import CORSMiddleware

# Load .env early so endpoints see keys
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

app = FastAPI(title="Syllabus Assignment Extractor", version="1.0.0")

# Import project modules AFTER app is created to avoid circulars
from .pdf_extractor import (  # noqa: E402
    extract_assignments_from_pdf_bytes,
    extract_assignments_from_text,
)
from .llm_repair import is_gemini_ready, repair_due_items  # noqa: E402

# Optional OCR import—kept as-is (thin wrapper call only)
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


# ------------------------------- Root / Health --------------------------------
@app.get("/")
def root() -> Dict[str, Any]:
    ok, reason = is_gemini_ready()
    return {
        "ok": True,
        "gemini_configured": ok,
        "gemini_reason": ("" if ok else reason),
        "model": os.getenv("GEMINI_MODEL", "gemini-2.5-pro"),
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


# ------------------------------- helpers for LLM merge ------------------------
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
        key = ((it.get("title") or "").strip(), (it.get("due_date_raw") or "").strip())
        meta_map[key] = {
            "course": (it.get("course") or "").strip(),
            "page": it.get("page"),
            "source": it.get("source"),
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

        merged.append(out)

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
    UI flow:
      - Upload a syllabus PDF
      - If use_llm=true and Gemini is configured, AI "repair" will run
    Returns:
      {
        status: "ok" | "error",
        pdf_name: str,
        course_name: str,
        items: [{title, due_date_raw, due_date_iso, page?, course?, source?}],
        llm_used: bool,
        llm_error: str | null
      }
    """
    try:
        data = await file.read()
        pdf_info = extract_assignments_from_pdf_bytes(data)
        course_name = pdf_info.get("course_name") or ""
        items = pdf_info.get("items") or []
        full_text = pdf_info.get("full_text") or ""

        # Mark source for PDF pipeline so UI can tell later if it wants to
        for it in items:
            it.setdefault("source", "pdf")

        llm_used = False
        llm_error: Optional[str] = None

        if use_llm and items:
            ok, reason = is_gemini_ready()
            if ok:
                # Prefer the entire PDF text for Gemini context
                # Fallback to a small summary if full_text is empty
                text_blob = full_text or "\n".join(
                    f"- {it.get('title','')}  (due: {it.get('due_date_raw','')})"
                    for it in items
                )

                # Optional: truncate very long syllabi for safety / cost
                # Adjust this limit if needed.
                max_chars = int(os.getenv("PDF_LLM_MAX_CHARS", "20000"))
                text_blob = text_blob[:max_chars]

                result = repair_due_items(text_blob, seed_items=items)
                llm_items = result.get("items", items)
                llm_used = True
                llm_error = result.get("error")

                # Re-attach course/page/source metadata
                items = _merge_llm_items_with_meta(
                    llm_items,
                    seed_items=items,
                    course_name=course_name,
                    default_source="pdf",
                )
            else:
                llm_error = reason

        return _ok(
            pdf_name=file.filename,
            course_name=course_name,
            items=items,
            llm_used=llm_used,
            llm_error=llm_error,
        )
    except Exception as e:
        return _err(f"{type(e).__name__}: {e}")


# ------------------------------- IMAGE (uses your OCR, if available) ----------
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
    UI flow:
      - Upload an image (screenshot/photo)
      - OCR runs to extract assignments
      - If use_llm=true, Gemini cleans the extracted items
    """
    if ocr_extract_assignments is None:
        return _err("OCR not available: could not import app.ocr.ocr_processor")

    try:
        raw = await file.read()
        suffix = os.path.splitext(file.filename or "")[1] or ".png"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(raw)
            path = tmp.name

        items = ocr_extract_assignments(path, preprocess_method=preprocess)  # already has course/page/source
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

                # Re-attach per-assignment metadata
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
    UI flow: paste syllabus text, tap "Parse Syllabus".
    """
    try:
        items = extract_assignments_from_text(text or "")
        # mark source for consistency
        for it in items:
            it.setdefault("source", "text")
        return _ok(items=items)
    except Exception as e:
        return _err(f"{type(e).__name__}: {e}")
