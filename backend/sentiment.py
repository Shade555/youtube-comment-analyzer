import os
import joblib
from .preprocessing import preprocess_hindi_text

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'model')
VECTORIZER_PATH = os.path.join(MODEL_DIR, 'tfidf_vectorizer.pkl')
MODEL_PATH = os.path.join(MODEL_DIR, 'sentiment_model.pkl')

# Global variables for model artifacts
vectorizer = None
model = None

def load_models():
    """Loads the pre-trained vectorizer and model from disk."""
    global vectorizer, model
    try:
        if os.path.exists(VECTORIZER_PATH) and os.path.exists(MODEL_PATH):
            vectorizer = joblib.load(VECTORIZER_PATH)
            model = joblib.load(MODEL_PATH)
            print("Successfully loaded model artifacts.")
        else:
            print("WARNING: Model artifacts not found. Inference will return mock data until model is trained.")
    except Exception as e:
        print(f"Error loading models: {e}")

# Call load_models when module is imported
load_models()

def predict_sentiment(comment_text: str):
    """
    Predicts the sentiment of a Hindi comment.
    Returns (processed_text, sentiment_label, confidence_score).
    """
    processed_text = preprocess_hindi_text(comment_text)
    
    # If it becomes empty after preprocessing, it's Neutral/unknown
    if not processed_text:
        return processed_text, "neutral", 0.0
        
    # If models are not loaded (e.g., before training step is completed by the user)
    if vectorizer is None or model is None:
        # Return a mock prediction so the UI can still be developed
        return processed_text, "positive", 0.85
        
    try:
        # Vectorize
        X = vectorizer.transform([processed_text])
        
        # Predict
        prediction = model.predict(X)[0]
        
        # Get confidence (max probability)
        probabilities = model.predict_proba(X)[0]
        confidence = max(probabilities)
        
        # Ensure sentiment is nicely formatted (assuming model predicts "positive", "negative", "neutral")
        sentiment_label = str(prediction).lower()
        
        return processed_text, sentiment_label, float(confidence)
    except Exception as e:
        print(f"Prediction error: {e}")
        return processed_text, "neutral", 0.0
