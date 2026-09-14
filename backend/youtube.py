import re
import googleapiclient.discovery
from googleapiclient.errors import HttpError
from .config import settings

def extract_video_id(url: str) -> str:
    """Extracts the YouTube video ID from various URL formats."""
    # Matches: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, etc.
    pattern = r'(?:v=|\/)([0-9A-Za-z_-]{11}).*'
    match = re.search(pattern, url)
    if match:
        return match.group(1)
    return None

def fetch_youtube_comments(video_id: str, max_comments: int = None):
    """
    Fetches top-level comments for a given YouTube video using the Data API v3.
    """
    if not settings.YOUTUBE_API_KEY or settings.YOUTUBE_API_KEY == "your_api_key_here":
        raise ValueError("YouTube API key is not configured.")
        
    if max_comments is None:
        max_comments = settings.MAX_COMMENTS
        
    youtube = googleapiclient.discovery.build(
        "youtube", "v3", developerKey=settings.YOUTUBE_API_KEY
    )

    comments = []
    next_page_token = None

    try:
        # First, fetch video details to make sure it exists and get title
        video_request = youtube.videos().list(
            part="snippet",
            id=video_id
        )
        video_response = video_request.execute()
        
        if not video_response.get("items"):
            raise ValueError(f"Video not found for ID: {video_id}")
            
        video_title = video_response["items"][0]["snippet"]["title"]
        video_thumbnail = video_response["items"][0]["snippet"]["thumbnails"].get("medium", {}).get("url", "")
        
        # Then, fetch comments
        while len(comments) < max_comments:
            request = youtube.commentThreads().list(
                part="snippet",
                videoId=video_id,
                maxResults=min(100, max_comments - len(comments)),
                pageToken=next_page_token,
                textFormat="plainText"
            )
            response = request.execute()

            for item in response.get("items", []):
                snippet = item["snippet"]["topLevelComment"]["snippet"]
                comments.append({
                    "text": snippet["textDisplay"],
                    "author": snippet.get("authorDisplayName", ""),
                    "likeCount": snippet.get("likeCount", 0),
                    "publishedAt": snippet.get("publishedAt", "")
                })

            next_page_token = response.get("nextPageToken")
            if not next_page_token:
                break

        return {
            "video_id": video_id,
            "title": video_title,
            "thumbnail": video_thumbnail,
            "comments": comments
        }
        
    except HttpError as e:
        error_reason = e.error_details[0].get("reason") if e.error_details else "Unknown"
        if error_reason == "commentsDisabled":
            raise ValueError("Comments are disabled for this video.")
        elif error_reason == "quotaExceeded":
            raise ValueError("YouTube API quota has been exceeded.")
        else:
            raise ValueError(f"YouTube API error: {e.reason}")
    except Exception as e:
        raise ValueError(f"Failed to fetch comments: {str(e)}")
