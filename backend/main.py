from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import YouTubeAnalyzeRequest, YouTubeAnalyzeResponse, CommentAnalysis
from .sentiment import unified_predict
from .youtube import extract_video_id, fetch_youtube_comments
from .analytics import generate_analytics

app = FastAPI(title="Hindi YouTube Comment Emotion & Sarcasm API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "API is running."}

@app.post("/api/analyze/youtube", response_model=YouTubeAnalyzeResponse)
def analyze_youtube_video(request: YouTubeAnalyzeRequest):
    video_id = extract_video_id(request.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL.")

    try:
        youtube_data = fetch_youtube_comments(video_id)
        raw_comments = youtube_data["comments"]
        
        if not raw_comments:
            raise HTTPException(status_code=404, detail="No comments found in this video.")

        predictions = []
        for c in raw_comments:
            result = unified_predict(c["text"])
            # Only include if preprocessing produced some text
            if result["processed_text"]:
                predictions.append(result)
                
        if not predictions:
            raise HTTPException(status_code=404, detail="Comments found, but none contained valid words after preprocessing.")

        analytics = generate_analytics(predictions)

        return YouTubeAnalyzeResponse(
            video_id=video_id,
            total_comments=len(raw_comments),
            analyzed_comments=len(predictions),
            emotion_distribution=analytics["emotion_distribution"],
            sarcasm_rate=analytics["sarcasm_rate"],
            model_usage=analytics["model_usage"],
            comments=predictions
        )

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"Error analyzing YouTube video: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")
