import joblib
import numpy as np

def load_emotion_model(path="model_bundle.joblib"):
    return joblib.load(path)

def predict_emotions(text, bundle):
    X = bundle["vectorizer"].transform([text])
    scores = bundle["model"].decision_function(X)[0]
    thresholds = np.asarray(bundle["thresholds"])
    selected = [label for label, score, threshold in zip(bundle["labels"], scores, thresholds) if score >= threshold]
    return {"emotions": selected, "scores": dict(zip(bundle["labels"], scores.tolist()))}

if __name__ == "__main__":
    bundle = load_emotion_model()
    print(predict_emotions("मैं बहुत दुखी और परेशान हूँ।", bundle))