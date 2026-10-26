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

Unlike basic sentiment analyzers that categorize text into simple Positive/Negative/Neutral buckets, this architecture dynamically routes text based on script composition to specialized machine learning models: the high-performance **EmoInHindi (LREC 2022)** model bundle for pure Devanagari Hindi, an optimized **Hinglish** model for Roman-script comments, emoji-aware semantic extraction, alongside an independent pipeline for **Sarcasm Detection**.

---

## 🧠 The 3-Model NLP Architecture

This project implements an intelligent **Language Routing Pipeline** paired with emoji-aware semantic extraction. When a comment is ingested:

- **Devanagari Script Present:** Evaluated and routed to the **Pure Hindi (EmoInHindi)** model bundle.
- **Roman / Latin Script (Code-Mixed):** Evaluated and routed to the **Hinglish Emotion Model**.
- **Emoji-Aware Intelligence:** Extracts social cues (`amusement`, `love`, `admiration`, `grateful`, `sad`, `disgusted`, `surprised`, `joy`, `anger`, `fear`) and reconciles them with ML model decisions.
- **Independent Sarcasm Pipeline:** Every comment is evaluated independently for sarcasm and irony.

### 1. Pure Hindi (EmoInHindi) Model Bundle
* **Task:** Multi-label Emotion Classification on Devanagari Hindi text
* **Classes (17 Labels):** `anger`, `annoyed`, `anticipation`, `apprehensive`, `compassion`, `confident`, `confused`, `disgusted`, `fear`, `grateful`, `guilty`, `hopeful`, `impressed`, `joy`, `neutral`, `sad`, `surprised` (plus social cues: `admiration`, `amusement`, `love`)
* **Vectorization:** `FeatureUnion` combining word n-grams `(1, 2)` and character n-grams with word boundaries `char_wb (2, 5)` to robustly handle morphological variations in Hindi.
* **Classifier:** `OneVsRestClassifier(LinearSVC)`
* **Threshold Tuning:** Per-class decision threshold tuning via `model/emoinhindi/thresholds.json` to optimize F1 scores across imbalanced emotion classes.
* **Dataset:** EmoInHindi (LREC 2022 corpus)

### 2. Hinglish Emotion Model
* **Task:** Single-label Multiclass Emotion Classification for Romanized Hindi
* **Classes:** 10 distinct emotions (`anger`, `joy`, `love`, `disgust`, `fear`, `sadness`, `admiration`, `amusement`, `neutral`, etc.)
* **Model:** Linear SVM with TF-IDF Vectorization
* **Performance:** Selected over Logistic Regression and Multinomial Naive Bayes based on Macro F1 scores.

### 3. Hinglish Sarcasm Model
* **Task:** Binary Classification (Sarcastic vs. Non-Sarcastic)
* **Model:** Logistic Regression with TF-IDF Vectorization
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
* **Techniques:** FeatureUnion, TF-IDF, Multi-label One-vs-Rest, Per-Class Decision-Threshold Optimization

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

# Optional Toggle: Set to true if you only want to analyze Devanagari Hindi comments. Defaults to false.
ONLY_SHOW_HINDI=false

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
- **Auth is on Supabase.** Identity (signup, login, OAuth, password reset) is owned by Supabase Auth; the backend verifies the resulting access token (ES256 via the project JWKS, or HS256 for legacy projects) and mirrors the profile into the `profiles` table.
- **Two tables, both written straight from the browser.** `public.profiles` holds the mirrored account (id + email + display name + avatar) and `public.analyses` holds one row per finished analysis (video metadata, comment counts, emotion distribution, model usage, the full comment list, sarcasm rate and status). The app talks to them over PostgREST with the publishable key, so Row Level Security is what keeps each user's rows private - `backend/sql/supabase_schema.sql` creates the tables, the indexes and those policies. Paste it into the Supabase SQL editor once (it is idempotent) and the History page works with no backend running at all.
- **Whoever runs on Postgres owns the write.** An authenticated `POST /api/analyze/youtube` is also persisted by the backend. When the backend reports `database: "postgres"` on `GET /` the browser skips its own insert, so a run is never stored twice; if the backend is on SQLite (or absent), the browser stores the run in Supabase itself.
- **Data follows `SUPABASE_DB_URL`.** If it is missing or still the `.env.example` placeholder, the backend runs on SQLite (`backend/app.db`) and says so on `GET /`. To move existing rows to Supabase, run `python -m backend.scripts.migrate_sqlite_to_supabase --email <you@example.com>` after signing up in the app once with that same email.
- **Duplicate account emails.** `profiles.email` is unique, and an account carried over from the old SQLite schema can already own your address. Symptom: sign-in works but saving an analysis reports a duplicate key. If that old row still holds analyses you want, run `python -m backend.scripts.migrate_sqlite_to_supabase --email <you@example.com>` first (it refuses unless a Supabase profile for the email exists), then remove the stale row - it is the one whose `id` differs from your Supabase user id:
  `delete from public.profiles where email = '<you@example.com>' and id <> '<supabase user id>';`
  The app mirrors the profile again on the next session.
- Google sign-in only appears once the provider is enabled in **Authentication → Providers**; the sign-in card reads the project's `/auth/v1/settings` and shows a button for every provider that is switched on (Google, GitHub, Microsoft, Apple).

### Auth settings that trip people up

Supabase's built-in mailer is **best-effort and capped at ~2 emails/hour**, so signup confirmation links often never arrive. For a working demo:

1. **Turn email confirmation off** — Supabase → Authentication → Sign In / Providers → Email → disable *Confirm email*. Signup then returns a session immediately. (The card detects the opposite setting and explains the block instead of leaving you stuck on "check your inbox".)
2. **Or/and enable Google** — the card then offers it automatically:
   - Google Cloud → **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**.
   - Authorized redirect URI (exactly): `https://<project-ref>.supabase.co/auth/v1/callback`
   - Paste the Client ID + Client Secret into Supabase → Authentication → Providers → **Google** → Enable.
   - Supabase → Authentication → **URL Configuration**: Site URL `http://localhost:5173`, and add `http://localhost:5173/**` to Redirect URLs.

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
1. **Dynamic Emotion Circular Graph:** Automatically categorizes and assigns unique colors to all emotions present in the video's comments using Recharts.
2. **Frequency Emotion Cloud:** Renders emotions using variable font sizes and colors based on frequency of occurrence, with 2D click-and-drag panning.
3. **KPI Stat Cards:** Aggregates detected micro-emotions into macro categories (**Positive**, **Negative**, **Neutral**) alongside a dedicated **Sarcasm Rate** gauge.
4. **Interactive Comment Data Grid & Filtering:**
   - **General Sentiment Buckets:** `All Sentiments`, `Positive (All)`, `Negative (All)`, and `Neutral` with real-time comment counts.
   - **Individual Emotion Filter:** Direct filtering across the 19 supported emotions (`Admiration`, `Amusement`, `Anger`, `Annoyed`, `Anticipation`, `Apprehensive`, `Compassion`, `Confident`, `Confused`, `Disgusted`, `Fear`, `Grateful`, `Guilty`, `Hopeful`, `Impressed`, `Joy`, `Love`, `Sad`, `Surprised`).
   - **Full-Text Search:** Case-insensitive search across raw text and processed text.
   - **Sorting:** Sort by `Most Liked`, `Newest`, or `Oldest`.
   - **CSV Export:** Download full analysis results including text, processed text, model name, primary emotions, like counts, and timestamps.

---

## 📜 Historical Archive: Previously Used Models & Architecture

This section documents the previous models, datasets, and pipeline configurations that were historically used in this project prior to the transition to the **EmoInHindi (LREC 2022)** model bundle:

### 1. Previous Pure Hindi Model: EmoHi (28-Class Architecture)
- **Dataset:** EmoHi dataset (extended GoEmotions adaptation for Hindi).
- **Emotions (28 Classes):**
  `admiration`, `amusement`, `anger`, `annoyance`, `approval`, `caring`, `confusion`, `curiosity`, `desire`, `disappointment`, `disapproval`, `disgust`, `embarrassment`, `excitement`, `fear`, `gratitude`, `grief`, `joy`, `love`, `nervousness`, `optimism`, `pride`, `realization`, `relief`, `remorse`, `sadness`, `surprise`, `neutral`.
- **Model Architecture:**
  - Standard word-level TF-IDF Vectorizer (`hindi_emotion_tfidf_vectorizer.pkl`)
  - Multi-label binarizer (`hindi_label_binarizer.pkl`)
  - One-vs-Rest Linear Support Vector Classifier (`hindi_emotion_model.pkl`)
  - Label mapping dictionary (`hindi_label_mapping.json`)
  - Global single decision threshold (`hindi_threshold.json` set to `0.30`)
- **Key Limitations:**
  - **Extreme Class Imbalance:** Fine-grained 28 emotions suffered from severe sparsity on minority classes (`grief`, `remorse`, `nervousness`, `embarrassment`), leading to high false-negative rates on rare emotions.
  - **Single Global Threshold:** A single static threshold (`0.30`) could not balance precision and recall across disparate classes, causing over-prediction of common classes and under-prediction of nuanced emotions.
  - **Morphological Sensitivity:** Pure word n-grams struggled with Hindi inflections, suffixes, and informal dialect spellings compared to sub-word/character n-grams.

### 2. Previous Language Routing & Preprocessing Rules
- **Devanagari Ratio Threshold:**
  Previously, `is_devanagari` calculated:
  $$\frac{\text{Devanagari character count}}{\text{Total non-whitespace characters}} \ge 0.30$$
  This ratio counted emojis, numbers, colons, timestamps (e.g. `12:45`), punctuation, and Latin symbols in the denominator, causing genuine Hindi comments with emojis or timestamps to fall below 30% and get rejected.
  *Updated to:* Detect any Devanagari script characters (`\u0900` to `\u097F`) to ensure comments with Hindi text are correctly routed to the pure Hindi model.
- **Strict `ONLY_SHOW_HINDI` Hardcoding:**
  Previously hardcoded to `True` in `backend/sentiment.py`, which caused all comments on videos containing primarily Romanized Hindi (Hinglish) to return `processed_text: None`, triggering a `404 Not Found` error (`"Comments found, but none contained valid words after preprocessing"`).
  *Updated to:* Default to `False` (configurable via environment variable), seamlessly analyzing both Pure Hindi and Hinglish comments.

### 3. Comparison Summary: Old vs. New Architecture

| Feature / Component | Previous Version (EmoHi) | Current Version (EmoInHindi) |
| :--- | :--- | :--- |
| **Pure Hindi Dataset** | EmoHi (28 classes) | EmoInHindi (LREC 2022, 17 classes) |
| **Model Bundle** | 5 separate pickle/json files | Single unified `model_bundle.joblib` |
| **Feature Extraction** | Word TF-IDF only | `FeatureUnion` (word n-grams 1-2 + char_wb 2-5) |
| **Thresholding** | Single global threshold (0.30) | Per-class tuned decision thresholds (`thresholds.json`) |
| **Emoji Processing** | Basic or unmapped | Normalized variation selectors + contextual cue fusion |
| **Supported Emotions** | 28 fine-grained classes | 17 structured classes + social cues (`admiration`, `love`, `amusement`) |
| **Script Detection** | Rigid $\ge 30\%$ non-whitespace ratio | Devanagari character presence detection |
| **Comment Retention** | Dropped Hinglish when toggle active | Analyzes both Hindi & Hinglish without 404 drops |

---
<div align="center">
  <i>Built for academic rigor, robust multilingual handling, and visually striking analytics.</i>
</div>