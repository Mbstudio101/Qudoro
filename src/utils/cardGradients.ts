export type CardGradientOption = {
  id: string;
  label: string;
  classes: string;
};

export const CARD_GRADIENT_OPTIONS: CardGradientOption[] = [
  {
    id: 'default',
    label: 'Default',
    classes: 'border-border/50 bg-card/50',
  },
  {
    id: 'ocean',
    label: 'Ocean Blue',
    classes:
      'border-cyan-300/60 bg-linear-to-br from-cyan-200/85 via-sky-200/80 to-indigo-200/85 dark:border-cyan-400/35 dark:from-cyan-500/16 dark:via-sky-500/12 dark:to-indigo-500/18',
  },
  {
    id: 'sunset',
    label: 'Sunset Orange',
    classes:
      'border-orange-300/60 bg-linear-to-br from-amber-200/85 via-orange-200/80 to-rose-200/85 dark:border-orange-400/35 dark:from-amber-500/16 dark:via-orange-500/12 dark:to-rose-500/18',
  },
  {
    id: 'mint',
    label: 'Mint Green',
    classes:
      'border-emerald-300/60 bg-linear-to-br from-emerald-200/85 via-green-200/80 to-teal-200/85 dark:border-emerald-400/35 dark:from-emerald-500/16 dark:via-green-500/12 dark:to-teal-500/18',
  },
  {
    id: 'midnight',
    label: 'Midnight Navy',
    classes:
      'border-slate-400/55 bg-linear-to-br from-slate-200/88 via-blue-200/78 to-zinc-300/88 dark:border-slate-500/35 dark:from-slate-700/30 dark:via-blue-900/28 dark:to-zinc-800/34',
  },
  {
    id: 'lavender',
    label: 'Lavender',
    classes:
      'border-violet-300/60 bg-linear-to-br from-violet-200/88 via-blue-200/82 to-cyan-200/88 dark:border-violet-400/35 dark:from-violet-500/16 dark:via-blue-500/12 dark:to-cyan-500/16',
  },
  {
    id: 'peach',
    label: 'Peach Glow',
    classes:
      'border-orange-300/60 bg-linear-to-br from-orange-100/92 via-pink-100/86 to-purple-100/92 dark:border-orange-400/35 dark:from-orange-500/14 dark:via-pink-500/11 dark:to-purple-500/15',
  },
  {
    id: 'aurora',
    label: 'Aurora',
    classes:
      'border-teal-300/60 bg-linear-to-br from-teal-100/92 via-lime-100/86 to-yellow-100/92 dark:border-teal-400/35 dark:from-teal-500/14 dark:via-lime-500/11 dark:to-yellow-500/15',
  },
  {
    id: 'royal',
    label: 'Royal Plum',
    classes:
      'border-fuchsia-300/60 bg-linear-to-br from-purple-100/92 via-fuchsia-100/86 to-rose-100/92 dark:border-fuchsia-400/35 dark:from-purple-500/14 dark:via-fuchsia-500/11 dark:to-rose-500/15',
  },
  {
    id: 'ruby',
    label: 'Ruby Wine',
    classes:
      'border-red-300/60 bg-linear-to-br from-red-100/92 via-rose-100/86 to-violet-100/92 dark:border-red-400/35 dark:from-red-600/16 dark:via-rose-600/12 dark:to-violet-600/16',
  },
  {
    id: 'sand',
    label: 'Sand Gold',
    classes:
      'border-amber-300/60 bg-linear-to-br from-yellow-100/92 via-lime-100/86 to-emerald-100/92 dark:border-amber-400/35 dark:from-yellow-500/14 dark:via-lime-500/11 dark:to-emerald-500/15',
  },
  {
    id: 'neon-dreams',
    label: 'Neon Dreams',
    classes:
      'border-fuchsia-400/70 bg-linear-to-br from-fuchsia-200/90 via-violet-200/85 to-cyan-200/90 dark:border-fuchsia-500/50 dark:from-fuchsia-600/22 dark:via-violet-600/18 dark:to-cyan-500/22',
  },
  {
    id: 'holo',
    label: 'Holographic',
    classes:
      'border-pink-300/60 bg-linear-to-135deg from-pink-200/88 via-violet-200/82 via-cyan-200/82 to-lime-200/88 dark:border-pink-400/40 dark:from-pink-500/18 dark:via-violet-500/14 dark:via-cyan-500/14 dark:to-lime-500/18',
  },
  {
    id: 'galaxy',
    label: 'Galaxy',
    classes:
      'border-indigo-400/70 bg-linear-to-br from-indigo-300/88 via-purple-300/82 to-fuchsia-300/88 dark:border-indigo-500/50 dark:from-indigo-700/32 dark:via-purple-700/28 dark:to-fuchsia-700/32',
  },
  {
    id: 'fire',
    label: 'Fire',
    classes:
      'border-red-400/70 bg-linear-to-br from-yellow-200/90 via-orange-300/85 to-red-300/90 dark:border-red-500/50 dark:from-yellow-500/20 dark:via-orange-600/18 dark:to-red-600/22',
  },
  {
    id: 'ice',
    label: 'Arctic Ice',
    classes:
      'border-cyan-300/70 bg-linear-to-br from-white/95 via-cyan-100/88 to-blue-200/90 dark:border-cyan-400/45 dark:from-cyan-300/12 dark:via-blue-300/10 dark:to-indigo-400/16',
  },
  {
    id: 'cotton-candy',
    label: 'Cotton Candy',
    classes:
      'border-pink-300/65 bg-linear-to-br from-pink-200/90 via-purple-100/85 to-blue-200/90 dark:border-pink-400/40 dark:from-pink-500/18 dark:via-purple-400/14 dark:to-blue-500/18',
  },
  {
    id: 'gold',
    label: 'Liquid Gold',
    classes:
      'border-yellow-400/70 bg-linear-to-br from-yellow-200/92 via-amber-300/86 to-orange-200/92 dark:border-yellow-500/50 dark:from-yellow-500/20 dark:via-amber-500/16 dark:to-orange-500/20',
  },
  {
    id: 'forest',
    label: 'Deep Forest',
    classes:
      'border-green-400/65 bg-linear-to-br from-lime-200/90 via-emerald-200/84 to-teal-300/90 dark:border-green-500/45 dark:from-lime-600/18 dark:via-emerald-600/15 dark:to-teal-600/20',
  },
  {
    id: 'northern-lights',
    label: 'Northern Lights',
    classes:
      'border-teal-300/65 bg-linear-to-br from-teal-200/88 via-green-200/82 to-violet-200/88 dark:border-teal-400/45 dark:from-teal-500/20 dark:via-green-500/14 dark:to-violet-600/22',
  },
  {
    id: 'rose-gold',
    label: 'Rose Gold',
    classes:
      'border-pink-300/65 bg-linear-to-br from-rose-200/90 via-pink-200/84 to-amber-200/90 dark:border-pink-400/42 dark:from-rose-500/18 dark:via-pink-500/14 dark:to-amber-500/18',
  },
  {
    id: 'toxic',
    label: 'Toxic Lime',
    classes:
      'border-lime-400/70 bg-linear-to-br from-lime-200/90 via-yellow-200/84 to-green-200/90 dark:border-lime-500/50 dark:from-lime-500/22 dark:via-yellow-500/16 dark:to-green-600/22',
  },
  {
    id: 'obsidian',
    label: 'Obsidian',
    classes:
      'border-zinc-500/60 bg-linear-to-br from-zinc-300/88 via-slate-300/82 to-neutral-300/88 dark:border-zinc-500/55 dark:from-zinc-800/50 dark:via-slate-800/45 dark:to-neutral-800/50',
  },
  {
    id: 'miami',
    label: 'Miami Vice',
    classes:
      'border-teal-400/70 bg-linear-to-br from-teal-200/90 via-pink-200/86 to-fuchsia-200/90 dark:border-teal-500/50 dark:from-teal-600/24 dark:via-pink-600/20 dark:to-fuchsia-600/24',
  },
  {
    id: 'candy',
    label: 'Bubblegum',
    classes:
      'border-pink-400/70 bg-linear-to-br from-pink-300/90 via-rose-200/85 to-fuchsia-300/90 dark:border-pink-500/55 dark:from-pink-600/26 dark:via-rose-500/20 dark:to-fuchsia-600/26',
  },
  {
    id: 'infrared',
    label: 'Infrared',
    classes:
      'border-rose-500/70 bg-linear-to-br from-yellow-300/90 via-red-300/86 to-fuchsia-300/90 dark:border-rose-600/55 dark:from-yellow-600/24 dark:via-red-700/30 dark:to-fuchsia-700/26',
  },
  {
    id: 'chrome',
    label: 'Chrome',
    classes:
      'border-slate-400/65 bg-linear-to-br from-white/96 via-slate-200/88 to-blue-200/90 dark:border-slate-400/50 dark:from-slate-300/14 dark:via-slate-500/18 dark:to-blue-400/14',
  },
  {
    id: 'acid',
    label: 'Acid Rain',
    classes:
      'border-lime-500/72 bg-linear-to-br from-lime-300/90 via-cyan-300/85 to-violet-300/88 dark:border-lime-600/55 dark:from-lime-600/26 dark:via-cyan-600/22 dark:to-violet-600/26',
  },
  {
    id: 'pastel-rainbow',
    label: 'Pastel Rainbow',
    classes:
      'border-pink-300/65 bg-linear-to-br from-pink-200/90 via-yellow-200/85 to-sky-200/90 dark:border-pink-400/42 dark:from-pink-500/18 dark:via-yellow-500/14 dark:to-sky-500/18',
  },
  {
    id: 'velvet',
    label: 'Dark Velvet',
    classes:
      'border-purple-500/65 bg-linear-to-br from-purple-300/88 via-violet-300/84 to-indigo-300/88 dark:border-purple-600/55 dark:from-purple-800/44 dark:via-violet-800/40 dark:to-indigo-800/44',
  },
];

export const getCardGradientClasses = (gradientId?: string): string => {
  const found = CARD_GRADIENT_OPTIONS.find((option) => option.id === gradientId);
  return found?.classes || CARD_GRADIENT_OPTIONS[0].classes;
};
