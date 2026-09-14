import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface SentimentDistributionProps {
  emotionDistribution?: Record<string, number>;
  totalComments?: number;
}

const COLORS = ["#1f2130"];
const emptyData = [{ name: "Empty", value: 1, color: COLORS[0] }];

// Distinct colors for up to 28 classes (generated using a distinct palette)
const EMOTION_COLORS = [
  "#f87171", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa", "#f472b6", "#2dd4bf", 
  "#fb923c", "#38bdf8", "#818cf8", "#4ade80", "#facc15", "#c084fc", "#f43f5e",
  "#14b8a6", "#f97316", "#0ea5e9", "#6366f1", "#84cc16", "#eab308", "#a855f7",
  "#ef4444", "#06b6d4", "#f59e0b", "#d946ef", "#10b981", "#8b5cf6", "#ec4899"
];

export function SentimentDistribution({ emotionDistribution = {}, totalComments = 0 }: SentimentDistributionProps) {
  const hasData = Object.keys(emotionDistribution).length > 0;
  
  // Prepare data for the pie chart
  const data = hasData 
    ? Object.entries(emotionDistribution).map(([name, value], index) => ({
        name,
        value,
        color: EMOTION_COLORS[index % EMOTION_COLORS.length]
      }))
    : emptyData;

  // Sort for legend
  const legendData = [...data].sort((a, b) => b.value - a.value);

  return (
    <div className="bg-[#14151f]/80 backdrop-blur-xl rounded-xl border border-[#262837]/60 p-5 w-full h-full flex flex-col shadow-lg">
      <h3 className="text-white font-medium mb-4">Emotion Distribution</h3>
      
      <div className="flex-1 flex flex-row items-center justify-between overflow-hidden">
        <div className="relative w-[140px] h-[140px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={hasData ? 2 : 0}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={hasData ? entry.color : COLORS[0]} />
                ))}
              </Pie>
              {hasData && <Tooltip contentStyle={{ backgroundColor: '#14151f', border: '1px solid #262837', color: '#fff', borderRadius: '8px' }} />}
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-white font-semibold text-lg">{totalComments}</span>
            <span className="text-gray-500 text-xs">Comments</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-1 ml-6 overflow-y-auto pr-2 max-h-[140px] custom-scrollbar">
          {hasData ? (
            legendData.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm shrink-0">
                <div className="flex items-center gap-2 truncate pr-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                  <span className="text-gray-300 truncate capitalize" title={item.name}>{item.name}</span>
                </div>
                <div className="text-gray-400 shrink-0">
                  <span className="text-white font-medium mr-2">
                    {Math.round((item.value / (totalComments || 1)) * 100)}%
                  </span>
                  ({item.value})
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#22c55e]"></div>
                  <span className="text-gray-300">Positive</span>
                </div>
                <div className="text-gray-400"><span className="text-white font-medium mr-2">0%</span>(0)</div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#eab308]"></div>
                  <span className="text-gray-300">Neutral</span>
                </div>
                <div className="text-gray-400"><span className="text-white font-medium mr-2">0%</span>(0)</div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#ef4444]"></div>
                  <span className="text-gray-300">Negative</span>
                </div>
                <div className="text-gray-400"><span className="text-white font-medium mr-2">0%</span>(0)</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
