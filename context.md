# Project Context: Hindi YouTube Comment Emotion & Sarcasm Analysis

## 1. Project Overview
We are building a web-based Natural Language Processing (NLP) application that analyzes YouTube comments. The project has evolved from basic sentiment analysis into a sophisticated multi-model architecture capable of multi-label emotion classification and sarcasm detection across both Pure Hindi and Hinglish.

## 2. Project Objective
To demonstrate an end-to-end NLP pipeline featuring language routing, multi-label classification, and independent sarcasm detection, served via a FastAPI backend and visualized on a React dashboard.

## 3. Academic Requirements
- Demonstration of TF-IDF, Linear SVM, Logistic Regression, and One-vs-Rest multi-label strategies.
- Handling of highly imbalanced datasets (e.g., EmoHi 28-class) using threshold tuning.
- Transparent language routing (Devanagari character ratio).

## 4. Current Architecture
- **Frontend**: React + Vite + Tailwind CSS + Recharts
- **Backend**: FastAPI (Python)
- **NLP / ML**: Three distinct classical machine learning models trained offline.

## 5. Technology Stack
- **Frontend**: React, Vite, Tailwind CSS, Recharts
- **Backend**: Python, FastAPI, uvicorn
- **Machine Learning**: scikit-learn, pandas, numpy, nltk, joblib

## 6. Folder Structure
```text
hindi-youtube-sentiment-analysis/
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── preprocessing.py
│   ├── sentiment.py (To be updated for 3 models)
│   ├── youtube.py
│   ├── analytics.py
│   ├── schemas.py
│   └── requirements.txt
├── model/ (Now contains multiple .pkl and .json files)
├── src/
├── package.json
└── vite.config.js
```

## 7. NLP Pipeline
1. Data Collection (YouTube API)
2. Language Routing (>30% Devanagari = Pure Hindi, else Hinglish)
3. Preprocessing (Specific to script type)
4. Feature Extraction (TF-IDF)
5. Inference (Emotion + Sarcasm)
6. Analytics & Visualization

## 8. ML Models
The system uses three distinct models:
1. **Hinglish Emotion (10-class)**: Linear SVM (Macro F1 ~56.8%)
2. **Pure Hindi Emotion (28-class Multi-label)**: One-vs-Rest Linear SVM with tuned decision thresholds (Macro F1 ~23.6%)
3. **Sarcasm Detection (Binary)**: Logistic Regression (Macro F1 ~92.8%)

## 9. Preprocessing Methodology
- **Hinglish**: URL/HTML removal, punctuation removal (retaining Roman/Devanagari), custom stopword removal (preserving negations like 'nahi', 'mat').
- **Pure Hindi**: Strict retention of Devanagari (\u0900-\u097F) and whitespace only.

## 10. API Endpoints
- `GET /` - Health check
- `POST /api/analyze/youtube` - Fetch + route + preprocess + classify + aggregate

## 11. Important Design Decisions
- **Unified Pipeline**: Every comment gets exactly one Sarcasm score and one Emotion output (routed dynamically based on script).
- **Validation Thresholding**: The Pure Hindi multi-label model does not use default 0.0 SVM thresholds; it uses a threshold tuned on a validation set to prevent over-predicting rare classes.

## 12. Known Limitations
- Pure Hindi 28-class emotion prediction is currently the weakest link due to extreme dataset imbalance and the difficulty of multi-label classical classification. Sarcasm is performing excellently.
