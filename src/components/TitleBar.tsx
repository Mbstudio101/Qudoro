import React, { useMemo } from 'react';
import { X, Minus, Square, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

const getThanksgiving = (year: number) => {
  const nov1 = new Date(year, 10, 1);
  const day = nov1.getDay();
  const diff = (4 - day + 7) % 7;
  return new Date(year, 10, 1 + diff + 21);
};

const getMLKDay = (year: number) => {
  const jan1 = new Date(year, 0, 1);
  const day = jan1.getDay();
  const diff = (1 - day + 7) % 7;
  return new Date(year, 0, 1 + diff + 14);
};

const getHolidayMessage = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();
  
  const holidays = [
    { name: "Happy New Year's", date: new Date(currentYear, 0, 1), emoji: "🎉" },
    { name: "Martin Luther King Jr. Day", date: getMLKDay(currentYear), emoji: "👨🏿" },
    { name: "Valentine's Day", date: new Date(currentYear, 1, 14), emoji: "❤️" },
    { name: "St. Patrick's Day", date: new Date(currentYear, 2, 17), emoji: "🍀" },
    { name: "Easter Sunday", date: new Date(currentYear, 3, 20), emoji: "🐰" }, // Approximation for 2025
    { name: "Earth Day", date: new Date(currentYear, 3, 22), emoji: "🌍" },
    { name: "Juneteenth", date: new Date(currentYear, 5, 19), emoji: "✊🏾" },
    { name: "Happy 4th of July", date: new Date(currentYear, 6, 4), emoji: "🇺🇸" },
    { name: "Indigenous Peoples' Day", date: new Date(currentYear, 9, 12), emoji: "🪶" },
    { name: "Happy Halloween", date: new Date(currentYear, 9, 31), emoji: "🎃" },
    { name: "Happy Thanksgiving", date: getThanksgiving(currentYear), emoji: "🦃" },
    { name: "Merry Christmas", date: new Date(currentYear, 11, 25), emoji: "🎄" },
    { name: "New Year's Eve", date: new Date(currentYear, 11, 31), emoji: "🎆" },
  ];

  // Check for today
  const activeHoliday = holidays.find(h => h.date.getTime() === today.getTime());
  
  if (activeHoliday) {
      return { text: `Happy ${activeHoliday.name}! ${activeHoliday.emoji}  ✨`, isToday: true };
  }

  return { text: '', isToday: false };
};

const TitleBar = () => {
  const { text, isToday } = useMemo(() => getHolidayMessage(), []);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <div className="h-10 bg-background flex justify-between items-center select-none border-b border-border overflow-hidden" style={{ WebkitAppRegion: 'drag' } as any}>
      
      {/* Holiday Ticker */}
      <div className="flex-1 overflow-hidden flex items-center h-full max-w-[500px] mask-linear-fade">
         {text && (
             <motion.div 
                initial={{ x: "100%" }}
                animate={{ x: "-100%" }}
                transition={{ 
                    repeat: Infinity, 
                    duration: 20, 
                    ease: "linear" 
                }}
                className={`whitespace-nowrap text-xs font-medium px-4 ${isToday ? 'text-primary' : 'text-muted-foreground/70'}`}
             >
                {text} • {text} • {text}
             </motion.div>
         )}
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <div className="flex h-full items-center z-10 bg-background pl-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
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
