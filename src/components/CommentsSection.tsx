import { useState, useMemo } from "react";
import { CommentFilters } from "./CommentFilters";
import { CommentsTable } from "./CommentsTable";

interface CommentsSectionProps {
  comments?: any[];
}

export function CommentsSection({ comments = [] }: CommentsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("Most Liked");

  const filteredComments = useMemo(() => {
    let result = [...comments];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        (c.text && c.text.toLowerCase().includes(q)) || 
        (c.processed_text && c.processed_text.toLowerCase().includes(q))
      );
    }

    // Sentiment filter
    if (sentimentFilter !== "All") {
      result = result.filter(c => {
        const primaryEmotion = (c.emotions?.[0] || "neutral").toLowerCase();
        return primaryEmotion === sentimentFilter.toLowerCase();
      });
    }

    // Sort
    if (sortOrder === "Most Liked") {
      result.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    } else if (sortOrder === "Newest") {
      result.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
    } else if (sortOrder === "Oldest") {
      result.sort((a, b) => new Date(a.publishedAt || 0).getTime() - new Date(b.publishedAt || 0).getTime());
    }

    return result;
  }, [comments, searchQuery, sentimentFilter, sortOrder]);

  return (
    <div className="bg-[#14151f]/80 backdrop-blur-xl rounded-xl border border-[#262837]/60 p-5 w-full flex flex-col gap-4 mt-6 shadow-lg">
      <h3 className="text-white font-medium text-lg">Comments</h3>
      <CommentFilters 
        comments={comments} 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sentimentFilter={sentimentFilter}
        setSentimentFilter={setSentimentFilter}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
      />
      <CommentsTable comments={filteredComments} />
    </div>
  );
}
