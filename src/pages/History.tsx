import { useEffect, useState } from 'react';
import { Clock, Trash2, ArrowLeft, ExternalLink } from 'lucide-react';
import { historyStore } from '../services/historyStore';
import type { AnalysisSummary, AnalysisDetail } from '../services/api';
import { VideoOverview } from '../components/VideoOverview';
import { KPISection } from '../components/KPISection';
import { SentimentDistribution } from '../components/SentimentDistribution';
import { WordCloud } from '../components/WordCloud';
import { CommentsSection } from '../components/CommentsSection';
import { useAuth } from '../context/AuthContext';

interface HistoryProps {
  onLogout?: () => void;
}

export function History({ onLogout }: HistoryProps) {
  const { user, isGuest } = useAuth();
  const [items, setItems] = useState<AnalysisSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AnalysisDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await historyStore.list();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadHistory();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const openAnalysis = async (id: string) => {
    setIsLoadingDetail(true);
    setError(null);
    try {
      const detail = await historyStore.get(id);
      setSelected(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analysis.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const deleteAnalysis = async (id: string) => {
    try {
      await historyStore.remove(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete analysis.');
    }
  };

  const getKPIStats = (data: AnalysisDetail) => {
    const posEmotions = ["Admiration", "Amusement", "Approval", "Caring", "Desire", "Excitement", "Gratitude", "Joy", "Love", "Optimism", "Pride", "Relief"];
    const negEmotions = ["Anger", "Annoyance", "Disappointment", "Disapproval", "Disgust", "Embarrassment", "Fear", "Grief", "Nervousness", "Remorse", "Sadness"];
    const neuEmotions = ["Neutral", "Realization"];
    let pos = 0, neg = 0, neu = 0, misc = 0;
    Object.entries(data.emotion_distribution || {}).forEach(([emotion, count]) => {
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
      sarcasm: Math.round((data.sarcasm_rate / 100) * data.analyzed_comments) || 0,
    };
  };

  // -------------------------------------------------------------------------
  // Detail view (reproduces a saved analysis without re-calling YouTube)
  // -------------------------------------------------------------------------
  if (selected) {
    const kpi = getKPIStats(selected);
    return (
      <div className="w-full max-w-[1400px] mx-auto pb-10">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-sm text-gray-300 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Back to History
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mb-4">
          <div className="flex flex-col gap-4">
            <VideoOverview videoId={selected.video_id} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:h-[250px]">
              <SentimentDistribution
                emotionDistribution={selected.emotion_distribution}
                totalComments={selected.analyzed_comments}
              />
              <WordCloud emotionDistribution={selected.emotion_distribution} />
            </div>
          </div>
          <div className="h-full">
            <KPISection
              totalComments={selected.total_comments}
              analyzedCount={selected.analyzed_comments}
              positive={kpi.positive}
              neutral={kpi.neutral}
              negative={kpi.negative}
              misc={kpi.misc}
              sarcasm={kpi.sarcasm}
            />
          </div>
        </div>

        <CommentsSection comments={selected.comments} />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // List view
  // -------------------------------------------------------------------------
  return (
    <div className="w-full max-w-[1400px] mx-auto pb-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Analysis History</h1>
        {onLogout && (
          <button
            onClick={onLogout}
            className="px-3 py-1.5 border border-red-500 text-red-500 bg-[#0f1016] hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors"
          >
            Log out
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {isGuest && (
        <div className="bg-[#14151f]/80 backdrop-blur-xl rounded-xl border border-[#262837]/60 p-8 text-center shadow-lg">
          <p className="text-gray-400">
            You are in Guest Mode. Log in to save and view your analysis history.
          </p>
        </div>
      )}

      {!isGuest && isLoading && (
        <div className="flex items-center justify-center p-12 bg-[#14151f]/80 backdrop-blur-xl rounded-xl border border-[#262837]/60 shadow-lg">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {!isGuest && !isLoading && items.length === 0 && (
        <div className="bg-[#14151f]/80 backdrop-blur-xl rounded-xl border border-[#262837]/60 p-8 text-center shadow-lg">
          <p className="text-gray-500">No history available yet.</p>
        </div>
      )}

      {!isGuest && !isLoading && items.length > 0 && (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-[#14151f]/80 backdrop-blur-xl rounded-xl border border-[#262837]/60 p-4 flex flex-col sm:flex-row gap-4 shadow-lg"
            >
              <div
                className="relative w-full sm:w-48 h-32 sm:h-28 bg-[#1f2130] rounded-lg overflow-hidden flex shrink-0 items-center justify-center bg-cover bg-center"
                style={
                  item.video_id
                    ? { backgroundImage: `url(https://img.youtube.com/vi/${item.video_id}/hqdefault.jpg)` }
                    : {}
                }
              />
              <div className="flex flex-col justify-between flex-1">
                <div>
                  <h2 className="text-lg font-medium text-white mb-1">
                    {item.video_title || `Video (ID: ${item.video_id})`}
                  </h2>
                  <a
                    href={item.video_url || `https://www.youtube.com/watch?v=${item.video_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mb-2"
                  >
                    {item.video_url || `https://www.youtube.com/watch?v=${item.video_id}`}
                    <ExternalLink size={12} />
                  </a>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                    <span>{item.analyzed_comments.toLocaleString()} comments analyzed</span>
                    <span>{item.sarcasm_rate}% sarcasm</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => openAnalysis(item.id)}
                    disabled={isLoadingDetail}
                    className="px-4 py-1.5 bg-[#2a2d40] hover:bg-[#343851] border border-[#3b405a] text-white rounded-lg text-sm transition-colors disabled:opacity-60"
                  >
                    View Analysis
                  </button>
                  <button
                    onClick={() => deleteAnalysis(item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}