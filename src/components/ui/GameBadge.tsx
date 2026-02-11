import React from 'react';
import { LucideIcon, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface GameBadgeProps {
  icon: LucideIcon;
  xpReward: number;
  unlocked: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

type BadgeTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'legendary';

const getTier = (xp: number): BadgeTier => {
  if (xp < 50) return 'bronze';
  if (xp < 100) return 'silver';
  if (xp < 300) return 'gold';
  if (xp < 1000) return 'diamond';
  return 'legendary';
};

const TIER_CONFIG = {
  bronze: {
    colors: ['#8B4513', '#CD7F32', '#A0522D'],
    borderColor: '#5D4037',
    shadow: 'shadow-orange-900/50',
    shape: 'hexagon',
  },
  silver: {
    colors: ['#757575', '#E0E0E0', '#BDBDBD'],
    borderColor: '#616161',
    shadow: 'shadow-gray-500/50',
    shape: 'shield',
  },
  gold: {
    colors: ['#B8860B', '#FFD700', '#FDB931'],
    borderColor: '#8B6508',
    shadow: 'shadow-yellow-600/50',
    shape: 'star-shield',
  },
  diamond: {
    colors: ['#00CED1', '#E0FFFF', '#00BFFF'],
    borderColor: '#008B8B',
    shadow: 'shadow-cyan-500/50',
    shape: 'circle-ornate',
  },
  legendary: {
    colors: ['#800080', '#FF00FF', '#4B0082'],
    borderColor: '#4B0082',
    shadow: 'shadow-purple-600/50',
    shape: 'crown-star',
  }
};

const SIZES = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
};

const ICON_SIZES = {
  sm: 20,
  md: 28,
  lg: 40,
  xl: 52,
};

export const GameBadge = ({ icon: Icon, xpReward, unlocked, size = 'md', className = '' }: GameBadgeProps) => {
  const tier = getTier(xpReward);
  const config = TIER_CONFIG[tier];
  
  // Unique IDs for gradients to prevent conflicts
  const gradId = `grad-${tier}-${Math.random().toString(36).substr(2, 9)}`;
  const borderGradId = `border-${tier}-${Math.random().toString(36).substr(2, 9)}`;

  // SVG Paths for different shapes
  const renderShape = () => {
    switch (config.shape) {
      case 'hexagon':
        return (
          <path 
            d="M50 0 L93.3 25 V75 L50 100 L6.7 75 V25 Z" 
            fill={`url(#${gradId})`} 
            stroke={`url(#${borderGradId})`} 
            strokeWidth="4"
          />
        );
      case 'shield':
        return (
            <path 
              d="M50 0 C50 0 10 10 10 35 V55 C10 85 50 100 50 100 C50 100 90 85 90 55 V35 C90 10 50 0 50 0 Z" 
              fill={`url(#${gradId})`} 
              stroke={`url(#${borderGradId})`} 
              strokeWidth="4"
            />
        );
      case 'star-shield':
        return (
          <>
             {/* Background Wings/Rays */}
             <path d="M10 30 L50 50 L90 30 L80 80 L50 100 L20 80 Z" fill={config.borderColor} opacity="0.5" />
             {/* Main Shield */}
             <path 
               d="M50 5 L85 25 V60 C85 85 50 100 50 100 C50 100 15 85 15 60 V25 L50 5 Z" 
               fill={`url(#${gradId})`} 
               stroke={`url(#${borderGradId})`} 
               strokeWidth="3"
             />
          </>
        );
      case 'circle-ornate':
         return (
             <>
                <circle cx="50" cy="50" r="45" fill={config.borderColor} opacity="0.3" />
                <path d="M50 0 L60 10 L85 15 L90 40 L100 50 L90 60 L85 85 L60 90 L50 100 L40 90 L15 85 L10 60 L0 50 L10 40 L15 15 L40 10 Z" fill={`url(#${borderGradId})`} />
                <circle cx="50" cy="50" r="35" fill={`url(#${gradId})`} stroke="#fff" strokeWidth="2" />
             </>
         );
       case 'crown-star':
         return (
            <>
               <path d="M50 0 L65 35 L100 35 L75 60 L85 100 L50 75 L15 100 L25 60 L0 35 L35 35 Z" fill={config.borderColor} />
               <circle cx="50" cy="50" r="30" fill={`url(#${gradId})`} stroke="#fff" strokeWidth="2" />
            </>
         );
      default:
        return <circle cx="50" cy="50" r="45" fill={`url(#${gradId})`} />;
    }
  };

  return (
    <motion.div 
        className={`relative ${SIZES[size]} ${className} flex-shrink-0`}
        whileHover={unlocked ? { scale: 1.1, rotate: [0, -5, 5, 0] } : {}}
    >
      <svg viewBox="0 0 100 100" className={`w-full h-full drop-shadow-xl ${!unlocked ? 'grayscale opacity-70' : ''}`}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={config.colors[0]} />
            <stop offset="50%" stopColor={config.colors[1]} />
            <stop offset="100%" stopColor={config.colors[2]} />
          </linearGradient>
          <linearGradient id={borderGradId} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={config.colors[2]} />
            <stop offset="50%" stopColor={config.colors[1]} />
            <stop offset="100%" stopColor={config.colors[0]} />
          </linearGradient>
          
          {/* Inner Glow/Shine */}
          <radialGradient id={`shine-${gradId}`} cx="30%" cy="30%" r="50%">
             <stop offset="0%" stopColor="white" stopOpacity="0.4" />
             <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>

        {renderShape()}
        
        {/* Shine Overlay */}
        <path 
            d="M50 10 C50 10 80 10 80 40 C80 40 50 30 50 30 C50 30 20 40 20 40 C20 10 50 10 50 10 Z" 
            fill="white" 
            opacity="0.2"
        />
      </svg>

      {/* Icon Container */}
      <div className="absolute inset-0 flex items-center justify-center text-white drop-shadow-md">
        {unlocked ? (
            <Icon size={ICON_SIZES[size]} className="drop-shadow-lg" />
        ) : (
            <Lock size={ICON_SIZES[size] * 0.8} className="opacity-50" />
        )}
      </div>
      
      {/* Tier Label (Optional - purely decorative dots) */}
      {unlocked && (
        <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
             {Array.from({ length: ['bronze', 'silver', 'gold', 'diamond', 'legendary'].indexOf(tier) + 1 }).map((_, i) => (
                 <div key={i} className="w-1 h-1 rounded-full bg-white/70 shadow-sm" />
             ))}
        </div>
      )}
    </motion.div>
  );
};
