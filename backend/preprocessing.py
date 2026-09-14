import re

# A basic list of Hindi stopwords (can be expanded). 
# Note: Words like 'नहीं', 'ना', 'मत' are EXCLUDED from this list because they carry crucial sentiment negation.
HINDI_STOPWORDS = {
    'मैं', 'मुझे', 'मेरा', 'अपने', 'हमने', 'हमारा', 'अपना', 'हम', 'आप', 'आपका', 'तुम्हारा',
    'अपने', 'स्वयं', 'वह', 'इसे', 'उसके', 'खुद', 'कि', 'जो', 'किसी', 'किस', 'क्या', 'कौन',
    'कौनसा', 'और', 'लेकिन', 'अगर', 'या', 'क्योंकि', 'जैसा', 'जब', 'तक', 'जबकि', 'का', 'की',
    'के', 'है', 'हैं', 'था', 'थी', 'थे', 'होना', 'गया', 'किया', 'कर', 'सकता', 'चाहिए', 'वाला',
    'वाले', 'वाली', 'इन', 'उन', 'इनके', 'उनके', 'यहाँ', 'वहाँ', 'तो', 'ही', 'भी', 'पर', 'में',
    'से', 'को', 'ये', 'वो', 'ये', 'वे'
}

def is_hindi_text(text: str) -> bool:
    """
    Checks if the text contains a reasonable amount of Devanagari characters.
    This acts as a transparent Hindi language filter.
    """
    if not isinstance(text, str) or not text.strip():
        return False
    
    # Range for Devanagari characters: \u0900-\u097F
    devanagari_chars = re.findall(r'[\u0900-\u097F]', text)
    
    # A simple heuristic: if it contains at least a few Devanagari characters, consider it Hindi.
    # In a real academic project, you might calculate a ratio.
    return len(devanagari_chars) >= 3

def preprocess_hindi_text(text: str) -> str:
    """
    Preprocesses Hindi text for sentiment analysis.
    This logic MUST perfectly match the logic used during offline model training.
    """
    if not isinstance(text, str):
        return ""

    # 1. Remove URLs
    text = re.sub(r'http\S+|www\S+', '', text)
    
    # 2. Remove English letters and numbers (keeping only Hindi)
    text = re.sub(r'[a-zA-Z0-9]', '', text)
    
    # 3. Remove punctuation, emojis, and special characters (keeping only Devanagari script and whitespace)
    text = re.sub(r'[^\u0900-\u097F\s]', '', text)
    
    # 4. Tokenization (basic whitespace split)
    tokens = text.split()
    
    # 5. Remove Hindi stop words
    filtered_tokens = [word for word in tokens if word not in HINDI_STOPWORDS]
    
    # 6. Normalize whitespace
    processed_text = ' '.join(filtered_tokens).strip()
    
    return processed_text
