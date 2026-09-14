import re
import unicodedata

# Hinglish setup
hinglish_stopwords = {
    "hai", "hain", "ho", "tha", "thi", "the", "h",
    "ka", "ki", "ke", "ko", "se", "me", "mein",
    "par", "pe", "aur", "ya", "ye", "yah", "woh",
    "wo", "ek", "to", "bhi", "hi", "jo", "is",
    "us", "kya", "ab", "phir", "bas", "sirf",
    "bahut", "bohot"
}

negations = {
    "nahi", "nahin", "na", "mat",
    "नहीं", "नहि", "ना", "मत"
}

def is_devanagari(text: str) -> bool:
    """
    Returns True if at least 30% of the non-whitespace characters are Devanagari.
    """
    if not text: return False
    chars = [c for c in str(text) if not c.isspace()]
    if not chars: return False
    
    devanagari_count = sum("\u0900" <= c <= "\u097F" for c in chars)
    return (devanagari_count / len(chars)) >= 0.30

def preprocess_hinglish(text: str) -> str:
    if not isinstance(text, str) or not text: return ""
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"@\w+", " ", text)
    text = re.sub(r"#", "", text)
    text = re.sub(r"[^A-Za-z0-9\u0900-\u097F\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text

def preprocess_hinglish_final(text: str) -> str:
    cleaned = preprocess_hinglish(text)
    tokens = cleaned.split()
    return " ".join(t for t in tokens if t not in hinglish_stopwords or t in negations)

def preprocess_pure_hindi(text: str) -> str:
    if not isinstance(text, str) or not text: return ""
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"@\w+", " ", text)
    text = re.sub(r"[^\u0900-\u097F\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text
