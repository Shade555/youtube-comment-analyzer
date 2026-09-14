import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface CommentsTableProps {
  comments?: any[];
}

export function CommentsTable({ comments = [] }: CommentsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const totalPages = Math.ceil(comments.length / itemsPerPage);
  const currentComments = comments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
              <th className="py-3 px-4 font-medium w-48">Emotions</th>
              <th className="py-3 px-4 font-medium w-32">Model</th>
              <th className="py-3 px-4 font-medium text-center w-28">Sarcastic</th>
            </tr>
          </thead>
          <tbody>
            {comments.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-500 text-sm">
                  No comments to display
                </td>
              </tr>
            ) : (
              currentComments.map((c, idx) => (
                <tr key={idx} className="border-b border-[#262837]/30 hover:bg-[#1f2130]/30 transition-colors">
                  <td className="py-3 px-2 w-10 text-center align-top">
                    <input type="checkbox" className="rounded border-gray-600 bg-[#1f2130]" />
                  </td>
                  <td className="py-3 px-4 align-top">
                    <div className="text-gray-300 text-sm mb-1">{c.text}</div>
                    <div className="text-gray-500 text-xs italic">Processed: {c.processed_text || 'None'}</div>
                  </td>
                  <td className="py-3 px-4 align-top">
                    <div className="flex flex-wrap gap-1">
                      {c.emotions.map((e: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 capitalize">
                          {e}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 align-top">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${c.emotion_model === 'Pure Hindi' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'} border`}>
                      {c.emotion_model}
                    </span>
                  </td>
                  <td className="py-3 px-4 align-top text-center">
                    {c.sarcasm_label === 1 ? (
                      <div className="flex items-center justify-center gap-1 text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2 py-0.5 rounded text-[10px] font-medium">
                        <AlertTriangle size={12} /> Yes
                      </div>
                    ) : (
                      <span className="text-gray-600 text-xs">No</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
        <div>Showing {comments.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–{Math.min(currentPage * itemsPerPage, comments.length)} of {comments.length} comments</div>
        <div className="flex items-center gap-1">
          <button 
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#262837] bg-[#1f2130] text-gray-400 hover:text-white disabled:opacity-50" 
            disabled={currentPage === 1 || comments.length === 0}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-gray-400 px-3">
            Page {currentPage} of {totalPages || 1}
          </span>
          <button 
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#262837] bg-[#1f2130] text-gray-400 hover:text-white disabled:opacity-50"
            disabled={currentPage === totalPages || comments.length === 0}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
