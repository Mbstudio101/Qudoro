import React from 'react';
import { Minus, Square, X } from 'lucide-react';

const AuthTitleBar = () => {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <div className="fixed top-0 left-0 right-0 h-10 flex justify-end items-center z-50" style={{ WebkitAppRegion: 'drag' } as any}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <div className="flex h-full items-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={() => window.electron?.minimize()}
          className="h-full px-5 hover:bg-secondary/50 flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
        >
          <Minus size={18} />
        </button>
        <button
          onClick={() => window.electron?.maximize()}
          className="h-full px-5 hover:bg-secondary/50 flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
        >
          <Square size={16} />
        </button>
        <button
          onClick={() => window.electron?.close()}
          className="h-full px-5 hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors text-muted-foreground"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default AuthTitleBar;
