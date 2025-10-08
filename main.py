import fitz # This is actually PyMuPDF
# Load the PDF
pdf_path = "mathSyllabus.pdf"

doc = fitz.open(pdf_path)


# Print the number of pages
print(f"Total Pages: {doc.page_count}")

# Print metadata
print("PDF Metadata:")
print(doc.metadata)

# Derive a simple "stem" (filename without folder and extension) to name the output .txt file.
# Example: "folder/mathSyllabus.pdf" -> stem becomes "mathSyllabus"
stem = pdf_path.rsplit("/", 1)[-1].rsplit(".", 1)[0]

# Create an output text file where we'll write:
#   1) document-level metadata,
#   2) per-page tables (as plain text),
#   3) per-page text that EXCLUDES table regions (cleaner narrative text).
out_txt = f"{stem}_extracted.txt"

# Open the output file once and write everything sequentially.
# Using "with" ensures the file is closed properly even if an error occurs.
with open(out_txt, "w", encoding="utf-8") as out:
    # ---- Document-level info ----
    # Total number of pages in the PDF
    out.write(f"Total Pages: {doc.page_count}\n")
    # PDF metadata (title, author, creation date, etc.), if available
    out.write(f"PDF Metadata: {doc.metadata}\n\n")

    # Iterate over each page in the document.
    # enumerate(..., start=1) gives human-friendly page numbers (1-based)
    for pno, page in enumerate(doc, start=1):
        out.write(f"\n===== Page {pno} =====\n")

        # ---------------------------------------------------------
        # 1) Find tables on the current page
        # ---------------------------------------------------------
        # page.find_tables() returns a TableFinder object which analyzes the page’s layout
        # and detects rectangular table structures (lines, aligned text, etc.).
        tf = page.find_tables()
        # .tables is a list of Table objects (may be empty if no tables were found)
        tables = tf.tables or []
        out.write(f"Found {len(tables)} table(s)\n")

        # We'll collect table bounding boxes so we can exclude them from the plain text later.
        table_bboxes = []

        # Loop through each detected table
        for i, tab in enumerate(tables, start=1):
            # Save the table's bounding box as a fitz.Rect. We'll use this to filter text blocks.
            table_bboxes.append(fitz.Rect(tab.bbox))

            # ---------------------------------------------------------
            # 2) Write the table as PLAIN TEXT
            # ---------------------------------------------------------
            out.write(f"\n--- Table {i} (plain text) ---\n")

            # tab.extract() returns the table content as a list of rows,
            # where each row is a list of cell strings.
            # Some cells may contain newlines or be None; we clean them below.
            rows = tab.extract()

            # Write each row as a single line, joining cell texts with " | " for readability.
            for row in rows:
                # Normalize cell text:
                # - replace embedded newlines so each cell stays on one line
                # - strip surrounding whitespace
                # - handle None gracefully by converting to empty string
                cells = [(c or "").replace("\n", " ").strip() for c in row]
                out.write(" | ".join(cells) + "\n")

        # ---------------------------------------------------------
        # 3) Extract and write non-table text from the page
        # ---------------------------------------------------------
        # Instead of grabbing raw page text (which would include table text and jumble columns),
        # we ask PyMuPDF for "blocks"—rectangular text regions with coordinates—so we can
        # exclude any block that overlaps a detected table area.
        out.write("\n--- Text (excluding tables) ---\n")

        # page.get_text("blocks") returns a list of tuples:
        # (x0, y0, x1, y1, text, block_no, ...). We only need coordinates + text.
        for (x0, y0, x1, y1, text, *_) in page.get_text("blocks"):
            # Skip empty or whitespace-only blocks
            if not text or not text.strip():
                continue

            # Make a rectangle for this text block so we can test overlap with table areas
            block_rect = fitz.Rect(x0, y0, x1, y1)

            # If this block intersects ANY table bounding box, we skip it.
            # This keeps the main narrative text cleaner and separate from tables.
            if any(block_rect.intersects(tb) for tb in table_bboxes):
                continue

            # Write the cleaned block text to the file (one block per line for readability).
            out.write(text.strip() + "\n")

# When the "with" block exits, the file is closed. Print a success message for the user.
print(f"Saved plain text output → {out_txt}")