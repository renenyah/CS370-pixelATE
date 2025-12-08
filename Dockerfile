# Use a slim Python image
FROM python:3.11-slim

# Install system packages (including tesseract + poppler)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      tesseract-ocr \
      libtesseract-dev \
      poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Work inside /app
WORKDIR /app

# Copy requirements first (for better layer caching)
# ⚠️ Adjust this path if your requirements.txt lives somewhere else
COPY requirements.txt ./requirements.txt

# Install Python deps
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend source
# ⚠️ This assumes your backend code is in `syllabus-backend/`
COPY syllabus-backend/ ./syllabus-backend/

# Set working dir to backend package
WORKDIR /app/syllabus-backend

# Expose backend port
EXPOSE 8000

# Start FastAPI app
# ⚠️ This assumes your app object is in syllabus-backend/app/app.py as `app`
CMD ["uvicorn", "app.app:app", "--host", "0.0.0.0", "--port", "8000"]
