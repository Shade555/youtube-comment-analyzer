import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    PROJECT_NAME: str = "Hindi YouTube Comment Sentiment Analysis"
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY")
    # Maximum number of comments to fetch per video
    MAX_COMMENTS: int = int(os.getenv("MAX_COMMENTS", 500))

settings = Settings()
