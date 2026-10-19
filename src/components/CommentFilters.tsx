import { Search, Download, ChevronDown, ArrowDownUp } from "lucide-react";
import { useState } from "react";

interface CommentFiltersProps {
  comments?: any[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  sentimentFilter: string;
  setSentimentFilter: (val: string) => void;
  sortOrder: string;
  setSortOrder: (val: string) => void;
}

// Full catalog of individual emotions supported by the NLP models (EmoInHindi 17 + Hinglish & Social Emojis)
const ALL_INDIVIDUAL_EMOTIONS = [
  "Anger",
  "Annoyed",
  "Anticipation",
  "Apprehensive",
  "Compassion",
  "Confident",
  "Confused",
  "Disgusted",
  "Fear",
  "Grateful",
  "Guilty",
  "Hopeful",
  "Impressed",
  "Joy",
  "Sad",
  "Surprised",
  "Admiration",
  "Amusement",
  "Annoyance",
  "Approval",
  "Caring",
  "Curiosity",
  "Desire",
  "Disappointment",
  "Disapproval",
  "Disgust",
  "Embarrassment",
  "Excitement",
  "Gratitude",
  "Grief",
  "Love",
  "Nervousness",
  "Optimism",
  "Pride",
  "Realization",
  "Relief",
  "Remorse",
  "Sadness",
  "Surprise"
];

const POSITIVE_SET = new Set([
  "joy", "grateful", "hopeful", "confident", "impressed", 
  "compassion", "anticipation", "admiration", "amusement", "approval", 
  "caring", "desire", "excitement", "gratitude", "love", "optimism", 
  "pride", "relief", "positive"
]);

const NEGATIVE_SET = new Set([
  "anger", "annoyed", "apprehensive", "disgusted", "fear", 
  "guilty", "sad", "sadness", "annoyance", "disappointment", 
  "disapproval", "disgust", "embarrassment", "grief", "nervousness", 
  "remorse", "negative"
]);

const NEUTRAL_SET = new Set([
  "neutral", "confused", "surprised", "realization", "curiosity", "confusion", "surprise"
]);

export function CommentFilters({ 
  comments = [], 
  searchQuery, 
  setSearchQuery, 
  sentimentFilter, 
  setSentimentFilter, 
  sortOrder, 
  setSortOrder 
}: CommentFiltersProps) {
  
  const [showSentimentDropdown, setShowSentimentDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Combine full model emotions list with any distinct emotions in comments
  const allEmotionsList = Array.from(
    new Set([
      ...ALL_INDIVIDUAL_EMOTIONS,
      ...comments.flatMap(c => (c.emotions || []).map((e: string) => e.charAt(0).toUpperCase() + e.slice(1).toLowerCase()))
    ])
  ).filter(e => e !== "Neutral").sort();

  // Counts for each sentiment/emotion in current comments
  const getCountForEmotion = (emotionName: string) => {
    if (!comments || comments.length === 0) return 0;
    const lower = emotionName.toLowerCase();
    return comments.filter(c => 
      (c.emotions || []).some((e: string) => e.toLowerCase() === lower)
    ).length;
  };

  const positiveCount = comments.filter(c => 
    (c.emotions || []).some((e: string) => POSITIVE_SET.has(e.toLowerCase()))
  ).length;

  const negativeCount = comments.filter(c => 
    (c.emotions || []).some((e: string) => NEGATIVE_SET.has(e.toLowerCase()))
  ).length;

  const neutralCount = comments.filter(c => 
    (c.emotions || []).some((e: string) => NEUTRAL_SET.has(e.toLowerCase()))
  ).length;

  const handleDownloadCSV = () => {
    if (!comments || comments.length === 0) return;
    
    const headers = ["Text", "Processed Text", "Emotion Model", "Primary Emotion", "Likes", "Published At"];
    const csvRows = [headers.join(",")];
    
    comments.forEach(c => {
      const text = `"${(c.text || "").replace(/"/g, '""')}"`;
      const processed = `"${(c.processed_text || "").replace(/"/g, '""')}"`;
      const model = `"${c.emotion_model || ""}"`;
      const emotion = `"${c.emotions && c.emotions.length > 0 ? c.emotions[0] : ""}"`;
      const likes = c.likeCount || 0;
      const publishedAt = `"${c.publishedAt || ""}"`;
      
      csvRows.push([text, processed, model, emotion, likes, publishedAt].join(","));
    });
    
    const csvContent = csvRows.join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "youtube_comments_analysis.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSentimentDisplayLabel = () => {
    if (sentimentFilter === "All") return "All Sentiments";
    if (sentimentFilter === "Positive") return "Positive (All)";
    if (sentimentFilter === "Negative") return "Negative (All)";
    return sentimentFilter;
  };

  return (
    <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 w-full">
      <div className="flex flex-wrap items-center gap-3 w-full xl:flex-1">
        <div className="relative w-full sm:flex-1 sm:max-w-[300px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 border border-[#262837] rounded-lg leading-5 bg-[#1f2130] text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Search comments..."
          />
        </div>

        {/* Sentiment Filter Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowSentimentDropdown(!showSentimentDropdown)}
            onBlur={() => setTimeout(() => setShowSentimentDropdown(false), 200)}
            className="flex items-center gap-2 px-3 py-2 border border-[#262837] rounded-lg bg-[#1f2130] text-sm text-gray-300 hover:text-white transition-colors"
          >
            {getSentimentDisplayLabel()} <ChevronDown size={14} className="text-gray-500" />
          </button>
          {showSentimentDropdown && (
            <div className="absolute top-full left-0 mt-1 w-64 max-h-80 overflow-y-auto bg-[#1f2130] border border-[#262837] rounded-lg shadow-xl z-30 py-1 divide-y divide-[#262837]/60">
              {/* General Sentiment Buckets */}
              <div className="py-1">
                <div
                  onMouseDown={() => { setSentimentFilter('All'); setShowSentimentDropdown(false); }}
                  className={`px-3 py-1.5 text-sm cursor-pointer transition-colors flex items-center justify-between ${
                    sentimentFilter === 'All' ? 'bg-indigo-600/30 text-indigo-400 font-medium' : 'text-gray-300 hover:bg-[#2a2d40] hover:text-white'
                  }`}
                >
                  <span>All Sentiments</span>
                  {comments.length > 0 && <span className="text-xs text-gray-500">{comments.length}</span>}
                </div>
                <div
                  onMouseDown={() => { setSentimentFilter('Positive'); setShowSentimentDropdown(false); }}
                  className={`px-3 py-1.5 text-sm cursor-pointer transition-colors flex items-center justify-between ${
                    sentimentFilter === 'Positive' ? 'bg-indigo-600/30 text-indigo-400 font-medium' : 'text-gray-300 hover:bg-[#2a2d40] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Positive (All)</span>
                  </div>
                  {comments.length > 0 && <span className="text-xs text-gray-500">{positiveCount}</span>}
                </div>
                <div
                  onMouseDown={() => { setSentimentFilter('Negative'); setShowSentimentDropdown(false); }}
                  className={`px-3 py-1.5 text-sm cursor-pointer transition-colors flex items-center justify-between ${
                    sentimentFilter === 'Negative' ? 'bg-indigo-600/30 text-indigo-400 font-medium' : 'text-gray-300 hover:bg-[#2a2d40] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    <span>Negative (All)</span>
                  </div>
                  {comments.length > 0 && <span className="text-xs text-gray-500">{negativeCount}</span>}
                </div>
                <div
                  onMouseDown={() => { setSentimentFilter('Neutral'); setShowSentimentDropdown(false); }}
                  className={`px-3 py-1.5 text-sm cursor-pointer transition-colors flex items-center justify-between ${
                    sentimentFilter === 'Neutral' ? 'bg-indigo-600/30 text-indigo-400 font-medium' : 'text-gray-300 hover:bg-[#2a2d40] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                    <span>Neutral</span>
                  </div>
                  {comments.length > 0 && <span className="text-xs text-gray-500">{neutralCount}</span>}
                </div>
              </div>

              {/* All Individual Emotions */}
              <div className="py-1">
                <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                  Individual Emotions ({allEmotionsList.length})
                </div>
                {allEmotionsList.map(opt => {
                  const count = getCountForEmotion(opt);
                  return (
                    <div 
                      key={opt}
                      onMouseDown={() => { setSentimentFilter(opt); setShowSentimentDropdown(false); }}
                      className={`px-3 py-1.5 text-sm cursor-pointer transition-colors flex items-center justify-between ${
                        sentimentFilter === opt ? 'bg-indigo-600/30 text-indigo-400 font-medium' : 'text-gray-300 hover:bg-[#2a2d40] hover:text-white'
                      }`}
                    >
                      <span>{opt}</span>
                      {comments.length > 0 && (
                        <span className={`text-xs ${count > 0 ? 'text-indigo-400 font-medium' : 'text-gray-600'}`}>
                          {count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sort Order */}
        <div className="relative">
          <button 
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            onBlur={() => setTimeout(() => setShowSortDropdown(false), 200)}
            className="flex items-center gap-2 px-3 py-2 border border-[#262837] rounded-lg bg-[#1f2130] text-sm text-gray-300 hover:text-white transition-colors"
          >
            <ArrowDownUp size={14} className="text-gray-500" /> {sortOrder} <ChevronDown size={14} className="text-gray-500" />
          </button>
          {showSortDropdown && (
            <div className="absolute top-full left-0 mt-1 w-40 bg-[#1f2130] border border-[#262837] rounded-lg shadow-xl z-30 overflow-hidden">
              {['Most Liked', 'Newest', 'Oldest'].map(opt => (
                <div 
                  key={opt}
                  onMouseDown={() => { setSortOrder(opt); setShowSortDropdown(false); }}
                  className="px-4 py-2 text-sm text-gray-300 hover:bg-[#2a2d40] hover:text-white cursor-pointer"
                >
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={handleDownloadCSV} 
        disabled={!comments || comments.length === 0} 
        className="flex justify-center items-center gap-2 bg-[#2a2d40] hover:bg-[#343851] border border-[#3b405a] text-white px-4 py-2 rounded-lg text-sm transition-colors w-full xl:w-auto mt-2 xl:mt-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download size={16} />
        Download CSV
      </button>
    </div>
  );
}
