import sys
import traceback
sys.path.append(".")

from backend.sentiment import unified_predict
from backend.preprocessing import is_devanagari, preprocess_pure_hindi, preprocess_hinglish_final
from backend.analytics import generate_analytics

try:
    print("Testing Preprocessing...")
    h1 = preprocess_pure_hindi("मुझे यह फिल्म बहुत पसंद आई")
    h2 = preprocess_hinglish_final("this is a test")
    
    print("Testing Unified Predict Hindi...")
    res1 = unified_predict("मुझे यह फिल्म बहुत पसंद आई")
    print(res1)
    
    print("Testing Unified Predict Hinglish...")
    res2 = unified_predict("This video is really good!")
    print(res2)
    
    print("Testing Analytics...")
    analytics = generate_analytics([res1, res2])
    print(analytics)
    
    print("All tests passed!")
except Exception as e:
    print("ERROR CAUGHT:")
    traceback.print_exc()
