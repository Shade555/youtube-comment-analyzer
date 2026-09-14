from typing import List, Dict

def generate_analytics(predictions: List[dict]) -> dict:
    """
    Calculates summary statistics and analytics based on sentiment predictions.
    """
    total = len(predictions)
    if total == 0:
        return {
            "sentiment_distribution": {"positive": 0, "negative": 0, "neutral": 0},
            "percentages": {"positive": 0.0, "negative": 0.0, "neutral": 0.0},
            "average_confidence": 0.0
        }

    positive_count = sum(1 for p in predictions if p["sentiment"] == "positive")
    negative_count = sum(1 for p in predictions if p["sentiment"] == "negative")
    neutral_count = sum(1 for p in predictions if p["sentiment"] == "neutral")
    
    avg_conf = sum(p["confidence"] for p in predictions) / total

    return {
        "sentiment_distribution": {
            "positive": positive_count,
            "negative": negative_count,
            "neutral": neutral_count
        },
        "percentages": {
            "positive": round((positive_count / total) * 100, 1),
            "negative": round((negative_count / total) * 100, 1),
            "neutral": round((neutral_count / total) * 100, 1)
        },
        "average_confidence": round(avg_conf, 2)
    }
