import { useState } from 'react';

interface WordCloudProps {
  emotionDistribution?: Record<string, number>;
  comments?: any[];
}

export function WordCloud({ emotionDistribution = {}, comments = [] }: WordCloudProps) {
  const [mode, setMode] = useState<'emotions' | 'words'>('emotions');
  const hasEmotions = Object.keys(emotionDistribution).length > 0;
  
  // Hash function for stable emotion colors
  const getEmotionColor = (emotion: string) => {
    let hash = 0;
    for (let i = 0; i < emotion.length; i++) {
      hash = emotion.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 65%)`;
  };

  const renderEmotions = () => {
    const maxVal = hasEmotions ? Math.max(...Object.values(emotionDistribution)) : 1;
    return Object.entries(emotionDistribution).map(([emotion, count], idx) => {
      const size = 14 + (count / maxVal) * 24;
      const opacity = 0.7 + (count / maxVal) * 0.3;

      return (
        <span
          key={idx}
          className="capitalize font-semibold m-1 cursor-grab active:cursor-grabbing inline-block transition-transform hover:scale-110"
          style={{ 
            fontSize: `${size}px`, 
            opacity,
            color: getEmotionColor(emotion)
          }}
          title={`${emotion}: ${count}`}
        >
          {emotion}
        </span>
      );
    });
  };

  const renderWords = () => {
    if (!comments || comments.length === 0) return <span className="text-gray-500 text-sm">No words to display</span>;
    
    const wordCounts: Record<string, { count: number, emotion: string }> = {};
    
    comments.forEach(c => {
      if (!c.processed_text) return;
      const words = c.processed_text.split(/\s+/);
      const primaryEmotion = c.emotions?.[0] || 'neutral';
      
      words.forEach((w: string) => {
        if (w.length < 3) return; // skip very short words
        if (!wordCounts[w]) {
          wordCounts[w] = { count: 0, emotion: primaryEmotion };
        }
        wordCounts[w].count += 1;
      });
    });
    
    const sortedWords = Object.entries(wordCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 50); // Top 50 words
      
    if (sortedWords.length === 0) return <span className="text-gray-500 text-sm">No words to display</span>;

    const maxVal = sortedWords[0][1].count;

    return sortedWords.map(([word, data], idx) => {
      const size = 12 + (data.count / maxVal) * 20;
      const opacity = 0.7 + (data.count / maxVal) * 0.3;

      return (
        <span
          key={idx}
          className="font-medium m-1 cursor-grab active:cursor-grabbing inline-block transition-transform hover:scale-110"
          style={{ 
            fontSize: `${size}px`, 
            opacity,
            color: getEmotionColor(data.emotion)
          }}
          title={`"${word}" (associated with ${data.emotion})`}
        >
          {word}
        </span>
      );
    });
  };

  return (
    <div className="bg-[#14151f]/80 backdrop-blur-xl rounded-xl border border-[#262837]/60 p-5 w-full h-full flex flex-col shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-medium">Cloud View</h3>
        <div className="flex bg-[#1f2130] rounded-lg p-1 border border-[#262837]/60">
          <button 
            onClick={() => setMode('emotions')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${mode === 'emotions' ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Emotions
          </button>
          <button 
            onClick={() => setMode('words')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${mode === 'words' ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Words
          </button>
        </div>
      </div>
      <div className="flex-1 flex flex-wrap items-center justify-center content-center gap-x-2 gap-y-1 overflow-y-auto custom-scrollbar p-2 max-h-[220px]">
        {mode === 'emotions' ? (hasEmotions ? renderEmotions() : <span className="text-gray-500 text-sm">No emotions to display</span>) : renderWords()}
      </div>
    </div>
  );
}
