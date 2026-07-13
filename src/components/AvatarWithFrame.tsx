import React from 'react';

interface AvatarWithFrameProps {
  avatarId: string;
  avatarUrl?: string;
  frameId?: string;
  sizeClassName?: string;
}

export const AvatarWithFrame: React.FC<AvatarWithFrameProps> = ({
  avatarId,
  avatarUrl,
  frameId = 'frame_none',
  sizeClassName = 'w-16 h-16 text-3xl'
}) => {
  const emoji = 
    avatarId === 'avatar_classic' 
      ? '🎩' 
      : avatarId === 'avatar_skater' 
      ? '🛹' 
      : avatarId === 'avatar_neon' 
      ? '🌌' 
      : avatarId === 'avatar_golden'
      ? '👑'
      : '🎩';
  
  // Custom frame styles
  let frameClass = 'border border-white/10';
  let glowStyle: React.CSSProperties = {};
  
  if (frameId === 'frame_neon') {
    frameClass = 'border-[3px] border-pink-500 animate-pulse';
    glowStyle = { 
      boxShadow: '0 0 15px #ec4899, inset 0 0 10px #ec4899'
    };
  } else if (frameId === 'frame_gold') {
    frameClass = 'border-[3px] border-amber-400 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600';
    glowStyle = { 
      boxShadow: '0 0 15px #fbbf24, inset 0 0 10px #d97706'
    };
  } else if (frameId === 'frame_fire') {
    frameClass = 'border-[3px] border-red-500 animate-pulse bg-gradient-to-r from-red-600 via-orange-500 to-red-600';
    glowStyle = { 
      boxShadow: '0 0 18px #ef4444, inset 0 0 10px #f97316'
    };
  } else if (frameId === 'frame_royal') {
    frameClass = 'border-[3px] border-cyan-400 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600';
    glowStyle = { 
      boxShadow: '0 0 15px #22d3ee, inset 0 0 10px #3b82f6'
    };
  }
  
  return (
    <div 
      id={`avatar-frame-${frameId}`}
      className={`${sizeClassName} rounded-full flex items-center justify-center font-bold text-white shadow-xl relative transition-all duration-300 p-0.5 overflow-hidden ${frameClass}`}
      style={glowStyle}
    >
      <div className="w-full h-full rounded-full bg-slate-900/95 flex items-center justify-center overflow-hidden">
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt="Avatar" 
            className="w-full h-full object-cover rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="select-none scale-110">{emoji}</span>
        )}
      </div>
    </div>
  );
};
