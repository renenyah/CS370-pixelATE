# Dueable

**Team Pixelate:** Nyah, Kultum, Kayla, Taylor, and Olivia  
**Course:** Computer Science Practicum - Software Development

A smart student planner that automatically extracts assignments from syllabi. Upload a PDF or paste syllabus text, and Dueable parses assignments, dates, and course details—helping students stay organized throughout the semester.

## 🌐 Live Demo

**Web Version:** [https://pixelate-nkkto.netlify.app/login](https://pixelate-nkkto.netlify.app/login)

> ⚠️ **Important:** Always use the web version in **private/incognito mode** to avoid caching issues.

---

## ✨ Features

- **📄 Syllabus Upload** - Upload PDF syllabi or paste syllabus text
- **🤖 AI-Powered Parsing** - Automatically extract assignments, due dates, and course info
- **🔧 AI Repair Mode** - Optional LLM-based date cleanup for ambiguous dates
- **📅 Calendar View** - Visualize assignments in month/week/day views
- **📚 Class Organization** - Color-coded folders for each class
- **⚡ Smart Tracking** - See today's assignments, upcoming (next 7 days), and overdue items
- **🖼️ Image Upload** - Extract assignments from syllabus screenshots via OCR
- **👤 User Authentication** - Secure login and signup powered by Supabase
- **📱 Cross-Platform** - Mobile app via Expo Go + web deployment for easy access

---

## 🛠️ Tech Stack

### Frontend
- **Expo / React Native** - Cross-platform mobile framework
- **TypeScript** - Type-safe development
- **Expo Router** - File-based navigation
- **Supabase Auth** - User authentication and session management
- **React Context API** - Global state management for assignments

### Backend
- **Hosted on Render** - [https://cs370-pixelate.onrender.com](https://cs370-pixelate.onrender.com)
- **Python** - Backend processing
- **FastAPI** - Modern Python web framework
- **PyMuPDF (fitz)** - PDF text extraction
- **Tesseract OCR** - Image text extraction
- **Google Gemini AI** - Date normalization and assignment cleanup
- **dateparser** - Intelligent date parsing
- **PDF & Image Parsing** - Extract text and assignments from documents
- **LLM Integration** - Optional AI repair for date parsing

### Database
- **Supabase** - PostgreSQL database with real-time capabilities

### Deployment
- **Netlify** - Web version hosting
- **Expo Go** - Mobile app distribution

---

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo Go app (for mobile testing)

### 1. Clone the Repository
```bash
git clone https://github.com/your-repo/dueable.git
cd dueable/pixelate
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the `pixelate` folder:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://crceevuhkdlohmohyqpu.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyY2VldnVoa2Rsb2htb2h5cXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MTA1NTEsImV4cCI6MjA3NTk4NjU1MX0.rZqBkW9ogQJ9wh340-lAbc2D2MnhkMDdgEckAH16SGM
EXPO_PUBLIC_REDIRECT_URL=exp://YOUR_IP_ADDRESS:8081
EXPO_PUBLIC_API_BASE=https://cs370-pixelate.onrender.com
```

> **Note:** These are the development credentials for the CS370 course project. The backend is hosted on Render and the database on Supabase - you can use these existing services to run the app locally.

#### Getting Your Redirect URL
To find your `EXPO_PUBLIC_REDIRECT_URL`:
1. Run `npx expo start` 
2. Look for the line that says `Metro waiting on exp://10.44.163.76:8081` (your IP will be different)
3. Copy that full URL (e.g., `exp://10.44.163.76:8081`)
4. Paste it as your `EXPO_PUBLIC_REDIRECT_URL` in the `.env` file
5. Restart the Expo server

### 4. Run the App

#### Mobile (Expo Go)
```bash
npx expo start
```
Scan the QR code with:
- **iOS:** Camera app
- **Android:** Expo Go app

#### Web (Local)
```bash
npx expo start --web
```
Opens at `http://localhost:8081`

---

## 🚀 Deployment

### Web Deployment (Netlify)
1. **Build the web version:**
   ```bash
   npx expo export --platform web
   ```

2. **Deploy to Netlify:**
   - Go to [app.netlify.com](https://app.netlify.com)
   - Drag and drop the `dist` folder
   - Your site will be live instantly!

3. **Custom domain (optional):**
   - Site settings → Domain management → Edit site name

---

## 📂 Project Structure

### Frontend (`pixelate/`)

```
pixelate/
├── app/                          # Expo Router screens
│   ├── (protected)/             # Protected routes (require auth)
│   │   ├── home.tsx            # Main dashboard with today's assignments
│   │   ├── layout.tsx          # Bottom tab navigation wrapper
│   │   └── profile.tsx         # User profile and settings
│   ├── auth/
│   │   └── callback.tsx        # Supabase auth callback handler
│   ├── _layout.tsx             # Root layout with navigation + context
│   ├── calendar.tsx            # Calendar view (month/week/day)
│   ├── classes.tsx             # Class list with folder cards
│   ├── index.tsx               # Entry point / redirect
│   ├── login.tsx               # Login screen
│   └── signup.tsx              # Signup screen
│
├── components/                  # Reusable UI components
│   ├── AssignmentsContext.tsx  # Global state for assignments
│   ├── CalendarView.tsx        # Calendar UI component
│   ├── ClassList.tsx           # Class folder cards
│   ├── PlusMenu.tsx            # Floating + button menu
│   └── UploadSyllabusModal.tsx # Syllabus upload modal (PDF/text/image)
│
├── constant/                    # App constants and utilities
│   ├── api.ts                  # API base URL builder
│   ├── colors.ts               # Color palette
│   └── supabase.js             # Supabase client config
│
├── assets/                      # Images, fonts, icons
├── dist/                        # Built web app (generated)
├── .env                         # Environment variables
├── app.json                     # Expo configuration
├── package.json                 # Dependencies
└── tsconfig.json               # TypeScript configuration
```

### Backend (`syllabus-backend/`)

```
syllabus-backend/
├── app/
│   ├── __init__.py             # FastAPI app initialization & endpoints
│   ├── pdf_extractor.py        # PDF text extraction & assignment parsing
│   ├── llm_repair.py           # Gemini AI integration for date normalization
│   └── ocr/
│       └── ocr_processor.py    # Image OCR processing with Tesseract
├── requirements.txt            # Python dependencies
└── README.md                   # Backend-specific documentation
```

### Key Files Explained

**`app/_layout.tsx`**  
Root layout that wraps the entire app in `AssignmentsProvider` for global state. Renders bottom tab navigation (Home, Classes, Calendar, Profile) and the floating + button. Hides navigation on login/signup screens.

**`components/AssignmentsContext.tsx`**  
React Context that stores all assignments for the current user. Provides `useAssignments()` hook for reading/writing assignment data. Includes helper functions for date normalization, priority assignment, and duplicate detection.

**`components/UploadSyllabusModal.tsx`**  
Full-screen modal for uploading syllabi. Supports PDF upload, image upload (OCR), and pasted text. Includes AI Repair toggle for LLM-based date parsing. Sends files to backend endpoints (`/assignments/pdf`, `/assignments/image`, `/assignments/text`) and converts parsed results into draft assignments for review.

**`components/PlusMenu.tsx`**  
Floating action button menu that slides up to reveal options: Upload Syllabus, Add Class, Add Assignment. Triggers the upload flow modal.

**`app/(protected)/home.tsx`**  
Main dashboard displaying welcome message, stats (upcoming vs overdue), and today's assignments filtered by class. Primary landing page after login.

**`app/classes.tsx`**  
Displays all classes as color-coded folder cards showing overdue and upcoming assignment counts. Tapping a class shows all related assignments.

**`app/calendar.tsx`**  
Calendar interface with month/week/day toggle. Highlights dates with assignments and shows assignment details when a date is selected.

**`app/login.tsx` & `app/signup.tsx`**  
Authentication screens for email/password login and account creation. After successful auth, shows a brief app tutorial before navigating to the home screen.

**`constant/supabase.js`**  
Configures the Supabase client with custom storage adapter that uses SecureStore on mobile and localStorage on web, enabling cross-platform authentication.

---

### Backend Files Explained

**`app/__init__.py`**  
Main FastAPI application with three core endpoints:
- **POST `/assignments/pdf`** - Accepts PDF upload, extracts text with PyMuPDF, parses assignments using regex patterns, optionally repairs dates with Gemini AI, and detects duplicates via SHA-256 hash stored in Supabase
- **POST `/assignments/image`** - Accepts image upload, runs OCR with Tesseract to extract text, parses assignments, optional AI repair
- **POST `/assignments/text`** - Accepts plain text input for simple parsing without OCR or AI

Each endpoint returns structured JSON with assignment items containing: `title`, `due_date_raw`, `due_date_iso`, `due_mdy`, `due_time`, `assignment_type`, `course`, `page`, and `source`.

Includes CORS middleware for cross-origin requests, Supabase integration for duplicate detection and upload tracking, and comprehensive error handling with fallback to in-memory caching if database is unavailable.

**`app/pdf_extractor.py`**  
Core PDF and text parsing logic using PyMuPDF for PDF text extraction and regex patterns for assignment detection. Includes multiple parsing strategies:
- **Pass A:** Explicit "due/given ... date" patterns
- **Pass B:** Schedule rows starting with month-name dates
- **Pass C:** "due on <date>" patterns  
- **Pass D:** Week-based patterns (e.g., "Week 3 (Mon Jan 27)")
- **Pass E:** Weekday patterns (e.g., "due by Tuesday and Thursday")

Detects course names from first page, infers fallback year from semester mentions, normalizes dates to ISO format using `dateparser`, assigns assignment types (Quiz, Test, Presentation, Assignment), tracks which PDF page each assignment appears on, and deduplicates results based on title and date.

**`app/llm_repair.py`**  
Google Gemini AI integration for cleaning and normalizing parsed assignments. Sends full syllabus text + seed items from regex parser to Gemini with a system prompt instructing it to:
- Clean OCR noise from titles
- Remove duplicate assignments
- Fix obviously wrong dates using syllabus context
- Return only valid JSON with cleaned items

Falls back gracefully to original seed items if Gemini is not configured or errors occur. Uses `gemini-2.5-pro` model with configurable API key via environment variables.

**`app/ocr/ocr_processor.py`**  
Image-to-text processing using Tesseract OCR. Accepts syllabus screenshots/photos, preprocesses images with OpenCV (adaptive thresholding, noise reduction, contrast enhancement), extracts text with pytesseract, and parses assignments using the same regex patterns as PDF extraction. Supports multiple preprocessing methods optimized for different image types (screenshots vs photos).

---

## 📱 Usage

### 1. Sign Up / Log In
Create an account or log in with your credentials.

### 2. Upload a Syllabus
- Tap the **+** button at the bottom
- Select **Upload Syllabus**
- Choose your method:
  - **Upload PDF** - Select a PDF file
  - **Upload Image** - Take a photo or select an image
  - **Paste Text** - Copy and paste syllabus text
- Toggle **AI Repair** for better date parsing
- Fill in class name, semester, year, and folder color
- Tap **Parse**

### 3. Review Assignments
- Review extracted assignments
- Edit titles, dates, or descriptions
- Delete any incorrect entries
- Tap **Save to Planner**

### 4. View Your Assignments
- **Home:** See today's assignments and quick stats
- **Classes:** Browse assignments by class
- **Calendar:** View assignments on specific dates
- **Profile:** Manage your account settings

---

## 🐛 Known Issues & Notes

- **Web Version:** Best used in private/incognito mode to avoid caching issues
- **Platform Differences:** The app is optimized for mobile (Expo Go) but fully functional on web
- **File Upload:** Web file handling uses different APIs than mobile, but both are supported

---

## 🤝 Contributors

**Team Pixelate**
- Nyah
- Kultum
- Kayla
- Taylor
- Olivia

---

## 📄 License

This project was created for Emory CS370.

---

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev/)
- Authentication by [Supabase](https://supabase.com/)
- Icons by [Lucide React Native](https://lucide.dev/)
- Backend hosted on [Render](https://render.com/)
- Web deployment by [Netlify](https://netlify.com/)