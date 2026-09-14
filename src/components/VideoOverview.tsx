import { Eye, ThumbsUp, MessageSquare, CheckCircle2 } from "lucide-react";

interface VideoOverviewProps {
  videoId?: string;
}

export function VideoOverview({ videoId }: VideoOverviewProps) {
  return (
    <div className="bg-[#14151f]/80 backdrop-blur-xl rounded-xl border border-[#262837]/60 p-4 flex flex-col sm:flex-row gap-4 sm:gap-6 w-full shadow-lg">
      <div 
        className="relative w-full sm:w-64 h-48 sm:h-36 bg-[#1f2130] rounded-lg overflow-hidden flex shrink-0 items-center justify-center bg-cover bg-center"
        style={videoId ? { backgroundImage: `url(https://img.youtube.com/vi/${videoId}/hqdefault.jpg)` } : {}}
      >
        <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1"></div>
        </div>
      </div>
      
      <div className="flex flex-col justify-between py-1 flex-1">
        <div className="mb-4 sm:mb-0">
          <h2 className="text-xl font-medium text-white mb-2">
            {videoId ? `Video Analysis (ID: ${videoId})` : "Awaiting Video..."}
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-5 h-5 rounded-full bg-[#2a2d40]"></div>
            <span>YouTube Data API v3</span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-sm">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-gray-400" />
            <div>
              <div className="text-white font-medium">--</div>
              <div className="text-gray-500 text-xs">Views</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ThumbsUp size={16} className="text-gray-400" />
            <div>
              <div className="text-white font-medium">--</div>
              <div className="text-gray-500 text-xs">Likes</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-gray-400" />
            <div>
              <div className="text-white font-medium">Max</div>
              <div className="text-gray-500 text-xs">Comments Fetched</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-gray-400" />
            <div>
              <div className="text-white font-medium">100%</div>
              <div className="text-gray-500 text-xs">Analyzed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
