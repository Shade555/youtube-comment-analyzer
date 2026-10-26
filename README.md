<div align="center">
  <img src="https://img.icons8.com/color/144/youtube-play.png" alt="YouTube Icon"/>
  <h1>Hindi YouTube Comment Emotion Analyzer</h1>
  <p><i>An end-to-end NLP architecture for multi-label emotion classification in Hindi powered by the EmoInHindi benchmark.</i></p>

  <p>
    <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="Frontend"/>
    <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="Backend"/>
    <img src="https://img.shields.io/badge/ML-scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white" alt="ML"/>
    <img src="https://img.shields.io/badge/Language-Python%20%7C%20TypeScript-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Languages"/>
  </p>
</div>

<br/>

## ✨ Overview

This project is an advanced academic NLP application designed to fetch, process, and analyze the emotional spectrum of Hindi YouTube comments.

Unlike basic sentiment analyzers that restrict analysis to simplistic Positive / Negative / Neutral polarities, this architecture is built around a specialized **Multi-Label Emotion Classification model** trained on the **EmoInHindi (LREC 2022)** dataset. It identifies combinations across **17 distinct emotional states** (including joy, fear, compassion, gratitude, anger, surprise, and sadness), paired with emoji-aware semantic extraction to accurately interpret contemporary social media communication.

---

## 🧠 Machine Learning Architecture: EmoInHindi

The core NLP engine is an utterance-level multi-label emotion classification pipeline trained offline via `NLPMini_EX.ipynb` on the authentic **EmoInHindi** corpus (LREC 2022).

### 1. Dataset & Dialogue-Aware Partitioning
* **Corpus:** EmoInHindi (`LREC_EmoInHindi.csv`), containing **44,247 utterances across 1,814 dialogues**.
* **17 Distinct Emotion Classes:**
  `anger`, `annoyed`, `anticipation`, `apprehensive`, `compassion`, `confident`, `confused`, `disgusted`, `fear`, `grateful`, `guilty`, `hopeful`, `impressed`, `joy`, `neutral`, `sad`, `surprised`.
* **Dialogue-Grouped Splitting (`GroupShuffleSplit`):**
  Utterances originating from the same conversation/dialogue ID are strictly isolated within a single split:
  - **Training Split:** 75% (~33,185 utterances)
  - **Validation Split:** 10% (~4,424 utterances)
  - **Test Split:** 15% (~6,638 utterances)
  *By grouping by dialogue ID, train/validation/test leakage across conversational turns is eliminated, ensuring reliable and generalizable evaluation.*

### 2. Dual Feature Extraction (`FeatureUnion`)
Hindi exhibits rich inflectional morphology, diverse dialectal spellings, and subtle compounding. A pure word-level vocabulary fails to generalize to unseen grammatical forms. The pipeline addresses this through a `FeatureUnion` combining two complementary sublinear TF-IDF representations:

1. **Word-Level TF-IDF (`word`):**
   - N-gram Range: `(1, 2)` (Unigrams & Bigrams)
   - Max Features: `40,000`
   - Parameters: `min_df=2`, `sublinear_tf=True` (applies $1 + \log(\text{tf})$ dampening)
   - *Captures phrase-level semantics and local contextual word pairs.*

2. **Character-Level TF-IDF with Word Boundaries (`char_wb`):**
   - N-gram Range: `(2, 5)` (2-gram to 5-gram character sequences)
   - Max Features: `30,000`
   - Parameters: `min_df=2`, `sublinear_tf=True`
   - *Captures sub-word morphology, root stems, suffixes, prefixes, and matra combinations within word boundaries, providing high resilience against spelling variations and typos.*

*Total combined feature dimensionality:* **70,000 features**.

### 3. Classification Algorithm
* **Classifier:** `OneVsRestClassifier(LinearSVC(C=1.0, class_weight='balanced', max_iter=3000, random_state=42))`
* **Strategy:** Fits 17 separate binary Linear Support Vector Classifiers, each learning an optimal separating hyperplane for one emotion against all others.
* **Class Balancing:** `class_weight='balanced'` automatically adjusts penalty parameter $C$ inversely proportional to class frequencies, countering extreme class imbalance between common states (`neutral`, `joy`) and rare emotions (`guilty`, `apprehensive`).

### 4. Validation-Based Decision-Threshold Tuning
Standard SVMs make predictions based on whether the signed distance exceeds zero ($f(x) \ge 0$). In imbalanced multi-label scenarios, a static zero threshold severely depresses recall on low-frequency classes.

* **Optimization Strategy:** Using validation data only (strictly isolated from the test set), candidate thresholds are swept along the `precision_recall_curve` for each emotion $j$:
  $$F_1 = \frac{2 \cdot \text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$$
* The threshold $\tau_j$ that maximizes the validation F1 score is saved into `model/emoinhindi/thresholds.json`.
* **Inference Decision Rule:**
  $$\hat{y}_j = \mathbb{I}\left( s_j \ge \tau_j \right), \quad \text{where } s_j = \mathbf{w}_j^T \mathbf{x} + b_j$$
* **Argmax Fallback:** If an utterance does not exceed the threshold for any emotion, the label with the maximum relative margin $(s_j - \tau_j)$ is selected, ensuring that every comment receives an informative prediction.

### 5. Multi-Label Inference & Emoji Fusion
Social media comments heavily rely on emojis to convey sentiment. The backend combines the ML classifier output with an emoji parsing engine:
* **Emoji Extraction:** Normalizes Unicode variation selectors (`\ufe0f`, `\ufe0e`) and maps common visual cues (e.g., 🔥/👏 $\rightarrow$ `admiration`, ❤️/😍 $\rightarrow$ `love`, 😂/🤣 $\rightarrow$ `amusement`, 🙏 $\rightarrow$ `grateful`, 😭 $\rightarrow$ `sad`).
* **Polarity Reconciliation:** Filters out passive background noise or contradictory predictions on short emoji-dense comments to ensure output fidelity.

### 6. Linguistic Preprocessing & Negation Preservation
* **Unicode Normalization:** NFKC normalization ensures Devanagari character consistency.
* **Devanagari Script Detection:** Identifies Devanagari characters (`\u0900` to `\u097F`) to accurately route comments without being skewed by timestamps, URLs, or emojis.
* **Preserving Negations:** Hindi negation tokens (`नहीं`, `नहि`, `ना`, `मत`) are explicitly preserved during stopword removal to prevent sentiment inversion.

---

## 💻 Tech Stack

### Frontend UI / Dashboard
* **Framework:** React + Vite (TypeScript)
* **Styling:** Tailwind CSS (Dark Glassmorphic UI)
* **Data Visualization:** Recharts (Dynamic Circular Emotion Chart, Custom KPI Cards)
* **Icons:** Lucide React

### Backend API
* **Framework:** FastAPI
* **Data Validation:** Pydantic
* **API Integration:** Google API Python Client (YouTube Data API v3)
* **Server:** Uvicorn

### Machine Learning
* **Libraries:** scikit-learn (v1.6.1), joblib, numpy, pandas
* **Artifacts:**
  - `model/emoinhindi/model_bundle.joblib` (FeatureUnion vectorizer + OneVsRest LinearSVC)
  - `model/emoinhindi/labels.json` (17 emotion labels)
  - `model/emoinhindi/thresholds.json` (per-label validation-tuned decision thresholds)
  - `model/emoinhindi/predict.py` (standalone prediction module)

---

## 🚀 How to Run Locally

### Prerequisites
1. Node.js (v18+)
2. Python (3.10+)
3. A YouTube Data API v3 Key (from Google Cloud Console)

### 1. Configure Environment Variables
Create a `.env` file in the root directory (see `.env.example` for reference):
```env
YOUTUBE_API_KEY=your_actual_api_key_here
MAX_COMMENTS=100

# Optional: Set to true to analyze strictly Devanagari comments. Defaults to false.
ONLY_SHOW_HINDI=false

# Supabase Auth — browser signs in against Supabase directly
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable/anon key>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<publishable/anon key>

# Optional: persist analyses in Supabase Postgres. Leave blank to use local SQLite (backend/app.db).
SUPABASE_DB_URL=postgresql://postgres.<project-ref>:<db-password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

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
1. **Dynamic Emotion Circular Graph:** Categorizes and assigns distinct color coding across active emotions present in the video comments using Recharts.
2. **Frequency Emotion & Word Cloud:** Interactive 2D-scrollable cloud visualizing high-frequency emotion labels and recurring Hindi terms.
3. **KPI Stat Cards:** Aggregates detected micro-emotions into macro categories (**Positive**, **Negative**, **Neutral**, **Miscellaneous**) alongside total and analyzed comment counts.
4. **Interactive Comment Data Grid & Filtering:**
   - **General Sentiment Buckets:** `All Sentiments`, `Positive (All)`, `Negative (All)`, and `Neutral` with live count badges.
   - **Individual Emotion Filter:** Direct filtering across the 19 supported emotions (`Admiration`, `Amusement`, `Anger`, `Annoyed`, `Anticipation`, `Apprehensive`, `Compassion`, `Confident`, `Confused`, `Disgusted`, `Fear`, `Grateful`, `Guilty`, `Hopeful`, `Impressed`, `Joy`, `Love`, `Sad`, `Surprised`).
   - **Full-Text Search:** Case-insensitive search across raw comment text and cleaned processed text.
   - **Sorting:** Real-time sorting by `Most Liked`, `Newest`, or `Oldest`.
   - **CSV Export:** One-click download of all comment predictions, labels, like counts, and timestamps with UTF-8 BOM encoding.

---

## 📜 Historical Archive: Previously Used Models & Architecture

This section documents the previous models, datasets, and pipeline configurations that were historically used in earlier iterations of this project prior to transitioning to the **EmoInHindi (LREC 2022)** model bundle:

### 1. Retired Pure Hindi Model: EmoHi (28-Class Architecture)
- **Dataset:** EmoHi (an adaptation of Google's GoEmotions dataset translated into Hindi).
- **28 Emotion Classes:**
  `admiration`, `amusement`, `anger`, `annoyance`, `approval`, `caring`, `confusion`, `curiosity`, `desire`, `disappointment`, `disapproval`, `disgust`, `embarrassment`, `excitement`, `fear`, `gratitude`, `grief`, `joy`, `love`, `nervousness`, `optimism`, `pride`, `realization`, `relief`, `remorse`, `sadness`, `surprise`, `neutral`.
- **Model Pipeline:**
  - Word-level TF-IDF Vectorizer (`hindi_emotion_tfidf_vectorizer.pkl`)
  - Multi-label Binarizer (`hindi_label_binarizer.pkl`)
  - One-vs-Rest Linear Support Vector Classifier (`hindi_emotion_model.pkl`)
  - Label Mapping Dictionary (`hindi_label_mapping.json`)
  - Static Global Threshold (`hindi_threshold.json` set to `0.30`)
- **Key Limitations:**
  - **Severe Class Imbalance:** 28 fine-grained labels suffered from acute data sparsity on low-frequency classes (`grief`, `remorse`, `nervousness`, `embarrassment`), leading to high false-negative rates on nuanced expressions.
  - **Single Static Global Threshold:** Applying a single uniform threshold ($0.30$) across all 28 classes failed to balance precision and recall across disparate class distributions.
  - **Absence of Character-Level N-Grams:** Pure word-level TF-IDF failed to handle Hindi morphological inflections, suffixes, and dialectal variations.

### 2. Retired Hinglish Emotion Model (Code-Mixed Romanized Hindi)
- **Task:** Single-label Multiclass Emotion Classification for Romanized Hindi.
- **10 Emotion Classes:** `anger`, `joy`, `love`, `disgust`, `fear`, `sadness`, `admiration`, `amusement`, `neutral`, `surprise`.
- **Model Pipeline:** Word-level TF-IDF Vectorizer (`hinglish_emotion_tfidf_vectorizer.pkl`) + Linear Support Vector Machine (`hinglish_emotion_model.pkl`).
- **Why Retired:**
  - Single-label formulation failed to capture multi-layered emotional complexity in social commentary.
  - Lacked standardized linguistic grounding compared to the peer-reviewed EmoInHindi benchmark.
  - The project shifted focus toward authentic Devanagari Hindi emotion analysis.

### 3. Retired Hinglish Sarcasm Detection Model
- **Task:** Binary Classification (Sarcastic vs. Non-Sarcastic).
- **Model Pipeline:** Word-level TF-IDF Vectorizer (`sarcasm_tfidf_vectorizer.pkl`) + Logistic Regression Classifier (`sarcasm_model.pkl`).
- **Reported Performance:** ~93% Accuracy and ~92.8% Macro F1 on a synthetic/curated Romanized Hinglish sarcasm benchmark.
- **Why Retired:**
  - Trained exclusively on Latin/Romanized code-mixed text without authentic Devanagari Hindi sarcasm ground truth.
  - Independent sarcasm scoring was decoupled to streamline the system around unified multi-label emotion understanding.

### 4. Previous Routing & Preprocessing Issues
- **Rigid 30% Devanagari Ratio:**
  Previously, `is_devanagari` required:
  $$\frac{\text{Devanagari character count}}{\text{Total non-whitespace characters}} \ge 0.30$$
  This ratio counted emojis, numbers, colons, timestamps (e.g. `12:45`), and Latin characters in the denominator, causing genuine Hindi comments with emojis or timestamps to fall below 30% and get rejected.
  *Updated to:* Detect any Devanagari script characters (`\u0900` to `\u097F`).
- **Hardcoded `ONLY_SHOW_HINDI = True`:**
  Previously hardcoded to `True` in `backend/sentiment.py`, which caused all comments on videos containing non-Devanagari text to return `processed_text: None`, triggering `404 Not Found` errors.
  *Updated to:* Configurable via environment variable (default `false`).

### 5. Architectural Evolution: Old vs. New

| Dimension | Previous Version (EmoHi + Hinglish + Sarcasm) | Current Version (EmoInHindi Architecture) |
| :--- | :--- | :--- |
| **Active Dataset** | EmoHi (28 classes) + Hinglish (10 classes) + Sarcasm | EmoInHindi (LREC 2022, 17 classes) |
| **Model Scope** | 3 disparate models (EmoHi + Hinglish + Sarcasm) | Unified EmoInHindi multi-label classification |
| **Artifact Packaging** | Multiple loose pickle and JSON files | Standardized `model_bundle.joblib` + JSON artifacts |
| **Feature Extraction** | Word TF-IDF only | `FeatureUnion` (word n-grams `1-2` + char_wb `2-5`) |
| **Feature Dimensions** | ~20,000 word features | 70,000 word and character n-gram features |
| **Data Partitioning** | Random train/test split (dialogue leakage risk) | `GroupShuffleSplit` on `dialogueId` (zero leakage) |
| **Decision Thresholds** | Single static global threshold (0.30) | Per-class validation-tuned thresholds (`thresholds.json`) |
| **Emoji Processing** | Basic or unmapped | Normalized Unicode selectors + polarity reconciliation |
| **Supported Emotions** | 28 fine-grained classes | 17 structured classes + social cues (`admiration`, `love`, `amusement`) |
| **Script Detection** | Rigid $\ge 30\%$ non-whitespace ratio | Devanagari character presence detection |

---
<div align="center">
  <i>Built for academic rigor, linguistic fidelity, and visually striking analytics.</i>
</div>