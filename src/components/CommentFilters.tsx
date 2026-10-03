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

        {/* Sentiment Filter */}
        <div className="relative">
          <button 
            onClick={() => setShowSentimentDropdown(!showSentimentDropdown)}
            onBlur={() => setTimeout(() => setShowSentimentDropdown(false), 200)}
            className="flex items-center gap-2 px-3 py-2 border border-[#262837] rounded-lg bg-[#1f2130] text-sm text-gray-300 hover:text-white transition-colors"
          >
            {sentimentFilter === 'All' ? 'All Sentiments' : sentimentFilter} <ChevronDown size={14} className="text-gray-500" />
          </button>
          {showSentimentDropdown && (
            <div className="absolute top-full left-0 mt-1 w-40 bg-[#1f2130] border border-[#262837] rounded-lg shadow-xl z-20 overflow-hidden">
              {['All', ...Array.from(new Set(comments.map(c => { const e = c.emotions?.[0] || 'Neutral'; return e.charAt(0).toUpperCase() + e.slice(1); }))).sort()].map(opt => (
                <div 
                  key={opt}
                  onMouseDown={() => setSentimentFilter(opt)}
                  className="px-4 py-2 text-sm text-gray-300 hover:bg-[#2a2d40] hover:text-white cursor-pointer"
                >
                  {opt}
                </div>
              ))}
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
            <div className="absolute top-full left-0 mt-1 w-40 bg-[#1f2130] border border-[#262837] rounded-lg shadow-xl z-20 overflow-hidden">
              {['Most Liked', 'Newest', 'Oldest'].map(opt => (
                <div 
                  key={opt}
                  onMouseDown={() => setSortOrder(opt)}
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
