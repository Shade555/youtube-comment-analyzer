import { Search, Download, ChevronDown, ArrowDownUp } from "lucide-react";

export function CommentFilters() {
  return (
    <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 w-full">
      <div className="flex flex-wrap items-center gap-3 w-full xl:flex-1">
        <div className="relative w-full sm:flex-1 sm:max-w-[300px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-500" />
          </div>
          <input
            type="text"
            className="block w-full pl-9 pr-3 py-2 border border-[#262837] rounded-lg leading-5 bg-[#1f2130] text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Search comments..."
          />
        </div>

        <button className="flex items-center gap-2 px-3 py-2 border border-[#262837] rounded-lg bg-[#1f2130] text-sm text-gray-300 hover:text-white transition-colors">
          All Sentiments <ChevronDown size={14} className="text-gray-500" />
        </button>

        <button className="flex items-center gap-2 px-3 py-2 border border-[#262837] rounded-lg bg-[#1f2130] text-sm text-gray-300 hover:text-white transition-colors">
          All Confidence <ChevronDown size={14} className="text-gray-500" />
        </button>

        <button className="flex items-center gap-2 px-3 py-2 border border-[#262837] rounded-lg bg-[#1f2130] text-sm text-gray-300 hover:text-white transition-colors">
          All Time <ChevronDown size={14} className="text-gray-500" />
        </button>
        
        <button className="flex items-center gap-2 px-3 py-2 border border-[#262837] rounded-lg bg-[#1f2130] text-sm text-gray-300 hover:text-white transition-colors">
          <ArrowDownUp size={14} className="text-gray-500" /> Most Liked <ChevronDown size={14} className="text-gray-500" />
        </button>
      </div>

      <button className="flex justify-center items-center gap-2 bg-[#2a2d40] hover:bg-[#343851] border border-[#3b405a] text-white px-4 py-2 rounded-lg text-sm transition-colors w-full xl:w-auto mt-2 xl:mt-0">
        <Download size={16} />
        Download CSV
      </button>
    </div>
  );
}
