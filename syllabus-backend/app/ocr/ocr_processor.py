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
        scale_percent = 200
        width = int(gray.shape[1] * scale_percent / 100)
        height = int(gray.shape[0] * scale_percent / 100)
        resized = cv2.resize(gray, (width, height), interpolation=cv2.INTER_CUBIC)
        denoised = cv2.fastNlMeansDenoising(resized, None, 10, 7, 21)
        _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        pil_img = Image.fromarray(binary)
        return pil_img.filter(ImageFilter.SHARPEN)

    elif method == 'adaptive':
        scale_percent = 200
        width = int(gray.shape[1] * scale_percent / 100)
        height = int(gray.shape[0] * scale_percent / 100)
        resized = cv2.resize(gray, (width, height), interpolation=cv2.INTER_CUBIC)
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
