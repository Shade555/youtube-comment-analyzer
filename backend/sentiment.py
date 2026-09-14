import os
import json
import joblib
import numpy as np
from .preprocessing import is_devanagari, preprocess_pure_hindi, preprocess_hinglish_final

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'model')

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
        
    try:
        # 1. Emotion Routing
        if is_devanagari(text):
            processed = preprocess_pure_hindi(text)
            if not processed:
                emotions = ["neutral"]
            else:
                x = hindi_tfidf.transform([processed])
                scores = hindi_model.decision_function(x)[0]
                prediction = (scores >= hindi_threshold).astype(int)
                active_indices = np.where(prediction == 1)[0]
                
                # Fallback to strongest emotion if none pass threshold
                if len(active_indices) == 0:
                    active_indices = [int(np.argmax(scores))]
                    
                emotions = [hindi_label_mapping[str(hindi_mlb.classes_[idx])] for idx in active_indices]
            
            emotion_model_used = "Pure Hindi"
        else:
            processed = preprocess_hinglish_final(text)
            if not processed:
                emotions = ["neutral"]
            else:
                x = hinglish_tfidf.transform([processed])
                emotions = [str(hinglish_model.predict(x)[0])]
            
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
