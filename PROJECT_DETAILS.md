# 🧠 YouTube Comment Emotion & Sarcasm Analyzer 
### Comprehensive NLP Architecture & Syllabus Mapping

This document provides a highly detailed, beautifully formatted overview of the NLP pipeline, the algorithms, and how this project directly maps to the academic syllabus.

---

## 🎯 1. Features Overview
* **🌐 Multilingual Language Routing:** Automatically detects the script of a YouTube comment. If it contains >30% Devanagari characters, it routes to the Pure Hindi model; otherwise, it routes to the Hinglish model.
* **🇮🇳 Pure Hindi (EmoHi) Emotion Detection:** A multi-label classification system capable of identifying 28 distinct human emotions (e.g., Admiration, Anger, Relief) from Devanagari text.
* **🔤 Hinglish Emotion Detection:** A single-label classification system that categorizes code-mixed (Hindi + English) text into 10 fundamental emotions.
* **😏 Sarcasm Detection:** An independent binary classifier that flags comments as sarcastic or non-sarcastic.
* **📊 Interactive React Dashboard:** Real-time visualization of YouTube comments using dynamic Pie Charts, a Word Cloud (scaled by frequency), and KPI metric cards.

---

## 🏗️ 2. Tech Stack & Architecture
* **Frontend:** React + Vite, Tailwind CSS, Recharts (for data visualization).
* **Backend:** FastAPI (Python), serving both the REST API and the static React files.
* **Machine Learning / NLP:** `scikit-learn` (v1.6.1), `pandas`, `numpy`, `nltk`, `joblib`.
* **APIs:** YouTube Data API v3 (for fetching live comments).
* **Database / Auth:** Supabase (PostgreSQL).

---

## 📚 3. Syllabus Mapping & Academic Relevance

This project heavily implements concepts from the following NLP syllabus modules:

### **Module 6: Applications of NLP (6.1)**
* **Topic:** *Sentiment analysis*
* **Application:** The entire project is an advanced, multi-dimensional sentiment analysis application. Rather than a basic Positive/Negative binary, we implemented Fine-grained Emotion Classification and Sarcasm Detection.

### **Module 1: Introduction to NLP (1.1)**
* **Topic:** *Challenges of NLP; Ambiguities and its types in Indian Regional Languages*
* **Application:** The project directly addresses the challenge of "Code-Mixing" (Hinglish), which is a massive ambiguity in Indian regional NLP. By implementing a language routing algorithm to separate Pure Hindi from Hinglish (`backend/preprocessing.py`, line 8: `is_devanagari`), we solve a fundamental regional language challenge.

### **Module 2: Word Level Analysis (2.1)**
* **Topic:** *Tokenization; Regular expression with types; Grams and its variation: Bigram, Trigram*
* **Application:** 
  * **Regular Expressions:** Heavily used during the preprocessing stage to clean URLs, HTML tags, user tags, and enforce script isolation. 
    * *Implementation Code:* `backend/preprocessing.py` (Lines 33–38 for Hinglish, Lines 49–53 for Pure Hindi using the `[^\u0900-\u097F\s]` regex pattern).
  * **N-grams / TF-IDF:** N-grams are utilized during the TF-IDF feature extraction phase to capture word relationships (specifically Bigrams via `ngram_range=(1, 2)`) rather than just isolated words.
    * *Training Code:* `backend/scripts/NLPMini.ipynb` (Code Cell 18 for Hinglish TF-IDF definition).
    * *Inference Code:* `backend/sentiment.py` (Vectorizers are loaded at lines 26, 30, 41 and Bigram extraction `.transform()` is called at lines 72, 89, 100).

---

## ⚙️ 4. Key Concepts Explained (with Code References)

### A. Preprocessing (`backend/preprocessing.py`)
Before a model can understand text, the text must be mathematically cleaned. Our preprocessing pipeline involves:
1. **Regex Cleaning (Lines 33–38):** Removing URLs, HTML tags, user tags (`@`), and punctuation.
2. **Script Isolation (Lines 49–53):** For the Pure Hindi dataset, English characters are aggressively stripped to prevent noise.
3. **Stopword Removal (Lines 23 & 45):** Common, meaningless words (like "is", "the", "hai", "ki") are removed to reduce dimensionality. *(Note: This is different from Stemming. Stopwords are completely discarded, whereas Stemming modifies words).*
4. **Negation Preservation (Lines 19 & 40):** *Crucially*, negative stopwords (e.g., "नहीं", "ना", "मत", "not") are filtered out of the stopword list so they are preserved in the text. Blindly removing them flips the sentiment of a sentence (e.g., "Good" vs "Not Good").

### B. Algorithm (`backend/sentiment.py`)
1. **TF-IDF with N-Grams (Lines 72, 89, 100):** This algorithm converts raw text into numerical arrays. It gives high weight to words that appear frequently in a specific comment but rarely across the whole dataset. We configured the vectorizers to extract Bigrams (`ngram_range=(1, 2)`) in the training notebook.
2. **Linear SVM (Lines 74, 91):** Used for the Emotion models. SVM plots the TF-IDF vectors in a high-dimensional space and finds the best hyperplane (line) that separates different emotions (e.g., Joy vs. Anger). 
3. **One-Vs-Rest (Multi-Label):** For the 28-class Hindi model, we used a One-Vs-Rest wrapper around the SVM. It trains 28 separate binary SVMs allowing a single comment to have multiple emotions.
4. **Logistic Regression (Line 101):** Used for the binary Sarcasm model due to its high speed and probabilistic output reliability for binary classification.

### C. The Application Flow (`backend/main.py`)
1. **User Input:** User pastes a YouTube URL in the React UI.
2. **Data Fetching:** FastAPI calls the YouTube Data API to fetch the top comments (`main.py`, line 155).
3. **Language Routing:** The backend checks the percentage of Devanagari characters in each comment to decide which model to use (`preprocessing.py`, line 8).
4. **Inference (`sentiment.py`, line 60: `unified_predict`):** 
   * >30% Devanagari ➔ Pure Hindi Preprocessing ➔ Hindi TF-IDF ➔ 28-Class SVM.
   * <30% Devanagari ➔ Hinglish Preprocessing ➔ Hinglish TF-IDF ➔ 10-Class SVM.
   * All comments ➔ Sarcasm TF-IDF ➔ Logistic Regression.
5. **Aggregation & Response:** The backend counts the emotions, generates statistics (`analytics.py`), and sends JSON back to the frontend (`main.py`, line 176).

---

## 🚫 5. Clarification: Stopword Removal vs. Stemming/Lemmatization

**Are Stemming and Lemmatization used in this project?**
**No.** 

*Wait, didn't we remove some words?*
Yes, but that is **Stopword Removal**, not Stemming. 
* **Stopword Removal** completely deletes common conjunctions and prepositions (e.g., "and", "but", "is").
* **Stemming** chops off the ends of words to find the root (e.g., changing "running" to "run").

**Academic Justification for NO Stemming/Lemmatization:**
In standard English NLP (Module 2.1), Stemming (Porter Stemmer) and Lemmatization are used heavily. However, we deliberately omitted this for two reasons:
1. **Indian Morphology Complexity:** Hindi and code-mixed Hinglish have highly complex inflectional morphology. Standard English stemmers destroy the phonetic structure of Hinglish, and robust, production-ready lemmatizers for Devanagari are extremely rare.
2. **Semantic Destruction:** Stripping suffixes in Hindi often alters gender, plurality, or tense in ways that destroy the subtle emotional context required for 28-class emotion detection. 
Instead of stemming, we relied on **TF-IDF with N-grams**, which allows the model to learn the emotional weight of morphologically varied words directly from the training corpus without risking artificial corruption.

---

## 🧪 6. Summary of `NLPMini.ipynb`
The `NLPMini.ipynb` notebook located in `backend/scripts` is the master training sandbox where the offline Machine Learning pipeline was developed. 

**What it exactly does:**
1. **Data Loading:** It extracts and loads the three massive CSV datasets (Hinglish Emotion, Pure Hindi EmoHi, and Hinglish Sarcasm).
2. **EDA (Exploratory Data Analysis):** It visualizes the class imbalances and structures of the datasets.
3. **Pipeline Construction:** It applies the regex preprocessing and TF-IDF vectorization (where `ngram_range=(1,2)` is defined).
4. **Model Training & Comparison:** It trains multiple algorithms (Logistic Regression, Multinomial Naive Bayes, Linear SVM) and compares them using academic metrics (Accuracy, Macro F1-Score).
5. **Multi-Label Binarization:** It converts the 28 EmoHi labels into a multi-hot binary matrix so the SVM can process them simultaneously.
6. **Artifact Export:** Finally, it serializes (pickles) the best performing models, vectorizers, and threshold data into the `.pkl` files that the FastAPI backend currently loads for live predictions.
