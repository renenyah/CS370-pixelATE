# Dockerfile (at repo root)

FROM python:3.11-slim

# --- System packages + Tesseract ---
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
 && rm -rf /var/lib/apt/lists/*

# Optional: make sure Tesseract can see its data
ENV TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata

# --- App code ---
WORKDIR /app

# Install Python deps
COPY syllabus-backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY syllabus-backend ./syllabus-backend

WORKDIR /app/syllabus-backend

# If you use .env in the container, you can copy it too (optional)
# COPY syllabus-backend/.env ./

ENV PORT=8000
EXPOSE 8000

# Run FastAPI via uvicorn
CMD ["uvicorn", "app.app:app", "--host", "0.0.0.0", "--port", "8000"]
