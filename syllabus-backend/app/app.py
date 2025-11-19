from __future__ import annotations

import os
import tempfile
from typing import Any, Dict, List, Optional

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


# ------------------------------- PDF ------------------------------------------
@app.post("/assignments/pdf")
async def assignments_pdf_upload(
    file: UploadFile = File(..., description="Upload a syllabus PDF"),
    use_llm: bool = Query(
        False,
        description="If on and Gemini is configured, try to repair/normalize results."
    ),
) -> Dict[str, Any]:
    try:
        data = await file.read()
        items = extract_assignments_from_pdf_bytes(data)

        llm_used = False
        llm_error: Optional[str] = None

        if use_llm:
            ok, reason = is_gemini_ready()
            if ok:
                # Build a single concatenated text for LLM context
                text_blob = "\n".join(
                    f"- {it.get('title','')}  (due: {it.get('due_date_raw','')})"
                    for it in items
                )
                result = repair_due_items(text_blob, seed_items=items)
                items = result.get("items", items)
                llm_used = True
                llm_error = result.get("error")
            else:
                llm_error = reason

        return _ok(pdf_name=file.filename, items=items, llm_used=llm_used, llm_error=llm_error)
    except Exception as e:
        return _err(f"{type(e).__name__}: {e}")


# ------------------------------- IMAGE (uses your OCR, if available) ----------
@app.post("/assignments/image")
async def assignments_image_upload(
    file: UploadFile = File(..., description="Upload a syllabus screenshot/photo"),
    preprocess: str = Query("adaptive", description="Passed through to your OCR (if supported)"),
    use_llm: bool = Query(False, description="Repair/normalize with Gemini if configured"),
) -> Dict[str, Any]:
    if ocr_extract_assignments is None:
        return _err("OCR not available: could not import app.ocr.ocr_processor")

    try:
        raw = await file.read()
        suffix = os.path.splitext(file.filename or "")[1] or ".png"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(raw)
            path = tmp.name

        items = ocr_extract_assignments(path, preprocess_method=preprocess)

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
                items = result.get("items", items)
                llm_used = True
                llm_error = result.get("error")
            else:
                llm_error = reason

        try:
            os.unlink(path)
        except Exception:
            pass

        return _ok(image_name=file.filename, items=items, llm_used=llm_used, llm_error=llm_error)
    except Exception as e:
        return _err(f"{type(e).__name__}: {e}")


# ------------------------------- PLAIN TEXT (debug) ----------------------------
@app.post("/assignments/text")
def assignments_from_text(
    text: str = Body(..., embed=True, description="Raw text blob to parse")
) -> Dict[str, Any]:
    try:
        items = extract_assignments_from_text(text or "")
        return _ok(items=items)
    except Exception as e:
        return _err(f"{type(e).__name__}: {e}")
