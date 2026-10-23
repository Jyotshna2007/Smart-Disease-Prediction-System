import React from 'react';
import { Activity, Heart, Wind, Brain, Shield, Sparkles } from 'lucide-react';

export const MedicalVisual: React.FC = () => {
  return (
    <div className="relative w-full max-w-[420px] aspect-square mx-auto flex items-center justify-center select-none pointer-events-none">
      {/* Background Soft Radiant Circles */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/10 via-cyan-400/15 to-transparent blur-3xl animate-pulse" />
      <div className="absolute w-72 h-72 rounded-full border border-blue-200/40 bg-white/30 backdrop-blur-sm shadow-xl shadow-blue-500/10" />
      <div className="absolute w-56 h-56 rounded-full border border-cyan-300/40 bg-cyan-50/40" />

      {/* Orbit Ring */}
      <div className="absolute w-80 h-80 rounded-full border border-dashed border-blue-200/60 animate-[spin_60s_linear_infinite]" />

      {/* Central Glowing Medical Sphere & Cross */}
      <div className="relative z-10 w-36 h-36 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 shadow-2xl shadow-blue-600/30 flex items-center justify-center p-3 border-2 border-white/60">
        {/* Soft grid overlay */}
        <div className="absolute inset-2 rounded-full border border-blue-300/30 flex items-center justify-center">
          <div className="w-full h-[1px] bg-blue-300/20" />
          <div className="absolute h-full w-[1px] bg-blue-300/20" />
        </div>

        {/* Crisp Cross */}
        <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-md">
          <defs>
            <linearGradient id="crossGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path
            d="M38 12 H62 V38 H88 V62 H62 V88 H38 V62 H12 V38 H38 Z"
            fill="url(#crossGrad)"
            rx="5"
            filter="url(#glow)"
          />
        </svg>

        {/* Pulse center dot */}
        <div className="absolute w-3 h-3 bg-white rounded-full animate-ping opacity-75" />
      </div>

      {/* Orbiting Organ Nodes */}
      {/* 1. Heart Node (Top Right) */}
      <div className="absolute -top-1 right-12 z-20 flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-white/95 border border-rose-100 shadow-lg shadow-rose-500/10 flex items-center justify-center text-rose-500 hover:scale-105 transition-transform">
          <Heart className="w-6 h-6 fill-rose-500/20 stroke-rose-600" />
        </div>
      </div>

      {/* 2. Brain / Neurological Node (Right Mid) */}
      <div className="absolute top-28 -right-2 z-20 flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-white/95 border border-indigo-100 shadow-lg shadow-indigo-500/10 flex items-center justify-center text-indigo-500 hover:scale-105 transition-transform">
          <Brain className="w-6 h-6 stroke-indigo-600" />
        </div>
      </div>

      {/* 3. Lungs / Respiratory Node (Left Top) */}
      <div className="absolute top-14 left-6 z-20 flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-white/95 border border-cyan-100 shadow-lg shadow-cyan-500/10 flex items-center justify-center text-cyan-600 hover:scale-105 transition-transform">
          <Wind className="w-6 h-6 stroke-cyan-600" />
        </div>
      </div>

      {/* 4. Stomach / Metabolic Node (Left Bottom) */}
      <div className="absolute bottom-12 left-4 z-20 flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-white/95 border border-amber-100 shadow-lg shadow-amber-500/10 flex items-center justify-center text-amber-600 hover:scale-105 transition-transform">
          <Activity className="w-6 h-6 stroke-amber-600" />
        </div>
      </div>

      {/* 5. Kidneys / Renal Filtration Node (Bottom Center-Left) */}
      <div className="absolute -bottom-2 left-28 z-20 flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-white/95 border border-teal-100 shadow-lg shadow-teal-500/10 flex items-center justify-center text-teal-600 hover:scale-105 transition-transform">
          <Shield className="w-6 h-6 stroke-teal-600 fill-teal-50" />
        </div>
      </div>

      {/* Subtle floating glow sparkles */}
      <div className="absolute top-1/4 right-1/4 text-cyan-400">
        <Sparkles className="w-4 h-4 animate-bounce" />
      </div>
      <div className="absolute bottom-1/3 left-1/4 text-blue-400">
        <Sparkles className="w-3 h-3 animate-pulse" />
      </div>
    </div>
  );
};
