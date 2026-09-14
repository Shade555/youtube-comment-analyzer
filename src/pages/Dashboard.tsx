import { YouTubeInput } from "../components/YouTubeInput";
import { VideoOverview } from "../components/VideoOverview";
import { KPISection } from "../components/KPISection";
import { SentimentDistribution } from "../components/SentimentDistribution";
import { WordCloud } from "../components/WordCloud";
import { CommentsSection } from "../components/CommentsSection";

export function Dashboard() {
  return (
    <div className="w-full max-w-[1400px] mx-auto pb-10">
      <YouTubeInput />
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mb-4">
        <div className="flex flex-col gap-4">
          <VideoOverview />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:h-[250px]">
            <SentimentDistribution />
            <WordCloud />
          </div>
        </div>
        
        <div className="h-full">
          <KPISection />
        </div>
      </div>
      
      <CommentsSection />
    </div>
  );
}
