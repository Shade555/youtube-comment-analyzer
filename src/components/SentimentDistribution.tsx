import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const emptyData = [{ name: "Empty", value: 1 }];
const COLORS = ["#1f2130"];

export function SentimentDistribution() {
  return (
    <div className="bg-[#14151f]/80 backdrop-blur-xl rounded-xl border border-[#262837]/60 p-5 w-full h-full flex flex-col shadow-lg">
      <h3 className="text-white font-medium mb-4">Sentiment Distribution</h3>
      
      <div className="flex-1 flex items-center justify-between">
        <div className="relative w-[140px] h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={emptyData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
              >
                {emptyData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-white font-semibold text-lg">0</span>
            <span className="text-gray-500 text-xs">Comments</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 flex-1 ml-8">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#22c55e]"></div>
              <span className="text-gray-300">Positive</span>
            </div>
            <div className="text-gray-400">
              <span className="text-white font-medium mr-2">0%</span>
              (0)
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#eab308]"></div>
              <span className="text-gray-300">Neutral</span>
            </div>
            <div className="text-gray-400">
              <span className="text-white font-medium mr-2">0%</span>
              (0)
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#ef4444]"></div>
              <span className="text-gray-300">Negative</span>
            </div>
            <div className="text-gray-400">
              <span className="text-white font-medium mr-2">0%</span>
              (0)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
