import { CommentFilters } from "./CommentFilters";
import { CommentsTable } from "./CommentsTable";

interface CommentsSectionProps {
  comments?: any[];
}

export function CommentsSection({ comments = [] }: CommentsSectionProps) {
  return (
    <div className="bg-[#14151f]/80 backdrop-blur-xl rounded-xl border border-[#262837]/60 p-5 w-full flex flex-col gap-4 mt-6 shadow-lg">
      <h3 className="text-white font-medium text-lg">Comments</h3>
      <CommentFilters />
      <CommentsTable comments={comments} />
    </div>
  );
}
