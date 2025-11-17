# app/confirmation_handler.py
"""
This file handles the confirmation and editing workflow for extracted assignments.
After assignments are extracted from a PDF, this module prepares them for user review,
validates user edits, and processes the final confirmed data.
"""

from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from pydantic import BaseModel, Field
from datetime import datetime
import re


# ============================================================================
# PYDANTIC MODELS - Define the data structures for API requests/responses
# ============================================================================

class AssignmentItem(BaseModel):
    """
    Represents a single assignment item.
    This matches the structure returned by extractor_core.py
    """
    title: str                  # Assignment name (e.g., "Homework 1")
    due_date_raw: str = ""      # Original date string from PDF (e.g., "Sep 15")
    due_date_iso: str = ""      # Standardized date format (e.g., "2025-09-15")
    page: int = 0               # Page number where assignment was found
    source: str = ""            # How it was extracted (e.g., "text-line", "table-row")


class ConfirmationRequest(BaseModel):
    """
    Data sent from frontend when user confirms/edits assignments.
    Contains the list of items after user has reviewed them.
    """
    items: List[AssignmentItem]                 # All assignments (edited or not)
    confirmed: bool = False                     # Whether user clicked "confirm"
    user_edits: Optional[Dict[str, Any]] = None # Optional metadata about edits


class ConfirmationResponse(BaseModel):
    """
    Response sent back after processing user's confirmation.
    Tells frontend whether save was successful and provides final data.
    """
    status: str                    # "confirmed" or "error"
    items: List[Dict[str, Any]]    # Final cleaned items ready for database
    total_items: int               # Count of items
    message: str                   # Success or error message


# ============================================================================
# VALIDATION FUNCTIONS - Check data integrity
# ============================================================================

def validate_date_format(date_str: str) -> bool:
    """
    Check if a date string is in valid ISO format (YYYY-MM-DD).
    
    Args:
        date_str: The date string to validate (e.g., "2025-09-15")
    
    Returns:
        True if valid or empty, False if malformed
    
    Examples:
        validate_date_format("2025-09-15")  # True
        validate_date_format("09/15/2025")  # False (wrong format)
        validate_date_format("")            # True (empty allowed)
    """
    if not date_str:
        return True  # Empty dates are acceptable
    
    # Check format with regex: must be YYYY-MM-DD
    pattern = r'^\d{4}-\d{2}-\d{2}$'
    if not re.match(pattern, date_str):
        return False
    
    # Verify it's an actual valid date (not like "2025-99-99")
    try:
        datetime.strptime(date_str, '%Y-%m-%d')
        return True
    except ValueError:
        return False


def clean_assignment_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Clean and normalize a single assignment item.
    Removes extra whitespace, validates dates, ensures required fields exist.
    
    Args:
        item: Raw assignment dict that might have messy data
    
    Returns:
        Cleaned assignment dict with standardized fields
    
    What it does:
        - Strips whitespace from all string fields
        - Validates ISO date format and clears if invalid
        - Ensures title is never empty (defaults to "Untitled Assignment")
        - Ensures all required fields exist with proper types
    """
    cleaned = {
        "title": (item.get("title") or "").strip(),
        "due_date_raw": (item.get("due_date_raw") or "").strip(),
        "due_date_iso": (item.get("due_date_iso") or "").strip(),
        "page": item.get("page", 0),
        "source": (item.get("source") or "").strip(),
    }
    
    # If ISO date is provided but invalid, clear it (keep raw though)
    if cleaned["due_date_iso"] and not validate_date_format(cleaned["due_date_iso"]):
        cleaned["due_date_iso"] = ""
    
    # Never allow empty titles - use a default
    if not cleaned["title"]:
        cleaned["title"] = "Untitled Assignment"
    
    return cleaned


# ============================================================================
# PREPARATION FUNCTIONS - Get data ready for user review
# ============================================================================

def prepare_for_confirmation(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Prepare extracted items for user confirmation screen.
    Cleans the data and organizes it for better UX.
    
    Args:
        items: Raw list of assignments from extractor_core.py
    
    Returns:
        Dict with cleaned items and metadata for the frontend
    
    What it does:
        - Cleans each item (removes whitespace, validates dates)
        - Counts how many items have dates vs don't have dates
        - Returns structure ready to send to frontend for review
    """
    # Clean all items first
    cleaned_items = [clean_assignment_item(item) for item in items]
    
    # Separate into categories for better user experience
    # This helps frontend show "5 dated items, 3 need dates" etc.
    dated_items = [item for item in cleaned_items if item["due_date_iso"]]
    undated_items = [item for item in cleaned_items if not item["due_date_iso"]]
    
    return {
        "status": "needs_confirmation",           # Tells frontend to show confirmation UI
        "total_items": len(cleaned_items),        # Total count
        "dated_items": len(dated_items),          # How many have dates
        "undated_items": len(undated_items),      # How many missing dates
        "items": cleaned_items,                   # The actual data
        "message": "Please review and confirm the extracted assignments. You can edit any field before saving."
    }


# ============================================================================
# CONFIRMATION PROCESSING - Handle user's final decision
# ============================================================================

def process_user_confirmation(
    original_items: List[Dict[str, Any]], 
    edited_items: List[Dict[str, Any]]
) -> ConfirmationResponse:
    """
    Process the user's confirmed/edited items before saving to database.
    This is called when user clicks "Confirm & Save" button.
    
    Args:
        original_items: The items we initially extracted from PDF
        edited_items: The items after user reviewed/edited them
    
    Returns:
        ConfirmationResponse with status and final cleaned items
    
    Raises:
        HTTPException: If validation fails on any item
    
    What it does:
        - Validates and cleans all user-edited items
        - Checks if user made any changes
        - Returns final data ready to save to database
    """
    # User must provide at least one item
    if not edited_items:
        raise HTTPException(status_code=400, detail="No items provided for confirmation")
    
    # Clean all edited items and collect any errors
    final_items = []
    errors = []
    
    for idx, item in enumerate(edited_items):
        try:
            cleaned = clean_assignment_item(item)
            final_items.append(cleaned)
        except Exception as e:
            # Track which item failed and why
            errors.append(f"Item {idx + 1}: {str(e)}")
    
    # If any items failed validation, reject the whole batch
    if errors:
        raise HTTPException(
            status_code=400, 
            detail=f"Validation errors: {'; '.join(errors)}"
        )
    
    # Check if user actually made any changes
    # (useful for logging/analytics)
    changes_made = len(final_items) != len(original_items)
    if not changes_made:
        for orig, final in zip(original_items, final_items):
            if orig != final:
                changes_made = True
                break
    
    # Build success message
    message = "Assignments confirmed and saved successfully."
    if changes_made:
        message += f" {len(final_items)} items processed with user edits."
    
    return ConfirmationResponse(
        status="confirmed",
        items=final_items,
        total_items=len(final_items),
        message=message
    )


# ============================================================================
# EDITING FUNCTIONS - Let user modify items during confirmation
# ============================================================================

def add_manual_item(
    existing_items: List[Dict[str, Any]], 
    new_item: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Add a new manually-created item to the list.
    Used when user clicks "Add New Assignment" button.
    
    Args:
        existing_items: Current list of assignments
        new_item: New assignment data from user
    
    Returns:
        Updated list with new item appended
    
    What it does:
        - Cleans the new item
        - Marks it as "manual" source (not extracted from PDF)
        - Adds it to the end of the list
    """
    cleaned_new = clean_assignment_item(new_item)
    cleaned_new["source"] = "manual"  # Track that user added this manually
    
    return existing_items + [cleaned_new]


def remove_item(
    items: List[Dict[str, Any]], 
    index: int
) -> List[Dict[str, Any]]:
    """
    Remove an item from the list.
    Used when user clicks "Remove" button on an assignment.
    
    Args:
        items: Current list of assignments
        index: Position of item to remove (0-based)
    
    Returns:
        New list without the removed item
    
    Raises:
        HTTPException: If index is out of bounds
    """
    # Validate index is within range
    if index < 0 or index >= len(items):
        raise HTTPException(status_code=400, detail="Invalid item index")
    
    # Return new list without that item (splice it out)
    return items[:index] + items[index + 1:]


def update_item(
    items: List[Dict[str, Any]], 
    index: int, 
    updated_fields: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Update specific fields of an existing item.
    Used when user edits fields like title, date, etc.
    
    Args:
        items: Current list of assignments
        index: Position of item to update (0-based)
        updated_fields: Dict with only the fields user changed
    
    Returns:
        New list with updated item
    
    Raises:
        HTTPException: If index is out of bounds
    
    What it does:
        - Gets the existing item
        - Applies only the changed fields
        - Cleans and validates the result
        - Returns new list with updated item
    """
    # Validate index is within range
    if index < 0 or index >= len(items):
        raise HTTPException(status_code=400, detail="Invalid item index")
    
    # Start with a copy of the existing item
    item = items[index].copy()
    
    # Update only the fields that were provided
    # This allows partial updates (e.g., just change the date)
    for key, value in updated_fields.items():
        if key in ["title", "due_date_raw", "due_date_iso", "page", "source"]:
            item[key] = value
    
    # Clean the updated item to ensure validity
    cleaned = clean_assignment_item(item)
    
    # Create new list with the updated item
    new_items = items.copy()
    new_items[index] = cleaned
    
    return new_items