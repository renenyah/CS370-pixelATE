from PyPDF2 import PdfReader

#gets file
reader = PdfReader("mathSyllabus.pdf")

with open("extracted.txt", "w", encoding="utf-8") as f:

    for page_num, page in enumerate(reader.pages):
        txt = page.extract_text()
        f.write(f"-----Page {page_num + 1}----- \n")
        if txt:
            f.write(txt + "\n")
        f.write("\n\n")