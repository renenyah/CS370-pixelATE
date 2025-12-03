# app/ocr/ocr_processor.py
import os
import re
import sys
from typing import List, Dict, Any, Optional, Tuple

import cv2
import numpy as np
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter

try:
    import dateparser
except Exception:
    dateparser = None

# ---------------------------------------------------------------------------
# Tesseract path (env override or Homebrew default)
# ---------------------------------------------------------------------------
_TESS_CMD = os.getenv("TESSERACT_CMD")
if _TESS_CMD and os.path.exists(_TESS_CMD):
    pytesseract.pytesseract.tesseract_cmd = _TESS_CMD
else:
    default_mac_path = "/opt/homebrew/bin/tesseract"
    if os.path.exists(default_mac_path):
        pytesseract.pytesseract.tesseract_cmd = default_mac_path

os.environ.setdefault("TESSDATA_PREFIX", "/usr/share/tesseract-ocr/4.00/tessdata")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# ---------------------------------------------------------------------------
# preprocessing
# ---------------------------------------------------------------------------


def _deskew(gray: np.ndarray) -> np.ndarray:
    _, bw = cv2.threshold(
        gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )
    coords = np.column_stack(np.where(bw > 0))
    if coords.size == 0:
        return gray
    rect = cv2.minAreaRect(coords)
    angle = rect[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    if abs(angle) < 0.5:
        return gray
    (h, w) = gray.shape[:2]
    M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
    return cv2.warpAffine(
        gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
    )


def preprocess_image(image_path: str, method: str = "standard") -> Tuple[Image.Image, str]:
    img_cv = cv2.imread(image_path)
    if img_cv is None:
        raise ValueError(f"Could not read image at {image_path}")
    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
    saved_path = ""

    if method == "screenshot":
        scale = 200
        w = int(gray.shape[1] * scale / 100)
        h = int(gray.shape[0] * scale / 100)
        up = cv2.resize(gray, (w, h), interpolation=cv2.INTER_CUBIC)
        up = cv2.fastNlMeansDenoising(up, None, 10, 7, 21)
        up = _deskew(up)
        bin_img = cv2.adaptiveThreshold(
            up, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 5
        )
        horiz_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (30, 1))
        vert_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 30))
        temp = cv2.morphologyEx(bin_img, cv2.MORPH_OPEN, horiz_kernel, iterations=1)
        temp = cv2.morphologyEx(temp, cv2.MORPH_OPEN, vert_kernel, iterations=1)
        cleaned = cv2.bitwise_or(bin_img, temp)
        pil_img = Image.fromarray(cleaned)
        saved_path = _save_preprocessed(image_path, pil_img, suffix=method)
        return pil_img, saved_path

    if method == "aggressive":
        w = int(gray.shape[1] * 2)
        h = int(gray.shape[0] * 2)
        up = cv2.resize(gray, (w, h), interpolation=cv2.INTER_CUBIC)
        den = cv2.fastNlMeansDenoising(up, None, 12, 7, 21)
        _, bin_img = cv2.threshold(
            den, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )
        pil_img = Image.fromarray(bin_img).filter(ImageFilter.SHARPEN)
        saved_path = _save_preprocessed(image_path, pil_img, suffix=method)
        return pil_img, saved_path

    # standard/adaptive fallback
    w = int(gray.shape[1] * 2)
    h = int(gray.shape[0] * 2)
    up = cv2.resize(gray, (w, h), interpolation=cv2.INTER_CUBIC)
    den = cv2.fastNlMeansDenoising(up, None, 10, 7, 21)
    pil_img = Image.fromarray(den)
    saved_path = _save_preprocessed(image_path, pil_img, suffix=method)
    return pil_img, saved_path


def _save_preprocessed(src_path: str, pil_img: Image.Image, suffix: str) -> str:
    try:
        os.makedirs("preprocessed", exist_ok=True)
        base = os.path.splitext(os.path.basename(src_path))[0]
        out_path = os.path.join("preprocessed", f"{base}__{suffix}.png")
        pil_img.save(out_path)
        return out_path
    except Exception:
        return ""

# ---------------------------------------------------------------------------
# OCR tokens/rows
# ---------------------------------------------------------------------------


def _psm_config(psm_hint: Optional[int], preprocess_method: str) -> str:
    if psm_hint is not None:
        return f"--oem 3 --psm {int(psm_hint)}"
    if preprocess_method == "screenshot":
        return "--oem 3 --psm 11"  # sparse text
    return "--oem 3 --psm 6"


def _image_to_tokens(pil_img: Image.Image, config: str) -> List[Dict[str, Any]]:
    data = pytesseract.image_to_data(
        pil_img, output_type=pytesseract.Output.DICT, config=config
    )
    tokens: List[Dict[str, Any]] = []
    n = len(data.get("text", []))
    for i in range(n):
        txt = (data["text"][i] or "").strip()
        if not txt:
            continue
        try:
            conf = int(float(data["conf"][i]))
        except Exception:
            conf = -1
        tokens.append(
            dict(
                text=txt,
                conf=conf,
                x=int(data["left"][i]),
                y=int(data["top"][i]),
                w=int(data["width"][i]),
                h=int(data["height"][i]),
            )
        )
    return tokens


def _cluster_rows(tokens: List[Dict[str, Any]], min_conf: int = 35) -> List[List[Dict[str, Any]]]:
    toks = [t for t in tokens if t.get("conf", -1) >= min_conf]
    if not toks:
        return []
    for t in toks:
        t["cy"] = t["y"] + t["h"] / 2.0
    toks.sort(key=lambda t: t["cy"])
    rows: List[List[Dict[str, Any]]] = []
    current: List[Dict[str, Any]] = []
    last_cy = None
    last_h = None

    for t in toks:
        if last_cy is None:
            current = [t]
            last_cy = t["cy"]
            last_h = t["h"]
            continue
        tol = max(10, (last_h + t["h"]) * 0.30)
        if abs(t["cy"] - last_cy) <= tol:
            current.append(t)
            last_cy = (last_cy + t["cy"]) / 2.0
            last_h = (last_h + t["h"]) / 2.0
        else:
            current.sort(key=lambda z: z["x"])
            rows.append(current)
            current = [t]
            last_cy = t["cy"]
            last_h = t["h"]
    if current:
        current.sort(key=lambda z: z["x"])
        rows.append(current)

    # merge very close rows
    merged: List[List[Dict[str, Any]]] = []
    for row in rows:
        if not merged:
            merged.append(row)
            continue
        prev = merged[-1]
        cy_prev = sum(t["cy"] for t in prev) / len(prev)
        cy_cur = sum(t["cy"] for t in row) / len(row)
        if abs(cy_cur - cy_prev) < 8:
            merged[-1] = sorted(prev + row, key=lambda z: z["x"])
        else:
            merged.append(row)
    return merged


def _rows_to_text(rows: List[List[Dict[str, Any]]]) -> str:
    lines = []
    for row in rows:
        line = " ".join(t["text"] for t in row)
        line = re.sub(
            r"\b(\w+)\s+\1\b", r"\1", line, flags=re.IGNORECASE
        )  # remove obvious duplicates
        lines.append(line)
    return "\n".join(lines)

# ---------------------------------------------------------------------------
# Date + type helpers
# ---------------------------------------------------------------------------


_COURSE_REGEX = re.compile(
    r"\b([A-Z]{2,5}[_\-\s]?\d{2,3}(?:[_\-\s]\d{1,2})?)\b"
)


def _find_course_name(text: str) -> str:
    head = "\n".join(text.splitlines()[:10])
    m = _COURSE_REGEX.search(head)
    return m.group(1) if m else ""


def _normalize_date_to_raw_and_iso(text: str) -> Tuple[str, str]:
    """
    Parse a date/time expression and return:
      - raw: 'MM/DD/YYYY hh:mmam/pm'
      - iso: 'YYYY-MM-DDTHH:MM'
    If no time is present, default to 11:59pm.
    """
    if not text or not dateparser:
        return "", ""

    # If there's no obvious time, default to 11:59pm
    if not re.search(r"\d\s*(am|pm)\b", text, re.I) and not re.search(
        r"\d{1,2}:\d{2}", text
    ):
        text_with_time = text.strip() + " 11:59pm"
    else:
        text_with_time = text

    try:
        settings = {
            "RETURN_AS_TIMEZONE_AWARE": False,
            "PREFER_DAY_OF_MONTH": "first",
            "DATE_ORDER": "MDY",
        }
        dt = dateparser.parse(text_with_time, settings=settings)
        if not dt:
            return "", ""
        # ISO with time
        iso = dt.strftime("%Y-%m-%dT%H:%M")
        # Raw MM/DD/YYYY hh:mmam/pm
        hour24 = dt.hour
        minute = dt.minute
        if hour24 == 0:
            h12 = 12
            suffix = "am"
        elif hour24 == 12:
            h12 = 12
            suffix = "pm"
        elif hour24 > 12:
            h12 = hour24 - 12
            suffix = "pm"
        else:
            h12 = hour24
            suffix = "am"
        raw = f"{dt.month:02d}/{dt.day:02d}/{dt.year} {h12}:{minute:02d}{suffix}"
        return raw, iso
    except Exception:
        return "", ""


def _classify_type(title: str) -> str:
    t = (title or "").lower()
    if "quiz" in t:
        return "quiz"
    if any(k in t for k in ["exam", "midterm", "test"]):
        return "test"
    if "presentation" in t or "talk" in t:
        return "presentation"
    return "assignment"

# ---------------------------------------------------------------------------
# Assignment extraction (Canvas-aware)
# ---------------------------------------------------------------------------


# generic date token (still used for fallbacks)
_DATE_PAT = (
    r"("
    r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?"
    r"|\d{1,2}/\d{1,2}(?:/\d{2,4})?"
    r"|\b(?:due|by)\s*[:\s-]*\s*(?:[A-Za-z]+\s+\d{1,2}|\d{1,2}/\d{1,2})"
    r"|\b(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s+\d{1,2}"
    r")"
)


def _is_nav_or_header(line: str) -> bool:
    return bool(
        re.search(
            r"\b(Assignments|Upcoming Assignments|Overdue Assignments|"
            r"Undated Assignments|Past Assignments|Modules|Home|Syllabus|"
            r"Announcements|Discussions|Quizzes|Grades|People|Files|Course Analytics)\b",
            line,
            re.I,
        )
    )

def _is_title_candidate(line: str) -> bool:
    """Heuristic: looks like 'hw6', 'Readings8', 'Final Exam', etc., not 'US' or nav UI."""
    base = line.strip(" |")
    if not base:
        return False

    # Filter out nav / header stuff
    if _is_nav_or_header(base):
        return False

    # Not lines that already talk about 'due' or 'available until' or points
    if re.search(r"\b(due|available until)\b", base, re.I):
        return False
    if re.search(r"\bpts\b", base, re.I):
        return False

    # Strip punctuation for length checks
    simple = re.sub(r"[|:·\-_/]", " ", base)
    simple = re.sub(r"\s+", " ", simple).strip()

    # Too short (e.g. "US", "=") → ignore
    if len(simple) < 3:
        return False

    # Must have at least one letter
    if not re.search(r"[A-Za-z]", simple):
        return False

    # All-caps long strings (UI junk) → ignore
    if len(simple) > 4 and simple.isupper():
        return False

    return True


def _extract_canvas_style(full_text: str) -> List[Dict[str, str]]:
    """
    Special handling for Canvas pages:
    - Title is usually on one line (hw5 / Readings8 / Final Exam)
    - 'Due ...' details are on the next line.
    """
    lines = [ln.strip() for ln in full_text.splitlines() if ln.strip()]
    results: List[Dict[str, str]] = []
    last_title: Optional[str] = None

    for ln in lines:
        # 1) If this line does NOT contain 'Due', treat it as a possible title row
        if not re.search(r"\bdue\b", ln, re.I):
            if _is_title_candidate(ln):
                # Only update last_title when it looks like a real assignment name
                last_title = ln.strip(" |")
            continue

        # 2) This line DOES contain 'Due' → it’s a due-info row
        matches = list(re.finditer(r"\bDue\b\s+(.*?)(?:\||$)", ln, re.I))
        if not matches:
            continue

        # Canvas lines sometimes have both "Not available until ..." and "Due ..."
        # We want the last 'Due ...'
        m = matches[-1]
        due_part = m.group(1).strip()

        # Prefer the previous good title line as the assignment name
        title_candidate = last_title

        # Fallback: look to the left of 'Due' in this same line
        if not title_candidate:
            left = ln[: m.start()].strip(" |")
            title_patterns = [
                r"(hw\d+)",
                r"(homework\s*\d+)",
                r"((?:midterm|final)\s+exam)",
                r"(exam\s*\d*)",
                r"(quiz\s*\d*)",
                r"(readings?\s*\d*)",
                r"([A-Z][A-Za-z0-9\s]{0,40}?(?:Exam|Quiz|Test|Presentation))",
            ]
            for pat in title_patterns:
                mm = list(re.finditer(pat, left, re.I))
                if mm:
                    title_candidate = mm[-1].group(0).strip()
                    break
            if not title_candidate and left:
                chunks = [c.strip() for c in left.split("|") if c.strip()]
                if chunks:
                    title_candidate = chunks[-1]

        if not title_candidate:
            continue

        raw, iso = _normalize_date_to_raw_and_iso(due_part)
        if not raw and not iso:
            continue

        results.append(
            {
                "title": title_candidate.strip()[:300],
                "due_date_raw": raw,
                "due_date_iso": iso,
            }
        )

    # Deduplicate by (title, iso)
    uniq: Dict[Tuple[str, str], Dict[str, str]] = {}
    for it in results:
        key = (it["title"].lower(), it["due_date_iso"])
        if key not in uniq:
            uniq[key] = it
    return list(uniq.values())



def extract_assignments_and_dates(full_text: str) -> List[Dict[str, str]]:
    """
    Main OCR text -> assignments extractor.
    1. Try Canvas-specific parsing (_extract_canvas_style).
    2. If nothing found, fall back to a generic '... due ... <date>' scan.
    """
    if not full_text:
        return []

    # 1) Canvas-style extraction first
    results = _extract_canvas_style(full_text)
    if results:
        return results

    # 2) Generic fallback: look for 'due' and a date on each line
    results = []
    for ln in full_text.splitlines():
        if not re.search(r"\bdue\b", ln, re.I):
            continue
        dm = re.search(_DATE_PAT, ln, re.I)
        if not dm:
            continue
        date_text = dm.group(1).strip()
        left = ln[: dm.start()].strip()
        left = re.sub(
            r"\b(due|by)\b.*$", "", left, flags=re.I
        ).strip(": -|")
        if not left:
            continue
        title = left[:300]
        raw, iso = _normalize_date_to_raw_and_iso(date_text)
        results.append(
            {
                "title": title,
                "due_date_raw": raw,
                "due_date_iso": iso,
            }
        )

    return results

# ---------------------------------------------------------------------------
# public API
# ---------------------------------------------------------------------------


def ocr_extract_assignments(
    image_path: str,
    preprocess_method: str = "screenshot",
    psm_hint: Optional[int] = None,
    min_conf: int = 35,
) -> List[Dict[str, Any]]:
    pil_img, _ = preprocess_image(image_path, method=preprocess_method)
    config = _psm_config(psm_hint, preprocess_method)
    tokens = _image_to_tokens(pil_img, config)
    rows = _cluster_rows(tokens, min_conf=min_conf)
    doc_text = _rows_to_text(rows)
    course = _find_course_name(doc_text)

    items = extract_assignments_and_dates(doc_text)

    return [
        {
            "title": it["title"],
            "due_date_raw": it.get("due_date_raw", ""),
            "due_date_iso": it.get("due_date_iso", ""),
            "assignment_type": _classify_type(it.get("title", "")),
            "course": course,
            "page": 1,
            "source": "ocr",
        }
        for it in items
    ]


def debug_ocr_image(
    image_path: str,
    preprocess_method: str = "screenshot",
    psm_hint: Optional[int] = None,
    min_conf: int = 35,
) -> Dict[str, Any]:
    pil_img, saved_path = preprocess_image(image_path, method=preprocess_method)
    config = _psm_config(psm_hint, preprocess_method)
    tokens = _image_to_tokens(pil_img, config)
    rows = _cluster_rows(tokens, min_conf=min_conf)
    text = _rows_to_text(rows)

    return {
        "preprocessed_saved": saved_path or "",
        "token_count": len(tokens),
        "row_count": len(rows),
        "first_tokens": tokens[:25],
        "first_rows": [" ".join(t["text"] for t in r) for r in rows[:10]],
        "first_text": "\n".join(text.splitlines()[:20]),
    }
