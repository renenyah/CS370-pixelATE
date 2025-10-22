# app/app.py
import os
from typing import Dict, Any
import fitz  # PyMuPDF

from fastapi import FastAPI, HTTPException, Body, UploadFile, File
from fastapi.responses import RedirectResponse

app = FastAPI(title="Syllabus Extractor (single-file API)")

# ---- Routes: root redirect + health ----
@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

@app.get("/health")
def health():
    return {"ok": True}


# ---- Core extraction: your original behavior wrapped in a function ----
def extract_pdf_to_txt(pdf_path: str) -> Dict[str, Any]:
    """
    Opens the PDF by path, writes <stem>_extracted.txt,
    and returns a small summary dict with where it saved the file.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"File not found: {pdf_path}")

    # Use a context manager so the file handle is released promptly
    with fitz.open(pdf_path) as doc:
        print(f"Total Pages: {doc.page_count}")
        print("PDF Metadata:")
        print(doc.metadata)

        stem = pdf_path.rsplit("/", 1)[-1].rsplit(".", 1)[0]
        out_txt = f"{stem}_extracted.txt"

        with open(out_txt, "w", encoding="utf-8") as out:
            out.write(f"Total Pages: {doc.page_count}\n")
            out.write(f"PDF Metadata: {doc.metadata}\n\n")

            for pno, page in enumerate(doc, start=1):
                out.write(f"\n===== Page {pno} =====\n")

                # 1) Tables
                tf = page.find_tables()
                tables = tf.tables or []
                out.write(f"Found {len(tables)} table(s)\n")

                table_bboxes = []
                for i, tab in enumerate(tables, start=1):
                    table_bboxes.append(fitz.Rect(tab.bbox))
                    out.write(f"\n--- Table {i} (plain text) ---\n")
                    rows = tab.extract()
                    for row in rows:
                        cells = [(c or "").replace("\n", " ").strip() for c in row]
                        out.write(" | ".join(cells) + "\n")

                # 2) Non-table text
                out.write("\n--- Text (excluding tables) ---\n")
                for (x0, y0, x1, y1, text, *_) in page.get_text("blocks"):
                    if not text or not text.strip():
                        continue
                    block_rect = fitz.Rect(x0, y0, x1, y1)
                    if any(block_rect.intersects(tb) for tb in table_bboxes):
                        continue
                    out.write(text.strip() + "\n")

        print(f"Saved plain text output → {out_txt}")

        return {
            "saved_to": os.path.abspath(out_txt),
            "total_pages": doc.page_count,
            "metadata": doc.metadata,
        }


# ---- Dev helper: parse a local path (handy while developing) ----
@app.post("/debug/parse_local")
def parse_local(file_path: str = Body(..., embed=True)):
    """
    Call with: {"file_path": "/absolute/or/relative/path.pdf"}
    Runs the same extractor and returns where the .txt was written.
    """
    try:
        summary = extract_pdf_to_txt(file_path)
        return {"status": "ok", **summary}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}")


# ---- Upload endpoint: send a PDF directly (no filesystem paths needed) ----
@app.post("/process_file")
async def process_file(file: UploadFile = File(...)):
    """
    Upload a PDF (multipart/form-data). We write it to a secure temp file
    only to reuse your existing function, then delete it.
    """
    if file.content_type not in {"application/pdf"}:
        raise HTTPException(status_code=400, detail="Please upload a PDF")

    import tempfile

    # Save to a temp .pdf so we can call extract_pdf_to_txt without changing your logic
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
