import React, { useRef, useState, useMemo } from 'react';
import { useStore, AVAILABLE_ACHIEVEMENTS } from '../store/useStore';
import { AnimatePresence, motion } from 'framer-motion';
import { Trophy, Flame, Award, User, Clock, Star, Layers, BookOpen, HelpCircle, X, GraduationCap, Palette, Shuffle, AlertTriangle, Zap, Pen, Shield, Moon, Sun, Calendar, Download, Skull, CheckSquare, Crown } from 'lucide-react';
import { GameBadge } from '../components/ui/GameBadge';

// Debug component to help identify image loading issues
const ImageWithDebug = ({ src, alt, className, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => {
    const [error, setError] = useState<boolean>(false);

    if (error) {
        return (
            <div className={`flex flex-col items-center justify-center bg-destructive/10 text-destructive p-2 text-[10px] overflow-hidden border border-destructive/50 ${className}`} title={src}>
                <AlertTriangle size={16} className="mb-1" />
                <div className="font-bold">Image Failed</div>
                <div className="w-full bg-white/50 p-1 rounded select-all cursor-text text-black font-mono text-[8px] break-all h-20 overflow-y-auto">
                    {src}
                </div>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => {
                console.error(`[ImageDebug] Failed to load: ${src}`);
                setError(true);
            }}
            {...props}
        />
    );
};

// Options for custom avatar builder
const AVATAR_OPTIONS = {
  skinColor: ['ffdbac', 'edb98a', 'd08b5b', 'ae5d29', '614335', 'fdecce'], // pale, light, brown, darkBrown, black, yellow
  top: [
    'bigHair', 'bob', 'bun', 'curly', 'curvy', 'dreads', 'frida', 'fro', 'longButNotTooLong', 
    'miaWallace', 'shavedSides', 'straight01', 'straight02', 'straightAndStrand', 
    'dreads01', 'dreads02', 'frizzle', 'shaggy', 'shaggyMullet', 'shortCurly', 'shortFlat', 
    'shortRound', 'shortWaved', 'sides', 'theCaesar', 'theCaesarAndSidePart'
  ],
  hairColor: ['a55728', '2c1b18', 'b58143', 'd6b370', '724133', '4a312c', 'f59797', 'ecdcbf', 'c93305', 'e8e1e1'], // auburn, black, blonde, blondeGolden, brown, brownDark, pastelPink, platinum, red, silverGray
  facialHair: ['beardMedium', 'beardLight', 'beardMajestic', 'moustacheFancy', 'moustacheMagnum', ''],
  clothing: ['blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 'graphicShirt', 'hoodie', 'overall', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck'],
  clothingColor: ['262e33', '65c9ff', '5199e4', '25557c', '929598', '3c4f5c', '3c4f5c', 'b1e2ff', 'a7ffc4', 'ff488e', 'ff5c5c', 'ffffff'] // black, blue01, blue02, blue03, gray01, gray02, heather, pastelBlue, pastelGreen, pink, red, white
};

interface AvatarSeed {
  name: string;
  options?: string;
}

const AVATAR_CATEGORIES: {
    id: string;
    name: string;
    style: string;
    options?: string;
    seeds: (string | AvatarSeed)[];
}[] = [
  {
    id: 'fun',
    name: 'Fun & Fantasy',
    style: 'adventurer',
    seeds: [
      'Felix', 'Aneka', 'Willow', 'Bella', 'Shadow', 
      'Gizmo', 'Leo', 'Misty', 'Bandit', 'Luna',
      'Sparky', 'Rocky', 'Coco', 'Bubbles', 'Lucky'
    ]
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    style: 'avataaars',
    // Scrubs look: V-neck shirts in blue/green shades
    options: 'clothing[]=shirtVNeck&clothingColor[]=65c9ff&clothingColor[]=5199e4&clothingColor[]=25557c&clothingColor[]=b1e2ff&clothingColor[]=a7ffc4',
    seeds: [
      { name: 'Registered Nurse', options: 'skinColor[]=edb98a&mouth[]=smile&eyebrows[]=defaultNatural&facialHairProbability=0' },
      { name: 'Registered Nurse (Male)', options: 'skinColor[]=614335&mouth[]=smile&eyebrows[]=defaultNatural&top[]=shortFlat&top[]=theCaesar&top[]=sides&top[]=frizzle&facialHairProbability=0' },
      'Nurse Practitioner', 'Physician', 'Physician Assistant', 
      'Occupational Therapist', 'Pharmacist', 'Social Worker',
      'Surgeon', 'Paramedic', 'Dentist', 'Radiologist',
      'Anesthesiologist', 'Midwife',
      // Diverse options - Generic Titles
      { name: 'ER Specialist', options: 'skinColor[]=614335&facialHair[]=beardMedium&facialHairProbability=100' },
      { name: 'Public Health Nurse', options: 'skinColor[]=614335' },
      { name: 'Clinical Specialist', options: 'skinColor[]=fdecce' },
      { name: 'Triage Nurse', options: 'skinColor[]=d08b5b' }
    ]
  },
  {
    id: 'business',
    name: 'Business & Law',
    style: 'avataaars',
    // Suits look: Blazers in dark/neutral colors
    options: 'clothing[]=blazerAndShirt&clothing[]=blazerAndSweater&clothingColor[]=262e33&clothingColor[]=929598&clothingColor[]=3c4f5c&clothingColor[]=65c9ff',
    seeds: [
      'Financial Examiner', 'Financial Manager', 'Accountant', 
      'Actuary', 'Lawyer', 'Consultant',
      'CEO', 'Executive', 'Broker', 'Judge',
      'Auditor', 'Partner'
    ]
  },
  {
    id: 'tech',
    name: 'Technology',
    style: 'avataaars',
    // Casual tech look: Hoodies, graphic shirts. Added accessoriesProbability to ensure they show up.
    options: 'clothing[]=graphicShirt&clothing[]=hoodie&clothing[]=shirtCrewNeck&accessoriesProbability=100&accessories[]=sunglasses&accessories[]=round&accessories[]=prescription01&accessories[]=prescription02',
    seeds: [
      'Software Developer', 'AI Specialist', 'Security Analyst',  
      'Database Admin', 'Data Scientist', 'Product Manager',
      'Game Dev', 'Hacker', 'SysAdmin', 'CTO',
      'Designer', 'Architect'
    ]
  },
  {
    id: 'science',
    name: 'Science',
    style: 'avataaars',
    // Lab coat look (approximate): White collar/sweaters
    options: 'clothing=collarAndSweater&clothingColor=ffffff',
    seeds: [
      'Environmental Scientist', 'Aerospace Engineer', 'Biochemist', 
      'Geologist', 'Lab Technician', 'Researcher',
      'Physicist', 'Chemist', 'Biologist', 'Astronomer'
    ]
  },
  {
    id: 'education',
    name: 'Education',
    style: 'avataaars',
    // Academic look
    options: 'clothing[]=collarAndSweater&clothing[]=shirtScoopNeck&glasses[]=round&glasses[]=prescription01&glasses[]=prescription02',
    seeds: [
      'Professor', 'Teacher', 'Urban Planner', 'Archivist', 
      'Librarian', 'Counselor',
      'Dean', 'Principal', 'Tutor', 'Lecturer'
    ]
  }
];

const getAvatarUrl = (avatarString: string) => {
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
  
  // Debug log
  // console.log(`[AvatarURL] Generated:`, url);
  return url;
};

interface AvatarBuilderOptions {
    style: string;
    seed: string;
    skinColor: string;
    top: string;
    hairColor: string;
    facialHair: string;
    clothing: string;
    clothingColor: string;
}

const CustomAvatarBuilder = ({ initialAvatar, onSave }: { initialAvatar?: string, onSave: (url: string) => void, onCancel: () => void }) => {
  const [options, setOptions] = useState<AvatarBuilderOptions>(() => {
    const defaultOptions = {
        style: 'avataaars',
        seed: Math.random().toString(36).substring(7),
        skinColor: 'edb98a', // light
        top: 'straight01',
        hairColor: '724133', // brown
        facialHair: '',
        clothing: 'shirtVNeck',
        clothingColor: '65c9ff' // blue01
    };

    if (!initialAvatar) return defaultOptions;

    try {
        let style = 'avataaars';
        let seed = '';
        let paramsString = '';

        if (initialAvatar.includes('|')) {
            const [base, params] = initialAvatar.split('|');
            paramsString = params;
            if (base.includes(':')) {
                [style, seed] = base.split(':');
            } else {
                seed = base;
            }
        } else if (initialAvatar.includes(':')) {
            [style, seed] = initialAvatar.split(':');
        } else {
            seed = initialAvatar;
            style = 'adventurer'; 
        }

        // Only support avataaars editing for now
        if (style !== 'avataaars') return defaultOptions;

        const parsedOptions: any = { ...defaultOptions, style, seed };
        
        if (paramsString) {
            const searchParams = new URLSearchParams(paramsString);
            
            // Helper to get value, checking both key and key[]
            const getValue = (key: string) => {
                return searchParams.get(key) || searchParams.get(`${key}[]`);
            };

            // Validation helper to ensure we don't load legacy/broken values
            const validate = (key: keyof typeof AVATAR_OPTIONS, value: string) => {
                // Check exact match
                if (AVATAR_OPTIONS[key].includes(value)) return value;
                
                // Legacy mappings for skinColor (names to hex)
                if (key === 'skinColor') {
                    const map: Record<string, string> = {
                        'light': 'edb98a', 'pale': 'ffdbac', 'brown': 'd08b5b', 
                        'darkBrown': 'ae5d29', 'black': '614335', 'yellow': 'fdecce'
                    };
                    if (map[value]) return map[value];
                }

                // If invalid/legacy, return default (first option)
                return AVATAR_OPTIONS[key][0];
            };

            const skinColor = getValue('skinColor');
            if (skinColor) parsedOptions.skinColor = validate('skinColor', skinColor);

            const top = getValue('top');
            if (top) parsedOptions.top = validate('top', top);

            const hairColor = getValue('hairColor');
            if (hairColor) parsedOptions.hairColor = validate('hairColor', hairColor);

            const facialHair = getValue('facialHair');
            if (facialHair !== null) parsedOptions.facialHair = validate('facialHair', facialHair);

            const clothing = getValue('clothing');
            if (clothing) parsedOptions.clothing = validate('clothing', clothing);

            const clothingColor = getValue('clothingColor');
            if (clothingColor) parsedOptions.clothingColor = validate('clothingColor', clothingColor);
        }

        return parsedOptions;
    } catch (e) {
        console.error("Failed to parse avatar string", e);
        return defaultOptions;
    }
  });

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.append('seed', options.seed);
    if (options.skinColor) params.append('skinColor[]', options.skinColor);
    if (options.top) params.append('top[]', options.top);
    if (options.hairColor) params.append('hairColor[]', options.hairColor);
    if (options.facialHair) {
      params.append('facialHair[]', options.facialHair);
      params.append('facialHairProbability', '100');
    } else {
        params.append('facialHairProbability', '0');
    }
    if (options.clothing) params.append('clothing[]', options.clothing);
    if (options.clothingColor) params.append('clothingColor[]', options.clothingColor);
    
    // Ensure eyes/mouth are standard/happy
    params.append('mouth[]', 'smile');
    params.append('eyebrows[]', 'defaultNatural');

    const url = `https://api.dicebear.com/7.x/${options.style}/svg?${params.toString()}`;
    // console.log('[AvatarBuilder] Preview URL:', url);
    return url;
  }, [options]);

  const handleSave = () => {
    // Construct the storage string using URLSearchParams to ensure consistent encoding
    // This matches exactly how the preview URL is generated
    const params = new URLSearchParams();
    
    if (options.skinColor) params.append('skinColor[]', options.skinColor);
    if (options.top) params.append('top[]', options.top);
    if (options.hairColor) params.append('hairColor[]', options.hairColor);
    
    if (options.facialHair) {
        params.append('facialHair[]', options.facialHair);
        params.append('facialHairProbability', '100');
    } else {
        params.append('facialHairProbability', '0');
    }
    
    if (options.clothing) params.append('clothing[]', options.clothing);
    if (options.clothingColor) params.append('clothingColor[]', options.clothingColor);
    
    // Always happy
    params.append('mouth[]', 'smile');
    params.append('eyebrows[]', 'defaultNatural');

    const avatarString = `${options.style}:${options.seed}|${params.toString()}`;
    onSave(avatarString);
  };

  const randomize = () => {
    setOptions((prev: AvatarBuilderOptions) => ({
        ...prev,
        seed: Math.random().toString(36).substring(7),
        skinColor: AVATAR_OPTIONS.skinColor[Math.floor(Math.random() * AVATAR_OPTIONS.skinColor.length)],
        top: AVATAR_OPTIONS.top[Math.floor(Math.random() * AVATAR_OPTIONS.top.length)],
        hairColor: AVATAR_OPTIONS.hairColor[Math.floor(Math.random() * AVATAR_OPTIONS.hairColor.length)],
        clothing: AVATAR_OPTIONS.clothing[Math.floor(Math.random() * AVATAR_OPTIONS.clothing.length)],
        clothingColor: AVATAR_OPTIONS.clothingColor[Math.floor(Math.random() * AVATAR_OPTIONS.clothingColor.length)],
    }));
  };

  return (
    <div className="flex flex-col md:flex-row h-full gap-6 p-4">
        <div className="flex-1 flex flex-col items-center justify-center bg-secondary/10 rounded-xl p-8 relative">
            <ImageWithDebug src={previewUrl} alt="Preview" className="w-64 h-64 rounded-full bg-white shadow-lg" />
            <button 
                type="button"
                onClick={randomize}
                className="absolute top-4 right-4 p-2 rounded-full bg-white shadow-md hover:bg-gray-50 text-gray-600"
                title="Randomize"
            >
                <Shuffle size={20} />
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">Skin Tone</label>
                <div className="flex flex-wrap gap-2">
                    {AVATAR_OPTIONS.skinColor.map(color => (
                        <button
                            type="button"
                            key={color}
                            onClick={() => setOptions({...options, skinColor: color})}
                            className={`w-8 h-8 rounded-full border-2 ${options.skinColor === color ? 'border-primary scale-110' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: `#${color}` }}
                            title={color}
                        />
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">Hair Style</label>
                <div className="grid grid-cols-3 gap-2">
                    {AVATAR_OPTIONS.top.map(style => (
                        <button
                            type="button"
                            key={style}
                            onClick={() => setOptions({...options, top: style})}
                            className={`px-2 py-1 text-xs rounded border ${options.top === style ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-secondary'}`}
                        >
                            {style.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">Hair Color</label>
                <div className="flex flex-wrap gap-2">
                    {AVATAR_OPTIONS.hairColor.map(color => (
                        <button
                            type="button"
                            key={color}
                            onClick={() => setOptions({...options, hairColor: color})}
                            className={`w-6 h-6 rounded-full border-2 ${options.hairColor === color ? 'border-primary scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: `#${color}` }}
                            title={color}
                        />
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">Facial Hair</label>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setOptions({...options, facialHair: ''})}
                        className={`px-3 py-1 text-xs rounded border ${options.facialHair === '' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
                    >
                        None
                    </button>
                    {AVATAR_OPTIONS.facialHair.filter(Boolean).map(style => (
                        <button
                            type="button"
                            key={style}
                            onClick={() => setOptions({...options, facialHair: style})}
                            className={`px-3 py-1 text-xs rounded border ${options.facialHair === style ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
                        >
                            {style.replace('beard', 'Beard ').replace('moustache', 'Moustache ')}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">Clothing</label>
                <div className="grid grid-cols-2 gap-2">
                    {AVATAR_OPTIONS.clothing.map(style => (
                        <button
                            type="button"
                            key={style}
                            onClick={() => setOptions({...options, clothing: style})}
                            className={`px-2 py-1 text-xs rounded border ${options.clothing === style ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
                        >
                            {style.replace('shirt', '').replace('And', ' & ')}
                        </button>
                    ))}
                </div>
            </div>

            <div className="pt-4 flex gap-3">
                <button type="button" onClick={handleSave} className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">
                    Save Avatar
                </button>
            </div>
        </div>
    </div>
  );
};

const ACHIEVEMENT_ICONS: Record<string, any> = {
  flag: Trophy,
  zap: Zap,
  pen: Pen,
  shield: Shield,
  book: BookOpen,
  crown: Crown,
  flame: Flame,
  clock: Clock,
  moon: Moon,
  sun: Sun,
  calendar: Calendar,
  star: Star,
  award: Award,
  book_open: BookOpen,
  download: Download,
  skull: Skull,
  check_square: CheckSquare,
  layers: Layers,
};

const Profile = () => {
  const { userProfile, setUserProfile } = useStore();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('fun');
  
  const stats = useMemo(() => {
    const s = userProfile.stats || {
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      totalStudyTime: 0,
      totalSetsCompleted: 0,
      streakDays: 0,
      lastStudyDate: 0,
      xp: 0,
      level: 1
    };
    
    // Level calculation helpers matching store logic
    // Level = floor(sqrt(xp / 100)) + 1
    // Therefore: (Level - 1) = sqrt(xp / 100) -> (Level - 1)^2 = xp / 100 -> xp = 100 * (Level - 1)^2
    
    const currentLevel = s.level || 1;
    const currentXp = s.xp || 0;
    
    const xpForCurrentLevel = 100 * Math.pow(currentLevel - 1, 2);
    const xpForNextLevel = 100 * Math.pow(currentLevel, 2);
    const xpProgress = currentXp - xpForCurrentLevel;
    const xpRequiredForNext = xpForNextLevel - xpForCurrentLevel;
    const progressPercentage = Math.min(100, Math.max(0, (xpProgress / xpRequiredForNext) * 100));

    return {
      items: [
        { label: 'Total Questions', value: s.totalQuestionsAnswered, icon: HelpCircle },
        { label: 'Study Time', value: `${Math.round(s.totalStudyTime)}m`, icon: Clock },
        { label: 'Study Streak', value: `${s.streakDays} Days`, icon: Flame },
        { label: 'XP Gained', value: s.xp, icon: Star },
      ],
      progress: {
        current: Math.round(xpProgress),
        total: Math.round(xpRequiredForNext),
        percentage: progressPercentage,
        level: currentLevel
      }
    };
  }, [userProfile.stats]);

  const achievements = useMemo(() => {
    return AVAILABLE_ACHIEVEMENTS.map(ach => {
      const unlocked = (userProfile.achievements || []).some(ua => ua.id === ach.id);
      return {
        ...ach,
        unlocked,
        icon: ACHIEVEMENT_ICONS[ach.icon] || Trophy
      };
    }).sort((a, b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0));
  }, [userProfile.achievements]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-10 pb-20">
      {/* Header / Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary/20 via-background to-background border border-border/50 p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-5 blur-3xl">
          <User size={400} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="relative group cursor-pointer" onClick={() => setIsAvatarModalOpen(true)}>
              <div className="h-32 w-32 rounded-full bg-linear-to-tr from-primary to-purple-500 p-1 shadow-lg group-hover:scale-105 transition-transform duration-300">
                <div className="h-full w-full rounded-full bg-card flex items-center justify-center overflow-hidden relative">
                    {userProfile.avatar ? (
                      <ImageWithDebug 
                        src={getAvatarUrl(userProfile.avatar)}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={64} className="text-muted-foreground" />
                    )}
                    
                    {/* Overlay for hover effect */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-medium">Change</span>
                    </div>
                </div>
              </div>
              <div className="absolute bottom-2 right-2 bg-background rounded-full p-2 border border-border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
          </div>
          
          <div className="text-center md:text-left space-y-4 flex-1">
            <div>
                <h2 className="text-4xl font-bold tracking-tight mb-2">{userProfile.name}</h2>
                <div className="flex items-center gap-3 justify-center md:justify-start flex-wrap">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 text-sm font-medium">
                        <Award className="h-3.5 w-3.5" /> Level {stats.progress.level}
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium">
                        {stats.progress.current} / {stats.progress.total} XP
                    </span>
                    {userProfile.studyField && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-sm font-medium">
                            <GraduationCap className="h-3.5 w-3.5" /> {userProfile.studyField}
                        </span>
                    )}
                </div>
                
                {/* XP Bar */}
                <div className="mt-4 max-w-sm mx-auto md:mx-0">
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-linear-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-1000"
                            style={{ width: `${stats.progress.percentage}%` }}
                        />
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/40">
                {stats.items.map((stat, idx) => (
                    <div key={idx} className="flex flex-col">
                        <span className="text-2xl font-bold">{stat.value}</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </div>


      {/* Achievements Row (Horizontal Scroll) */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2 px-2">
            <Trophy className="h-5 w-5 text-yellow-500" /> Achievements
        </h3>
        
        <div className="relative group/container">
            <div 
                ref={scrollContainerRef}
                className="flex gap-4 overflow-x-auto pb-4 px-2 snap-x snap-mandatory scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {achievements.map((achievement, idx) => (
                    <motion.div
                        key={achievement.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 * idx }}
                        className={`min-w-[320px] snap-center rounded-2xl border p-6 flex flex-col gap-4 transition-all hover:scale-[1.02] relative overflow-hidden group ${
                            achievement.unlocked 
                                ? 'bg-card/80 backdrop-blur-sm border-primary/20 shadow-lg' 
                                : 'bg-muted/10 border-border/20 opacity-80'
                        }`}
                    >
                        {/* Decorative background glow for unlocked items */}
                        {achievement.unlocked && (
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors" />
                        )}

                        <div className="flex justify-between items-start z-10">
                            <GameBadge 
                                icon={achievement.icon}
                                xpReward={achievement.xp}
                                unlocked={achievement.unlocked}
                                size="lg"
                            />
                            
                            <div className="flex flex-col items-end gap-1">
                                {achievement.unlocked ? (
                                    <span className="flex items-center gap-1 text-xs font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full uppercase tracking-wider">
                                        <Star size={12} className="fill-yellow-500" /> Unlocked
                                    </span>
                                ) : (
                                    <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                                        Locked
                                    </span>
                                )}
                                <span className="text-xs font-mono text-muted-foreground mt-1">
                                    {achievement.xp} XP
                                </span>
                            </div>
                        </div>
                        
                        <div className="z-10 mt-2">
                            <h4 className="font-bold text-xl tracking-tight mb-1">{achievement.title}</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">{achievement.description}</p>
                        </div>
                        
                        {!achievement.unlocked && (
                            <div className="mt-auto pt-2 z-10">
                                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                    <div className="h-full bg-primary/50 w-[30%] rounded-full" />
                                </div>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
      </div>
      {/* Avatar Selection Modal */}
      <AnimatePresence>
        {isAvatarModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsAvatarModalOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border flex justify-between items-center shrink-0">
                <h3 className="text-xl font-bold">Choose Your Avatar</h3>
                <button onClick={() => setIsAvatarModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={24} />
                </button>
              </div>

              {/* Categories Tabs */}
              <div className="flex overflow-x-auto p-2 border-b border-border bg-secondary/10 shrink-0">
                  <button
                    onClick={() => setActiveCategory('custom')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                        activeCategory === 'custom'
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                  >
                      <Palette size={16} /> Custom
                  </button>
                  <div className="w-px h-6 bg-border mx-2 self-center" />
                  {AVATAR_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                            activeCategory === cat.id 
                            ? 'bg-primary text-primary-foreground shadow-sm' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                        }`}
                      >
                          {cat.name}
                      </button>
                  ))}
              </div>

              {/* Avatar Grid or Customizer */}
              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                {activeCategory === 'custom' ? (
                    <CustomAvatarBuilder 
                        initialAvatar={userProfile.avatar}
                        onSave={(avatarUrl) => {
                            setUserProfile({ ...userProfile, avatar: avatarUrl });
                            setIsAvatarModalOpen(false);
                        }}
                        onCancel={() => setIsAvatarModalOpen(false)}
                    />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {AVATAR_CATEGORIES.find(c => c.id === activeCategory)?.seeds.map((seedItem) => {
                        const seedName = typeof seedItem === 'string' ? seedItem : seedItem.name;
                        const seedOptions = typeof seedItem === 'string' ? '' : seedItem.options;
                        const category = AVATAR_CATEGORIES.find(c => c.id === activeCategory);
                        
                        // Combine category options and item-specific options
                        let avatarValue = `${category?.style}:${seedName}`;
                        
                        // Combine category options and item-specific options
                        const allOptions = [category?.options, seedOptions].filter(Boolean).join('&');
                        
                        if (allOptions) {
                            avatarValue += `|${allOptions}`;
                        }

                        return (
                          <button
                            key={seedName}
                            onClick={() => {
                              setUserProfile({ ...userProfile, avatar: avatarValue });
                              setIsAvatarModalOpen(false);
                            }}
                            className="group relative aspect-square rounded-xl bg-secondary/20 hover:bg-secondary/40 transition-all border border-transparent hover:border-primary/50 overflow-hidden"
                          >
                            <ImageWithDebug 
                              src={getAvatarUrl(avatarValue)}
                              alt={seedName}
                              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                              loading="lazy"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-center translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                <span className="text-xs text-white font-medium truncate block">
                                    {seedName}
                                </span>
                            </div>
                          </button>
                        );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
