import fitz # This is actually PyMuPDF
import re # regular expressions to find keywords and date partters

# Load the PDF
pdf_path = "mathSyllabus.pdf"
doc = fitz.open(pdf_path)
stem = pdf_path.rsplit("/", 1)[-1].rsplit(".", 1)[0] #extracts filename without extension
out_txt = f"{stem}_assignments.txt" #output file where results will be saved


# defining regex patters, looks for "assignmtn-like" lines
assignment_keywords = re.compile(
    r"\b(assignment|homework|quiz|exam|project|paper|essay|lab|task|test|assesment|presentation|reading|discussion|excercise|reflection)\b", 
    re.IGNORECASE)

#looking for date-like or "Due" phrases
date_patterns = re.compile(
    r"\b("
    r"(?:Jan|Feb|Mar|Apr|May|Aug|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2}"
    r"|\d{1,2}/\d{1,2(?:/\d{2,4})?"
    r"|\b(?:due|by)\s+(?:on\s+)(?:[A-Za-z]+\s+\d{1,2}|\d{1,2}/\d{1,2})"
    r")\b",
    re.IGNORECASE
)

# Print the number of pages
print(f"Total Pages: {doc.page_count}")

# Print metadata
print("PDF Metadata:")
print(doc.metadata)


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
# -----------------------------------------------------------------
        # Extract text from the current page
        # -----------------------------------------------------------------
        # The "text" mode keeps a continuous flow of text.
        # Other modes like "blocks" or "dict" return structured layouts.
        text = page.get_text("text")

        # Split the text into separate lines for easier scanning.
        # Each line may represent a sentence, list item, or paragraph.
        lines = text.splitlines()

        # -----------------------------------------------------------------
        # Filter for lines that mention assignments or due dates
        # -----------------------------------------------------------------
        relevant_lines = []

        for line in lines:
            # Remove leading/trailing spaces
            cleaned_line = line.strip()

            # Skip completely empty lines
            if not cleaned_line:
                continue

            # Check whether the line contains:
            #   - an assignment keyword (e.g., "Assignment", "Exam", "Project")
            #   - or a date/due-related phrase
            if assignment_keywords.search(cleaned_line) or date_patterns.search(cleaned_line):
                relevant_lines.append(cleaned_line)

        # -----------------------------------------------------------------
        # Write results to output file
        # -----------------------------------------------------------------
        # Only write something if we actually found relevant lines.
        if relevant_lines:
            out.write(f"\n===== Page {pno} =====\n")
            for l in relevant_lines:
                out.write(l + "\n")


# When the "with" block exits, the file is closed. Print a success message for the user.
print(f"extracted assignment-related info saved to → {out_txt}")
