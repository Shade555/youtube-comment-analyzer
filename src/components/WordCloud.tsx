interface WordCloudProps {
  emotionDistribution?: Record<string, number>;
}

export function WordCloud({ emotionDistribution = {} }: WordCloudProps) {
  const hasData = Object.keys(emotionDistribution).length > 0;
  
  // Find max value for scaling
  const maxVal = hasData ? Math.max(...Object.values(emotionDistribution)) : 1;

  // Render words with sizes relative to frequency
  const renderWords = () => {
    return Object.entries(emotionDistribution).map(([emotion, count], idx) => {
      // Scale font size between 14px and 32px based on frequency
      const size = 14 + (count / maxVal) * 18;
      
      // Randomly assign slight opacity variations to make it look like a cloud
      const opacity = 0.7 + (count / maxVal) * 0.3;

      return (
        <span
          key={idx}
          className="capitalize font-semibold m-1 inline-block transition-transform hover:scale-110"
          style={{ 
            fontSize: `${size}px`, 
            opacity,
            color: `hsl(${(idx * 137.5) % 360}, 70%, 65%)` // generate distinct colors
          }}
          title={`${emotion}: ${count}`}
        >
          {emotion}
        </span>
      );
    });
  };

  return (
    <div className="bg-[#14151f]/80 backdrop-blur-xl rounded-xl border border-[#262837]/60 p-5 w-full h-full flex flex-col shadow-lg">
      <h3 className="text-white font-medium mb-4">Emotion Cloud</h3>
      <div className="flex-1 flex flex-wrap items-center justify-center content-center gap-x-2 gap-y-1 overflow-hidden p-2">
        {hasData ? renderWords() : (
          <span className="text-gray-500 text-sm">No emotions to display</span>
        )}
      </div>
    </div>
  );
}
