# Project Context: Hindi YouTube Comment Sentiment Analysis (HindiSentiment)

## 1. Project Overview
We are building a web-based Natural Language Processing (NLP) application that analyzes Hindi YouTube comments and classifies their sentiment into three categories: Positive, Negative, and Neutral. This is an academic NLP mini-project focusing on a clean, simple, and polished implementation.

## 2. Project Objective
To demonstrate an end-to-end NLP pipeline for Hindi text, from data collection (via YouTube API, CSV, or direct input) and language filtering to preprocessing, sentiment prediction using a trained Logistic Regression model, and displaying the results in an interactive analytics dashboard.

## 3. Academic Requirements
- Clear demonstration of NLP concepts: tokenization, stopword removal, TF-IDF, Logistic Regression.
- The codebase must be understandable and explainable during a viva.
- Proper evaluation metrics (Accuracy, Precision, Recall, F1-score) must be documented.
- Transparent handling of Hindi text constraints and dataset limitations.

## 4. Current Architecture
- **Frontend**: React + Vite + Tailwind CSS + Recharts (running at the project root)
- **Backend**: FastAPI (Python)
- **NLP / ML**: Pandas, NumPy, scikit-learn, NLTK, Python regex
- No Next.js, no overly complex frameworks, no MongoDB/PostgreSQL (SQLite only if necessary for history).

## 5. Technology Stack
- **Frontend**: React, Vite, Tailwind CSS, Recharts
- **Backend**: Python, FastAPI, uvicorn
- **Machine Learning**: scikit-learn, pandas, numpy, nltk, joblib
- **API Integration**: YouTube Data API v3 
- **Environment**: python-dotenv

## 6. Folder Structure
```text
hindi-youtube-sentiment-analysis/
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── preprocessing.py
│   ├── sentiment.py
│   ├── youtube.py
│   ├── analytics.py
│   ├── schemas.py
│   └── requirements.txt
├── model/
│   ├── train.py
│   ├── evaluate.py
│   ├── preprocessing.py
│   ├── tfidf_vectorizer.pkl
│   ├── sentiment_model.pkl
│   └── metrics.json
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── vite.config.js
```

## 7. NLP Pipeline
1. Data Collection (YouTube API / CSV / Text)
2. Language Filtering (Extract Hindi comments)
3. Text Preprocessing
4. Feature Extraction (TF-IDF)
5. Sentiment Prediction (Logistic Regression)
6. Analytics & Visualization

## 8. Dataset Information
- **Source**: Kaggle (YouTube Comments Data - Sentiment, Toxicity & Spam).
- **Size**: 1,068 Hindi comments extracted.
- **Required Columns**: `comment_text`, `label_sentiment` (and `processed_text` after processing).

## 9. Preprocessing Methodology
- Remove URLs, English letters, numbers, punctuation, emojis, special characters, and extra spaces.
- Tokenization.
- Remove Hindi stop words.
- *Crucial note*: Negation words (e.g., नहीं, ना, मत) that affect sentiment must be handled carefully and potentially excluded from stopword removal.

## 10. Hindi Language Handling
- Focus exclusively on Hindi text (Devanagari script).
- Be mindful of Devanagari Unicode ranges, matras, and Hinglish.
- Use a transparent Unicode/Devanagari-based heuristic for language filtering.

## 11. ML Model
- **Primary Model**: Logistic Regression.
- **Feature Extraction**: TF-IDF Vectorization.
- **Classes**: Positive, Negative, Neutral.

## 12. Model Training Process
- Training is an offline process (`model/train.py`), distinct from runtime inference.
- Process: Dataset -> Hindi Filtering -> Preprocessing -> Train/Test Split -> TF-IDF -> Logistic Regression -> Save Vectorizer & Model.

## 13. Model Evaluation
- Metrics calculated: Accuracy, Precision, Recall, F1-score, Confusion Matrix.
- Results and classification reports are to be saved in `model/metrics.json`.

## 14. YouTube API Integration
- Uses YouTube Data API v3 (`commentThreads.list`).
- Backend fetches comments using the video ID.
- Handles pagination (`nextPageToken`) up to a configurable max comments limit (e.g., 500 or 1000).
- Gracefully handles API errors (quota exceeded, comments disabled, etc.).
- ONLY top-level comments are fetched for now (no replies).

## 15. API Endpoints
- `GET /` - Health check
- `POST /api/predict` - Predict sentiment for a single comment
- `POST /api/analyze` - Analyze multiple comments
- `POST /api/analyze/csv` - Analyze uploaded CSV
- `POST /api/youtube/comments` - Fetch comments from a YouTube video
- `POST /api/analyze/youtube` - Fetch + filter + preprocess + classify + aggregate
- `GET /api/model/info` - Return model information and metrics

## 16. Frontend Architecture
- Simple, modern React single-page application hosted at the root.
- Sidebar navigation (Dashboard, New Analysis, History, Model Info).
- Dashboard contains stat cards, sentiment charts, keyword charts, and a filterable/searchable comment table.

## 17. Backend Architecture
- FastAPI application managing routing and API integration.
- Separation of concerns: `preprocessing.py` (text handling), `sentiment.py` (inference), `youtube.py` (API calls), `analytics.py` (aggregation).

## 18. Dashboard Functionality
- Stat cards: Total/Positive/Negative/Neutral counts and percentages, Average Confidence.
- Charts: Sentiment Distribution, Top Keywords.
- Data Table: Processed comments with sentiment, confidence, and search/filter functionality.
- Export: Download results as CSV.

## 19. Data Flow
1. User requests analysis (YouTube URL, CSV, or Text) via React Frontend.
2. FastAPI Backend receives request, fetches/extracts data.
3. Backend filters for Hindi, runs preprocessing (identical to training phase).
4. Backend transforms text via saved TF-IDF vectorizer and predicts via saved Logistic Regression model.
5. Backend calculates analytics and returns JSON response.
6. Frontend updates dashboard with results.

## 20. Environment Variables
- `YOUTUBE_API_KEY`: Stored in `.env` file on the backend. NEVER exposed to frontend or committed to version control.

## 21. Important Design Decisions
- **No Next.js**: Stick to React + Vite.
- **Frontend at Root**: The React project is initialized at the root of the repository.
- **No runtime training**: Inference only in the FastAPI app.
- **Offline ML script**: Training done separately in `model/train.py`.
- **Top-level comments only**: Do not fetch replies to reduce complexity.
- **Logistic Regression**: Chosen for academic simplicity and interpretability unless proven inadequate.

## 22. Constraints
- Must function well on local setups without heavy containerization (Docker only if required).
- Minimal cloud infrastructure required for deployment (e.g., Render or Railway).
- Focus strictly on Hindi text.

## 23. Known Limitations
- Model may struggle with sarcasm, code-mixed Hindi-English (Hinglish), spelling variations, and slang.
- The dataset is relatively small (~1,068 comments).
- Class imbalance might affect neutral or negative predictions depending on the dataset.

## 24. Future Improvements
- Fetching and analyzing comment replies.
- Improving handling of Hinglish text.
- Comparing Logistic Regression with more advanced models (if academically justified).
- Word clouds (if Devanagari font rendering is robustly supported).

## 25. Development Conventions
- Use meaningful Git commits (e.g., `feat: ...`, `fix: ...`, `docs: ...`).
- Keep code clear and explainable for an academic viva.
- Write tests for core backend functions (URL extraction, preprocessing, API validation).

## 26. Things that MUST NOT be changed without consideration
- The React+Vite and FastAPI architecture (do NOT introduce Next.js).
- The offline training vs runtime inference separation.
- The core preprocessing steps (unless addressing specific NLP issues like negations).
- The reliance on the specific project dataset format.
