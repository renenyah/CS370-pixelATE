from PIL import Image
from pytesseract import pytesseract

#defining path to tesseract.exe
path_to_tesseract = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

#defining path to image
path_to_image = r'C:\Users\kayla\OneDrive\Documents\GitHub\CS370-pixelATE\syllabus-backend\app\ocr\test_files\hlth111.png'

#point tesseract_cmd to tesseract.exe
pytesseract.tesseract_cmd = path_to_tesseract


#opening image w PIL
img = Image.open(path_to_image)

#extracting the text from image
text = pytesseract.image_to_string(img)

print(text)