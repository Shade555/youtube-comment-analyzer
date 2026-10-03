import { CommentFilters } from "./CommentFilters";
import { CommentsTable } from "./CommentsTable";
import { Download } from "lucide-react";

interface CommentsSectionProps {
  comments?: any[];
}

export function CommentsSection({ comments = [] }: CommentsSectionProps) {
  
  const handleDownloadCSV = () => {
    if (!comments || comments.length === 0) return;
    
    const headers = ["Text", "Processed Text", "Emotion Model", "Primary Emotion"];
    const csvRows = [headers.join(",")];
    
    comments.forEach(c => {
      // Escape quotes and wrap in quotes for CSV safety
      const text = `"${(c.text || "").replace(/"/g, '""')}"`;
      const processed = `"${(c.processed_text || "").replace(/"/g, '""')}"`;
      const model = `"${c.emotion_model || ""}"`;
      const emotion = `"${c.emotions && c.emotions.length > 0 ? c.emotions[0] : ""}"`;
      
      csvRows.push([text, processed, model, emotion].join(","));
    });
    
    // Create blob to properly handle UTF-8 chars (Devanagari)
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
    <div className="bg-[#14151f]/80 backdrop-blur-xl rounded-xl border border-[#262837]/60 p-5 w-full flex flex-col gap-4 mt-6 shadow-lg">
      <div className="flex justify-between items-center">
        <h3 className="text-white font-medium text-lg">Comments</h3>
        <button 
          onClick={handleDownloadCSV}
          disabled={comments.length === 0}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>
      <CommentFilters />
      <CommentsTable comments={comments} />
    </div>
  );
}
