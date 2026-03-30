# JobLife - AI-Powered Recruitment Platform - Requirements Document

## 1. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | >= 18 |
| Framework | Express.js | ^5.1.0 |
| Database | MongoDB | (Mongoose ^8.20.2) |
| Template Engine | Express Handlebars | ^8.0.3 |
| CSS Framework | Bootstrap 5 | (CDN) |
| Authentication | Passport.js | ^0.7.0 |
| OAuth | Google OAuth 2.0 | passport-google-oauth20 ^2.0.0 |
| Session | express-session + connect-mongodb-session | ^1.18.2, ^5.0.0 |
| File Upload | Multer | ^2.0.2 |
| Image Processing | Sharp | ^0.34.3 |
| Email | Nodemailer | ^7.0.5 |
| AI Integration | OpenAI SDK, Google Gemini | ^5.11.0 |
| Cloud Storage | Cloudflare R2 | (S3-compatible) |
| Validation | express-validator | ^7.2.1 |
| Security | bcryptjs, cookie-parser | ^3.0.2, ^1.4.7 |
| Utilities | lodash, moment, slugify, uuid | latest |
| Dev Tools | ESLint, Prettier, Husky, Nodemon | latest |

## 2. Project Structure

```
cv-server/blog/
├── src/
│   ├── server.js                 # Entry point
│   ├── app/
│   │   ├── controllers/          # Route handlers
│   │   │   ├── auth/            # Auth, OTP, Profile, Register
│   │   │   ├── business/        # ApplicantMatching, Business, Dashboard, Jobs, Profile
│   │   │   ├── job/             # Apply, CVUpload, JobController, SaveJob, Search
│   │   │   └── users/           # AISearch, Home, PersonalityAssessment, Recommendations
│   │   └── models/              # MongoDB models
│   │       ├── Activity.js
│   │       ├── AppliedJobs.js
│   │       ├── BigFiveAssessment.js
│   │       ├── Business.js
│   │       ├── CV.js
│   │       ├── DISCAssessment.js
│   │       ├── Job.js
│   │       ├── JobField.js
│   │       ├── MBTIAssessment.js
│   │       ├── SavedJobs.js
│   │       ├── User.js
│   │       └── UserBehavior.js
│   ├── config/
│   │   └── multer.js            # File upload config
│   ├── helpers/
│   │   └── uploadHelper.js      # Avatar upload helper
│   ├── middlewares/
│   │   ├── activityTracker.js   # User activity tracking
│   │   ├── auth.js              # Basic auth middleware
│   │   ├── authState.js         # Auth state management
│   │   ├── businessDataMiddleware.js
│   │   ├── businessLayout.js
│   │   ├── formatDate.js        # Date formatting helpers
│   │   ├── generateOtp.js       # OTP generation
│   │   ├── isBusinessOrApiKey.js
│   │   ├── isLogin.js           # Login check middleware
│   │   ├── logoUpload.js        # Logo upload middleware
│   │   ├── upload.js            # Generic upload middleware
│   │   └── verifyToken.js       # JWT token verification
│   ├── routes/                  # Express route definitions
│   │   ├── index.js             # Route aggregator
│   │   ├── auth.js              # Authentication routes
│   │   ├── business.js          # Business routes
│   │   ├── cv.js                # CV upload/processing routes
│   │   ├── job.js               # Job listing routes
│   │   ├── personality-assessments.js
│   │   ├── recommendations.js
│   │   ├── search.js
│   │   ├── user-behavior.js
│   │   └── users.js             # User profile routes
│   ├── resources/views/         # Handlebars templates
│   │   ├── auth/                # Login, register, forgot-password
│   │   ├── business/              # Dashboard, jobs, applicants
│   │   ├── jobs/                  # Job listing, detail
│   │   ├── users/                 # Profile, CV, saved jobs
│   │   ├── personality-assessments/
│   │   ├── partials/              # Header, footer, toast
│   │   └── layouts/               # Main layouts
│   ├── services/                # Business logic
│   │   ├── AIApplicantMatchingService.js
│   │   ├── AIFilteringService.js
│   │   ├── EmailService.js
│   │   ├── RecommendationEngine.js
│   │   ├── SmartSearchService.js
│   │   ├── UserBehaviorService.js
│   │   └── r2Storage.js         # Cloudflare R2 storage
│   ├── util/
│   │   └── createEmbedding.js   # Text embedding utility
│   └── public/                  # Static assets (CSS, JS, images)
├── package.json
├── .env.example
└── render.yaml                  # Render deployment config
```

## 3. Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=production
BASE_URL=http://localhost:3000
AI_SERVICE_URL=http://localhost:8000  # External AI service URL

# Database
MONGODB_URI=mongodb://localhost:27017/recruit-web

# JWT Secrets
JWT_SECRET=your-jwt-secret-key-here
REFRESH_TOKEN_SECRET=your-refresh-token-secret-here
SESSION_SECRET=your-session-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email Configuration (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# OpenAI API
OPENAI_API_KEY=your-openai-api-key

# Cloudflare R2 Storage
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

## 4. Database Models

### 4.1 User (Job Seeker)
```javascript
{
  username: String (required, 1-255 chars),
  email: String (required, unique),
  password: String (hashed),
  googleId: String,
  avatar: String,
  birthday: Date,
  phone: String,
  gender: String,
  level: String,        // Intern, Fresher, Junior...
  degree: String,       // High School, Bachelor...
  experience: String,   // 0-1 year...
  major: String,
  role: Number (default: 1),
  cvPath: String,
  slug: String (unique, auto-generated),
  status: String (default: 'active'),
  timestamps: true
}
```

### 4.2 Business (Employer)
```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (hashed, required),
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  capital: String,
  scale: String,
  website: String,
  description: String,
  industry: String,
  companySize: String (enum: ['1-10', '11-50', '51-200', '201-500', '500+']),
  foundedYear: Number,
  logo: String,
  logoPath: String,
  isVerified: Boolean (default: false),
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date,
  isActive: Boolean (default: true),
  subscription: {
    plan: String (enum: ['free', 'basic', 'premium', 'enterprise'], default: 'free'),
    startDate: Date,
    endDate: Date,
    features: [String]
  },
  jobPostings: {
    total: Number (default: 0),
    active: Number (default: 0),
    limit: Number (default: 5)
  }
}
```

### 4.3 Job
```javascript
{
  title: String (required),
  businessId: ObjectId (ref: Business, required),
  companyName: String (required),
  email: String (required),
  experience: String (default: 'no required'),
  type: String (required),
  field: String (required),
  description: String,
  degree: String,
  workTime: String (required),
  technique: String (required),
  logoPath: String (required),
  embedding: [Number],          // For AI search (384 dimensions)
  status: String (enum: ['urgent', 'active', 'closed'], default: 'active'),
  city: String (required),
  location: String (required),
  salary: String (required),
  contact: String,
  expiryTime: Date (required),
  slug: String (unique),
  unique_id: String (unique)
}
```

### 4.4 CV
```javascript
{
  user_id: ObjectId (ref: User, required),
  username: String (required, unique),
  processed_text: String,
  parsed_output: {
    technical_skills: [],
    job_titles: [],
    industries: [],
    personal_info: {},
    education: [],
    work_experience: [],
    skills: {
      technical: [],
      soft: [],
      languages: []
    },
    certifications: [],
    projects: [],
    summary: String
  },
  uploaded_at: Date,
  file_path: String,
  filename: String
}
```

### 4.5 AppliedJobs
```javascript
{
  user_id: ObjectId (ref: User, required),
  job_id: ObjectId (ref: Job, required),
  business_id: ObjectId (ref: Business, required),
  status: String (enum: ['pending', 'reviewing', 'interviewing', 'hired', 'rejected'], default: 'pending'),
  applied_at: Date,
  cv_id: ObjectId (ref: CV),
  cover_letter: String,
  notes: String,
  viewed_by_business: Boolean (default: false),
  viewed_at: Date,
  business_notes: String
}
```

### 4.6 SavedJobs
```javascript
{
  user_id: ObjectId (ref: User, required),
  job_id: ObjectId (ref: Job, required),
  business_id: ObjectId (ref: Business, required),
  saved_at: Date,
  notes: String,
  is_active: Boolean (default: true),
  reminder_set: Boolean (default: false),
  reminder_date: Date,
  tags: [String]
}
```

### 4.7 Activity (User Activity Tracking)
```javascript
{
  businessId: ObjectId (ref: Business, required),
  userId: ObjectId (ref: User, required),
  activityType: String (enum: ['job_view', 'job_apply', 'company_profile_view', 'company_connect', 'job_save']),
  jobId: ObjectId (ref: Job),
  viewedBusinessId: ObjectId (ref: Business),
  userInfo: { name, email, avatar, cvScore },
  jobInfo: String (JSON),
  details: { userAgent, ipAddress, source, sessionId }
}
```

### 4.8 MBTIAssessment
```javascript
{
  userId: ObjectId (ref: User, required),
  type: String (enum: 16 MBTI types),
  scores: { E, I, S, N, T, F, J, P: Number (0-10) },
  answers: [String],
  description: String,
  strengths: [String],
  weaknesses: [String],
  careers: [String],
  quote: String,
  workStyle: String,
  completedAt: Date
}
```

### 4.9 BigFiveAssessment & DISCAssessment
- Similar structure to MBTI with type-specific fields
- Store personality scores and results

### 4.10 UserBehavior
```javascript
{
  user_id: ObjectId (ref: User),
  job_id: ObjectId (ref: Job),
  action: String (view, apply, save, search),
  timestamp: Date,
  metadata: Object
}
```

## 5. API Routes

### 5.1 Authentication (`/auth/*`)
```
GET  /auth/login              # Show login page
POST /auth/login              # Login
GET  /auth/google             # Google OAuth
GET  /auth/google/callback    # OAuth callback
GET  /auth/register           # Show register page
POST /auth/register           # Register
GET  /auth/logout             # Logout
GET  /auth/forgot-password    # Forgot password page
POST /auth/forgot-password    # Send reset email
GET  /auth/reset-password/:token
POST /auth/reset-password/:token
GET  /auth/verify-email/:token
POST /auth/resend-verification
GET  /auth/verify-otp
POST /auth/verify-otp
POST /auth/resend-otp
POST /auth/refresh-token
```

### 5.2 Jobs (`/jobs/*`)
```
GET  /jobs                    # Job listing
GET  /jobs/remote             # Remote jobs
GET  /jobs/all               # All jobs
GET  /jobs/search            # Search jobs
GET  /jobs/search-results    # Search results page
GET  /jobs/api/search        # API search
GET  /jobs/api/load-more     # Load more jobs
GET  /jobs/grouped-by-field  # Jobs grouped by field
GET  /jobs/api/job-fields    # Get job fields
GET  /jobs/category/:slug    # Jobs by category
GET  /jobs/:slug             # Job detail
POST /jobs/apply/:slug       # Apply for job (auth)
POST /jobs/save/:jobId       # Save job (auth)
DELETE /jobs/save/:jobId     # Unsave job (auth)
GET  /jobs/saved/:jobId      # Check if saved (auth)
GET  /jobs/export-jobs       # Export jobs for FAISS
```

### 5.3 Business (`/business/*`)
```
GET  /business/                         # Business list
GET  /business/list                   # Public business list
GET  /business/detail/:id             # Business detail
GET  /business/jobs/:id               # Company jobs
GET  /business/dashboard               # Dashboard (auth)
GET  /business/profile                 # Profile (auth)
POST /business/profile/edit           # Update profile (auth)
GET  /business/jobs                    # Job list (auth)
GET  /business/jobs-list               # API job list
GET  /business/job/create-page         # Create job page (auth)
POST /business/job/create              # Create job (auth)
GET  /business/applications            # Applications (auth)
GET  /business/applications/stream     # SSE stream
GET  /business/jobs/matching           # Matching page (auth)
GET  /business/jobs/matching-simple/:jobId
POST /business/connect/:id             # Connect with business
POST /business/schedule/meeting      # Schedule meeting
POST /business/login                   # Business login
POST /business/register-direct       # Register with logo
POST /business/upload-logo             # Upload logo (auth)
POST /business/delete-logo             # Delete logo (auth)
```

### 5.4 CV (`/cv/*`)
```
GET  /cv/uploadCV              # Upload page (auth)
POST /cv/upload               # Upload CV (auth)
GET  /cv/jobs/suggestions/:username  # Job suggestions (auth)
POST /cv/assistant-upload     # CV assistant upload (auth)
```

### 5.5 Users (`/users/*`)
```
GET  /users/profile            # Profile (auth)
POST /users/profile            # Update profile (auth)
GET  /users/saved-jobs         # Saved jobs (auth)
GET  /users/applied-jobs       # Applied jobs (auth)
GET  /users/applied-jobs/api   # API applied jobs
DELETE /users/saved-jobs/:jobId  # Unsave job
POST /users/upload-avatar      # Upload avatar
GET  /users/cv                 # View CV
GET  /users/view-cv/:userId    # View CV
GET  /users/download-cv/:userId  # Download CV
```

### 5.6 Personality Assessments (`/personality-assessments/*`)
```
GET  /personality-assessments/              # Assessment home
GET  /personality-assessments/mbti          # MBTI test
POST /personality-assessments/mbti/submit   # Submit MBTI
GET  /personality-assessments/mbti/results/:resultId
GET  /personality-assessments/big-five      # Big Five test
POST /personality-assessments/big-five/submit
GET  /personality-assessments/disc          # DISC test
POST /personality-assessments/disc/submit
```

### 5.7 API Routes
```
GET  /api/behavior/track       # Track user behavior
POST /api/behavior/track       # Track behavior
GET  /api/recommendations/jobs # Get job recommendations
GET  /api/recommendations/history
GET  /api/ai/search            # AI-powered search
GET  /search                  # Search page
GET  /search/results          # Search results
POST /ai-service/process     # AI processing
GET  /cv-assistant            # CV assistant page
POST /cv-assistant/generate   # Generate CV
```

## 6. Core Services

### 6.1 AIApplicantMatchingService
- `getMatchingApplicants(jobId, options)` - Get matching candidates
- `calculateMatchingScore(job, cv)` - Calculate match score (0-100)
- Scoring weights: Skills (40%), Experience (20%), Education (15%), Field (15%), Title (10%)

### 6.2 SmartSearchService
- Vietnamese text processing with stop words removal
- Relevance scoring based on title, description, requirements
- Accent-insensitive matching
- Field/city/type filtering

### 6.3 RecommendationEngine
- Build user profile from behavior and assessments
- Personalized job recommendations
- Fallback to popular jobs
- MBTI/Big Five/DISC integration

### 6.4 EmailService
- Welcome emails
- Password reset
- Application notifications
- OTP verification

### 6.5 UserBehaviorService
- Track user actions (view, apply, save, search)
- Build user profiles for recommendations
- Analytics and insights

### 6.6 R2Storage (Cloudflare R2)
- File upload/download
- Serve files via `/api/files/*`
- S3-compatible API

## 7. Middleware

### 7.1 Authentication
- `isLogin` - Check if user is logged in
- `isBusiness` - Check if business is logged in
- `verifyToken` - Verify JWT token
- `requireAuth` - Require authentication
- `requireUserAuth` - Require user auth

### 7.2 File Upload
- `upload` - Multer config for CVs (PDF/DOCX, max 5MB)
- `logoUpload` - Business logo upload
- `uploadAvatar` - User avatar upload

### 7.3 Activity Tracking
- `activityTracker` - Track job views
- Track user behavior for recommendations

## 8. Key Features

### 8.1 Job Seeker Features
1. **Authentication**: Email/password, Google OAuth
2. **Profile**: Multi-step profile setup (basic, experience, education)
3. **CV Upload**: PDF/DOCX upload with AI parsing
4. **Job Search**: Smart search with filters (field, location, salary, experience)
5. **Apply**: One-click apply with saved CV
6. **Save Jobs**: Bookmark jobs with reminders
7. **Personality Tests**: MBTI, Big Five, DISC
8. **Recommendations**: AI-powered job suggestions

### 8.2 Employer Features
1. **Business Profile**: Company info, logo, verification
2. **Job Posting**: Create jobs with requirements
3. **Applicant Management**: View, filter, update status
4. **AI Matching**: Score candidates (0-100) with detailed analysis
5. **Dashboard**: Analytics, stats, recent activities
6. **Subscription**: Free/Basic/Premium/Enterprise plans

### 8.3 AI Features
1. **CV Parsing**: Extract skills, experience, education using Gemini
2. **Job Matching**: Multi-factor scoring algorithm
3. **Smart Search**: Semantic search with embeddings
4. **Recommendations**: Behavior-based suggestions
5. **Personality Analysis**: Career fit based on assessments

## 9. Deployment

### 9.1 Render Configuration
```yaml
services:
  - type: web
    name: recruit-web
    env: node
    plan: free
    runtime: node
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /
    rootDir: cv-server/blog
    nodeVersion: 20.20.0
```

### 9.2 Scripts
```json
{
  "dev": "nodemon src/server.js",
  "start": "node src/server.js",
  "lint": "eslint .",
  "format": "prettier --write ."
}
```

## 10. External Dependencies

### 10.1 AI Service (Separate)
- URL: `AI_SERVICE_URL` env var
- Endpoints:
  - `POST /api/v1/resume/upload` - CV parsing
  - Supports model: `gemini-2.0-flash`

### 10.2 MongoDB
- Atlas or local instance
- Connection via `MONGODB_URI`

### 10.3 Cloudflare R2
- S3-compatible storage for files
- Config via R2_* env vars

## 11. File Upload Limits

- **CV Files**: Max 5MB, PDF/DOCX only
- **Avatars**: Image files (processed with Sharp)
- **Logos**: Image files
- **Storage**: Cloudflare R2 (cloud) or local uploads folder

## 12. Security

- Password hashing with bcrypt (salt rounds: 10)
- JWT tokens for API auth
- Session-based auth for web
- CSRF protection via SameSite cookies
- File type validation
- File size limits
- Rate limiting (to be implemented)
