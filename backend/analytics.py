from typing import List, Dict

def generate_analytics(predictions: List[dict]) -> dict:
    total = len(predictions)
    if total == 0:
        return {
            "emotion_distribution": {},
            "sarcasm_rate": 0.0,
            "model_usage": {"Pure Hindi": 0, "Hinglish": 0}
        }
        
    emotion_dist = {}
    sarcastic_count = 0
    hindi_model_count = 0
    hinglish_model_count = 0
    
    for p in predictions:
        # Tally emotions (multi-label)
        for emotion in p["emotions"]:
            emotion_dist[emotion] = emotion_dist.get(emotion, 0) + 1
            
        # Tally sarcasm
        if p["sarcasm_label"] == 1:
            sarcastic_count += 1
            
        # Tally model routing
        if p["emotion_model"] == "Pure Hindi":
            hindi_model_count += 1
        elif p["emotion_model"] == "Hinglish":
            hinglish_model_count += 1
            
    # Sort emotions by frequency
    emotion_dist = dict(sorted(emotion_dist.items(), key=lambda item: item[1], reverse=True))
    
    return {
        "emotion_distribution": emotion_dist,
        "sarcasm_rate": round((sarcastic_count / total) * 100, 1),
        "model_usage": {
            "Pure Hindi": hindi_model_count,
            "Hinglish": hinglish_model_count
        }
    }
