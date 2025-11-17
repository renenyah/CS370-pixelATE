"""
FastAPI app exposing:
- POST /assignments/pdf_upload?use_llm_repair={true|false}
- POST /assignments/image_upload?use_llm_repair={true|false}
Both return a unified structure, and the LLM step is optional.

Run:
  PYTHONPATH="$(pwd)" uvicorn app.app:app --reload --port 8000
"""

# app/app.py (top of file)
from __future__ import annotations
import os
import io
import tempfile
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Query, HTTPException
from fastapi.responses import JSONResponse

# ✅ explicit imports from the submodules (no circular/attribute confusion)
from .pdf_extractor import (
    extract_assignments_from_pdf,
    extract_assignments_from_text,  # (if you ever use it directly)
)
from .llm_repair import have_gemini, repair_due_items
from .ocr.ocr_processor import ocr_extract_assignments


ALLOWED_PDF = {"application/pdf", "application/x-pdf", "binary/octet-stream"}
ALLOWED_IMG = {"image/png", "image/jpeg", "image/jpg", "image/tiff", "image/bmp", "image/webp"}

app = FastAPI(title="Syllabus Extractor", version="1.0.0")


@app.get("/")
def root():
    return {"ok": True, "docs": "/docs"}


def _llm_if_requested(result: dict, use_llm_repair: bool):
    """
    Applies Gemini repair if requested & available. Returns (items, llm_used, llm_error)
    """
    items = result.get("items", []) or []
    excerpt = result.get("text_excerpt", "") or ""
    meta = {"pdf_title": result.get("pdf_title"), "default_year": result.get("default_year")}
    if use_llm_repair and items:
        fixed, used, err = repair_due_items(items, excerpt, meta)
        return fixed, used, err
    return items, False, None


@app.post("/assignments/pdf_upload")
async def assignments_pdf_upload(
    file: UploadFile = File(...),
    use_llm_repair: bool = Query(False, description="Use Gemini to clean/merge results")
):
    if file.content_type not in ALLOWED_PDF and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {file.content_type}")

    try:
        # Save to a temp file to hand to fitz
        with tempfile.NamedTemporaryFile(prefix="syllabus_", suffix=".pdf", delete=False) as tmp:
            data = await file.read()
            tmp.write(data)
            tmp_path = tmp.name

        base = pdf_extractor.extract_assignments_from_pdf(tmp_path)
        items, used, err = _llm_if_requested(base, use_llm_repair)

        return JSONResponse({
            "status": "ok",
            "pdf_title": base.get("pdf_title") or file.filename,
            "items": items,
            "llm_used": used,
            **({"llm_error": err} if err else {})
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            os.unlink(tmp_path)  # cleanup
        except Exception:
            pass


@app.post("/assignments/image_upload")
async def assignments_image_upload(
    file: UploadFile = File(...),
    use_llm_repair: bool = Query(False, description="Use Gemini to clean/merge results")
):
    # content-type is flaky in browsers; check extension too
    ext_ok = file.filename.lower().endswith((".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"))
    if file.content_type not in ALLOWED_IMG and not ext_ok:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {file.content_type}")

    try:
        # Save temp image
        suffix = os.path.splitext(file.filename)[1] or ".png"
        with tempfile.NamedTemporaryFile(prefix="syllabus_img_", suffix=suffix, delete=False) as tmp:
            data = await file.read()
            tmp.write(data)
            tmp_path = tmp.name

        # OCR -> extractor
        base = extract_assignments_from_pdf(tmp_path)
        items, used, err = _llm_if_requested(base, use_llm_repair)

        return JSONResponse({
            "status": "ok",
            "pdf_title": base.get("pdf_title") or "Image Upload",
            "items": items,
            "llm_used": used,
            **({"llm_error": err} if err else {})
        })
    except Exception as e:
        # bubble the traceback message
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
