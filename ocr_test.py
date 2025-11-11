"""
Simple test script for OCR functionality
Run this from the syllabus-backend directory
"""

import os
import sys

import pytesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Add the app directory to Python path so we can import from it
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.ocr.ocr_processor import (
    extract_text_from_image,
    extract_text_with_bounding_boxes,
    visualize_bounding_boxes,
    save_text_to_file
)

def test_file(image_path):
    """Test OCR on a single file"""
    
    print("=" * 70)
    print(f"Testing: {image_path}")
    print("=" * 70)
    
    if not os.path.exists(image_path):
        print(f" Error: File not found at {image_path}")
        print(f"   Current directory: {os.getcwd()}")
        return
    
    # Test different preprocessing methods
    methods = ['none', 'standard', 'aggressive', 'adaptive']
    best_method = None
    best_word_count = 0
    
    for method in methods:
        print(f"\n Testing method: {method.upper()}")
        
        text = extract_text_from_image(
            image_path,
            preprocess_method=method,
            save_preprocessed=True,
            output_dir='test_output/preprocessed'
        )
        
        if not text.startswith("Error"):
            word_count = len(text.split())
            print(f"   Extracted {word_count} words")
            print(f"   Preview: {text[:100].strip()}...")
            
            if word_count > best_word_count:
                best_word_count = word_count
                best_method = method
        else:
            print(f"   Failed: {text}")
    
    if best_method:
        print("\n" + "=" * 70)
        print(f" BEST METHOD: {best_method.upper()} ({best_word_count} words)")
        print("=" * 70)
        
        # Get full extraction with bounding boxes
        print("\n Extracting with bounding boxes...")
        bbox_data = extract_text_with_bounding_boxes(
            image_path,
            preprocess_method=best_method,
            min_confidence=60
        )
        
        if isinstance(bbox_data, dict):
            print(f"   Found {len(bbox_data['text'])} text elements")
            if bbox_data['confidence']:
                avg_conf = sum(bbox_data['confidence']) / len(bbox_data['confidence'])
                print(f"   Average confidence: {avg_conf:.1f}%")
            
            # Save outputs
            os.makedirs('test_output', exist_ok=True)
            base_name = os.path.splitext(os.path.basename(image_path))[0]
            
            # Save extracted text
            text_file = f'test_output/{base_name}_extracted.txt'
            save_text_to_file(bbox_data['full_text'], text_file)
            
            # Save visualization
            bbox_image = f'test_output/{base_name}_boxes.png'
            visualize_bounding_boxes(
                image_path,
                preprocess_method=best_method,
                min_confidence=60,
                output_path=bbox_image
            )
            
            print(f"\n Saved results:")
            print(f"    Text: {text_file}")
            print(f"    Visualization: {bbox_image}")
            print(f"    Preprocessed images: test_output/preprocessed/")
            
            # Show extracted text
            print("\n" + "=" * 70)
            print("EXTRACTED TEXT:")
            print("=" * 70)
            print(bbox_data['full_text'][:500])
            if len(bbox_data['full_text']) > 500:
                print("\n... (truncated, see full text in output file)")
    else:
        print("\n No successful extractions")

def main():
    """Main function to test files"""
    
    print("\n" + "=" * 70)
    print(" SYLLABUS OCR TESTER")
    print("=" * 70)
    
    # Check for test_files directory
    test_dir = "test_files"
    
    if not os.path.exists(test_dir):
        print(f"\n  Directory '{test_dir}/' not found")
        print(f"   Creating it now...")
        os.makedirs(test_dir)
        print(f"\n Created '{test_dir}/' directory")
        print(f"\n Next steps:")
        print(f"   1. Add your test images to {test_dir}/")
        print(f"   2. Run this script again: python test_ocr_simple.py")
        return
    
    # Find all images in test_files
    image_extensions = ('.png', '.jpg', '.jpeg', '.tiff', '.bmp')
    images = [
        f for f in os.listdir(test_dir)
        if f.lower().endswith(image_extensions)
    ]
    
    if not images:
        print(f"\n  No images found in '{test_dir}/'")
        print(f"\n Add some test images and try again!")
        print(f"   Supported formats: PNG, JPG, JPEG, TIFF, BMP")
        return
    
    print(f"\n Found {len(images)} image(s) in {test_dir}/")
    
    # Test each image
    for i, img_name in enumerate(images, 1):
        img_path = os.path.join(test_dir, img_name)
        print(f"\n\n{'=' * 70}")
        print(f"Testing image {i}/{len(images)}")
        test_file(img_path)
        print("\n")
    
    print("=" * 70)
    print(" ALL TESTS COMPLETE!")
    print("=" * 70)
    print(f"\n Check 'test_output/' for all results")

if __name__ == "__main__":
    # Quick test: You can also test a specific file directly
    # Uncomment and modify the line below to test a specific file:
    # test_file("test_files/your_image.png")
    
    # Or run the full test suite:
    main()