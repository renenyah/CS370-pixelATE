# app/app.py
from fastapi import FastAPI, File, UploadFile, Query
from fastapi.responses import JSONResponse, RedirectResponse
from pathlib import Path
import tempfile, io, os
import fitz  # PyMuPDF
from .extractor_core import extract_due_dates_from_pdf
from .llm_repair import have_gemini, repair_due_items

app = FastAPI(title="Syllabus Extractor")

@app.get("/")
def root():
    return {"ok": True, "docs": "/docs"}

def _pdf_text_excerpt(pdf_path: Path, max_chars: int = 5000, max_pages: int = 6) -> str:
    out = []
    try:
        with fitz.open(pdf_path) as doc:
            for i, page in enumerate(doc):
                if i >= max_pages:
                    break
                out.append(page.get_text("text") or "")
                if sum(len(s) for s in out) >= max_chars:
                    break
    except Exception:
        return ""
    text = "\n".join(out)
    return text[:max_chars]

@app.post("/assignments/due_upload")
async def assignments_due_upload(
    file: UploadFile = File(...),
    use_llm_repair: bool = Query(False, description="Use Gemini to clean/normalize result"),
):
    # Save uploaded PDF to a temp path
    file_bytes = await file.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(file_bytes)
        tmp_path = Path(tmp.name)

    try:
        # Your existing extractor returns a dict like:
        # {"status": "ok", "pdf_title": "...", "items": [...], "metadata": {...}}
        base = extract_due_dates_from_pdf(str(tmp_path))
        # In case some older version returns a tuple, take the first element
        if isinstance(base, tuple):
            base = base[0]

        title = base.get("pdf_title") or ""
        items = base.get("items", [])
        metadata = base.get("metadata", {}) or {}

        llm_used = False
        llm_error = None

        if use_llm_repair:
            if have_gemini():
                try:
                    excerpt = _pdf_text_excerpt(tmp_path)
                    items = repair_due_items(
                        items,
                        pdf_title=title,
                        pdf_text_excerpt=excerpt,
                        metadata=metadata,
                    )
                    llm_used = True
                except Exception as e:
                    llm_error = f"{type(e).__name__}: {e}"
            else:
                llm_error = "GEMINI_API_KEY/MODEL missing or library not available"

        resp = {
            "status": "ok",
            "pdf_title": title,
            "items": items,
            "llm_used": llm_used,
        }
        if llm_error:
            resp["llm_error"] = llm_error
        return JSONResponse(resp)

    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

