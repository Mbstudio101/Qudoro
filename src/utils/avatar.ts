export const getAvatarUrl = (avatarString: string) => {
  if (!avatarString) return '';

  // Strip the optional third segment (overlays) — only first two segments go to DiceBear
  const segments = avatarString.split('|');
  const base = segments[0];
  const optionsStr = segments[1] || '';

  if (optionsStr) {
    let style = 'adventurer';
    let seed = base;
    if (base.includes(':')) {
      [style, seed] = base.split(':');
    }
    const params = new URLSearchParams(optionsStr);
    return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&${params.toString()}`;
  } else if (base.includes(':')) {
    const [style, seed] = base.split(':');
    return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
  } else {
    return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(base)}`;
  }
};

/** Returns the list of overlay IDs stored in the third segment of an avatar string. */
export const getAvatarOverlays = (avatarString: string): string[] => {
  if (!avatarString) return [];
  const parts = avatarString.split('|');
  if (parts.length < 3 || !parts[2]) return [];
  return parts[2].split(',').filter(Boolean);
};
