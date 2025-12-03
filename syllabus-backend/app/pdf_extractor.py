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

LINE_STARTS_WITH_NUMERIC = re.compile(
    rf"""(?xi) ^
    \s*(?P<date>{NUMERIC})
    \s+
    (?P<title>[^.\n]*?\b(?:due|assigned|given)\b[^.\n]*)
    $
    """
)

WEEK_LINE = re.compile(
    rf"(?i)^\s*week\s*\d+\s*\((?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\s+(?P<date>{DATE_TOKEN})\)\s*"
)
ASSIGNMENT_AFTER_WEEK = re.compile(
    r"(?i)\bAssignment\s*\d+\s*[:\-]\s*(?P<title>[^.\n]+)"
)

DUE_ON_DATE = re.compile(
    rf"""(?xi)
    (?P<title>[^.\n]{{6,}}?)
    \b(?:due\s*(?:at[^,\n]+)?\s*on,?\s*|due\s*[,:\-]?\s*)
    (?P<date>{DATE_TOKEN})
    """,
)

WEEKDAY_BLOCK = r"(?:Mon(?:day)?|Tue(?:s|sday)?|Wed(?:nesday)?|Thu(?:rs|rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)"
DUE_BY_WEEKDAYS = re.compile(
    rf"(?i)\b(?:due(?:\s+at[^,:\n]+)?\s+by|due\s+by|given\s+on)\s+(?P<days>{WEEKDAY_BLOCK}(?:\s*(?:and|,)\s*{WEEKDAY_BLOCK})*)"
)

COURSE_NAME_PATTERNS = [
    re.compile(r"(?i)^\s*course\s*name\s*:\s*(?P<name>.+)$"),
    re.compile(r"(?i)^\s*course\s*code\s*:\s*(?P<name>.+)$"),
    re.compile(r"(?i)^\s*course\s*syllabus\s*(?P<name>.*)$"),
    re.compile(r"(?i)^\s*([A-Z]{2,}\s*\d{2,}[A-Z\-]*\s*[:\-]?\s*.+)$"),
]

SEMESTER_YEAR = re.compile(r"(?i)\b(Spring|Summer|Fall|Autumn|Winter)\s+(20\d{2})\b")
ANY_YEAR = re.compile(r"\b(20\d{2})\b")

WEEKDAY = re.compile(
    r"(?i)\b(Mon(?:day)?|Tue(?:s|sday)?|Wed(?:nesday)?|Thu(?:rs|rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)\b"
)


def _clean(s: str) -> str:
    s = s.replace("\u2013", "-").replace("\u2014", "-")
    s = re.sub(r"[ \t]+", " ", s)
    return s.strip()


def _normalize_calendar_spacing(text: str) -> str:
    text = re.sub(
        r"(?i)\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)"
        r"(?=(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z\.]*\s+\d{1,2})",
        r"\1 ",
        text,
    )
    text = re.sub(r"[ \t]+", " ", text)
    return text


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


def _iso_to_mdy(iso: str) -> str:
    try:
        if not iso or len(iso) < 10:
            return ""
        y, m, d = [int(x) for x in iso[:10].split("-")]
        return f"{m:02d}/{d:02d}/{y:04d}"
    except Exception:
        return ""


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
        k = (
            _clean(it.get("title", "")).lower(),
            it.get("due_date_iso", "") or it.get("due_date_raw", "").lower(),
        )
        if k in seen:
            continue
        seen.add(k)
        out.append(it)
    return out


def _infer_assignment_type(title: str) -> str:
    """
    Map title text to one of: Quiz, Test, Presentation, Assignment.
    """
    t = title.lower()
    if "quiz" in t:
        return "Quiz"
    if "exam" in t or "midterm" in t or "test" in t:
        return "Test"
    if "presentation" in t or "present" in t or "talk" in t:
        return "Presentation"
    return "Assignment"


# -------------------------
# Core extraction from plain text
# -------------------------

def extract_from_text(full_text: str, fallback_year: Optional[int]) -> List[Dict[str, str]]:
    results: List[Dict[str, str]] = []
    text = _normalize_calendar_spacing(full_text)

    def _make_item(title: str, date_raw: str) -> Dict[str, str]:
        iso = _norm_date_to_iso(date_raw, fallback_year)
        mdy = _iso_to_mdy(iso)
        return {
            "title": _clean(title),
            "due_date_raw": _clean(date_raw),
            "due_date_iso": iso,
            "due_mdy": mdy,
            "due_time": "23:59",  # default DB time
            "assignment_type": _infer_assignment_type(title),
        }

    # Pass A: explicit “due/given … <date>”
    for m in EXPLICIT_DUE_GIVEN.finditer(text):
        title = _clean(m.group("title"))
        date_raw = _clean(m.group("date"))
        item = _make_item(title, date_raw)
        if item["due_date_iso"]:
            results.append(item)

    # Pass B: schedule rows beginning with a month-name date
    for ln in text.splitlines():
        ln_c = _clean(ln)
        mb = LINE_STARTS_WITH_DATE.search(ln_c)
        if not mb:
            continue
        date_raw = _clean(mb.group("date"))
        title = _clean(mb.group("title"))
        parts = re.split(
            r"\s*,\s*(?=(?:Problem|PS|Assignment|Homework|Final|Midterm|Exam|Quiz|Project|Prototype|Reading|Response|Presentation)\b)",
            title,
            maxsplit=5,
        )
        for p in parts:
            p = _clean(p)
            if not p:
                continue
            if not re.search(r"(?i)\b(due|assigned|given)\b", p):
                if not re.search(
                    r"(?i)(final|midterm|exam|quiz|problem\s*set|assignment|homework|paper|project|prototype|reading|response|presentation)",
                    p,
                ):
                    continue
            item = _make_item(p, date_raw)
            if item["due_date_iso"]:
                results.append(item)

    # Pass B2: lines that begin with a numeric date
    for ln in text.splitlines():
        ln_c = _clean(ln)
        mb_num = LINE_STARTS_WITH_NUMERIC.search(ln_c)
        if not mb_num:
            continue
        date_raw = _clean(mb_num.group("date"))
        title = _clean(mb_num.group("title"))
        item = _make_item(title, date_raw)
        if item["due_date_iso"] or item["due_date_raw"]:
            results.append(item)

    # Pass C: “... due ... on <date>”
    for m in DUE_ON_DATE.finditer(text):
        title = _clean(m.group("title"))
        if len(title) > 180:
            continue
        date_raw = _clean(m.group("date"))
        item = _make_item(title, date_raw)
        if item["due_date_iso"]:
            results.append(item)

    # Pass D: Rome “Week … (Mon Jan. 27) … Assignment N: ...”
    current_week_date: Optional[str] = None
    for ln in text.splitlines():
        ln_c = _clean(ln)
        wm = WEEK_LINE.search(ln_c)
        if wm:
            current_week_date = _clean(wm.group("date"))
            continue
        if current_week_date:
            am = ASSIGNMENT_AFTER_WEEK.search(ln_c)
            if am:
                title = f"Assignment {am.group(0).split(':', 1)[0].strip()}: {_clean(am.group('title'))}"
                item = _make_item(title, current_week_date)
                if item["due_date_iso"]:
                    results.append(item)

    # Pass E: “due by Tuesday and Thursday ...”
    last_concrete_date_raw: Optional[str] = None
    lines = text.splitlines()
    for ln in lines:
        ln_c = _clean(ln)
        dr = re.search(DATE_TOKEN, ln_c)
        if dr:
            last_concrete_date_raw = _clean(dr.group(0))

        m = DUE_BY_WEEKDAYS.search(ln_c)
        if not m:
            continue

        title_left = _clean(ln_c[: m.start()]).strip(": -")
        if not title_left:
            continue

        tail = ln_c[m.end():]
        dates_in_tail = [_clean(x) for x in re.findall(DATE_TOKEN, tail)]
        if dates_in_tail:
            for d in dates_in_tail:
                item = _make_item(title_left, d)
                results.append(item)
            continue

        days_str = _clean(m.group("days"))
        context = f"{days_str}" + (
            f" (week of {last_concrete_date_raw})" if last_concrete_date_raw else ""
        )
        item = {
            "title": title_left,
            "due_date_raw": context,
            "due_date_iso": "",
            "due_mdy": "",
            "due_time": "",
            "assignment_type": _infer_assignment_type(title_left),
        }
        results.append(item)

    return _unique(results)


# -------------------------
# Public API
# -------------------------

def extract_assignments_from_pdf(pdf_path: str) -> Dict[str, Any]:
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
        txt = re.sub(r"[ \t]+", " ", txt)
        txt = txt.replace("—", "-")
        all_text.append(txt)
    doc.close()

    joined = "\n".join(all_text)
    fallback_year = _detect_fallback_year(joined)
    course_name = _detect_course_name(first_page_text)
    sem_match = SEMESTER_YEAR.search(joined)
    semester_year = (
        f"{sem_match.group(1).title()} {sem_match.group(2)}" if sem_match else ""
    )

    items = extract_from_text(joined, fallback_year)

    enriched: List[Dict[str, Any]] = []
    for it in items:
        date_raw = it.get("due_date_raw", "")
        found_page = None
        if date_raw:
            needle = date_raw.replace(".", "")
            for idx, pg in enumerate(all_text, start=1):
                if needle in pg or date_raw in pg:
                    found_page = idx
                    break
        enriched.append({**it, "page": found_page, "course": course_name})

    return {
        "course_name": course_name,
        "semester_year": semester_year,
        "items": enriched,
    }


def normalize_date_text(text: str) -> str:
    return _norm_date_to_iso(text, fallback_year=None)


def extract_assignments_from_pdf_bytes(pdf_bytes: bytes) -> Dict[str, Any]:
    if fitz is None:
        raise RuntimeError("PyMuPDF (fitz) is not installed. pip install PyMuPDF")

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages: List[str] = []
    first_page_text = ""
    for i, page in enumerate(doc):
        txt = page.get_text("text")
        if i == 0:
            first_page_text = txt
        txt = re.sub(r"[ \t]+", " ", txt)
        txt = txt.replace("—", "-")
        pages.append(txt)
    doc.close()

    joined = "\n".join(pages)
    fallback_year = _detect_fallback_year(joined)
    course_name = _detect_course_name(first_page_text)

    base_items = extract_from_text(joined, fallback_year)

    enriched: List[Dict[str, Any]] = []
    for it in base_items:
        date_raw = it.get("due_date_raw", "")
        found_page = None
        if date_raw:
            needle = date_raw.replace(".", "")
            for idx, pg in enumerate(pages, start=1):
                if needle in pg or date_raw in pg:
                    found_page = idx
                    break
        enriched.append(
            {
                **it,
                "page": found_page,
                "course": course_name,
            }
        )

    return {
        "course_name": course_name,
        "items": enriched,
    }


def extract_assignments_from_text(text: str) -> List[Dict[str, Any]]:
    fallback_year = _detect_fallback_year(text)
    return extract_from_text(text, fallback_year)
