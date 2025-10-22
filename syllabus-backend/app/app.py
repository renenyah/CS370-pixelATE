# app/app.py
import os
import re
from typing import Dict, Any, List, Optional

import fitz  # PyMuPDF
from fastapi import FastAPI, HTTPException, Body, UploadFile, File
from fastapi.responses import RedirectResponse

app = FastAPI(title="Syllabus Extractor (single-file API)")

# --------------------------- Root + Health ---------------------------

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

@app.get("/health")
def health():
    return {"ok": True}


# --------------- ORIGINAL extractor (tables + non-table text) ---------------

def extract_pdf_to_txt(pdf_path: str) -> Dict[str, Any]:
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"File not found: {pdf_path}")

    with fitz.open(pdf_path) as doc:
        stem = pdf_path.rsplit("/", 1)[-1].rsplit(".", 1)[0]
        out_txt = f"{stem}_extracted.txt"

        with open(out_txt, "w", encoding="utf-8") as out:
            out.write(f"Total Pages: {doc.page_count}\n")
            out.write(f"PDF Metadata: {dict(doc.metadata or {})}\n\n")

            for pno, page in enumerate(doc, start=1):
                out.write(f"\n===== Page {pno} =====\n")

                tf = page.find_tables()
                tables = tf.tables or []
                out.write(f"Found {len(tables)} table(s)\n")

                table_bboxes = []
                for i, tab in enumerate(tables, start=1):
                    table_bboxes.append(fitz.Rect(tab.bbox))
                    out.write(f"\n--- Table {i} (plain text) ---\n")
                    rows = tab.extract() or []
                    for row in rows:
                        cells = [(c or "").replace("\n", " ").strip() for c in row]
                        out.write(" | ".join(cells) + "\n")

                out.write("\n--- Text (excluding tables) ---\n")
                for (x0, y0, x1, y1, text, *_) in page.get_text("blocks"):
                    if not text or not text.strip():
                        continue
                    block_rect = fitz.Rect(x0, y0, x1, y1)
                    if any(block_rect.intersects(tb) for tb in table_bboxes):
                        continue
                    out.write(text.strip() + "\n")

        # <<< capture BEFORE the with-block closes >>>
        total_pages = doc.page_count
        metadata = dict(doc.metadata or {})

    return {
        "saved_to": os.path.abspath(out_txt),
        "total_pages": total_pages,
        "metadata": metadata,
    }


# --------------- ASSIGNMENTS extractor (small, robust tweaks) ---------------

# Broad, editable keywords (covers many syllabus styles)
ASSIGNMENT_RE = re.compile(
    r"\b("
    r"assignment|homework|problem\s*set|ps\s*\d+|quiz|exam|midterm|final\s*exam|"
    r"project|paper|essay|lab|presentation|reading|discussion|exercise|reflection"
    r")\b",
    re.IGNORECASE,
)

# Date-only context lines (e.g., "Sep 2nd", "Sept 2", "11/04", "11/4/25")
DATE_CONTEXT_RE = re.compile(
    r"^\s*(?:"
    r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{2,4})?"
    r"|"
    r"\d{1,2}/\d{1,2}(?:/\d{2,4})?"
    r")\s*$",
    re.IGNORECASE,
)

# Inline “due/by on …” on the same line
INLINE_DATE_RE = re.compile(
    r"(?:due|by)\s+(?:on\s+)?("
    r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{2,4})?"
    r"|\d{1,2}/\d{1,2}(?:/\d{2,4})?"
    r")",
    re.IGNORECASE,
)

ORDINAL_SUFFIX_RE = re.compile(r"(\d+)(st|nd|rd|th)\b", re.IGNORECASE)

def _clean_lines(raw: str) -> List[str]:
    """Undo hyphenation at line breaks and normalize whitespace."""
    if not raw:
        return []
    txt = re.sub(r"(\w)-\n(\w)", r"\1\2", raw)  # as-\nsignments -> assignments
    txt = txt.replace("\r\n", "\n").replace("\r", "\n")
    txt = re.sub(r"[ \t]+", " ", txt)
    lines = [ln.strip() for ln in txt.split("\n")]
    return [ln for ln in lines if ln]

def _strip_ordinals(s: str) -> str:
    return ORDINAL_SUFFIX_RE.sub(r"\1", s or "")

def extract_assignments_to_txt(pdf_path: str) -> Dict[str, Any]:
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"File not found: {pdf_path}")

    results: List[Dict[str, Any]] = []

    with fitz.open(pdf_path) as doc:
        stem = pdf_path.rsplit("/", 1)[-1].rsplit(".", 1)[0]
        out_txt = f"{stem}_assignments.txt"

        with open(out_txt, "w", encoding="utf-8") as out:
            out.write(f"Total Pages: {doc.page_count}\n")
            out.write(f"PDF Metadata: {dict(doc.metadata or {})}\n\n")

            for pno, page in enumerate(doc, start=1):
                lines = _clean_lines(page.get_text("text") or "")
                current_date: Optional[str] = None

                def maybe_emit(ln: str):
                    m = INLINE_DATE_RE.search(ln)
                    date_text = _strip_ordinals(m.group(1)) if m else (_strip_ordinals(current_date) if current_date else None)
                    results.append({"page": pno, "line": ln, "date_text": date_text})

                for ln in lines:
                    if DATE_CONTEXT_RE.match(ln):
                        current_date = ln
                        continue
                    if ASSIGNMENT_RE.search(ln):
                        maybe_emit(ln)

                tf = page.find_tables()
                for tab in (tf.tables or []):
                    rows = (tab.extract() or [])
                    current_date = None
                    for row in rows:
                        ln = " | ".join((c or "").strip() for c in row if c is not None)
                        if not ln:
                            continue
                        if DATE_CONTEXT_RE.match(ln):
                            current_date = ln
                            continue
                        if ASSIGNMENT_RE.search(ln) or INLINE_DATE_RE.search(ln):
                            maybe_emit(ln)

                page_hits = [r for r in results if r["page"] == pno]
                if page_hits:
                    out.write(f"\n===== Page {pno} =====\n")
                    for r in page_hits:
                        out.write(f'{r["line"]}   || date_text={r.get("date_text") or "—"}\n')

        # <<< capture BEFORE the with-block closes >>>
        total_pages = doc.page_count
        metadata = dict(doc.metadata or {})

    return {
        "saved_to": os.path.abspath(out_txt),
        "total_pages": total_pages,
        "metadata": metadata,
        "assignments": results,
    }



# ------------------------------- Endpoints -------------------------------

# Original text extractor via local path
@app.post("/debug/parse_local")
def parse_local(file_path: str = Body(..., embed=True)):
    try:
        summary = extract_pdf_to_txt(file_path)
        return {"status": "ok", **summary}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}")


# Original text extractor via upload
@app.post("/process_file")
async def process_file(file: UploadFile = File(...)):
    if not (file.content_type == "application/pdf" or file.filename.lower().endswith(".pdf")):
        raise HTTPException(status_code=400, detail="Please upload a PDF")

    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(await file.read())
        temp_path = tmp.name

    try:
        summary = extract_pdf_to_txt(temp_path)
        return {"status": "ok", **summary}
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass


# Assignments-only via local path
@app.post("/assignments/parse_local")
def assignments_parse_local(file_path: str = Body(..., embed=True)):
    try:
        data = extract_assignments_to_txt(file_path)
        return {"status": "ok", **data}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}")


# Assignments-only via upload
@app.post("/assignments/process_file")
async def assignments_process_file(file: UploadFile = File(...)):
    if not (file.content_type == "application/pdf" or file.filename.lower().endswith(".pdf")):
        raise HTTPException(status_code=400, detail="Please upload a PDF")

    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(await file.read())
        temp_path = tmp.name

    try:
        data = extract_assignments_to_txt(temp_path)
        return {"status": "ok", **data}
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass
#this is a check