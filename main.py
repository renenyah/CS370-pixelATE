#pdfplumber is a python library that helps you work with PDF files by reading and extracting text 
# https://github.com/jsvine/pdfplumber
import pdfplumber
import re
from datetime import datetime

def extract_syllabus_assignments(pdf_path):
    """
    Extract assignments from any syllabus PDF.
    Finds keywords and matches them with nearby dates.
    """
    
    # Keywords to look for
    ASSIGNMENT_KEYWORDS = [
        'problem set', 'homework', 'assignment', 'quiz', 'test',
        'midterm', 'final', 'exam', 'project', 'paper', 'essay',
        'due', 'submit', 'turn in', 'activity', 'lab', 'presentation'
    ]
    
    # Date patterns to match (e.g., "Sep 4th", "September 4", "9/4", "Oct 2nd")
    DATE_PATTERNS = [
        r'\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?\b',
        r'\b\d{1,2}(?:st|nd|rd|th)\b',  # Just day with suffix
        r'\b\d{1,2}/\d{1,2}(?:/\d{2,4})?\b'  # Date format like 9/4 or 9/4/2025
    ]
    
    all_assignments = []
    current_month = None  # Track month across ALL pages
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            
            # Extract all text from the page
            text = page.extract_text()
            
            if not text:
                continue
            
            # Split into lines for processing
            lines = text.split('\n')
            
            # Try to extract tables first (more structured)
            tables = page.extract_tables()
            
            if tables:
                print(f"\n=== Page {page_num}: Processing {len(tables)} table(s) ===")
                for table in tables:
                    for row_num, row in enumerate(table):
                        if not row:
                            continue
                        
                        print(f"\n--- Row {row_num} ---")
                        print(f"Row content: {row}")
                        
                        # First pass: find month and all dates in the entire row
                        row_month = None
                        row_dates = {}  # Map cell index to date info
                        
                        for cell_idx, cell in enumerate(row):
                            if not cell:
                                continue
                            
                            cell_str = str(cell)
                            
                            # Look for month in this cell
                            month_match = re.search(r'\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b', cell_str, re.IGNORECASE)
                            if month_match:
                                row_month = month_match.group(1)
                                current_month = row_month
                                print(f"  Found month in cell {cell_idx}: {row_month}")
                            
                            # Look for dates in this cell
                            # Full date with month
                            full_date_match = re.search(r'\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b', cell_str, re.IGNORECASE)
                            if full_date_match:
                                row_dates[cell_idx] = full_date_match.group(0)
                                print(f"  Found full date in cell {cell_idx}: {full_date_match.group(0)}")
                            else:
                                # Just day number
                                day_match = re.search(r'\b(\d{1,2})(?:st|nd|rd|th)\b', cell_str)
                                if day_match:
                                    row_dates[cell_idx] = day_match.group(0)
                                    print(f"  Found day in cell {cell_idx}: {day_match.group(0)}")
                        
                        # Use current_month if no month found in this row
                        if not row_month and current_month:
                            row_month = current_month
                            print(f"  Using previous month context: {row_month}")
                        
                        print(f"  Row month: {row_month}, Current month: {current_month}")
                        print(f"  Row dates: {row_dates}")
                        
                        # Second pass: process assignments with proper dates
                        for cell_idx, cell in enumerate(row):
                            if not cell:
                                continue
                            
                            cell_text = str(cell)
                            
                            # Check if cell contains assignment keywords
                            has_keyword = any(keyword in cell_text.lower() 
                                            for keyword in ASSIGNMENT_KEYWORDS)
                            
                            if has_keyword:
                                print(f"  Cell {cell_idx} has assignment keyword")
                                
                                # Get the date for this cell
                                final_date = None
                                
                                # If this cell has a date
                                if cell_idx in row_dates:
                                    date_str = row_dates[cell_idx]
                                    # Check if date already has month
                                    if any(month in date_str for month in ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']):
                                        final_date = date_str
                                        print(f"    Using date with month: {final_date}")
                                    elif row_month:
                                        # Add month to day-only date
                                        day_num = re.search(r'\d+', date_str).group(0)
                                        final_date = f"{row_month} {day_num}"
                                        print(f"    Adding month to date: {date_str} -> {final_date}")
                                    else:
                                        final_date = date_str
                                        print(f"    No month available, using: {final_date}")
                                else:
                                    # Look for date in other cells of the row
                                    print(f"    No date in this cell, checking other cells")
                                    for other_idx, other_date in row_dates.items():
                                        if any(month in other_date for month in ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']):
                                            final_date = other_date
                                            print(f"      Found date with month in cell {other_idx}: {final_date}")
                                        elif row_month:
                                            day_num = re.search(r'\d+', other_date).group(0)
                                            final_date = f"{row_month} {day_num}"
                                            print(f"      Found day in cell {other_idx}, adding month: {other_date} -> {final_date}")
                                        else:
                                            final_date = other_date
                                            print(f"      Using date without month: {final_date}")
                                        break
                                
                                # Create assignment entry only if date found
                                if final_date:
                                    assignment = {
                                        'date': final_date,
                                        'description': cell_text.strip(),
                                        'page': page_num,
                                        'source': 'table'
                                    }
                                    all_assignments.append(assignment)
                                    print(f"    ADDED: {final_date} - {cell_text[:50]}...")
            
            # Also search through plain text (in case tables aren't detected)
            print(f"\n=== Page {page_num}: Processing plain text ===")
            for i, line in enumerate(lines):
                # Update current month if we see one
                month_match = re.search(r'\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b', line, re.IGNORECASE)
                if month_match:
                    current_month = month_match.group(1)
                
                # Check if line contains assignment keywords
                has_keyword = any(keyword in line.lower() 
                                for keyword in ASSIGNMENT_KEYWORDS)
                
                if has_keyword:
                    # Look for dates in the same line
                    dates_found = []
                    
                    # Try full date first
                    full_date_match = re.search(r'\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?\b', line, re.IGNORECASE)
                    if full_date_match:
                        dates_found.append(full_date_match.group(0))
                    else:
                        # Try just day
                        day_match = re.search(r'\b(\d{1,2})(?:st|nd|rd|th)\b', line)
                        if day_match and current_month:
                            dates_found.append(f"{current_month} {day_match.group(1)}")
                    
                    # If no date in same line, check nearby lines
                    if not dates_found:
                        context_start = max(0, i - 2)
                        context_end = min(len(lines), i + 3)
                        
                        for context_line in lines[context_start:context_end]:
                            full_date_match = re.search(r'\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?\b', context_line, re.IGNORECASE)
                            if full_date_match:
                                dates_found.append(full_date_match.group(0))
                                break
                            
                            day_match = re.search(r'\b(\d{1,2})(?:st|nd|rd|th)\b', context_line)
                            if day_match and current_month:
                                dates_found.append(f"{current_month} {day_match.group(1)}")
                                break
                    
                    # Only add if date found and not already found in tables
                    if dates_found:
                        description = line.strip()
                        is_duplicate = any(
                            description in a['description'] or a['description'] in description
                            for a in all_assignments
                        )
                        
                        if not is_duplicate:
                            assignment = {
                                'date': dates_found[0],
                                'description': description,
                                'page': page_num,
                                'source': 'text'
                            }
                            all_assignments.append(assignment)
    
    return all_assignments


# Run the parser
print("Extracting assignments from syllabus...")
assignments = extract_syllabus_assignments("mathSyllabus.pdf")

# Display all found assignments
print("\n\n" + "="*70)
print("EXTRACTED ASSIGNMENTS:")
print("="*70)

for i, assignment in enumerate(assignments, 1):
    print(f"\n{i}. Date: {assignment['date']}")
    print(f"   Assignment: {assignment['description']}")
    print(f"   (Page {assignment['page']}, found in {assignment['source']})")

# Summary
print(f"\n\n{'='*70}")
print(f"TOTAL ASSIGNMENTS FOUND: {len(assignments)}")
print(f"{'='*70}")