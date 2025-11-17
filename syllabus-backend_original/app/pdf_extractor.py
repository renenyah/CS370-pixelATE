"""
General syllabus extractor.
- Reads PDF text with PyMuPDF (fitz) OR accepts raw text
- Finds course name
- Extracts assignments/quizzes/exams and due dates
- Normalizes dates to ISO using dateparser (without RELATIVE_BASE=None issue)

Returns items in a consistent shape used by the API:
  {"title": str, "due_date_raw": str, "due_date_iso": str, "page": None, "source": str}
"""

from __future__ import annotations
from pathlib import Path
import re
import json
from typing import List, Dict, Optional, Tuple

import fitz  # PyMuPDF
from dateparser import parse as parse_date


# -------------------- Regex patterns (broad & resilient) --------------------

TERM_YEAR_RE = re.compile(r'\b(Fall|Spring|Summer|Winter)\s+(\d{4})\b', re.IGNORECASE)

COURSE_LINE_RE = re.compile(
    r'^\s*([A-Z]{2,}\s*\d{2,}(?:-\d+)?\s*[:\-–]\s*.+)$'  # e.g., "CS 370: Practicum – Fall 2025"
)

# Month Day (optional comma year)
MONTH_FIRST_RE = re.compile(
    r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?[a-z]*\s+\d{1,2}(?:,\s*\d{4})?\b',
    re.IGNORECASE
)

# 9/8(/2025) etc.
MD_SLASH_RE = re.compile(r'\b\d{1,2}/\d{1,2}(?:/\d{2,4})?\b')

# Named event then "on/due on/given on" date
EXAM_QUIZ_RE = re.compile(
    r'(?P<name>\b(?:Short|Second|Midterm|Final)\s+(?:Essay\s+)?Exam\b|\bExam\b|\bQuiz(?:zes)?\b)'
    r'[^.\n]*?(?:on|given on|due(?:\s+on)?)\s+(?P<date>[^.\n;]+)',
    re.IGNORECASE
)

# Date first (schedule style): "Oct 1 — Midterm Exam ..."
DATE_THEN_EVENT_RE = re.compile(
    r'(?P<date>' + MONTH_FIRST_RE.pattern + r')\s*[—\-–: ]+\s*(?P<name>(?:Short|Second|Midterm|Final)\s+(?:Essay\s+)?Exam|Exam|Quiz(?:zes)?\b[^\n]*)',
    re.IGNORECASE
)

# Any deliverable "... is/are due <date>" (paper/response/assignment/etc.)
DUE_LINE_RE = re.compile(
    r'(?P<what>[^.\n]*?\b(?:response|paper|essay|assignment|project|'
    r'reading response|reflection|write[-\s]?up|map|lab|presentation|problem set|'
    r'pset|homework|quiz)\b[^.\n]*?)\b(?:is|are)?\s*due(?:\s+at the beginning of class|\s+by|\s+on)?\s*'
    r'(?P<date>[^.\n;]+)',
    re.IGNORECASE
)

# Simple "Due <date>"
JUST_DUE_DATE_RE = re.compile(
    r'\b(?:Due|due)\b[^\n]*?\s(?P<date>' + MONTH_FIRST_RE.pattern + r'|' + MD_SLASH_RE.pattern + r')',
    re.IGNORECASE
)

# Generic "Thing (date)" and "Thing - date" patterns
PAREN_DATE_RE = re.compile(
    r'(?P<name>[^\n()]{3,}?)\s*[\(\[]\s*(?P<date>' + MONTH_FIRST_RE.pattern + r'|' + MD_SLASH_RE.pattern + r')\s*[\)\]]',
    re.IGNORECASE
)
DASH_DATE_RE = re.compile(
    r'(?P<name>[^\n:]{3,}?)\s*(?:—|-|–|:)\s*(?P<date>' + MONTH_FIRST_RE.pattern + r'|' + MD_SLASH_RE.pattern + r')',
    re.IGNORECASE
)


# -------------------- Core helpers --------------------

def _read_pdf_text(pdf_path: Path) -> str:
    parts = []
    with fitz.open(pdf_path) as doc:
        for page in doc:
            parts.append(page.get_text("text"))
    return "\n".join(parts)


def _infer_default_year(text: str, fallback: Optional[int] = None) -> Optional[int]:
    m = TERM_YEAR_RE.search(text)
    if m:
        return int(m.group(2))
    # fallback: first explicit year present
    m2 = re.search(r'\b(20\d{2})\b', text)
    if m2:
        return int(m2.group(1))
    return fallback


def _find_course_name(text: str) -> Optional[str]:
    for line in text.splitlines():
        ln = line.strip()
        if not ln:
            continue
        m = COURSE_LINE_RE.match(ln)
        if m:
            return m.group(1)
    # fallback: a line near "SYLLABUS"
    nonempty = [ln.strip() for ln in text.splitlines() if ln.strip()]
    for i, ln in enumerate(nonempty[:40]):
        if "SYLLABUS" in ln.upper() and i:
            return nonempty[i - 1]
    return nonempty[0] if nonempty else None


def _ensure_year(date_txt: str, default_year: Optional[int]) -> str:
    if not default_year:
        return date_txt
    if re.search(r'\b(19|20)\d{2}\b', date_txt):
        return date_txt
    return f"{date_txt.strip()}, {default_year}"


def normalize_date_text(date_txt: str, default_year: Optional[int] = None) -> str:
    """
    Normalize a free-text date to YYYY-MM-DD. Returns "" if parsing fails.
    """
    candidate = _ensure_year(date_txt, default_year)
    dt = parse_date(candidate, settings={
        "PREFER_DAY_OF_MONTH": "first",
        "PREFER_DATES_FROM": "future",  # helpful for fall term dates
        # DO NOT set RELATIVE_BASE here to avoid TypeError
        "RETURN_AS_TIMEZONE_AWARE": False,
    })
    return dt.date().isoformat() if dt else ""


def _unique_push(items: List[Dict], item: Dict):
    key = (item["title"].strip().lower(), item["due_date_iso"])
    if not any((x["title"].strip().lower(), x["due_date_iso"]) == key for x in items):
        items.append(item)


def _extract_from_text_core(text: str, course: str, default_year: Optional[int]) -> List[Dict]:
    found: List[Dict] = []

    # 1) "Exam/Quiz ... on <date>"
    for m in EXAM_QUIZ_RE.finditer(text):
        name = re.sub(r'\s+', ' ', m.group("name")).strip()
        date_txt = m.group("date").strip()
        date_iso = normalize_date_text(date_txt, default_year)
        _unique_push(found, {
            "title": name,
            "due_date_raw": date_txt,
            "due_date_iso": date_iso,
            "page": None,
            "source": "exam_or_quiz"
        })

    # 2) "<Month Day> — Exam/Quiz ..."
    for m in DATE_THEN_EVENT_RE.finditer(text):
        name = re.sub(r'\s+', ' ', m.group("name")).strip()
        date_txt = m.group("date").strip()
        date_iso = normalize_date_text(date_txt, default_year)
        _unique_push(found, {
            "title": name,
            "due_date_raw": date_txt,
            "due_date_iso": date_iso,
            "page": None,
            "source": "exam_or_quiz"
        })

    # 3) "... due <date>"
    for m in DUE_LINE_RE.finditer(text):
        what = re.sub(r'\s+', ' ', m.group("what")).strip(" :.-")
        date_txt = m.group("date").strip()
        date_iso = normalize_date_text(date_txt, default_year)
        _unique_push(found, {
            "title": what,
            "due_date_raw": date_txt,
            "due_date_iso": date_iso,
            "page": None,
            "source": "assignment_due"
        })

    # 4) "Due <date>"
    for m in JUST_DUE_DATE_RE.finditer(text):
        date_txt = m.group("date").strip()
        date_iso = normalize_date_text(date_txt, default_year)
        _unique_push(found, {
            "title": "Due item",
            "due_date_raw": date_txt,
            "due_date_iso": date_iso,
            "page": None,
            "source": "assignment_due"
        })

    # 5) Generic "Thing (date)"
    for m in PAREN_DATE_RE.finditer(text):
        name = re.sub(r'\s+', ' ', m.group("name")).strip(" :.-")
        date_txt = m.group("date").strip()
        date_iso = normalize_date_text(date_txt, default_year)
        _unique_push(found, {
            "title": name,
            "due_date_raw": date_txt,
            "due_date_iso": date_iso,
            "page": None,
            "source": "inline_date"
        })

    # 6) Generic "Thing - date"
    for m in DASH_DATE_RE.finditer(text):
        name = re.sub(r'\s+', ' ', m.group("name")).strip(" :.-")
        date_txt = m.group("date").strip()
        date_iso = normalize_date_text(date_txt, default_year)
        _unique_push(found, {
            "title": name,
            "due_date_raw": date_txt,
            "due_date_iso": date_iso,
            "page": None,
            "source": "inline_date"
        })

    # Sort by date when possible
    def s_key(x):
        return (x["due_date_iso"] or "9999-12-31", x["title"].lower())
    found.sort(key=s_key)
    return found


# -------------------- Public API --------------------

def extract_assignments_from_text(text: str, source_name: str = "text") -> Dict:
    course = _find_course_name(text) or source_name
    year = _infer_default_year(text)
    items = _extract_from_text_core(text, course, year)
    # Also return a short excerpt for LLM (first 8k chars max)
    excerpt = text[:8000] if text else ""
    return {
        "pdf_title": course,
        "items": items,
        "text_excerpt": excerpt,
        "default_year": year
    }


def extract_assignments_from_pdf(pdf_path: str | Path) -> Dict:
    pdf_path = Path(pdf_path)
    text = _read_pdf_text(pdf_path)
    course = _find_course_name(text) or pdf_path.stem
    year = _infer_default_year(text)
    items = _extract_from_text_core(text, course, year)
    excerpt = text[:8000] if text else ""
    return {
        "pdf_title": course,
        "items": items,
        "text_excerpt": excerpt,
        "default_year": year
    }
