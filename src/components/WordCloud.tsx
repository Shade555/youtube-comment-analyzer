export function WordCloud() {
  return (
    <div className="bg-[#14151f]/80 backdrop-blur-xl rounded-xl border border-[#262837]/60 p-5 w-full h-full flex flex-col shadow-lg">
      <h3 className="text-white font-medium mb-4">Word Cloud</h3>
      <div className="flex-1 flex items-center justify-center">
        <span className="text-gray-500 text-sm">No words to display</span>
      </div>
    </div>
  );
}
