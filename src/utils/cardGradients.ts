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
    id: 'coral',
    label: 'Coral Pop',
    classes:
      'border-rose-300/60 bg-linear-to-br from-rose-200/88 via-orange-200/82 to-amber-200/88 dark:border-rose-400/35 dark:from-rose-500/16 dark:via-orange-500/12 dark:to-amber-500/16',
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
    id: 'slate',
    label: 'Slate Steel',
    classes:
      'border-slate-300/60 bg-linear-to-br from-slate-100/92 via-zinc-100/86 to-blue-100/92 dark:border-slate-400/35 dark:from-slate-500/14 dark:via-zinc-500/11 dark:to-blue-500/15',
  },
];

export const getCardGradientClasses = (gradientId?: string): string => {
  const found = CARD_GRADIENT_OPTIONS.find((option) => option.id === gradientId);
  return found?.classes || CARD_GRADIENT_OPTIONS[0].classes;
};
