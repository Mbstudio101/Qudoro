import React, { useMemo, useState, useEffect, useRef } from 'react';
import { X, Minus, Square, Heart, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';

const CASH_TAG = '$Marveyy2x';
const CASH_URL = 'https://cash.app/$Marveyy2x';
// QR code via free public API — encodes the Cash App payment link
const QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(CASH_URL)}&margin=14&color=000000&bgcolor=ffffff`;

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
    { name: "Easter Sunday", date: new Date(currentYear, 3, 20), emoji: "🐰" },
    { name: "Earth Day", date: new Date(currentYear, 3, 22), emoji: "🌍" },
    { name: "Juneteenth", date: new Date(currentYear, 5, 19), emoji: "✊🏾" },
    { name: "Happy 4th of July", date: new Date(currentYear, 6, 4), emoji: "🇺🇸" },
    { name: "Indigenous Peoples' Day", date: new Date(currentYear, 9, 12), emoji: "🪶" },
    { name: "Happy Halloween", date: new Date(currentYear, 9, 31), emoji: "🎃" },
    { name: "Happy Thanksgiving", date: getThanksgiving(currentYear), emoji: "🦃" },
    { name: "Merry Christmas", date: new Date(currentYear, 11, 25), emoji: "🎄" },
    { name: "New Year's Eve", date: new Date(currentYear, 11, 31), emoji: "🎆" },
  ];

  const activeHoliday = holidays.find(h => h.date.getTime() === today.getTime());
  if (activeHoliday) {
    return { text: `Happy ${activeHoliday.name}! ${activeHoliday.emoji}  ✨`, isToday: true };
  }
  return { text: '', isToday: false };
};

const TitleBar = () => {
  const { text, isToday } = useMemo(() => getHolidayMessage(), []);
  const { accounts, currentAccountId } = useStore();

  const currentAccount = accounts.find(a => a.id === currentAccountId);
  const shouldShowTicker = currentAccount?.country === 'USA' || (!currentAccount && false);

  const [showDonation, setShowDonation] = useState(false);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!showDonation) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowDonation(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDonation]);

  const handleCopy = () => {
    navigator.clipboard.writeText(CASH_TAG).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <div className="h-10 bg-background flex justify-between items-center select-none border-b border-border relative" style={{ WebkitAppRegion: 'drag' } as any}>

      {/* Holiday Ticker */}
      <div className="flex-1 overflow-hidden flex items-center h-full max-w-[500px] mask-linear-fade">
        {text && shouldShowTicker && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: "-100%" }}
            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
            className={`whitespace-nowrap text-xs font-medium px-4 ${isToday ? 'text-primary' : 'text-muted-foreground/70'}`}
          >
            {text} • {text} • {text}
          </motion.div>
        )}
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <div className="flex h-full items-center z-10 bg-background pl-4" style={{ WebkitAppRegion: 'no-drag' } as any}>

        {/* Donate button + popover */}
        <div ref={popoverRef} className="relative h-full flex items-center mr-2">
          <button
            type="button"
            onClick={() => setShowDonation(prev => !prev)}
            className={`h-full px-4 flex items-center gap-2 text-sm font-medium transition-colors rounded-md ${
              showDonation
                ? 'text-emerald-500 bg-emerald-500/10'
                : 'text-emerald-500 hover:bg-emerald-500/10'
            }`}
          >
            <Heart size={16} className="fill-current" />
            <span>Donate</span>
          </button>

          <AnimatePresence>
            {showDonation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute top-full right-0 mt-2 w-72 rounded-2xl border border-border bg-background shadow-2xl shadow-black/20 overflow-hidden z-50"
              >
                {/* Header */}
                <div className="bg-emerald-500 px-5 py-4 text-white text-center">
                  <div className="flex items-center justify-center gap-2 mb-0.5">
                    <Heart size={15} className="fill-white" />
                    <span className="font-semibold text-sm tracking-wide">Support Qudoro</span>
                  </div>
                  <p className="text-emerald-100 text-xs">Your support keeps this app going 🙏</p>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center px-5 pt-5 pb-4 gap-4">
                  <div className="rounded-xl overflow-hidden border border-border/60 shadow-sm bg-white p-2">
                    <img
                      src={QR_URL}
                      alt="Cash App QR code"
                      width={196}
                      height={196}
                      className="block rounded-lg"
                      draggable={false}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
                    Open <span className="font-semibold text-foreground">Cash App</span>, tap the{' '}
                    <span className="font-semibold text-foreground">QR scanner</span>, and point it at the code above.
                  </p>

                  {/* Tag row */}
                  <div className="w-full flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5">
                    <span className="flex-1 font-mono font-semibold text-sm text-foreground tracking-wide">
                      {CASH_TAG}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      {copied ? (
                        <><Check size={13} className="text-emerald-500" /><span className="text-emerald-500">Copied</span></>
                      ) : (
                        <><Copy size={13} /><span>Copy</span></>
                      )}
                    </button>
                  </div>

                  {/* Open in browser fallback */}
                  <button
                    type="button"
                    onClick={() => { window.electron.openDonationWindow(); setShowDonation(false); }}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                  >
                    Open Cash App in browser instead
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-4 w-px bg-border mx-1" />

        <button
          onClick={() => window.electron?.minimize()}
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
