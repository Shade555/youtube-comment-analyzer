import { useState } from "react";
// @ts-ignore
import MoltenMetal from "../components/MoltenMetal";
import { AuthCard } from "../components/AuthCard";
import { useAuth } from "../context/AuthContext";

interface LandingProps {
  onEnterApp: () => void;
}

export function Landing({ onEnterApp }: LandingProps) {
  const [showAuth, setShowAuth] = useState(false);
  const { continueAsGuest } = useAuth();

  return (
    <div className="relative w-full h-screen bg-[#0f1016] overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 z-0">
        <MoltenMetal
          color1="#5227FF"
          color2="#FF9FFC"
          color3="#FFFFFF"
          speed={0.35}
          scale={4}
          detail={3}
          glow={1.6}
          coreSize={0.1}
          swirl={1}
          fold={-0.2}
          blackPoint={0.05}
          brightness={1.3}
          colorMode="molten"
          grain={true}
          grainIntensity={0.05}
          mouseInteraction={true}
          mouseStrength={0.3}
          opacity={1.0}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-10 max-w-4xl leading-tight">
          YouTube Comment Analyzer
        </h1>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => {
              continueAsGuest();
              onEnterApp();
            }}
            className="px-8 py-3.5 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
          >
            Guest Mode
          </button>
          <button 
            onClick={() => setShowAuth(true)}
            className="px-8 py-3.5 bg-[rgba(255,255,255,0.05)] backdrop-blur-md text-white font-semibold rounded-xl border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] transition-colors shadow-lg"
          >
            Sign up/Log in
          </button>
        </div>
      </div>

      {/* Auth Modal Overlay */}
      {showAuth && (
        <AuthCard 
          onClose={() => setShowAuth(false)} 
          onLogin={() => onEnterApp()} 
        />
      )}
    </div>
  );
}
