import { Link, ArrowRight } from "lucide-react";
import { useState } from "react";

interface YouTubeInputProps {
  onLogout?: () => void;
  onAnalyze?: (url: string) => void;
}

export function YouTubeInput({ onLogout, onAnalyze }: YouTubeInputProps) {
  const [url, setUrl] = useState("");

  const handleAnalyze = () => {
    if (onAnalyze && url) {
      onAnalyze(url);
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full mb-6 gap-4">
      <div className="text-xl font-semibold text-white tracking-wide">
        Comment<span className="text-gray-300 font-medium">Analyzer</span>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
        <div className="relative w-full md:w-[400px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Link size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-[#262837] rounded-lg leading-5 bg-[#14151f] text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Paste YouTube video URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
          />
        </div>
        <button 
          onClick={handleAnalyze}
          className="flex items-center justify-center gap-2 bg-[#2a2d40] hover:bg-[#343851] border border-[#3b405a] text-white px-4 py-2 rounded-lg text-sm transition-colors w-full sm:w-auto"
        >
          <ArrowRight size={16} />
          Analyze
        </button>
      </div>

      <div className="flex items-center gap-3 self-end md:self-auto">
        <div className="w-8 h-8 rounded-full bg-[#2a2d40] flex items-center justify-center text-xs text-gray-300 border border-[#3b405a]">
          NR
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-300 cursor-pointer hover:text-white">
          Nadia Rachal
        </div>
        <button 
          onClick={onLogout}
          className="px-3 py-1.5 ml-2 border border-red-500 text-red-500 bg-[#0f1016] hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
