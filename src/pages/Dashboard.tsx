import { useState } from "react";
import { YouTubeInput } from "../components/YouTubeInput";
import { VideoOverview } from "../components/VideoOverview";
import { KPISection } from "../components/KPISection";
import { SentimentDistribution } from "../components/SentimentDistribution";
import { WordCloud } from "../components/WordCloud";
import { CommentsSection } from "../components/CommentsSection";
import { api } from "../services/api";
import type { YouTubeAnalyzeResponse } from "../services/api";

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  // State for the API response
  const [analysisData, setAnalysisData] = useState<YouTubeAnalyzeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group emotions for the KPI section
  const getKPIStats = () => {
    if (!analysisData) return { positive: 0, negative: 0, neutral: 0, misc: 0, sarcasm: 0 };
    
    const posEmotions = ["Admiration", "Amusement", "Approval", "Caring", "Desire", "Excitement", "Gratitude", "Joy", "Love", "Optimism", "Pride", "Relief"];
    const negEmotions = ["Anger", "Annoyance", "Disappointment", "Disapproval", "Disgust", "Embarrassment", "Fear", "Grief", "Nervousness", "Remorse", "Sadness"];
    const neuEmotions = ["Neutral", "Realization"];
    
    let pos = 0, neg = 0, neu = 0, misc = 0;
    
    Object.entries(analysisData.emotion_distribution || {}).forEach(([emotion, count]) => {
      const e = emotion.charAt(0).toUpperCase() + emotion.slice(1);
      if (posEmotions.includes(e)) pos += count as number;
      else if (negEmotions.includes(e)) neg += count as number;
      else if (neuEmotions.includes(e)) neu += count as number;
      else misc += count as number;
    });

    return {
      positive: pos,
      negative: neg,
      neutral: neu,
      misc,
      sarcasm: Math.round((analysisData.sarcasm_rate / 100) * analysisData.analyzed_comments) || 0
    };
  };

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.analyzeYouTubeVideo(url);
      setAnalysisData(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze video. Make sure the backend is running.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const kpi = getKPIStats();

  return (
    <div className="w-full max-w-[1400px] mx-auto pb-10">
      <YouTubeInput 
        onLogout={onLogout} 
        onAnalyze={handleAnalyze} 
      />
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center p-12 mb-6 bg-[#14151f]/80 backdrop-blur-xl rounded-xl border border-[#262837]/60 shadow-lg">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-300">Fetching and analyzing comments using ML models...</p>
          </div>
        </div>
      )}
      
      {!isLoading && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mb-4">
            <div className="flex flex-col gap-4">
              <VideoOverview videoId={analysisData?.video_id} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:h-[250px]">
                <SentimentDistribution 
                  emotionDistribution={analysisData?.emotion_distribution}
                  totalComments={analysisData?.analyzed_comments}
                />
                <WordCloud 
                  emotionDistribution={analysisData?.emotion_distribution}
                />
              </div>
            </div>
            
            <div className="h-full">
              <KPISection 
                totalComments={analysisData?.total_comments}
                analyzedCount={analysisData?.analyzed_comments}
                positive={kpi.positive}
                neutral={kpi.neutral}
                negative={kpi.negative}
                misc={kpi.misc}
                sarcasm={kpi.sarcasm}
              />
            </div>
          </div>
          
          <CommentsSection comments={analysisData?.comments} />
        </>
      )}
    </div>
  );
}
