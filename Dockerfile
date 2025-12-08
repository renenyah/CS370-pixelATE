# Dockerfile at: CS370-pixelATE/Dockerfile

# 1. Base image
FROM python:3.11-slim

# 2. Install system deps (tesseract + poppler for PDF)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      tesseract-ocr \
      libtesseract-dev \
      poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# 3. Workdir inside the container
WORKDIR /app

# 4. Copy backend code (including requirements.txt)
#    This assumes you have: syllabus-backend/requirements.txt
COPY syllabus-backend/ ./syllabus-backend/

# 5. Install Python deps
RUN pip install --no-cache-dir -r syllabus-backend/requirements.txt

# 6. Move into backend package
WORKDIR /app/syllabus-backend

# 7. Expose FastAPI port
EXPOSE 8000

# 8. Run FastAPI via uvicorn
#    This assumes your app is in syllabus-backend/app/app.py as `app`
CMD ["uvicorn", "app.app:app", "--host", "0.0.0.0", "--port", "8000"]
