# Health Companion
### AI Medical Assistant for Rural India — Major Project

---

## Setup

### 1. Get Free Gemini API Key
1. Go to **aistudio.google.com**
2. Sign in with Google account
3. Click **Get API Key**
4. Copy the key (starts with AIzaSy…)
5. Free tier: 15 requests/min, 1500 requests/day — no credit card needed

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# Open .env and add: GEMINI_API_KEY=AIzaSy-your-key-here
npm start
# Runs on http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm start
# Runs on http://localhost:3000
```

### 4. Configure Key in App
Navigate to **http://localhost:3000/settings**
Enter your Gemini API key and click Save Key.
This page is not linked from the navigation — internal only.

---

## Features
- AI symptom assessment with severity detection (Gemini 1.5 Flash)
- Patient memory — profile, sessions, health history
- Multilingual OCR in 8 Indian languages (Gemini Vision)
- Drug interaction checker with verified WHO/NLEM/CIMS database
- Voice input and output
- Health analytics dashboard
- Emergency SOS with 8 helplines
- Download reports as TXT or PDF

---

## Tech Stack
- Frontend: React 18, React Router 6
- Backend: Node.js, Express.js
- AI: Google Gemini 1.5 Flash (free tier)
- Drug Database: WHO Essential Medicines List 2023, NLEM 2022, CIMS India
- Storage: In-memory (prototype) — replace with MongoDB for production

---

## Notes
- Both terminals must stay open during use
- Backend on port 5000, Frontend on port 3000
- Patient data is lost when backend restarts (in-memory store)
- Voice input works in Chrome and Edge only (not Firefox)
