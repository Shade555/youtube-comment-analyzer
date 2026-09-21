<div align="center">
  <img src="https://img.icons8.com/color/144/youtube-play.png" alt="YouTube Icon"/>
  <h1>Hindi YouTube Comment Sentiment & Emotion Analyzer</h1>
  <p><i>An end-to-end NLP architecture for multi-label emotion classification, sarcasm detection, and language routing.</i></p>

  <p>
    <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="Frontend"/>
    <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="Backend"/>
    <img src="https://img.shields.io/badge/ML-scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white" alt="ML"/>
    <img src="https://img.shields.io/badge/Language-Python%20%7C%20TypeScript-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Languages"/>
  </p>
</div>

<br/>

## ✨ Overview

This project is an advanced academic NLP application designed to fetch, process, and analyze YouTube comments in both **Pure Hindi (Devanagari)** and **Hinglish (Code-Mixed)**. 

Unlike basic sentiment analyzers that categorize text into simple Positive/Negative/Neutral buckets, this architecture dynamically routes text based on script composition to highly specialized models capable of identifying up to **28 distinct human emotions**, alongside an independent pipeline for **Sarcasm Detection**.

---

## 🧠 The 3-Model NLP Architecture

This project abandons the traditional single-model approach in favor of a **Language Routing Pipeline**. When a comment is ingested, it is evaluated for its Devanagari character ratio. 

- **> 30% Devanagari:** Routed to the Pure Hindi Model.
- **< 30% Devanagari:** Routed to the Hinglish Model.
- **Independent Sarcasm:** Every comment is independently checked for sarcasm.

### 1. Pure Hindi (EmoHi) Model
* **Task:** Multi-label Emotion Classification
* **Classes:** 28 distinct emotions (Admiration, Amusement, Anger, Relief, etc.)
* **Model:** One-vs-Rest Linear SVM (TF-IDF Vectorizer)
* **Optimization:** Due to extreme class imbalance in the 28-label dataset, the model utilizes **Validation-Based Decision-Threshold Tuning** rather than relying on default SVM thresholds.

### 2. Hinglish Emotion Model
* **Task:** Single-label Multiclass Emotion Classification
* **Classes:** 10 distinct emotions (Anger, Joy, Love, Disgust, Fear, Sadness, etc.)
* **Model:** Linear SVM (TF-IDF Vectorizer)
* **Performance:** Selected over Logistic Regression and Multinomial Naive Bayes based on Macro F1 scores.

### 3. Hinglish Sarcasm Model
* **Task:** Binary Classification (Sarcastic vs. Non-Sarcastic)
* **Model:** Logistic Regression (TF-IDF Vectorizer)
* **Performance:** Exceptionally high accuracy (~93%) and Macro F1 score (~92.8%).

> **Preprocessing Note:** Stopword removal is meticulously configured to **preserve negations** (e.g., 'नहीं', 'ना', 'मत', 'nahi', 'mat'). Blindly removing negations destroys sentiment context.

---

## 💻 Tech Stack

### Frontend UI / Dashboard
The dashboard is built with modern, high-performance web technologies, featuring a dark-themed, glassmorphic UI.
* **Framework:** React + Vite (TypeScript)
* **Styling:** Tailwind CSS
* **Data Visualization:** Recharts (Dynamic Pie Charts, Custom KPI Cards)
* **Icons:** Lucide React

### Backend API
The backend acts as the orchestrator, fetching data via the YouTube API and feeding it through the ML pipeline.
* **Framework:** FastAPI
* **Data Validation:** Pydantic
* **API Integration:** Google API Python Client (YouTube Data API v3)
* **Server:** Uvicorn

### Machine Learning (Offline Training)
The models were trained offline in Google Colab and exported as reusable artifacts.
* **Core:** Python, scikit-learn (v1.6.1), pandas, numpy
* **Artifact Export:** joblib, json
* **Techniques:** TF-IDF, MultiLabelBinarizer, Stratified Splitting, Threshold Tuning

---

## 🚀 How to Run Locally

### Prerequisites
1. Node.js (v18+)
2. Python (3.10+)
3. A YouTube Data API v3 Key (from Google Cloud Console)

### 1. Configure Environment Variables
Create a `.env` file in the root directory (see `.env.example` for the annotated version):
```env
YOUTUBE_API_KEY=your_actual_api_key_here
MAX_COMMENTS=100

# Supabase Auth — the browser signs users in against Supabase directly
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable/anon key>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<publishable/anon key>

# Optional: move app data (analyses) from SQLite to Supabase Postgres.
# Leave it out and the backend keeps using backend/app.db.
SUPABASE_DB_URL=postgresql://postgres.<project-ref>:<db-password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

Notes:
- **Auth is on Supabase.** Identity (signup, login, OAuth, password reset) is owned by
  Supabase Auth; the backend verifies the resulting access token (ES256 via the
  project JWKS, or HS256 for legacy projects) and mirrors the profile into the
  `profiles` table.
- **Two tables, both written straight from the browser.** `public.profiles` holds the
  mirrored account (id + email + display name + avatar) and `public.analyses` holds one
  row per finished analysis (video metadata, comment counts, emotion distribution,
  model usage, the full comment list, sarcasm rate and status). The app talks to them
  over PostgREST with the publishable key, so Row Level Security is what keeps each
  user's rows private - `backend/sql/supabase_schema.sql` creates the tables, the
  indexes and those policies. Paste it into the Supabase SQL editor once (it is
  idempotent) and the History page works with no backend running at all.
- **Whoever runs on Postgres owns the write.** An authenticated
  `POST /api/analyze/youtube` is also persisted by the backend. When the backend
  reports `database: "postgres"` on `GET /` the browser skips its own insert, so a run
  is never stored twice; if the backend is on SQLite (or absent), the browser stores
  the run in Supabase itself.
- **Data follows `SUPABASE_DB_URL`.** If it is missing or still the `.env.example`
  placeholder, the backend runs on SQLite (`backend/app.db`) and says so on
  `GET /`. To move existing rows to Supabase, run
  `python -m backend.scripts.migrate_sqlite_to_supabase --email <you@example.com>`
  after signing up in the app once with that same email.
- **Duplicate account emails.** `profiles.email` is unique, and an account carried
  over from the old SQLite schema can already own your address. Symptom: sign-in works
  but saving an analysis reports a duplicate key. If that old row still holds analyses
  you want, run
  `python -m backend.scripts.migrate_sqlite_to_supabase --email <you@example.com>`
  first (it refuses unless a Supabase profile for the email exists), then remove the
  stale row - it is the one whose `id` differs from your Supabase user id:
  `delete from public.profiles where email = '<you@example.com>' and id <> '<supabase user id>';`
  The app mirrors the profile again on the next session.
- Google sign-in only appears once the provider is enabled in
  **Authentication → Providers**; the sign-in card reads the project's
  `/auth/v1/settings` and shows a button for every provider that is switched on
  (Google, GitHub, Microsoft, Apple).

### Auth settings that trip people up

Supabase's built-in mailer is **best-effort and capped at ~2 emails/hour**, so
signup confirmation links often never arrive. For a working demo:

1. **Turn email confirmation off** — Supabase → Authentication → Sign In /
   Providers → Email → disable *Confirm email*. Signup then returns a session
   immediately. (The card detects the opposite setting and explains the block
   instead of leaving you stuck on "check your inbox".)
2. **Or/and enable Google** — the card then offers it automatically:
   - Google Cloud → **APIs & Services → Credentials → Create credentials →
     OAuth client ID → Web application**.
   - Authorized redirect URI (exactly):
     `https://<project-ref>.supabase.co/auth/v1/callback`
   - Paste the Client ID + Client Secret into Supabase →
     Authentication → Providers → **Google** → Enable.
   - Supabase → Authentication → **URL Configuration**: Site URL
     `http://localhost:5173`, and add `http://localhost:5173/**` to Redirect URLs.

### 2. Setup the Backend (FastAPI)
Open a terminal in the root directory:
```bash
# Create a virtual environment
python -m venv venv

# Activate it (Windows)
.\venv\Scripts\Activate
# Activate it (Mac/Linux)
source venv/bin/activate

# Install dependencies (Requires scikit-learn==1.6.1)
pip install -r backend/requirements.txt

# Start the server
uvicorn backend.main:app --reload
```
The API will run on `http://127.0.0.1:8000`.

### 3. Setup the Frontend (React)
Open a **second terminal** in the root directory:
```bash
# Install Node dependencies
npm install

# Start the Vite development server
npm run dev
```
The UI will run on `http://localhost:5173`.

---

## 📊 Dashboard Features
1. **Dynamic Emotion Circular Graph:** Automatically categorizes and assigns unique colors to all emotions present in the video's comments.
2. **Frequency Emotion Cloud:** Renders emotions using variable font sizes based on their frequency of occurrence.
3. **KPI Stat Cards:** Aggregates the 38 micro-emotions into macro-categories (Positive, Negative, Neutral, Miscellaneous) alongside a dedicated **Sarcasm Rate** indicator.
4. **Data Grid:** A tabular view of the analyzed comments, displaying the processed text, applied ML model, identified emotion tags, and a sarcastic alert badge.

---
<div align="center">
  <i>Built for academic rigor and visually striking analytics.</i>
</div>
