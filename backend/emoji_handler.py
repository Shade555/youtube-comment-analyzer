import re
from typing import List

# Normalized mapping of emojis/emoticons to standard emotion labels (matching the 28 EmoHi / Hinglish catalog)
EMOJI_EMOTION_MAP = {
    # Amusement / Laughing / Humor
    "😂": "amusement",
    "🤣": "amusement",
    "😆": "amusement",
    "😹": "amusement",
    "😅": "amusement",
    "🤭": "amusement",
    "😝": "amusement",
    "😜": "amusement",
    
    # Love / Heartfelt affection
    "❤": "love",
    "♥": "love",
    "💕": "love",
    "💞": "love",
    "💓": "love",
    "💗": "love",
    "💖": "love",
    "💘": "love",
    "💙": "love",
    "💚": "love",
    "💛": "love",
    "💜": "love",
    "🧡": "love",
    "🤎": "love",
    "🖤": "love",
    "🤍": "love",
    "😍": "love",
    "🥰": "love",
    "😘": "love",
    "😻": "love",
    
    # Admiration / Respect / Fire / Praise
    "🔥": "admiration",
    "👏": "admiration",
    "🙌": "admiration",
    "💯": "admiration",
    "👌": "admiration",
    "👍": "admiration",
    "🫡": "admiration",
    "👑": "admiration",
    "🌟": "admiration",
    "✨": "admiration",
    "⭐": "admiration",
    
    # Grateful / Prayer / Respect
    "🙏": "grateful",
    "🤝": "grateful",
    
    # Joy / Happiness
    "😊": "joy",
    "😃": "joy",
    "😀": "joy",
    "😁": "joy",
    "🥳": "joy",
    "🎉": "joy",
    
    # Sad / Heartbreak
    "😭": "sad",
    "😢": "sad",
    "🥺": "sad",
    "😞": "sad",
    "😔": "sad",
    "💔": "sad",
    "😿": "sad",
    
    # Anger / Outrage
    "😡": "anger",
    "😠": "anger",
    "🤬": "anger",
    "😤": "anger",
    "👿": "anger",
    
    # Fear
    "😨": "fear",
    "😰": "fear",
    "😱": "fear",
    
    # Disgusted
    "🤢": "disgusted",
    "🤮": "disgusted",
    "💩": "disgusted",
    
    # Surprised / Shock
    "😮": "surprised",
    "😲": "surprised",
    "😯": "surprised",
    "🤯": "surprised",
    "😳": "surprised",
}

# Text emoticons and acronyms
TEXT_EMOTION_PATTERNS = [
    (re.compile(r"\b(lmao|lmfao|rofl|lol|xd|xd+)\b", re.IGNORECASE), "amusement"),
    (re.compile(r"(:-\)|:\)|\^_\^)", re.IGNORECASE), "joy"),
    (re.compile(r"(:-\(|:\()", re.IGNORECASE), "sad"),
    (re.compile(r"<3", re.IGNORECASE), "love"),
]

def extract_emoji_emotions(text: str) -> List[str]:
    """
    Extracts distinct emotions expressed by emojis and common text emoticons in order of frequency.
    Normalizes variation selectors (U+FE0F, U+FE0E) so standard and presentation forms match reliably.
    """
    if not text:
        return []
        
    normalized = text.replace("\ufe0f", "").replace("\ufe0e", "")
    counts = {}
    
    for char, emotion in EMOJI_EMOTION_MAP.items():
        occ = normalized.count(char)
        if occ > 0:
            counts[emotion] = counts.get(emotion, 0) + occ
            
    for pattern, emotion in TEXT_EMOTION_PATTERNS:
        matches = pattern.findall(normalized)
        if matches:
            counts[emotion] = counts.get(emotion, 0) + len(matches)
            
    # Sort emotions by frequency of appearance
    sorted_emotions = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    return [e for e, _ in sorted_emotions]
