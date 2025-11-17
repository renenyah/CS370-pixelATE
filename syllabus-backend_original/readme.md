Purpose of the requirements.txt:
    List of Python packages your backend needs
    install the same dependencies with - pip install -r requirements.txt
    
    Packages described:
        fastapi: your web framework (defines /health, /process)
        uvicorn[standard]: the ASGI server that actually runs your FastAPI app (locally and on Render)
        pydantic:FastAPI’s data validation layer; you used BaseModel for the ProcessReq request body
        supabase==2.*: official Python client to talk to Supabase Postgres and Storage (insert/select, create signed URLs)
        httpx: HTTP client to download the PDF from the Supabase signed URL
        pymupdf: PDF text extraction (PyMuPDF).
        dateparser: makes “Fri 9/13 11:59pm” → an actual datetime.Optional for a barebones MVP (if you don’t auto-parse dates yet).Recommended if you want automatic due-date parsing now.
        python-multipart: enables FastAPI to accept multipart/form-data file uploads. Optional for your current flow (you’re uploading PDFs to Supabase from the frontend, not posting the file to FastAPI).Required later if you add a /upload endpoint that receives files directly
        python-dotenv: loads your .env file when running locally so SUPABASE_URL, etc., are available.Optional on Render (Render injects env vars).Recommended locally (so you don’t export env vars manually every run)

Purpose of the gitignore:
    Tells Git what not to commit (your virtual env, __pycache__, secrets).
    Why: keeps the repo clean and prevents leaking sensitive files like .env.

    Contents described:
        .venv/ : Ignores your local Python virtual environment folder. It can be thousands of files and is specific to your machine. Recreate it anywhere with python -m venv .venv + pip install -r requirements.txt
        __pycache__/ : Ignores Python’s bytecode cache directories that Python auto-generates when you run code. They’re machine/OS-specific and don’t belong in source control.
        .env : Ignores your local environment variables file (contains secrets like Supabase keys). You should not commit this. Keep a safe template in the repo as .env.example instead.
        *.pyc: Ignores any stray compiled Python bytecode files (in case they exist outside __pycache__/). Redundant protection so compiled artifacts don’t slip in.

Purpose of the .env:   
    Your actual secrets/keys for local dev (Supabase URL/keys, bucket name).
    Why: app reads these at runtime. Never commit this file (it’s in .gitignore).


When running the code to access the the API:
<<<<<<< HEAD
    1. go to your backend folder - cd /Users/kultumlhabaik/Documents/CS370-pixelATE/syllabus-backend
    2. activate your venv (environment you are using- source .venv-syllabus/bin/activate)
    3. (one-time) ensure deps are installed *in this venv* - pip install fastapi "uvicorn[standard]" pymupdf
    4. run the API (NOT python app.py) - uvicorn app.app:app --reload --port 8000
    once you run it you should see a http link. Add "/docs" to the end of the link when you are searching it up in your brourse 

    *if you are having trouble because it says it is running but you want to restart the whole process:
    - pkill -f "uvicorn" 
    - uvicorn app.app:app --reload --port 8000
=======
# In the backend folder
cd ~/Documents/CS370-pixelATE/syllabus-backend
source .venv-syllabus/bin/activate

# Quick health check
python -c "import app.llm_repair as L; print('have_gemini:', L.have_gemini()); print('status:', L.gemini_status())"

# Run server
PYTHONPATH=\"$(pwd)\" uvicorn app.app:app --reload --port 8000
>>>>>>> Kultum
