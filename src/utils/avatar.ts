export const getAvatarUrl = (avatarString: string) => {
  if (!avatarString) return '';
  
  let url = '';
  // Check for new format with options (style:seed|options)
  if (avatarString.includes('|')) {
      const [base, optionsStr] = avatarString.split('|');
      let style = 'adventurer';
      let seed = base;
      
      if (base.includes(':')) {
          [style, seed] = base.split(':');
      }
      
      // Ensure parameters are properly encoded
      const params = new URLSearchParams(optionsStr);
      url = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&${params.toString()}`;
  } else if (avatarString.includes(':')) {
    const [style, seed] = avatarString.split(':');
    url = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
  } else {
    // Legacy support for adventurer style
    url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatarString)}`;
  }
  
  return url;
};
