# app/ocr/ocr_processor.py
from __future__ import annotations

import os
import re
import sys
from typing import List, Dict, Any, Optional, Tuple, Set

import cv2
import numpy as np
import pytesseract
from PIL import Image, ImageFilter

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
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
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
            up,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            31,
            5,
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
        _, bin_img = cv2.threshold(den, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
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
        # Canvas screenshots are usually sparse text
        return "--oem 3 --psm 11"
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
        tol = max(12, (last_h + t["h"]) * 0.35)
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
        if abs(cy_cur - cy_prev) < 10:
            merged[-1] = sorted(prev + row, key=lambda z: z["x"])
        else:
            merged.append(row)
    return merged


def _rows_to_lines(rows: List[List[Dict[str, Any]]]) -> List[str]:
    lines: List[str] = []
    for row in rows:
        line = " ".join(t["text"] for t in row)
        # collapse duplicate tokens like "Quiz Quiz"
        line = re.sub(r"\b(\w+)\s+\1\b", r"\1", line, flags=re.IGNORECASE)
        line = " ".join(line.split())
        if line:
            lines.append(line)
    return lines


def _rows_to_text(rows: List[List[Dict[str, Any]]]) -> str:
    return "\n".join(_rows_to_lines(rows))

# ---------------------------------------------------------------------------
# date + type helpers
# ---------------------------------------------------------------------------


def _normalize_datetime(text: str) -> Tuple[str, str]:
    """
    Convert things like 'Nov 21 at 11:59pm' or '12/1/25' into:
      iso:   '2025-11-21T23:59'
      human: '11/21/2025 11:59pm'

    If no explicit time is present, default to 11:59pm.
    """
    if not text or not dateparser:
        return "", text.strip()

    raw = text.strip()

    has_time = bool(
        re.search(r"\d{1,2}:\d{2}\s*(am|pm)", raw, re.I)
        or re.search(r"\b\d{1,2}\s*(am|pm)\b", raw, re.I)
    )

    settings = {
        "RETURN_AS_TIMEZONE_AWARE": False,
        "PREFER_DAY_OF_MONTH": "first",
        "DATE_ORDER": "MDY",
    }
    dt = dateparser.parse(raw, settings=settings)
    if not dt:
        return "", raw

    if not has_time:
        dt = dt.replace(hour=23, minute=59, second=0, microsecond=0)

    iso = dt.strftime("%Y-%m-%dT%H:%M")

    hour24 = dt.hour
    minute = dt.minute
    ampm = "am" if hour24 < 12 else "pm"
    hour12 = hour24 % 12 or 12
    human = f"{dt.month:02d}/{dt.day:02d}/{dt.year} {hour12}:{minute:02d}{ampm}"

    return iso, human


def _normalize_date_to_iso(text: str) -> str:
    # kept for compatibility, but we prefer _normalize_datetime
    iso, _ = _normalize_datetime(text)
    return iso


def _guess_assignment_type(title: str) -> str:
    t = title.lower()
    if "quiz" in t:
        return "quiz"
    if any(k in t for k in ("exam", "midterm", "final", "test")):
        return "test"
    if any(k in t for k in ("presentation", "talk", "pitch")):
        return "presentation"
    return "assignment"


_COURSE_REGEX = re.compile(r"\b([A-Z]{2,5}[_\-\s]?\d{2,3}(?:[_\-\s]\d{1,2})?)\b")


def _find_course_name(text: str) -> str:
    head = "\n".join(text.splitlines()[:10])
    m = _COURSE_REGEX.search(head)
    return m.group(1) if m else ""

# ---------------------------------------------------------------------------
# regex used in fallback (your original logic)
# ---------------------------------------------------------------------------

_DATE_PAT = (
    r"("
    r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?"
    r"|\d{1,2}/\d{1,2}(?:/\d{2,4})?"
    r"|\b(?:due|by)\s*[:\s-]*\s*(?:[A-Za-z]+\s+\d{1,2}|\d{1,2}/\d{1,2})"
    r"|\b(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s+\d{1,2}"
    r")"
)
_ASSIGNMENT_KEYS = (
    r"(?:Due|DUE|DEADLINE|assignment|homework|quiz|exam|midterm|final|project|paper|essay|lab|task|test|assessment|presentation|reading|discussion|exercise|reflection)"
)
_ASSIGNMENT_REGEX = re.compile(
    r"([A-Za-z0-9\s()./\-:_]+?)\s*"
    + _ASSIGNMENT_KEYS
    + r"\s*[:\s-]*"
    + _DATE_PAT,
    flags=re.IGNORECASE,
)

# ---------------------------------------------------------------------------
# Canvas-aware extraction (new) + fallback (old behavior)
# ---------------------------------------------------------------------------


def _extract_assignments_canvas_style(lines: List[str]) -> List[Dict[str, str]]:
    """
    Focused on Canvas "Assignments" pages.

    We first build "candidate" lines where the title might be on one line
    and the 'Due ...' on the next, then parse each candidate line.
    """
    candidates: List[str] = []

    # 1) merge title line + due line when Canvas splits them
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        low = line.lower()
        if "due" in low:
            candidates.append(line)
            i += 1
            continue

        # if next line contains 'due', merge these two
        if i + 1 < n and "due" in lines[i + 1].lower():
            merged = line + " " + lines[i + 1]
            candidates.append(merged)
            i += 2
        else:
            i += 1

    results: List[Dict[str, str]] = []
    seen: Set[Tuple[str, str]] = set()

    nav_phrases = [
        "upcoming assignments",
        "undated assignments",
        "past assignments",
        "show by date",
        "show by type",
    ]

    for cand in candidates:
        line = " ".join(cand.split())
        if not line:
            continue
        low = line.lower()
        if "due" not in low:
            continue
        if any(p in low for p in nav_phrases):
            continue

        due_idx = low.rfind("due ")
        if due_idx == -1:
            continue

        left = line[:due_idx].strip(" |:-")
        right = line[due_idx + 4 :].strip()

        # strip 'available until / not available until' noise
        ll = left.lower()
        for phrase in (" not available until", " available until"):
            pos = ll.find(phrase)
            if pos != -1:
                left = left[:pos].strip(" |:-,")
                ll = left.lower()

        if not left or len(left) < 2:
            continue

        # skip pure headers
        if left.lower() in ("upcoming assignments", "undated assignments", "past assignments"):
            continue

        # small fix for 'le Final Exam' → 'Final Exam'
        words = left.split()
        if len(words) > 1 and len(words[0]) <= 2 and words[1][0].isupper():
            left = " ".join(words[1:])

        # trim date tail at first '|'
        pipe = right.find("|")
        if pipe != -1:
            right = right[:pipe]
        date_str = right.strip()
        if not date_str:
            continue

        iso, human = _normalize_datetime(date_str)
        if not human:
            human = date_str

        key = (left.lower(), iso or human)
        if key in seen:
            continue
        seen.add(key)

        results.append(
            {
                "title": left,
                "due_date_raw": human,
                "due_date_iso": iso,
                "assignment_type": _guess_assignment_type(left),
            }
        )

    return results


def extract_assignments_and_dates(full_text: str) -> List[Dict[str, str]]:
    """
    Main logical extractor:
      1) Canvas-aware line/merged-line pass (preferred).
      2) If that finds nothing, fall back to your original regex behavior.
    """
    if not full_text:
        return []

    results: List[Dict[str, str]] = []
    seen: Set[Tuple[str, str]] = set()

    lines = [" ".join(ln.split()) for ln in full_text.splitlines()]
    lines = [ln for ln in lines if ln]

    # ---- Pass 1: Canvas-aware ----
    canvas_items = _extract_assignments_canvas_style(lines)
    for it in canvas_items:
        key = (it["title"].lower(), it["due_date_iso"] or it["due_date_raw"])
        if key in seen:
            continue
        seen.add(key)
        results.append(it)

    # ---- Pass 2: original regex per line (only if nothing found) ----
    if not results:
        for ln in lines:
            for m in _ASSIGNMENT_REGEX.findall(ln):
                title = " ".join(m[0].split())[:300]
                date_raw_text = m[-1].strip()
                iso, human = _normalize_datetime(date_raw_text)
                if not human:
                    human = date_raw_text
                key = (title.lower(), iso or human)
                if key in seen:
                    continue
                seen.add(key)
                results.append(
                    {
                        "title": title,
                        "due_date_raw": human,
                        "due_date_iso": iso,
                        "assignment_type": _guess_assignment_type(title),
                    }
                )

    # ---- Pass 3: simple "line contains 'due'" fallback (your old fallback) ----
    if not results:
        for ln in lines:
            if not re.search(r"\bdue\b", ln, re.I):
                continue
            dm = re.search(_DATE_PAT, ln, re.I)
            if not dm:
                continue
            date_raw_text = dm.group(1).strip()
            left = ln[: dm.start()].strip()
            left = re.sub(r"\b(due|by)\b.*$", "", left, flags=re.I).strip(": -")
            if not left:
                continue
            iso, human = _normalize_datetime(date_raw_text)
            if not human:
                human = date_raw_text
            key = (left.lower(), iso or human)
            if key in seen:
                continue
            seen.add(key)
            results.append(
                {
                    "title": left[:300],
                    "due_date_raw": human,
                    "due_date_iso": iso,
                    "assignment_type": _guess_assignment_type(left),
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
            "assignment_type": it.get("assignment_type", "assignment"),
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
    lines = _rows_to_lines(rows)
    text = "\n".join(lines)
    items = extract_assignments_and_dates(text)

    return {
        "preprocessed_saved": saved_path or "",
        "token_count": len(tokens),
        "row_count": len(rows),
        "first_rows": [" ".join(t["text"] for t in r) for r in rows[:10]],
        "first_text": "\n".join(text.splitlines()[:20]),
        "items_preview": items,
    }
