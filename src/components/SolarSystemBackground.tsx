import React from 'react';

export const SolarSystemBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* Deep cosmic warm mahogany gradient base */}
      <div className="absolute inset-0 bg-radial from-[#2a170f] via-[#1a0e08] to-[#120804] opacity-95" />

      {/* Subtle papercut craft texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(#D4AF37 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Celestial Solar System Papercut Scene - Offset to top right / corner so it frames the content beautifully */}
      <div className="absolute -top-32 -right-32 w-[900px] h-[900px] opacity-40">
        {/* Sun at the focal point */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full bg-gradient-to-tr from-[#B45309] via-[#D97706] to-[#FDE68A] shadow-[0_0_60px_rgba(245,158,11,0.25)] flex items-center justify-center">
          <div className="w-28 h-28 rounded-full border border-amber-300/40 bg-amber-500/20" />
        </div>

        {/* Orbit 1: Mercury */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] rounded-full border border-amber-700/25 border-dashed animate-[spin_120s_linear_infinite]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#A88B74] border border-[#F3E8DF]/40 shadow-sm" />
        </div>

        {/* Orbit 2: Venus */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full border border-amber-700/20 animate-[spin_180s_linear_infinite_reverse]">
          <div className="absolute top-1/4 right-0 w-6 h-6 rounded-full bg-[#E5B869] border border-amber-200/50 shadow-sm" />
        </div>

        {/* Orbit 3: Earth & Moon */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[440px] rounded-full border border-amber-700/25 border-dashed animate-[spin_240s_linear_infinite]">
          <div className="absolute bottom-4 left-1/4 w-7 h-7 rounded-full bg-[#60A5FA] border border-blue-200/50 shadow-md flex items-center justify-center">
            {/* Moon orbit */}
            <div className="w-2 h-2 rounded-full bg-[#F5F5F4] -translate-x-4 -translate-y-3" />
          </div>
        </div>

        {/* Orbit 4: Mars */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full border border-red-900/25 animate-[spin_320s_linear_infinite]">
          <div className="absolute top-10 left-1/3 w-5 h-5 rounded-full bg-[#DC2626] border border-red-300/40 shadow-sm" />
        </div>

        {/* Orbit 5: Jupiter */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full border border-amber-800/20 border-dashed animate-[spin_480s_linear_infinite_reverse]">
          <div className="absolute bottom-16 right-1/4 w-12 h-12 rounded-full bg-gradient-to-br from-[#D97706] to-[#78350F] border border-amber-400/40 shadow-md overflow-hidden">
            <div className="w-full h-1 bg-amber-900/40 my-1" />
            <div className="w-full h-1.5 bg-amber-200/20 my-1" />
          </div>
        </div>

        {/* Orbit 6: Saturn with Paper Rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[880px] h-[880px] rounded-full border border-amber-900/15 animate-[spin_600s_linear_infinite]">
          <div className="absolute top-1/3 left-4 flex items-center justify-center">
            <div className="w-9 h-9 rounded-full bg-[#D4AF37] border border-amber-200/50 shadow-md relative">
              {/* Saturn ring */}
              <div className="absolute -inset-x-4 top-1/2 -translate-y-1/2 h-2 rounded-full border border-amber-300/60 rotate-[-25deg]" />
            </div>
          </div>
        </div>
      </div>

      {/* Twinkling Stars scattered across screen */}
      <div className="absolute inset-0">
        {[
          { top: '8%', left: '12%', size: 'w-1.5 h-1.5', delay: '0s', dur: '3s' },
          { top: '15%', left: '45%', size: 'w-2 h-2', delay: '1s', dur: '4s' },
          { top: '22%', left: '78%', size: 'w-1 h-1', delay: '2s', dur: '3.5s' },
          { top: '35%', left: '20%', size: 'w-2.5 h-2.5', delay: '0.5s', dur: '5s' },
          { top: '48%', left: '85%', size: 'w-1.5 h-1.5', delay: '1.5s', dur: '4.5s' },
          { top: '65%', left: '8%', size: 'w-2 h-2', delay: '2.5s', dur: '3.2s' },
          { top: '75%', left: '35%', size: 'w-1 h-1', delay: '1.2s', dur: '4s' },
          { top: '82%', left: '60%', size: 'w-2 h-2', delay: '0.8s', dur: '5.2s' },
          { top: '90%', left: '88%', size: 'w-1.5 h-1.5', delay: '2.2s', dur: '3.8s' },
          { top: '55%', left: '50%', size: 'w-1.5 h-1.5', delay: '1.8s', dur: '4.2s' },
        ].map((star, idx) => (
          <div
            key={idx}
            className={`absolute ${star.size} rounded-full bg-amber-100 shadow-[0_0_8px_rgba(253,230,138,0.7)]`}
            style={{
              top: star.top,
              left: star.left,
              animation: `pulse ${star.dur} cubic-bezier(0.4, 0, 0.6, 1) infinite`,
              animationDelay: star.delay,
            }}
          />
        ))}
      </div>
    </div>
  );
};
