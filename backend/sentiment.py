import os
import json
import joblib
import numpy as np
from .preprocessing import is_devanagari, preprocess_pure_hindi, preprocess_hinglish_final
from .emoji_handler import extract_emoji_emotions

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'model')

# --- TOGGLE: Set to False if you want to analyze both Hindi and Hinglish comments ---
ONLY_SHOW_HINDI = True

# Emotion polarity sets for consistency checking
POSITIVE_SET = {
    "amusement", "joy", "love", "admiration", "gratitude", 
    "optimism", "pride", "relief", "approval", "caring", "excitement"
}

NEGATIVE_SET = {
    "sadness", "anger", "disappointment", "disapproval", 
    "disgust", "fear", "grief", "remorse", "annoyance"
}

# Weak background classes in EmoHi that often trigger false positives on short slang/jokes
PASSIVE_NOISE = {"caring", "realization", "neutral", "confusion", "curiosity"}

# Model placeholders
hinglish_tfidf = None
hinglish_model = None
hindi_tfidf = None
hindi_model = None
hindi_mlb = None
sarcasm_tfidf = None
sarcasm_model = None
hindi_label_mapping = {}
hindi_threshold = 0.0

def load_models():
    global hinglish_tfidf, hinglish_model, hindi_tfidf, hindi_model
    global hindi_mlb, sarcasm_tfidf, sarcasm_model, hindi_label_mapping, hindi_threshold
    
    try:
        # Load Hinglish
        hinglish_tfidf = joblib.load(os.path.join(MODEL_DIR, "hinglish_emotion_tfidf_vectorizer.pkl"))
        hinglish_model = joblib.load(os.path.join(MODEL_DIR, "hinglish_emotion_model.pkl"))
        
        # Load Pure Hindi
        hindi_tfidf = joblib.load(os.path.join(MODEL_DIR, "hindi_emotion_tfidf_vectorizer.pkl"))
        hindi_model = joblib.load(os.path.join(MODEL_DIR, "hindi_emotion_model.pkl"))
        hindi_mlb = joblib.load(os.path.join(MODEL_DIR, "hindi_label_binarizer.pkl"))
        
        with open(os.path.join(MODEL_DIR, "hindi_label_mapping.json"), "r", encoding="utf-8") as f:
            hindi_label_mapping = json.load(f)
            
        with open(os.path.join(MODEL_DIR, "hindi_threshold.json"), "r") as f:
            hindi_threshold = json.load(f)["threshold"]
            
        # Load Sarcasm
        sarcasm_tfidf = joblib.load(os.path.join(MODEL_DIR, "sarcasm_tfidf_vectorizer.pkl"))
        sarcasm_model = joblib.load(os.path.join(MODEL_DIR, "sarcasm_model.pkl"))
        
        print("Successfully loaded all 3 models and artifacts.")
    except Exception as e:
        print(f"Error loading models: {e}. Inference will return mock data.")

load_models()

def unified_predict(text: str) -> dict:
    """
    Routes the text to the appropriate emotion model and scores sarcasm independently.
    Incorporates emoji-aware emotion cues to accurately capture social media sentiment.
    """
    # Mock data fallback if models failed to load
    if not hinglish_model or not hindi_model or not sarcasm_model:
        return {
            "text": text,
            "processed_text": text,
            "emotion_model": "Mock Model",
            "emotions": ["neutral"],
            "sarcasm_label": 0,
            "sarcasm_probability": 0.0
        }
        
    if ONLY_SHOW_HINDI and not is_devanagari(text):
        # By returning None for processed_text, main.py will automatically skip this comment
        return {
            "text": text,
            "processed_text": None,
            "emotion_model": "Skipped",
            "emotions": [],
            "sarcasm_label": 0,
            "sarcasm_probability": 0.0
        }
        
    try:
        # Extract emoji emotion cues (primary signal for social media / YouTube comments)
        emoji_emotions = extract_emoji_emotions(text)

        # 1. Emotion Routing
        if is_devanagari(text):
            processed = preprocess_pure_hindi(text)
            token_count = len(processed.split()) if processed else 0
            
            if not processed:
                emotions = emoji_emotions if emoji_emotions else ["neutral"]
            else:
                x = hindi_tfidf.transform([processed])
                if x.nnz == 0:
                    emotions = emoji_emotions if emoji_emotions else ["neutral"]
                else:
                    scores = hindi_model.decision_function(x)[0]
                    prediction = (scores >= hindi_threshold).astype(int)
                    active_indices = np.where(prediction == 1)[0]
                    
                    # Fallback to strongest emotion if none pass threshold
                    if len(active_indices) == 0:
                        active_indices = [int(np.argmax(scores))]
                        
                    model_emotions = [hindi_label_mapping[str(hindi_mlb.classes_[idx])] for idx in active_indices]

                    if emoji_emotions:
                        primary_emoji = emoji_emotions[0]
                        is_pos_emoji = primary_emoji in POSITIVE_SET
                        is_neg_emoji = primary_emoji in NEGATIVE_SET
                        
                        # Filter out contradictory or passive background noise from the ML model
                        filtered_model = []
                        for me in model_emotions:
                            if is_pos_emoji and me in NEGATIVE_SET:
                                continue  # Don't pair laughing emoji with sadness/anger
                            if is_neg_emoji and me in POSITIVE_SET:
                                continue  # Don't pair crying emoji with joy/amusement
                            if me in PASSIVE_NOISE:
                                continue  # Suppress weak background labels on short emoji comments
                            filtered_model.append(me)

                        # If comment is short or has few TF-IDF features, emojis represent the primary intent
                        if token_count <= 7 or x.nnz <= 2:
                            emotions = emoji_emotions[:2]
                        else:
                            combined = emoji_emotions + filtered_model
                            emotions = list(dict.fromkeys(combined))[:2]
                    else:
                        emotions = model_emotions
            
            emotion_model_used = "Pure Hindi"
        else:
            processed = preprocess_hinglish_final(text)
            token_count = len(processed.split()) if processed else 0
            
            if not processed:
                emotions = emoji_emotions if emoji_emotions else ["neutral"]
            else:
                x = hinglish_tfidf.transform([processed])
                if x.nnz == 0:
                    emotions = emoji_emotions if emoji_emotions else ["neutral"]
                else:
                    model_emotion = str(hinglish_model.predict(x)[0])
                    if emoji_emotions:
                        primary_emoji = emoji_emotions[0]
                        if token_count <= 5 or (primary_emoji in POSITIVE_SET and model_emotion in NEGATIVE_SET) or (primary_emoji in NEGATIVE_SET and model_emotion in POSITIVE_SET):
                            emotions = emoji_emotions[:2]
                        else:
                            emotions = list(dict.fromkeys([primary_emoji, model_emotion]))[:2]
                    else:
                        emotions = [model_emotion]
            
            emotion_model_used = "Hinglish"
            
        # 2. Sarcasm (Independent)
        sarcasm_processed = preprocess_hinglish_final(text)
        if not sarcasm_processed:
            sarcasm_label = 0
            sarcasm_prob = 0.0
        else:
            sarcasm_x = sarcasm_tfidf.transform([sarcasm_processed])
            sarcasm_label = int(sarcasm_model.predict(sarcasm_x)[0])
            sarcasm_prob = float(sarcasm_model.predict_proba(sarcasm_x)[0, 1]) if hasattr(sarcasm_model, "predict_proba") else 0.0
            
        return {
            "text": text,
            "processed_text": processed,
            "emotion_model": emotion_model_used,
            "emotions": emotions,
            "sarcasm_label": sarcasm_label,
            "sarcasm_probability": sarcasm_prob
        }
    except Exception as e:
        print(f"Prediction error: {e}")
        return {
            "text": text,
            "processed_text": "",
            "emotion_model": "Error",
            "emotions": ["neutral"],
            "sarcasm_label": 0,
            "sarcasm_probability": 0.0
        }
