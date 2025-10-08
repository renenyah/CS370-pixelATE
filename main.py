from PyPDF2 import PdfReader

reader = PdfReader("mathSyllabus.pdf")

with open("extracted.txt", "w") as f:

    for page in reader.pages:
        txt = page.extract_text()
        if t:
            f.write(t + "\n")