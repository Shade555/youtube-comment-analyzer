from pydantic import BaseModel
from typing import List, Optional, Dict

class PredictRequest(BaseModel):
    text: str

class PredictResponse(BaseModel):
    comment: str
    processed_text: str
    sentiment: str
    confidence: float

class YouTubeAnalyzeRequest(BaseModel):
    url: str

class SentimentDistribution(BaseModel):
    positive: int
    negative: int
    neutral: int

class Percentages(BaseModel):
    positive: float
    negative: float
    neutral: float

class YouTubeAnalyzeResponse(BaseModel):
    video_id: str
    total_comments: int
    hindi_comments: int
    analyzed_comments: int
    sentiment_distribution: SentimentDistribution
    percentages: Percentages
    average_confidence: float
    comments: List[PredictResponse]
