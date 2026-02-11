import React from 'react';
import { X, Minus, Square, Heart } from 'lucide-react';

const TitleBar = () => {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <div className="h-10 bg-background flex justify-end items-center select-none border-b border-border" style={{ WebkitAppRegion: 'drag' } as any}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <div className="flex h-full items-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <a 
          href="https://cash.app/$marvensb" 
          target="_blank" 
          rel="noopener noreferrer"
          className="h-full px-4 flex items-center gap-2 text-sm font-medium text-emerald-500 hover:bg-emerald-500/10 transition-colors mr-2 rounded-md"
        >
          <Heart size={16} className="fill-current" />
          <span>Donate</span>
        </a>

        <div className="h-4 w-px bg-border mx-1"></div>

        <button
          onClick={() => window.electron.minimize()}
          className="h-full px-5 hover:bg-secondary flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
        >
          <Minus size={18} />
        </button>
        <button
          onClick={() => window.electron.maximize()}
          className="h-full px-5 hover:bg-secondary flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
        >
          <Square size={16} />
        </button>
        <button
          onClick={() => window.electron.close()}
          className="h-full px-5 hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors text-muted-foreground"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
