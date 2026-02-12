# JobLife - AI-Powered Recruitment Platform

A full-stack job matching platform that connects job seekers with employers using AI-powered CV parsing, candidate-job matching, and personality assessments.

**Live Demo:** https://recruit-be.onrender.com/auth/login

## Features

### For Job Seekers
- Register/Login with email or Google OAuth
- Upload CV with AI-powered parsing (auto-extracts skills, experience, education)
- Search and filter jobs by field, location, salary, experience level
- Save and apply for jobs with application tracking
- Personality assessments: MBTI, Big Five, DISC
- Personalized job recommendations based on profile and behavior

### For Employers
- Business registration with company profile and logo
- Post and manage job listings
- AI-driven applicant matching with scoring (0-100)
- Detailed matching analysis per candidate (skills, experience, education, field)
- Application status management (pending, accepted, rejected)
- Business dashboard with analytics

### AI Engine
- **CV Parsing** - Google Gemini 2.0 Flash extracts structured data from PDF resumes
- **Matching Algorithm** - Multi-factor weighted scoring:
  - Skills (40%) | Experience (20%) | Education (15%) | Field (15%) | Title (10%)
- **Smart Search** - Semantic job search with intelligent filtering
- **Recommendations** - Personalized suggestions based on user behavior

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express.js v5, MongoDB (Mongoose) |
| Frontend | Handlebars (HBS), Bootstrap 5, Vanilla JS |
| Auth | Passport.js, Google OAuth 2.0, JWT, bcrypt |
| AI Agent | Python, FastAPI, Google Gemini, LangChain, PyTorch |
| File Processing | Multer, Sharp, Tesseract OCR, pdf2image |
| Email | Nodemailer |
| DevTools | ESLint, Prettier, Husky, Nodemon |

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── controllers/        # Route handlers (auth, business, job, users, ai)
│   │   └── models/             # MongoDB models (User, Job, CV, Business, etc.)
│   ├── services/               # Business logic
│   │   ├── AIApplicantMatchingService.js
│   │   ├── SmartSearchService.js
│   │   ├── RecommendationEngine.js
│   │   └── EmailService.js
│   ├── middlewares/            # Auth, token verification, activity tracking
│   ├── routes/                 # Express route definitions
│   ├── resources/views/        # Handlebars templates
│   │   ├── auth/               # Login, register, password reset
│   │   ├── business/           # Employer dashboard, jobs, applicants
│   │   ├── jobs/               # Job listing, detail, search
│   │   ├── users/              # User profile, CV, assessments
│   │   └── partials/           # Shared components (header, footer, toast)
│   ├── public/                 # Static assets (CSS, JS, images)
│   └── server.js               # App entry point
├── ai-agent/                   # Python FastAPI AI service
│   └── chatbot_backend/
│       ├── main.py
│       ├── services/           # CV parsing, job suggestions, webscraping
│       └── requirements.txt
├── package.json
└── .env
```

## Setup

### Prerequisites
- Node.js >= 18
- MongoDB (Atlas or local)
- Python 3.8+ (for AI agent)
- Tesseract OCR, poppler-utils

### Installation

```bash
# Install dependencies
npm install

# Setup AI agent
cd ai-agent/chatbot_backend
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<database>
SESSION_SECRET=your_session_secret
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
MAIL_USER=your_email
MAIL_PASS=your_email_app_password
GG_CLIENT_ID=your_google_client_id
GG_CLIENT_SECRET=your_google_client_secret
GG_CALLBACK_URL=http://localhost:3000/users/google/callback
OPENAI_API_KEY=your_openai_api_key
```

### Running

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start

# AI Agent (separate terminal)
cd ai-agent/chatbot_backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Deploy on Render

**Build Command:**
```bash
apt-get update && apt-get install -y poppler-utils && npm install
```

**Start Command:**
```bash
node src/server.js
```

## API Routes

| Route | Description |
|-------|-------------|
| `/auth/*` | Authentication (login, register, OAuth, password reset) |
| `/jobs/*` | Job listing, search, apply, save |
| `/users/*` | User profile, CV, avatar |
| `/business/*` | Employer dashboard, job posting, applicant matching |
| `/cv/*` | CV upload and AI processing |
| `/personality-assessments/*` | MBTI, Big Five, DISC assessments |
| `/api/recommendations/*` | Personalized job recommendations |
| `/api/behavior/*` | User activity tracking |
| `/api/ai/*` | AI-powered search |
| `/search/*` | Advanced job search |

## Database Models

- **User** - Job seeker profiles (skills, experience, education)
- **Job** - Job postings with requirements and search embeddings
- **Business** - Employer accounts and company info
- **CV** - AI-parsed resume data
- **AppliedJobs** - Application records with status tracking
- **SavedJobs** - Bookmarked jobs
- **MBTIAssessment / BigFiveAssessment / DISCAssessment** - Personality test results
- **Activity / UserBehavior** - Engagement tracking for recommendations
