import { MessageSquare, Smile, Meh, Frown, HelpCircle, AlertTriangle } from "lucide-react";

interface KPISectionProps {
  totalComments?: number;
  analyzedCount?: number;
  positive?: number;
  neutral?: number;
  negative?: number;
  misc?: number;
  sarcasm?: number;
}

export function KPISection({
  totalComments = 0,
  analyzedCount = 0,
  positive = 0,
  neutral = 0,
  negative = 0,
  misc = 0,
  sarcasm = 0
}: KPISectionProps) {
  
  const calcPercent = (val: number) => {
    if (!analyzedCount) return "0%";
    return Math.round((val / analyzedCount) * 100) + "%";
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Total Comments Card - Full Width */}
      <div className="bg-[#14151f]/80 backdrop-blur-xl rounded-xl border border-[#262837]/60 p-4 flex items-center justify-between gap-4 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#2a2d40] flex items-center justify-center">
            <MessageSquare size={20} className="text-gray-400" />
          </div>
          <div>
            <div className="text-gray-400 text-xs mb-1">Total Comments</div>
            <div className="text-white text-xl font-semibold">{totalComments}</div>
            <div className="text-gray-500 text-[10px]">Analyzed: {analyzedCount}</div>
          </div>
        </div>
        
        {/* Sarcasm Highlight next to Total Comments */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1">
            <AlertTriangle size={14} className="text-orange-500" />
            <span className="text-gray-400 text-xs">Sarcasm Rate</span>
          </div>
          <div className="text-white text-lg font-semibold">{calcPercent(sarcasm)}</div>
          <div className="text-gray-500 text-[10px]">({sarcasm} comments)</div>
        </div>
      </div>

      {/* 2x2 Grid for the other 4 KPIs */}
      <div className="grid grid-cols-2 gap-4 flex-1">
        <div className="bg-[#14151f]/80 backdrop-blur-xl rounded-xl border border-[#262837]/60 p-4 flex flex-col justify-center gap-2 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[rgba(34,197,94,0.1)] flex items-center justify-center">
              <Smile size={16} className="text-[#22c55e]" />
            </div>
            <div className="text-gray-400 text-xs font-medium">Positive</div>
          </div>
          <div>
            <div className="text-white text-xl font-semibold">{positive}</div>
            <div className="text-gray-500 text-[10px]">{calcPercent(positive)}</div>
          </div>
        </div>

        <div className="bg-[#14151f]/80 backdrop-blur-xl rounded-xl border border-[#262837]/60 p-4 flex flex-col justify-center gap-2 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[rgba(234,179,8,0.1)] flex items-center justify-center">
              <Meh size={16} className="text-[#eab308]" />
            </div>
            <div className="text-gray-400 text-xs font-medium">Neutral</div>
          </div>
          <div>
            <div className="text-white text-xl font-semibold">{neutral}</div>
            <div className="text-gray-500 text-[10px]">{calcPercent(neutral)}</div>
          </div>
        </div>

        <div className="bg-[#14151f]/80 backdrop-blur-xl rounded-xl border border-[#262837]/60 p-4 flex flex-col justify-center gap-2 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[rgba(239,68,68,0.1)] flex items-center justify-center">
              <Frown size={16} className="text-[#ef4444]" />
            </div>
            <div className="text-gray-400 text-xs font-medium">Negative</div>
          </div>
          <div>
            <div className="text-white text-xl font-semibold">{negative}</div>
            <div className="text-gray-500 text-[10px]">{calcPercent(negative)}</div>
          </div>
        </div>

        <div className="bg-[#14151f]/80 backdrop-blur-xl rounded-xl border border-[#262837]/60 p-4 flex flex-col justify-center gap-2 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[rgba(99,102,241,0.1)] flex items-center justify-center">
              <HelpCircle size={16} className="text-[#6366f1]" />
            </div>
            <div className="text-gray-400 text-xs font-medium">Miscellaneous</div>
          </div>
          <div>
            <div className="text-white text-xl font-semibold">{misc}</div>
            <div className="text-gray-500 text-[10px]">{calcPercent(misc)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

