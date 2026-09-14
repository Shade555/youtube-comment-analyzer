from pydantic import BaseModel
from typing import List, Dict

class YouTubeAnalyzeRequest(BaseModel):
    url: str

class CommentAnalysis(BaseModel):
    text: str
    processed_text: str
    emotion_model: str
    emotions: List[str]
    sarcasm_label: int
    sarcasm_probability: float

class YouTubeAnalyzeResponse(BaseModel):
    video_id: str
    total_comments: int
    analyzed_comments: int
    emotion_distribution: Dict[str, int]
    sarcasm_rate: float
    model_usage: Dict[str, int]
    comments: List[CommentAnalysis]
