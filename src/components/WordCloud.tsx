import { useState, useRef } from 'react';
import type { MouseEvent } from 'react';

interface WordCloudProps {
  emotionDistribution?: Record<string, number>;
  comments?: any[];
}

export function WordCloud({ emotionDistribution = {}, comments = [] }: WordCloudProps) {
  const [mode, setMode] = useState<'emotions' | 'words'>('emotions');
  const hasEmotions = Object.keys(emotionDistribution).length > 0;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const getEmotionColor = (emotion: string) => {
    let hash = 0;
    for (let i = 0; i < emotion.length; i++) {
      hash = emotion.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 65%)`;
  };

  const onMouseDown = (e: MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setStartY(e.pageY - containerRef.current.offsetTop);
    setScrollLeft(containerRef.current.scrollLeft);
    setScrollTop(containerRef.current.scrollTop);
  };

  const onMouseLeave = () => {
    setIsDragging(false);
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const y = e.pageY - containerRef.current.offsetTop;
    const walkX = (x - startX) * 1.5; 
    const walkY = (y - startY) * 1.5;
    containerRef.current.scrollLeft = scrollLeft - walkX;
    containerRef.current.scrollTop = scrollTop - walkY;
  };

  const renderEmotions = () => {
    const maxVal = hasEmotions ? Math.max(...Object.values(emotionDistribution)) : 1;
    return Object.entries(emotionDistribution).map(([emotion, count], idx) => {
      const size = 14 + (count / maxVal) * 24;
      const opacity = 0.7 + (count / maxVal) * 0.3;

      return (
        <span
          key={idx}
          className="capitalize font-semibold m-2 inline-block select-none transition-transform hover:scale-110"
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
        if (w.length < 3) return; 
        if (!wordCounts[w]) {
          wordCounts[w] = { count: 0, emotion: primaryEmotion };
        }
        wordCounts[w].count += 1;
      });
    });
    
    const sortedWords = Object.entries(wordCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 50);
      
    if (sortedWords.length === 0) return <span className="text-gray-500 text-sm">No words to display</span>;

    const maxVal = sortedWords[0][1].count;

    return sortedWords.map(([word, data], idx) => {
      const size = 12 + (data.count / maxVal) * 20;
      const opacity = 0.7 + (data.count / maxVal) * 0.3;

      return (
        <span
          key={idx}
          className="font-medium m-2 inline-block select-none transition-transform hover:scale-110"
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
    <div className="bg-[#14151f]/80 backdrop-blur-xl rounded-xl border border-[#262837]/60 p-5 w-full h-full max-h-full flex flex-col shadow-lg overflow-hidden relative">
      <div className="flex justify-between items-center mb-4 shrink-0 z-10">
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
      
      {/* Draggable Container */}
      <div 
        ref={containerRef}
        className={`flex-1 overflow-hidden rounded-lg ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
      >
        {/* Inner surface that is larger than the container to allow 2D panning */}
        <div className="w-[600px] min-h-[300px] flex flex-wrap items-center justify-center content-center p-4">
          {mode === 'emotions' ? (hasEmotions ? renderEmotions() : <span className="text-gray-500 text-sm">No emotions to display</span>) : renderWords()}
        </div>
      </div>
    </div>
  );
}
