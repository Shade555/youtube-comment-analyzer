EmoInHindi multi-label emotion model

Files: model_bundle.joblib, labels.json, thresholds.json, predict.py

Usage: pip install scikit-learn joblib numpy
from predict import load_emotion_model, predict_emotions
bundle = load_emotion_model("model_bundle.joblib")
print(predict_emotions("मैं बहुत दुखी हूँ।", bundle)["emotions"])

Research use only. Predicts from a single utterance; no dialogue context or intensity prediction.