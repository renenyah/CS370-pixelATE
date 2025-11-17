<<<<<<< HEAD
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
import cv2
import numpy as np
import os
import sys 
import re
"""
need to make sure that tesseract is in the server's path: the following is hardcoded for personal use
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

"""

os.environ['TESSDATA_PREFIX'] = '/usr/share/tesseract-ocr/4.00/tessdata' # Optional, for Linux/Server setup

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def preprocess_image(image_path, method = 'standard'):
    """
    preprocessing to improve OCR accuracy
    will return the preprocessed PIL image object
    """

    # reading the image with OpenCV for advanced preprocessing
    img_cv = cv2.imread(image_path)

    if img_cv is None:
        raise ValueError(f"Could not read image at {image_path}")
    
    #converting the image to grayscale
    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)

    if method == 'standard':
        #resizing and denoising
        #upscaling by 2x for better OCR
        scale_percent = 200
        width = int(gray.shape[1]* scale_percent / 100)
        height = int(gray.shape[0]* scale_percent / 100)
        resized = cv2.resize(gray, (width, height), interpolation = cv2.INTER_CUBIC)

        #denoise
        denoised = cv2.fastNlMeansDenoising(resized, None, 10, 7, 21)

        #convert bac to PIL
        return Image.fromarray(denoised)
    
    elif method == 'aggressive':
        # Aggressive preprocessing: rescale, denoise, sharpen, binarize
        # Upscale by 2x
=======
"""
OCR utilities (keeps your original style) + a thin bridge to the extractor.
"""

from __future__ import annotations
import os
import re
import cv2
import numpy as np
from typing import Dict, List, Optional

import pytesseract
from PIL import Image, ImageEnhance, ImageFilter

# Optional: allow override via env (Mac Homebrew default is usually just 'tesseract' in PATH)
TESSERACT_CMD = os.getenv("TESSERACT_CMD")
if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

# ---- Your original preprocessing helpers ----

def preprocess_image(image_path: str, method: str = 'standard') -> Image.Image:
    img_cv = cv2.imread(image_path)
    if img_cv is None:
        raise ValueError(f"Could not read image at {image_path}")

    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)

    if method == 'standard':
        scale_percent = 200
        width = int(gray.shape[1] * scale_percent / 100)
        height = int(gray.shape[0] * scale_percent / 100)
        resized = cv2.resize(gray, (width, height), interpolation=cv2.INTER_CUBIC)
        denoised = cv2.fastNlMeansDenoising(resized, None, 10, 7, 21)
        return Image.fromarray(denoised)

    elif method == 'aggressive':
>>>>>>> Kultum
        scale_percent = 200
        width = int(gray.shape[1] * scale_percent / 100)
        height = int(gray.shape[0] * scale_percent / 100)
        resized = cv2.resize(gray, (width, height), interpolation=cv2.INTER_CUBIC)
<<<<<<< HEAD
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(resized, None, 10, 7, 21)
        
        # Apply binary threshold (Otsu's method)
        _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Convert to PIL and sharpen
        pil_img = Image.fromarray(binary)
        sharpened = pil_img.filter(ImageFilter.SHARPEN)
        
        return sharpened
    
    elif method == 'adaptive':
        # Adaptive thresholding - good for varying lighting
        # Upscale by 2x
=======
        denoised = cv2.fastNlMeansDenoising(resized, None, 10, 7, 21)
        _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        pil_img = Image.fromarray(binary)
        return pil_img.filter(ImageFilter.SHARPEN)

    elif method == 'adaptive':
>>>>>>> Kultum
        scale_percent = 200
        width = int(gray.shape[1] * scale_percent / 100)
        height = int(gray.shape[0] * scale_percent / 100)
        resized = cv2.resize(gray, (width, height), interpolation=cv2.INTER_CUBIC)
<<<<<<< HEAD
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(resized, None, 10, 7, 21)
        
        # Adaptive threshold
        adaptive = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        
        return Image.fromarray(adaptive)
    
    elif method == 'grayscale':
        # Simple grayscale with contrast enhancement
        pil_img = Image.fromarray(gray)
        enhancer = ImageEnhance.Contrast(pil_img)
        enhanced = enhancer.enhance(2.0)
        
        return enhanced
    
    else:
        # Default: return grayscale
        return Image.fromarray(gray)



def extract_text_from_image(image_path, preprocess_method='standard', 
                           save_preprocessed=False, output_dir='preprocessed'):
    """
    Extract text from an image using OCR with preprocessing
    
    arguments:
        image_path: Path to the image file
        preprocess_method: Method for preprocessing ('standard', 'aggressive', 'adaptive', 'grayscale', 'none')
        save_preprocessed: Whether to save the preprocessed image
        output_dir: Directory to save preprocessed images
    
        returns: extracted text as string
    """
    try:
        # Open the image
        if preprocess_method == 'none':
            img = Image.open(image_path)
        else:
            img = preprocess_image(image_path, preprocess_method)
        
        # Save preprocessed image if requested
        if save_preprocessed:
            os.makedirs(output_dir, exist_ok=True)
            base_name = os.path.basename(image_path)
            name, ext = os.path.splitext(base_name)
            preprocessed_path = os.path.join(output_dir, f"{name}_preprocessed_{preprocess_method}{ext}")
            img.save(preprocessed_path)
            print(f"Preprocessed image saved to: {preprocessed_path}")
        
        # Configure tesseract for better accuracy
        custom_config = r'--oem 3 --psm 6'
        text = pytesseract.image_to_string(img, config=custom_config)
        
        return text
    
    except Exception as e:
        return f"Error: {str(e)}"

def extract_text_with_bounding_boxes(image_path, preprocess_method='standard',
                                    min_confidence=60):
    """
    Extract text with bounding box information and confidence scores
    
    Args:
        image_path: Path to the image file
        preprocess_method: Method for preprocessing
        min_confidence: Minimum confidence threshold (0-100)
    
    Returns:
        Dictionary with text and bounding box data
    """
    try:
        if preprocess_method == 'none':
            img = Image.open(image_path)
        else:
            img = preprocess_image(image_path, preprocess_method)
        
        # Get detailed OCR data
        custom_config = r'--oem 3 --psm 6'
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT, 
                                         config=custom_config)
        
        # Filter by confidence and organize data
        filtered_data = {
            'text': [],
            'confidence': [],
            'bounding_boxes': [],
            'full_text': ''
        }
        
        n_boxes = len(data['text'])
        for i in range(n_boxes):
            conf = int(data['conf'][i])
            text = data['text'][i].strip()
            
            if conf > min_confidence and text:
                filtered_data['text'].append(text)
                filtered_data['confidence'].append(conf)
                filtered_data['bounding_boxes'].append({
                    'x': data['left'][i],
                    'y': data['top'][i],
                    'width': data['width'][i],
                    'height': data['height'][i]
                })
        
        # Get full text
        filtered_data['full_text'] = ' '.join(filtered_data['text'])
        
        return filtered_data
    
    except Exception as e:
        return f"Error: {str(e)}"

def visualize_bounding_boxes(image_path, preprocess_method='standard',
                            min_confidence=60, output_path='output_boxes.png'):
    """
    Visualize bounding boxes on the image
    
    Args:
        image_path: Path to the image file
        preprocess_method: Method for preprocessing
        min_confidence: Minimum confidence threshold
        output_path: Path to save the output image with boxes
    """
    try:
        # Read original image for visualization
        img_cv = cv2.imread(image_path)
        
        # Get preprocessed image for OCR
        if preprocess_method == 'none':
            img = Image.open(image_path)
        else:
            img = preprocess_image(image_path, preprocess_method)
        
        # Get bounding box data
        custom_config = r'--oem 3 --psm 6'
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT,
                                         config=custom_config)
        
        n_boxes = len(data['text'])
        for i in range(n_boxes):
            conf = int(data['conf'][i])
            text = data['text'][i].strip()
            
            if conf > min_confidence and text:
                x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
                
                # Draw rectangle
                cv2.rectangle(img_cv, (x, y), (x + w, y + h), (0, 255, 0), 2)
                
                # Add confidence score
                cv2.putText(img_cv, f"{conf}%", (x, y - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
        
        # Save the output
        cv2.imwrite(output_path, img_cv)
        print(f"Bounding box visualization saved to: {output_path}")
        
    except Exception as e:
        print(f"Error: {str(e)}")

def save_text_to_file(text, output_path='extracted_text.txt'):
    """
    Save extracted text to a text file
    
    Args:
        text: Text to save
        output_path: Path to save the text file
    """
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f"Text saved to: {output_path}")
    except Exception as e:
        print(f"Error saving text: {str(e)}")

def extract_assignments_and_dates(full_text):
    """
    using regex to search for the relevant information about assignments
    """
    # Define common date formats
    date_patterns = (
        r"("
        # Match Month Day, Year (e.g., Dec 15, 2025). Added Jun, Jul. Made Year optional.
        r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?" 
        # Match MM/DD/YY(YY)
        r"|\d{1,2}/\d{1,2}(?:/\d{2,4})?"
        r"|\b(?:due|by)\s+[:\s-]*\s*(?:[A-Za-z]+\s+\d{1,2}|\d{1,2}/\d{1,2})" 
        r"|\b(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|due by|by)\s+\d{1,2}"

        r")" 
    )
    
    assignments_keywords = r"([A-Za-z0-9\s()./-]+?)\s*(?:Due|DUE|DEADLINE|assignment|homework|quiz|exam|project|paper|essay|lab|task|test|assesment|presentation|reading|discussion|excercise|reflection)\s*[:\s-]*"
    
    # Define the full regex pattern (Title + Keyword + Date)
    regex_pattern = re.compile(
        assignments_keywords + date_patterns,
        re.IGNORECASE  | re.DOTALL # Makes the match case-insensitive for keywords like 'Due'
    )
    
    # Find all matches in the text
    matches = regex_pattern.findall(full_text)
    
    results = []
    for title, date in matches:
        results.append({
            'title': title.strip(),
            'due_date': date.strip()
        })
    return results

# New function that the backend will call
def process_syllabus_image(image_path: str, preprocess_method: str = 'adaptive'):
    """
    Runs the full OCR and assignment extraction pipeline.

    Args:
        image_path: The local path to the image file uploaded by the user.
        preprocess_method: The method to use for image preprocessing.

    Returns:
        A list of dictionaries containing assignment title and due date.
    """
    
    # 1. Run OCR (using the best method for clean text)
    bbox_data = extract_text_with_bounding_boxes(
        image_path, 
        preprocess_method=preprocess_method, 
        min_confidence=60
    )
    
    # Check for error or empty data
    if isinstance(bbox_data, str) or not bbox_data.get('full_text'):
        # Return an empty list if OCR failed
        return []

    # 2. Extract assignments using the refined regex
    assignments = extract_assignments_and_dates(bbox_data['full_text'])
    
    # 3. Return the clean list of dicts
    return assignments

# The only code left in the test block is for local development testing
if __name__ == "__main__":
    # Define image path relatively or via simple OS path for local testing only!
    local_test_image = os.path.join('test_files', 'hlth111.png') 
    
    if os.path.exists(local_test_image):
        print("--- RUNNING LOCAL TEST ---")
        # Call the new main function
        extracted_data = process_syllabus_image(local_test_image)
        
        # Print the output (you can remove this print statement for API use)
        for item in extracted_data:
            print(f"Assignment: {item['title']} | Due: {item['due_date']}")
    else:
        print("Local test image not found.")

"""
# Old Test the functions
if __name__ == "__main__":
    test_image = r'C:\Users\kayla\OneDrive\Documents\GitHub\CS370-pixelATE\syllabus-backend\app\ocr\test_files\hlth111.png'
    
    if os.path.exists(test_image):
        print("=" * 60)
        print("Testing Different Preprocessing Methods")
        print("=" * 60)
        
        methods = ['none', 'standard', 'aggressive', 'adaptive', 'grayscale']
        
        for method in methods:
            print(f"\n--- Method: {method.upper()} ---")
            text = extract_text_from_image(test_image, preprocess_method=method,
                                         save_preprocessed=True)
            print(f"Extracted {len(text.split())} words")
            print(f"First 200 characters: {text[:200]}")
        
        print("\n" + "=" * 60)
        print("Extracting with Bounding Boxes (Standard Method)")
        print("=" * 60)
        
        bbox_data = extract_text_with_bounding_boxes(test_image, 
                                                     preprocess_method='adaptive',
                                                     min_confidence=60)
        
        if isinstance(bbox_data, dict):
            print(f"\nFound {len(bbox_data['text'])} text elements")
            print(f"Average confidence: {sum(bbox_data['confidence'])/len(bbox_data['confidence']):.1f}%")
            print(f"\nFull extracted text:\n{bbox_data['full_text']}")
        
            #assignment extraction
            print("\n" + "=" * 60)
            print("ASSIGNMENTS & DUE DATES (Extracted)")
            print("=" * 60)
            
            assignments = extract_assignments_and_dates(bbox_data['full_text'])
            
            if assignments:
                for item in assignments:
                    print(f" Assignment: {item['title']} | Due: {item['due_date']}")
            else:
                print("No assignments and due dates found with the current pattern.")

            # Save to file
            save_text_to_file(bbox_data['full_text'], 'preprocessed/syllabus_text.txt')
            
            # Visualize bounding boxes
            visualize_bounding_boxes(test_image, preprocess_method='standard',
                                   min_confidence=60, output_path='preprocessed/bounding_boxes.png')
        
    else:
        print(f"Please place a test image at: {test_image}")
        print("\nTip: For syllabus PDFs, convert them to images first using:")
        print("  pdf2image library or online converters")
"""
=======
        denoised = cv2.fastNlMeansDenoising(resized, None, 10, 7, 21)
        adaptive = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        return Image.fromarray(adaptive)

    elif method == 'grayscale':
        pil_img = Image.fromarray(gray)
        return ImageEnhance.Contrast(pil_img).enhance(2.0)

    else:
        return Image.fromarray(gray)


def extract_text_from_image(image_path: str, preprocess_method: str = 'standard',
                            save_preprocessed: bool = False, output_dir: str = 'preprocessed') -> str:
    try:
        img = Image.open(image_path) if preprocess_method == 'none' else preprocess_image(image_path, preprocess_method)

        if save_preprocessed:
            os.makedirs(output_dir, exist_ok=True)
            base = os.path.basename(image_path)
            name, ext = os.path.splitext(base)
            out_path = os.path.join(output_dir, f"{name}_preprocessed_{preprocess_method}{ext}")
            img.save(out_path)

        custom_config = r'--oem 3 --psm 6'
        return pytesseract.image_to_string(img, config=custom_config)
    except Exception as e:
        return f"Error: {str(e)}"


def extract_text_with_bounding_boxes(image_path: str, preprocess_method: str = 'standard',
                                     min_confidence: int = 60):
    try:
        img = Image.open(image_path) if preprocess_method == 'none' else preprocess_image(image_path, preprocess_method)
        custom_config = r'--oem 3 --psm 6'
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT, config=custom_config)

        filtered = {'text': [], 'confidence': [], 'bounding_boxes': [], 'full_text': ''}
        n = len(data['text'])
        for i in range(n):
            conf = int(data['conf'][i])
            t = data['text'][i].strip()
            if conf > min_confidence and t:
                filtered['text'].append(t)
                filtered['confidence'].append(conf)
                filtered['bounding_boxes'].append({
                    'x': data['left'][i], 'y': data['top'][i],
                    'width': data['width'][i], 'height': data['height'][i]
                })
        filtered['full_text'] = ' '.join(filtered['text'])
        return filtered
    except Exception as e:
        return f"Error: {str(e)}"


# ---- Thin bridge to the extractor ----

# NOTE: relative import because this file lives in app/ocr/
from .. import pdf_extractor as extractor  # noqa: E402


def ocr_image_to_text(image_path: str, preprocess_method: str = 'adaptive') -> str:
    """
    Run OCR and return a single merged text string (best for feeding the extractor).
    """
    bbox = extract_text_with_bounding_boxes(image_path, preprocess_method=preprocess_method, min_confidence=60)
    if isinstance(bbox, dict) and bbox.get("full_text"):
        return bbox["full_text"]
    # fallback to the simple OCR path
    raw = extract_text_from_image(image_path, preprocess_method=preprocess_method)
    return "" if raw.startswith("Error") else raw


def ocr_extract_assignments(image_path: str, preprocess_method: str = 'adaptive') -> Dict:
    """
    Full image pipeline: OCR -> extractor
    Returns same shape as extractor: {"pdf_title","items","text_excerpt","default_year"}
    """
    txt = ocr_image_to_text(image_path, preprocess_method=preprocess_method)
    return extractor.extract_assignments_from_text(txt or "", source_name=os.path.basename(image_path))
>>>>>>> Kultum
