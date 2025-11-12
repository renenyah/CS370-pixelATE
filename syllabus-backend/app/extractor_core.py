# app/extractor_core.py
from __future__ import annotations

import re
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF
import dateparser


# ----------------------------
# Utilities
# ----------------------------

ASSIGNMENT_KEYWORDS = [
    # canonical types
    r"homework",
    r"hw(?:\s*\d+)?",
    r"problem\s*set|ps\s*\d+",
    r"assignment(?:\s*\d+)?",
    r"quiz(?:\s*\d+|#\s*\d+)?",
    r"exam(?:\s*\d+)?|midterm(?:\s*\d+)?|final\s*exam",
    r"project(?:\s*proposal|\s*plan|\s*deliverables|\s*\d+)?",
    r"portfolio",
    r"presentation(?:\s*feedback)?",
    r"blueprint\s*for\s*a\s*seminar\s*paper",
    r"reading\s+response(?:s)?",
    r"discussion\s+post(?:s)?",
    r"reflection(?:\s*paper)?",
    r"lab\s*(?:work|report|assignment)?",
    r"sprint\s*\d+\s*artifacts(?:\s*and\s*feedback)?",
]

ASSIGNMENT_RE = re.compile(
    r"(?i)\b(" + r"|".join(ASSIGNMENT_KEYWORDS) + r")\b"
)

# Matches many month+day variants: "Sep 2", "September 2nd", "DECEMBER 17TH"
MONTH_DAY_RE = re.compile(
    r"""(?ix)
    \b(
      jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|
      may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|
      sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?
    )
    [\s\.]*      # optional whitespace/dot
    (\d{1,2})    # day of month
    (?:st|nd|rd|th)?\b
    """
)

# Numeric date like "9/15" or "09-15"
NUMERIC_DATE_RE = re.compile(r"\b(1[0-2]|0?[1-9])[/-](3[01]|[12]?\d)\b")

# Occasionally syllabi put a weekday before the date (we ignore weekday content)
WEEKDAY_RE = re.compile(
    r"(?i)\b(mon|tues?|wed(?:nesday)?|thu(?:rs)?|fri|sat|sun)(?:day)?\b"
)

# Simple hyphenation fix: join "word-\nnext" to "wordnext"
HYPH_JOIN_RE = re.compile(r"(\w)-\n(\w)")

# Clean multiple spaces / tabs
SPACE_NORM_RE = re.compile(r"[ \t]+")


@dataclass
class Item:
    title: str
    due_date_raw: str
    due_date_iso: str
    page: int
    source: str


# ----------------------------
# Year Guessing
# ----------------------------

def _guess_year_from_pdf_metadata(md: Dict[str, Any]) -> Optional[int]:
    """
    Try to infer the academic year from PDF metadata dates like 'D:20250825215201Z'.
    """
    for key in ("creationDate", "modDate", "CreationDate", "ModDate"):
        val = (md.get(key) or "").strip()
        if val.startswith("D:") and len(val) >= 6:
            # D:YYYY...
            try:
                return int(val[2:6])
            except Exception:
                pass
        # fallback: contains a 4-digit year anywhere
        m = re.search(r"\b(20\d{2}|19\d{2})\b", val)
        if m:
            try:
                return int(m.group(1))
            except Exception:
                pass
    return None


def _pick_reasonable_year(candidates: List[int]) -> Optional[int]:
    """
    If multiple years detected, pick the most common; else the max.
    """
    if not candidates:
        return None
    from collections import Counter
    counts = Counter(candidates)
    year, _ = counts.most_common(1)[0]
    return year


# ----------------------------
# Date Parsing
# ----------------------------

def _normalize_spaces(s: str) -> str:
    s = s.replace("\xa0", " ")
    s = SPACE_NORM_RE.sub(" ", s)
    return s.strip()


def _extract_month_day_token(s: str) -> Optional[str]:
    """
    Return first visible Month Day token from line, normalized, e.g., 'Oct 2'.
    """
    m = MONTH_DAY_RE.search(s)
    if m:
        mon = m.group(1)
        day = m.group(2)
        return f"{mon} {day}"
    # numeric mm/dd
    m2 = NUMERIC_DATE_RE.search(s)
    if m2:
        return f"{m2.group(1)}/{m2.group(2)}"
    return None


def _parse_to_iso(raw_token: str, year_hint: Optional[int]) -> Optional[str]:
    """
    Convert a minimal 'Oct 2' or '9/15' to YYYY-MM-DD using dateparser.
    """
    if not raw_token:
        return None

    text = raw_token
    # Remove weekday names to avoid confusion
    text = WEEKDAY_RE.sub("", text).strip(",:; -")

    # Append year if not present
    if re.search(r"\b(20\d{2}|19\d{2})\b", text) is None and year_hint:
        text_with_year = f"{text} {year_hint}"
    else:
        text_with_year = text

    dt = dateparser.parse(
        text_with_year,
        settings={
            "PREFER_DAY_OF_MONTH": "first",
            "RELATIVE_BASE": datetime(year_hint or datetime.now().year, 9, 1),
            "RETURN_AS_TIMEZONE_AWARE": False,
        },
    )
    if not dt:
        return None
    try:
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return None


# ----------------------------
# Page Text Acquisition
# ----------------------------

def _page_text_lines(page: fitz.Page) -> List[str]:
    """
    Extract lines of text from a page, repairing simple word-break hyphenation.
    """
    txt = page.get_text("text")
    if not txt:
        return []
    # de-hyphenate single split across a newline
    txt = HYPH_JOIN_RE.sub(r"\1\2", txt)
    # Normalize Windows-style newlines
    txt = txt.replace("\r\n", "\n").replace("\r", "\n")
    # Split into lines and clean
    lines = [_normalize_spaces(ln) for ln in txt.split("\n")]
    # Drop empty lines
    return [ln for ln in lines if ln]


def _split_schedule_row(line: str) -> List[str]:
    """
    Split heavy schedule rows on vertical bars or double-spaces.
    """
    if "|" in line:
        parts = [p.strip() for p in line.split("|")]
        return [p for p in parts if p]
    # Fallback: split on 2+ spaces (but keep words together)
    parts = re.split(r"\s{2,}", line)
    parts = [p.strip() for p in parts if p.strip()]
    return parts if len(parts) > 1 else [line]


# ----------------------------
# Candidate Extraction
# ----------------------------

def _line_is_assignmentish(s: str) -> bool:
    return bool(ASSIGNMENT_RE.search(s))


def _build_item(title: str, raw: str, iso: Optional[str], page: int, source: str) -> Item:
    return Item(
        title=_normalize_spaces(title),
        due_date_raw=_normalize_spaces(raw),
        due_date_iso=iso or "",
        page=page,
        source=source,
    )


def _dedupe_items(items: List[Item]) -> List[Item]:
    seen: set[Tuple[str, str, int]] = set()
    out: List[Item] = []
    for it in items:
        key = (it.title.lower(), it.due_date_iso, it.page)
        if key in seen:
            continue
        seen.add(key)
        out.append(it)
    return out


def _scan_page(lines: List[str], page_ix: int, year_hint: Optional[int]) -> List[Item]:
    """
    Extract many candidates from a single page using several heuristics.
    """
    out: List[Item] = []
    last_dated_token: Optional[str] = None
    last_dated_iso: Optional[str] = None
    last_dated_line_ix: Optional[int] = None

    # pass 1: direct lines, keep a notion of the most recent date token on the page
    for i, ln in enumerate(lines):
        token = _extract_month_day_token(ln)
        if token:
            iso = _parse_to_iso(token, year_hint)
            if iso:
                last_dated_token, last_dated_iso, last_dated_line_ix = token, iso, i

        # assignment-ish lines
        if _line_is_assignmentish(ln):
            if token:
                # this line carries a date
                out.append(_build_item(ln, token, _parse_to_iso(token, year_hint), page_ix, "text-line"))
            else:
                # no date: if a close previous line had a date, adopt it (small window)
                if last_dated_line_ix is not None and (i - last_dated_line_ix) <= 3 and last_dated_iso:
                    out.append(_build_item(ln, last_dated_token or "", last_dated_iso, page_ix, "text-line-nearby"))
                else:
                    out.append(_build_item(ln, "", "", page_ix, "text-line-undated"))

        # schedule-style rows with segments
        parts = _split_schedule_row(ln)
        if len(parts) > 1:
            # try to find (segment with date) + (segment with assignment)
            seg_date = None
            seg_iso = None
            for p in parts:
                t = _extract_month_day_token(p)
                if t:
                    seg_date = t
                    seg_iso = _parse_to_iso(t, year_hint)
                    break
            for p in parts:
                if _line_is_assignmentish(p):
                    if seg_iso:
                        out.append(_build_item(p, seg_date or "", seg_iso, page_ix, "table-row"))
                    else:
                        # tie to page-local recent date if close
                        if last_dated_iso and last_dated_line_ix is not None and (i - last_dated_line_ix) <= 3:
                            out.append(_build_item(p, last_dated_token or "", last_dated_iso, page_ix, "table-row-nearby"))
                        else:
                            out.append(_build_item(p, "", "", page_ix, "table-row-undated"))

    # pass 2: “X is due on Thursdays” general rules → keep as undated signals (user can edit later)
    for i, ln in enumerate(lines):
        if re.search(r"(?i)\b(due\s+on|due\s+by|will\s+be\s+due)\b", ln) and _line_is_assignmentish(ln):
            out.append(_build_item(ln, "", "", page_ix, "policy-line"))

    return out


# ----------------------------
# Public Entry
# ----------------------------

def extract_due_dates_from_pdf(pdf_path: str) -> Dict[str, Any]:
    """
    Main entry point used by your FastAPI app.
    Returns:
    {
      "status": "ok",
      "pdf_title": "...",
      "items": [ {title, due_date_raw, due_date_iso, page, source}, ... ],
      "metadata": {...},
      "total_pages": N
    }
    """
    path = Path(pdf_path)
    if not path.exists():
        return {"status": "error", "error": f"File not found: {pdf_path}"}

    items: List[Item] = []
    metadata: Dict[str, Any] = {}
    title = ""
    year_hints: List[int] = []

    with fitz.open(str(path)) as doc:
        md = doc.metadata or {}
        metadata = {
            "format": getattr(doc, "format", ""),
            "title": md.get("title", "") or md.get("Title", ""),
            "author": md.get("author", "") or md.get("Author", ""),
            "subject": md.get("subject", "") or md.get("Subject", ""),
            "keywords": md.get("keywords", "") or md.get("Keywords", ""),
            "creator": md.get("creator", "") or md.get("Creator", ""),
            "producer": md.get("producer", "") or md.get("Producer", ""),
            "creationDate": md.get("creationDate", "") or md.get("CreationDate", ""),
            "modDate": md.get("modDate", "") or md.get("ModDate", ""),
            "trapped": md.get("trapped", "") or md.get("Trapped", ""),
        }
        title = metadata.get("title") or "Untitled"
        total_pages = doc.page_count

        # guess year from metadata
        y = _guess_year_from_pdf_metadata(metadata)
        if y:
            year_hints.append(y)

        # scan pages
        for p in range(total_pages):
            page = doc.load_page(p)
            lines = _page_text_lines(page)
            # if page contains a year literal, capture it as hint too
            for ln in lines:
                m = re.search(r"\b(20\d{2}|19\d{2})\b", ln)
                if m:
                    try:
                        year_hints.append(int(m.group(1)))
                    except Exception:
                        pass

            items.extend(_scan_page(lines, p + 1, _pick_reasonable_year(year_hints)))

    # dedupe + sort
    items = _dedupe_items(items)

    # Prefer dated first by date, then undated by page order, then title
    def _sort_key(it: Item) -> Tuple[int, str, int, str]:
        has_date = 0 if it.due_date_iso else 1
        return (has_date, it.due_date_iso or "9999-12-31", it.page, it.title.lower())

    items_sorted = sorted(items, key=_sort_key)

    # pack to dicts
    items_payload = [
        {
            "title": it.title,
            "due_date_raw": it.due_date_raw,
            "due_date_iso": it.due_date_iso,
            "page": it.page,
            "source": it.source,
        }
        for it in items_sorted
    ]

    return {
        "status": "ok",
        "pdf_title": title,
        "items": items_payload,
        "metadata": metadata,
        "total_pages": len(items_sorted),
    }
