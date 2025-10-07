import pdfplumber

with pdfplumber.open("syllabus.pdf") as pdf:
    page = pdf.pages[0]
    text = page.extract_text()
    print(text)

    