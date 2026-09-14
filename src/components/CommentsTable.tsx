import { ChevronLeft, ChevronRight } from "lucide-react";

export function CommentsTable() {
  return (
    <div className="w-full mt-2">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-gray-500 text-xs border-b border-[#262837]">
              <th className="py-3 px-2 w-10 text-center font-medium">
                <input type="checkbox" className="rounded border-gray-600 bg-[#1f2130]" />
              </th>
              <th className="py-3 px-4 font-medium">Comment</th>
              <th className="py-3 px-4 font-medium text-center w-32">Sentiment</th>
              <th className="py-3 px-4 font-medium text-center w-28">Confidence</th>
              <th className="py-3 px-4 font-medium text-center w-24">Likes</th>
              <th className="py-3 px-4 font-medium w-40">Timestamp</th>
              <th className="py-3 px-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="py-12 text-center text-gray-500 text-sm">
                No comments to display
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
        <div>Showing 0–0 of 0 comments</div>
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#262837] bg-[#1f2130] text-gray-400 hover:text-white disabled:opacity-50" disabled>
            <ChevronLeft size={16} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white font-medium">
            1
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1f2130] text-gray-400 hover:text-white transition-colors">
            2
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1f2130] text-gray-400 hover:text-white transition-colors">
            3
          </button>
          <span className="px-2">...</span>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#262837] bg-[#1f2130] text-gray-400 hover:text-white transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
