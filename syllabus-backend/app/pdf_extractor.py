from __future__ import annotations

import re
import os
from typing import List, Dict, Any, Optional, Tuple

# PDF text extraction
try:
    import fitz  # PyMuPDF
except Exception:
    fitz = None  # We'll raise a helpful error at call time

# Date parsing
try:
    import dateparser
except Exception:
    dateparser = None


# -------------------------
# Small utilities
# -------------------------

MONTH = r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z\.]*"
DAY = r"\d{1,2}"
YEAR = r"\d{4}"
MD = rf"{MONTH}\s+{DAY}"
MDY = rf"{MONTH}\s+{DAY}(?:,\s*{YEAR})?"
MDY_PAREN = rf"(?:Mon|Tue|Tues|Wed|Thu|Thur|Fri|Sat|Sun)[a-z]*\s+{MDY}"
NUMERIC = r"\d{1,2}/\d{1,2}(?:/\d{2,4})?"

DATE_TOKEN = rf"(?:{MDY}|{MD}|{MDY_PAREN}|{NUMERIC})"

# Examples we want to catch:
# - "Final exam (30%) given on Monday, December 15 ..."
# - "Short Essay Exam (10%) given on Wednesday, October 1"
# - "Problem Set 6 due" (use the line's left date if present)
# - "response ... due ... on, November 10"
EXPLICIT_DUE_GIVEN = re.compile(
    rf"""(?xi)
    (?P<title>
        (?:Final\s+(?:Essay\s+)??Exam|Midterm(?:\s+Essay)?\s+Exam|
         Exam|Quiz|Problem\s*Set\s*\d+|Problem\s*Set|PS\s*\d+|Homework|HW\s*\d+|
         Assignment\s*\d+|Assignment|Paper|Essay|Project|Prototype|Reading(?:\s*Response)?|
         Response|Presentation|Lab(?:\s*Session)?)
        [^\.:\n]*?
    )
    (?:\s*[\(\[]\d+%[\)\]])?
    [^:\n]*?
    (?:\b(?:due|given)\b|\b(?:due\s+at|due\s+on)\b)
    [^:\n,;]*?
    (?:on|by|:)?\s*
    (?P<date>{DATE_TOKEN})
    """,
    re.IGNORECASE,
)

# Lines that begin with a date (typical schedule tables):
# "Sep 11  Thu  Direct Methods ... — Problem Set 1 due, Problem Set 2 assigned"
LINE_STARTS_WITH_DATE = re.compile(
    rf"""(?xi) ^
    (?P<date>{MONTH}\s+{DAY}(?:,\s*{YEAR})?
      |{MONTH}\.?\s+{DAY}(?:,\s*{YEAR})?
      |\b(?:Aug|Sept|Sep|Oct|Nov|Dec|Jan|Feb|Mar|Apr|May|Jun|Jul)[a-z\.]*\s+{DAY}\b
    )
    [^\n]*?
    (?P<title>(?:Final\s+Exam|Midterm|Exam|Quiz|Problem\s*Set\s*\d+|Problem\s*Set|PS\s*\d+|
                 Assignment\s*\d+|Assignment|Homework|HW\s*\d+|Paper|Essay|Project|
                 Prototype|Reading(?:\s*Response)?|Response|Presentation)
                 [^.\n]*?(?:due|assigned|given)?)
    """,
)

# Weekly plan style for Rome Sketchbook:
# "Week 2 (Monday Jan. 27) ...  Assignment 1: Ten fast sketches."
WEEK_LINE = re.compile(
    rf"(?i)^\s*week\s*\d+\s*\((?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\s+(?P<date>{DATE_TOKEN})\)\s*"
)
ASSIGNMENT_AFTER_WEEK = re.compile(
    r"(?i)\bAssignment\s*\d+\s*[:\-]\s*(?P<title>[^.\n]+)"
)

# “response … due at the beginning of class on, November 10”
DUE_ON_DATE = re.compile(
    rf"""(?xi)
    (?P<title>[^.\n]{{6,}}?)
    \b(?:due\s*(?:at[^,\n]+)?\s*on,?\s*|due\s*[,:\-]?\s*)
    (?P<date>{DATE_TOKEN})
    """,
)

COURSE_NAME_PATTERNS = [
    re.compile(r"(?i)^\s*course\s*name\s*:\s*(?P<name>.+)$"),
    re.compile(r"(?i)^\s*course\s*code\s*:\s*(?P<name>.+)$"),
    re.compile(r"(?i)^\s*course\s*syllabus\s*(?P<name>.*)$"),
    re.compile(r"(?i)^\s*([A-Z]{2,}\s*\d{2,}[A-Z\-]*\s*[:\-]?\s*.+)$"),  # e.g., "MATH-315-2: Numerical Analysis"
]

SEMESTER_YEAR = re.compile(r"(?i)\b(Spring|Summer|Fall|Autumn|Winter)\s+(20\d{2})\b")
ANY_YEAR = re.compile(r"\b(20\d{2})\b")


def _clean(s: str) -> str:
    s = s.replace("\u2013", "-").replace("\u2014", "-")
    s = re.sub(r"[ \t]+", " ", s)
    return s.strip()


def _norm_date_to_iso(text: str, fallback_year: Optional[int]) -> str:
    if not text or not dateparser:
        return ""
    text = text.replace(".", "")  # "Jan." -> "Jan"
    settings = {
        "RETURN_AS_TIMEZONE_AWARE": False,
        "PREFER_DAY_OF_MONTH": "first",
        "DATE_ORDER": "MDY",
    }
    dt = dateparser.parse(text, settings=settings)
    if not dt and fallback_year:
        dt = dateparser.parse(f"{text} {fallback_year}", settings=settings)
    return dt.date().isoformat() if dt else ""


def _detect_fallback_year(text: str) -> Optional[int]:
    m = SEMESTER_YEAR.search(text)
    if m:
        return int(m.group(2))
    m2 = ANY_YEAR.search(text)
    if m2:
        return int(m2.group(1))
    return None


def _detect_course_name(first_page_text: str) -> str:
    lines = [l.strip() for l in first_page_text.splitlines() if l.strip()]
    # Try explicit patterns
    for ln in lines[:40]:
        for pat in COURSE_NAME_PATTERNS:
            m = pat.search(ln)
            if m:
                name = m.groupdict().get("name") or m.group(0)
                return _clean(name)
    # Fallback: look for a line with colon after an all-caps code
    for ln in lines[:40]:
        if re.search(r"^[A-Z]{2,}[- ]?\d{2,}[A-Z0-9\-]*\b", ln):
            return _clean(ln)
    return ""


def _unique(items: List[Dict[str, str]]) -> List[Dict[str, str]]:
    seen: set[Tuple[str, str]] = set()
    out: List[Dict[str, str]] = []
    for it in items:
        k = (_clean(it.get("title", "")).lower(), it.get("due_date_iso", ""))
        if k in seen:
            continue
        seen.add(k)
        out.append(it)
    return out


# -------------------------
# Core extraction from plain text
# -------------------------

def extract_from_text(full_text: str, fallback_year: Optional[int]) -> List[Dict[str, str]]:
    results: List[Dict[str, str]] = []
    text = full_text

    # Pass A: explicit “due/given … <date>”
    for m in EXPLICIT_DUE_GIVEN.finditer(text):
        title = _clean(m.group("title"))
        date_raw = _clean(m.group("date"))
        iso = _norm_date_to_iso(date_raw, fallback_year)
        if iso:
            results.append(
                {"title": title, "due_date_raw": date_raw, "due_date_iso": iso}
            )

    # Pass B: schedule rows beginning with a date, then “Problem Set … due” etc.
    for ln in text.splitlines():
        ln_c = _clean(ln)
        mb = LINE_STARTS_WITH_DATE.search(ln_c)
        if not mb:
            continue
        date_raw = _clean(mb.group("date"))
        title = _clean(mb.group("title"))
        # If line has multiple items separated by commas with "due/assigned/given", split sensibly
        parts = re.split(r"\s*,\s*(?=(?:Problem|PS|Assignment|Homework|Final|Midterm|Exam|Quiz)\b)", title, maxsplit=3)
        for p in parts:
            p = _clean(p)
            if not p:
                continue
            if not re.search(r"(?i)\b(due|assigned|given)\b", p):
                # allow plain “Final Exam” or “Midterm” on that dated line
                if not re.search(r"(?i)(final|midterm|exam|quiz|problem\s*set|assignment|homework|paper|project)", p):
                    continue
            iso = _norm_date_to_iso(date_raw, fallback_year)
            if iso:
                results.append(
                    {"title": p, "due_date_raw": date_raw, "due_date_iso": iso}
                )

    # Pass C: “... response ... due ... on November 10”
    for m in DUE_ON_DATE.finditer(text):
        title = _clean(m.group("title"))
        # keep titles reasonable
        if len(title) > 180:
            continue
        date_raw = _clean(m.group("date"))
        iso = _norm_date_to_iso(date_raw, fallback_year)
        if iso:
            results.append(
                {"title": title, "due_date_raw": date_raw, "due_date_iso": iso}
            )

    # Pass D: “Week … (Mon Jan. 27) … Assignment 1: Title”
    # We thread through the lines, remembering last seen week date.
    current_week_date: Optional[str] = None
    for ln in full_text.splitlines():
        ln_c = _clean(ln)
        wm = WEEK_LINE.search(ln_c)
        if wm:
            current_week_date = _clean(wm.group("date"))
            continue
        if current_week_date:
            am = ASSIGNMENT_AFTER_WEEK.search(ln_c)
            if am:
                title = f"Assignment {am.group(0).split(':', 1)[0].strip()}: {_clean(am.group('title'))}"
                iso = _norm_date_to_iso(current_week_date, fallback_year)
                if iso:
                    results.append(
                        {"title": title, "due_date_raw": current_week_date, "due_date_iso": iso}
                    )

    return _unique(results)


# -------------------------
# Public API (path-based) — already present and used elsewhere
# -------------------------

def extract_assignments_from_pdf(pdf_path: str) -> Dict[str, Any]:
    """
    Read a PDF and return:
      {
        'course_name': str,
        'semester_year': 'Fall 2025' (if found) or '',
        'items': [{'title','due_date_raw','due_date_iso','page'}...]
      }
    """
    if fitz is None:
        raise RuntimeError("PyMuPDF (fitz) is not installed. pip install PyMuPDF")

    if not os.path.exists(pdf_path):
        raise FileNotFoundError(pdf_path)

    doc = fitz.open(pdf_path)
    all_text = []
    first_page_text = ""
    for i, page in enumerate(doc):
        txt = page.get_text("text")
        if i == 0:
            first_page_text = txt
        # Make tabley PDFs easier by collapsing runs of spaces/dashes
        txt = re.sub(r"[ \t]+", " ", txt)
        txt = txt.replace("—", "-")
        all_text.append(txt)
    doc.close()

    joined = "\n".join(all_text)
    fallback_year = _detect_fallback_year(joined)
    course_name = _detect_course_name(first_page_text)
    sem_match = SEMESTER_YEAR.search(joined)
    semester_year = f"{sem_match.group(1).title()} {sem_match.group(2)}" if sem_match else ""

    # Core extraction
    items = extract_from_text(joined, fallback_year)

    # include page numbers when we can roughly guess them (match by line presence)
    # Simple heuristic: for each item, locate the raw date snippet in pages
    enriched: List[Dict[str, str]] = []
    for it in items:
        date_raw = it.get("due_date_raw", "")
        found_page = None
        if date_raw:
            needle = date_raw.replace(".", "")
            for idx, pg in enumerate(all_text, start=1):
                if needle in pg or date_raw in pg:
                    found_page = idx
                    break
        enriched.append({**it, "page": found_page})

    return {
        "course_name": course_name,
        "semester_year": semester_year,
        "items": enriched,
    }


# Backwards compatibility helpers if your app imports these names
def normalize_date_text(text: str) -> str:
    return _norm_date_to_iso(text, fallback_year=None)


# -------------------------
# New lightweight adapters expected by app/app.py
# -------------------------

def extract_assignments_from_pdf_bytes(pdf_bytes: bytes) -> List[Dict[str, str]]:
    """
    Open a PDF from raw bytes, extract text from all pages, run the same
    regex pipeline, and return a list of items:
      [{'title','due_date_raw','due_date_iso','page'}...]
    """
    if fitz is None:
        raise RuntimeError("PyMuPDF (fitz) is not installed. `pip install pymupdf`")

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page_texts = []
    for page in doc:
        txt = page.get_text("text")
        txt = re.sub(r"[ \t]+", " ", txt).replace("—", "-")
        page_texts.append(txt)
    doc.close()

    joined = "\n".join(page_texts)
    fallback_year = _detect_fallback_year(joined)

    # Use the existing core parser
    items = extract_from_text(joined, fallback_year)

    # Best-effort page tagging by searching for the raw date on a page
    enriched: List[Dict[str, str]] = []
    for it in items:
        date_raw = (it.get("due_date_raw") or "").replace(".", "")
        found_page = None
        if date_raw:
            for idx, pg in enumerate(page_texts, start=1):
                if date_raw in pg or it.get("due_date_raw", "") in pg:
                    found_page = idx
                    break
        enriched.append({**it, "page": found_page})
    return enriched


def extract_assignments_from_text(text: str) -> List[Dict[str, str]]:
    """
    Run the same parsing on a raw text blob. Returns the same item list.
    """
    fallback_year = _detect_fallback_year(text or "")
    return extract_from_text(text or "", fallback_year)
