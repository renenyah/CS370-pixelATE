# --- Base image ---
FROM python:3.11-slim

# --- Install system packages (Tesseract + helpers) ---
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        tesseract-ocr \
        libtesseract-dev \
        poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# --- App directory ---
WORKDIR /app

# --- Install Python deps (backend only) ---
# We copy just the requirements first so Docker cache works nicely
COPY syllabus-backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# --- Copy backend code into image ---
COPY syllabus-backend/ .

# --- Expose port & set env ---
EXPOSE 8000
ENV PORT=8000

# --- Start FastAPI app via uvicorn ---
# Adjust "app.app:app" if your file/module path is different.
CMD ["uvicorn", "app.app:app", "--host", "0.0.0.0", "--port", "8000"]
