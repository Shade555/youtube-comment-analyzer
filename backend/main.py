from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import PredictRequest, PredictResponse, YouTubeAnalyzeRequest, YouTubeAnalyzeResponse
from .sentiment import predict_sentiment
from .preprocessing import is_hindi_text
from .youtube import extract_video_id, fetch_youtube_comments
from .analytics import generate_analytics

app = FastAPI(title="Hindi YouTube Comment Sentiment Analysis API")

# Configure CORS for React frontend (default Vite port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Hindi Sentiment Analysis API is running."}

@app.post("/api/predict", response_model=PredictResponse)
def predict_single_comment(request: PredictRequest):
    """Predicts sentiment for a single Hindi comment."""
    if not is_hindi_text(request.text):
        raise HTTPException(status_code=400, detail="Text does not appear to contain sufficient Hindi (Devanagari) characters.")
        
    processed, sentiment, confidence = predict_sentiment(request.text)
    
    return PredictResponse(
        comment=request.text,
        processed_text=processed,
        sentiment=sentiment,
        confidence=confidence
    )

@app.post("/api/analyze/youtube", response_model=YouTubeAnalyzeResponse)
def analyze_youtube_video(request: YouTubeAnalyzeRequest):
    """Fetches comments from a YouTube video, filters for Hindi, and predicts sentiment."""
    video_id = extract_video_id(request.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL.")

    try:
        # 1. Fetch comments
        youtube_data = fetch_youtube_comments(video_id)
        raw_comments = youtube_data["comments"]
        
        # 2. Filter for Hindi comments
        hindi_comments = [c for c in raw_comments if is_hindi_text(c["text"])]
        
        if not hindi_comments:
            raise HTTPException(status_code=404, detail="No Hindi comments found in this video.")

        # 3. Predict sentiment for each Hindi comment
        predictions = []
        for c in hindi_comments:
            processed, sentiment, conf = predict_sentiment(c["text"])
            # Only include if preprocessing didn't wipe it out completely
            if processed: 
                predictions.append({
                    "comment": c["text"],
                    "processed_text": processed,
                    "sentiment": sentiment,
                    "confidence": conf
                })
                
        if not predictions:
            raise HTTPException(status_code=404, detail="Comments found, but none contained valid Hindi words after preprocessing.")

        # 4. Generate analytics
        analytics = generate_analytics(predictions)

        # 5. Return complete response
        return YouTubeAnalyzeResponse(
            video_id=video_id,
            total_comments=len(raw_comments),
            hindi_comments=len(hindi_comments),
            analyzed_comments=len(predictions),
            sentiment_distribution=analytics["sentiment_distribution"],
            percentages=analytics["percentages"],
            average_confidence=analytics["average_confidence"],
            comments=predictions
        )

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"Error analyzing YouTube video: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred while analyzing the video.")
