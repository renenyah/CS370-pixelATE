# Dockerfile at repo root: cs370-pixelate/Dockerfile

FROM python:3.11-slim

# Install system deps (tesseract + poppler for PDF)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      tesseract-ocr \
      libtesseract-dev \
      poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend code (assuming you have syllabus-backend/ in the repo)
COPY syllabus-backend/ ./syllabus-backend/

# Install Python deps
RUN pip install --no-cache-dir -r syllabus-backend/requirements.txt

WORKDIR /app/syllabus-backend

EXPOSE 8000

CMD ["uvicorn", "app.app:app", "--host", "0.0.0.0", "--port", "8000"]
