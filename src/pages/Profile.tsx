import React, { useRef, useState, useMemo } from 'react';
import { useStore, AVAILABLE_ACHIEVEMENTS } from '../store/useStore';
import { AnimatePresence, motion } from 'framer-motion';
import { Trophy, Flame, Award, User, Clock, Star, Layers, BookOpen, HelpCircle, X, GraduationCap, Palette, Shuffle, Zap, Pen, Shield, Moon, Sun, Calendar, Download, Skull, CheckSquare, Crown, LucideIcon } from 'lucide-react';
import { GameBadge } from '../components/ui/GameBadge';
import { getAvatarUrl } from '../utils/avatar';

// ─── Avatar option data ───────────────────────────────────────────────────────
const MALE_HAIR   = ['shortFlat', 'shortRound', 'shortCurly', 'shortWaved', 'sides', 'theCaesar', 'theCaesarAndSidePart', 'shavedSides'];
const FEMALE_HAIR = ['bigHair', 'bob', 'bun', 'curvy', 'frida', 'longButNotTooLong', 'miaWallace', 'straight01', 'straight02', 'straightAndStrand'];
const NATURAL_HAIR = ['curly', 'dreads', 'dreads01', 'dreads02', 'fro', 'frizzle', 'shaggy', 'shaggyMullet'];
const HAIR_STYLES = [...MALE_HAIR, ...FEMALE_HAIR, ...NATURAL_HAIR];
const HAT_STYLES  = ['hat', 'hijab', 'turban'];


const AVATAR_OPTIONS = {
  skinColor:        ['ffdbac', 'edb98a', 'd08b5b', 'ae5d29', '614335', 'fdecce'],
  top:              [...HAIR_STYLES, ...HAT_STYLES],
  hairColor:        ['a55728', '2c1b18', 'b58143', 'd6b370', '724133', '4a312c', 'f59797', 'ecdcbf', 'c93305', 'e8e1e1'],
  facialHair:       ['beardMedium', 'beardLight', 'beardMajestic', 'moustacheFancy', 'moustacheMagnum'],
  facialHairColor:  ['a55728', '2c1b18', 'b58143', 'd6b370', '724133', '4a312c', 'f59797', 'ecdcbf', 'c93305', 'e8e1e1'],
  eyes:             ['closed', 'cry', 'default', 'dizzy', 'eyeRoll', 'happy', 'hearts', 'side', 'squint', 'surprised', 'wink', 'winkWacky', 'xDizzy'],
  eyebrows:         ['angryNatural', 'default', 'defaultNatural', 'flatNatural', 'frownNatural', 'raisedExcited', 'raisedExcitedNatural', 'sadConcerned', 'sadConcernedNatural', 'unibrowNatural', 'upDown', 'upDownNatural'],
  mouth:            ['concerned', 'default', 'disbelief', 'eating', 'grimace', 'sad', 'screamOpen', 'serious', 'smile', 'tongue', 'twinkle', 'vomit'],
  clothing:         ['blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 'graphicShirt', 'hoodie', 'overall', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck'],
  clothingColor:    ['262e33', '65c9ff', '5199e4', '25557c', '929598', '3c4f5c', 'b1e2ff', 'a7ffc4', 'ff488e', 'ff5c5c', 'ffffff'],
  accessories:      ['kurt', 'prescription01', 'prescription02', 'round', 'sunglasses', 'wayfarers'],
  accessoriesColor: ['262e33', '65c9ff', '5199e4', '25557c', '929598', '3c4f5c', 'b1e2ff', 'a7ffc4', 'ff488e', 'ff5c5c', 'ffffff'],
  hatColor:         ['262e33', '65c9ff', '5199e4', '25557c', '929598', '3c4f5c', 'b1e2ff', 'a7ffc4', 'ff488e', 'ff5c5c', 'ffffff'],
};

const LABELS: Record<string, string> = {
  bigHair: 'Big Hair', longButNotTooLong: 'Long', miaWallace: 'Mia Wallace',
  straightAndStrand: 'Loose Strand', theCaesar: 'Caesar', theCaesarAndSidePart: 'Caesar Side',
  shavedSides: 'Shaved Sides', shaggyMullet: 'Mullet', fro: 'Afro', frida: 'Frida',
  shortWaved: 'Short Waves',
  eyeRoll: 'Eye Roll', xDizzy: 'X Eyes', winkWacky: 'Wacky Wink',
  defaultNatural: 'Natural', angryNatural: 'Angry Natural', flatNatural: 'Flat',
  frownNatural: 'Frown', raisedExcited: 'Raised', raisedExcitedNatural: 'Raised Natural',
  sadConcerned: 'Sad', sadConcernedNatural: 'Sad Natural', unibrowNatural: 'Unibrow',
  upDown: 'Up & Down', upDownNatural: 'Up-Down',
  screamOpen: 'Scream', disbelief: 'Disbelief',
  prescription01: 'Classic', prescription02: 'Thin Frames', wayfarers: 'Wayfarers',
  blazerAndShirt: 'Blazer & Shirt', blazerAndSweater: 'Blazer & Sweater',
  collarAndSweater: 'Collar & Sweater', graphicShirt: 'Graphic Tee',
  shirtCrewNeck: 'Crew Neck', shirtScoopNeck: 'Scoop Neck', shirtVNeck: 'V-Neck',
  beardMedium: 'Beard Med.', beardLight: 'Beard Light', beardMajestic: 'Full Beard',
  moustacheFancy: 'Fancy Moustache', moustacheMagnum: 'Magnum Moustache',
};
const getLabel = (s: string) =>
  LABELS[s] || s.replace(/([A-Z])/g, ' $1').replace(/(\d+)/, ' $1').replace(/^./, c => c.toUpperCase()).trim();

const SKIN_NAMES: Record<string, string> = {
  ffdbac: 'Pale', edb98a: 'Light', d08b5b: 'Tan', ae5d29: 'Brown', '614335': 'Dark', fdecce: 'Fair',
};
const HAIR_COLOR_NAMES: Record<string, string> = {
  a55728: 'Auburn', '2c1b18': 'Black', b58143: 'Blonde', d6b370: 'Golden', '724133': 'Brown',
  '4a312c': 'Dark Brown', f59797: 'Pink', ecdcbf: 'Platinum', c93305: 'Red', e8e1e1: 'Silver',
};
const CLOTH_COLOR_NAMES: Record<string, string> = {
  '262e33': 'Midnight', '65c9ff': 'Sky Blue', '5199e4': 'Blue', '25557c': 'Navy',
  '929598': 'Gray', '3c4f5c': 'Slate', b1e2ff: 'Pastel Blue', a7ffc4: 'Mint',
  ff488e: 'Pink', ff5c5c: 'Red', ffffff: 'White',
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

interface AvatarBuilderOptions {
  style: string;
  seed: string;
  skinColor: string;
  top: string;
  hairColor: string;
  facialHair: string;
  facialHairColor: string;
  clothing: string;
  clothingColor: string;
  eyes: string;
  eyebrows: string;
  mouth: string;
  accessories: string;
  accessoriesColor: string;
  hatColor: string;
}

// ─── Tiny shared sub-components ──────────────────────────────────────────────
const AvatarSection = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
    {children}
  </div>
);

const AvatarChip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all ${
      active ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card border-border hover:bg-secondary'
    }`}
  >
    {label}
  </button>
);

const AvatarChips = ({ values, current, onSelect }: { values: string[]; current: string; onSelect: (v: string) => void }) => (
  <div className="flex flex-wrap gap-1.5">
    {values.map(v => <AvatarChip key={v} label={getLabel(v)} active={current === v} onClick={() => onSelect(v)} />)}
  </div>
);

// ─── Custom Avatar Builder ────────────────────────────────────────────────────
const CustomAvatarBuilder = ({ initialAvatar, onSave, onCancel }: {
  initialAvatar?: string;
  onSave: (avatarString: string) => void;
  onCancel: () => void;
}) => {
  const defaults: AvatarBuilderOptions = {
    style: 'avataaars',
    seed: Math.random().toString(36).substring(7),
    skinColor: 'edb98a',
    top: 'straight01',
    hairColor: '724133',
    facialHair: '',
    facialHairColor: '724133',
    clothing: 'shirtVNeck',
    clothingColor: '65c9ff',
    eyes: 'default',
    eyebrows: 'defaultNatural',
    mouth: 'smile',
    accessories: '',
    accessoriesColor: '262e33',
    hatColor: '262e33',
  };

  const [options, setOptions] = useState<AvatarBuilderOptions>(() => {
    if (!initialAvatar) return defaults;
    try {
      let style = 'avataaars', seed = '', paramsString = '';
      const segments = initialAvatar.split('|');
      if (segments.length >= 2) {
        const base = segments[0];
        paramsString = segments[1];
        [style, seed] = base.includes(':') ? base.split(':') : ['avataaars', base];
      } else if (initialAvatar.includes(':')) {
        [style, seed] = initialAvatar.split(':');
      } else {
        seed = initialAvatar; style = 'adventurer';
      }
      if (style !== 'avataaars') return defaults;
      const result = { ...defaults, style, seed };
      if (paramsString) {
        const sp = new URLSearchParams(paramsString);
        const get = (k: string) => sp.get(k) || sp.get(`${k}[]`) || null;
        const pick = (key: keyof typeof AVATAR_OPTIONS, val: string) =>
          (AVATAR_OPTIONS[key] as string[]).includes(val) ? val : (AVATAR_OPTIONS[key] as string[])[0];
        const skinColorVal = get('skinColor'); if (skinColorVal) result.skinColor = pick('skinColor', skinColorVal);
        const topVal = get('top'); if (topVal) result.top = pick('top', topVal);
        const hairColorVal = get('hairColor'); if (hairColorVal) result.hairColor = pick('hairColor', hairColorVal);
        const fhVal = get('facialHair');
        if (fhVal !== null) result.facialHair = AVATAR_OPTIONS.facialHair.includes(fhVal) ? fhVal : '';
        const fhcVal = get('facialHairColor'); if (fhcVal) result.facialHairColor = pick('facialHairColor', fhcVal);
        const clothingVal = get('clothing'); if (clothingVal) result.clothing = pick('clothing', clothingVal);
        const ccVal = get('clothingColor'); if (ccVal) result.clothingColor = pick('clothingColor', ccVal);
        const eyesVal = get('eyes'); if (eyesVal) result.eyes = pick('eyes', eyesVal);
        const ebVal = get('eyebrows'); if (ebVal) result.eyebrows = pick('eyebrows', ebVal);
        const mouthVal = get('mouth'); if (mouthVal) result.mouth = pick('mouth', mouthVal);
        const accVal = get('accessories');
        if (accVal !== null) result.accessories = AVATAR_OPTIONS.accessories.includes(accVal) ? accVal : '';
        const acVal = get('accessoriesColor'); if (acVal) result.accessoriesColor = pick('accessoriesColor', acVal);
        const hcVal = get('hatColor'); if (hcVal) result.hatColor = pick('hatColor', hcVal);
      }
      return result;
    } catch (e) {
      console.error('Failed to parse avatar string', e);
      return defaults;
    }
  });

  const [activeTab, setActiveTab] = useState<'face' | 'hair' | 'outfit' | 'extras'>('face');
  const set = (key: keyof AvatarBuilderOptions, val: string) => setOptions(prev => ({ ...prev, [key]: val }));
  const isHat = HAT_STYLES.includes(options.top);

  const buildParams = (o: AvatarBuilderOptions) => {
    const p = new URLSearchParams();
    p.append('skinColor[]', o.skinColor);
    p.append('top[]', o.top);
    p.append('hairColor[]', o.hairColor);
    if (HAT_STYLES.includes(o.top)) p.append('hatColor[]', o.hatColor);
    if (o.facialHair) {
      p.append('facialHair[]', o.facialHair);
      p.append('facialHairProbability', '100');
      p.append('facialHairColor[]', o.facialHairColor);
    } else {
      p.append('facialHairProbability', '0');
    }
    p.append('clothing[]', o.clothing);
    p.append('clothingColor[]', o.clothingColor);
    p.append('eyes[]', o.eyes);
    p.append('eyebrows[]', o.eyebrows);
    p.append('mouth[]', o.mouth);
    if (o.accessories) {
      p.append('accessories[]', o.accessories);
      p.append('accessoriesProbability', '100');
      p.append('accessoriesColor[]', o.accessoriesColor);
    } else {
      p.append('accessoriesProbability', '0');
    }
    return p;
  };

  const previewUrl = useMemo(() => {
    const p = buildParams(options);
    p.append('seed', options.seed);
    return `https://api.dicebear.com/9.x/avataaars/svg?${p.toString()}`;
  }, [options]);

  const handleSave = () => {
    const p = buildParams(options);
    onSave(`avataaars:${options.seed}|${p.toString()}`);
  };

  const rand = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const randomize = () => setOptions(prev => ({
    ...prev,
    seed: Math.random().toString(36).substring(7),
    skinColor: rand(AVATAR_OPTIONS.skinColor),
    top: rand(AVATAR_OPTIONS.top),
    hairColor: rand(AVATAR_OPTIONS.hairColor),
    facialHair: Math.random() < 0.4 ? rand(AVATAR_OPTIONS.facialHair) : '',
    facialHairColor: rand(AVATAR_OPTIONS.facialHairColor),
    clothing: rand(AVATAR_OPTIONS.clothing),
    clothingColor: rand(AVATAR_OPTIONS.clothingColor),
    eyes: rand(AVATAR_OPTIONS.eyes),
    eyebrows: rand(AVATAR_OPTIONS.eyebrows),
    mouth: rand(AVATAR_OPTIONS.mouth),
    accessories: Math.random() < 0.35 ? rand(AVATAR_OPTIONS.accessories) : '',
    accessoriesColor: rand(AVATAR_OPTIONS.accessoriesColor),
    hatColor: rand(AVATAR_OPTIONS.hatColor),
  }));

  const TABS = [
    { id: 'face' as const,   emoji: '👤', label: 'Face'   },
    { id: 'hair' as const,   emoji: '💇', label: 'Hair'   },
    { id: 'outfit' as const, emoji: '👕', label: 'Outfit' },
    { id: 'extras' as const, emoji: '🕶️', label: 'Extras' },
  ];

  const ColorRow = ({ colors, value, names, onPick }: {
    colors: string[]; value: string; names: Record<string, string>; onPick: (c: string) => void;
  }) => (
    <div className="flex flex-wrap gap-2">
      {colors.map(c => (
        <button key={c} type="button" onClick={() => onPick(c)}
          className={`w-7 h-7 rounded-full border-2 transition-transform ${value === c ? 'border-primary scale-110 ring-2 ring-primary/30' : 'border-transparent hover:scale-105'}`}
          style={{ backgroundColor: `#${c}`, ...(c === 'ffffff' ? { border: '2px solid #d1d5db' } : {}) }}
          title={names[c] || c}
        />
      ))}
    </div>
  );

  return (
    <div className="flex gap-5 h-full min-h-0">
      {/* Left: preview + nav + save */}
      <div className="flex flex-col gap-3 w-44 shrink-0">
        <div className="relative">
          <div className="relative w-full aspect-square rounded-2xl bg-white shadow-lg border border-border overflow-hidden">
            <img
              src={previewUrl}
              alt="Avatar preview"
              className="w-full h-full object-cover"
            />
          </div>
          <button
            type="button"
            onClick={randomize}
            title="Randomize"
            className="absolute -top-2 -right-2 p-1.5 rounded-full bg-background border border-border shadow-sm hover:bg-secondary text-muted-foreground transition-colors"
          >
            <Shuffle size={13} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <span className="text-base">{tab.emoji}</span> {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="mt-auto w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-sm text-sm"
        >
          Save Avatar
        </button>
      </div>

      {/* Right: option panels */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 min-h-0">

        {/* ── Face ── */}
        {activeTab === 'face' && (
          <>
            <AvatarSection label="Skin Tone">
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS.skinColor.map(c => (
                  <button key={c} type="button" onClick={() => set('skinColor', c)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${options.skinColor === c ? 'border-primary scale-110 ring-2 ring-primary/30' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: `#${c}` }} title={SKIN_NAMES[c]} />
                ))}
              </div>
            </AvatarSection>
            <AvatarSection label="Eyes">
              <AvatarChips values={AVATAR_OPTIONS.eyes} current={options.eyes} onSelect={v => set('eyes', v)} />
            </AvatarSection>
            <AvatarSection label="Eyebrows">
              <AvatarChips values={AVATAR_OPTIONS.eyebrows} current={options.eyebrows} onSelect={v => set('eyebrows', v)} />
            </AvatarSection>
            <AvatarSection label="Mouth">
              <AvatarChips values={AVATAR_OPTIONS.mouth} current={options.mouth} onSelect={v => set('mouth', v)} />
            </AvatarSection>
          </>
        )}

        {/* ── Hair ── */}
        {activeTab === 'hair' && (
          <>
            <AvatarSection label="Men's Styles">
              <AvatarChips values={MALE_HAIR} current={options.top} onSelect={v => set('top', v)} />
            </AvatarSection>
            <AvatarSection label="Women's Styles">
              <AvatarChips values={FEMALE_HAIR} current={options.top} onSelect={v => set('top', v)} />
            </AvatarSection>
            <AvatarSection label="Natural / Shared">
              <AvatarChips values={NATURAL_HAIR} current={options.top} onSelect={v => set('top', v)} />
            </AvatarSection>
            <AvatarSection label="Headwear">
              <AvatarChips values={HAT_STYLES} current={options.top} onSelect={v => set('top', v)} />
            </AvatarSection>
            {!isHat && (
              <AvatarSection label="Hair Color">
                <ColorRow colors={AVATAR_OPTIONS.hairColor} value={options.hairColor} names={HAIR_COLOR_NAMES} onPick={c => set('hairColor', c)} />
              </AvatarSection>
            )}
            {isHat && (
              <AvatarSection label="Hat Color">
                <ColorRow colors={AVATAR_OPTIONS.hatColor} value={options.hatColor} names={CLOTH_COLOR_NAMES} onPick={c => set('hatColor', c)} />
              </AvatarSection>
            )}
            <AvatarSection label="Facial Hair">
              <div className="flex flex-wrap gap-1.5">
                <AvatarChip label="None" active={options.facialHair === ''} onClick={() => set('facialHair', '')} />
                {AVATAR_OPTIONS.facialHair.map(v => (
                  <AvatarChip key={v} label={getLabel(v)} active={options.facialHair === v} onClick={() => set('facialHair', v)} />
                ))}
              </div>
            </AvatarSection>
            {options.facialHair && (
              <AvatarSection label="Facial Hair Color">
                <ColorRow colors={AVATAR_OPTIONS.facialHairColor} value={options.facialHairColor} names={HAIR_COLOR_NAMES} onPick={c => set('facialHairColor', c)} />
              </AvatarSection>
            )}
          </>
        )}

        {/* ── Outfit ── */}
        {activeTab === 'outfit' && (
          <>
            <AvatarSection label="Clothing Style">
              <AvatarChips values={AVATAR_OPTIONS.clothing} current={options.clothing} onSelect={v => set('clothing', v)} />
            </AvatarSection>
            <AvatarSection label="Clothing Color">
              <ColorRow colors={AVATAR_OPTIONS.clothingColor} value={options.clothingColor} names={CLOTH_COLOR_NAMES} onPick={c => set('clothingColor', c)} />
            </AvatarSection>
          </>
        )}

        {/* ── Extras ── */}
        {activeTab === 'extras' && (
          <>
            <AvatarSection label="Glasses">
              <div className="flex flex-wrap gap-1.5">
                <AvatarChip label="None" active={options.accessories === ''} onClick={() => set('accessories', '')} />
                {AVATAR_OPTIONS.accessories.map(v => (
                  <AvatarChip key={v} label={getLabel(v)} active={options.accessories === v} onClick={() => set('accessories', v)} />
                ))}
              </div>
            </AvatarSection>
            {options.accessories && (
              <AvatarSection label="Glasses Color">
                <ColorRow colors={AVATAR_OPTIONS.accessoriesColor} value={options.accessoriesColor} names={CLOTH_COLOR_NAMES} onPick={c => set('accessoriesColor', c)} />
              </AvatarSection>
            )}

          </>
        )}

      </div>
    </div>
  );
};

// ─── Study Heat-map ───────────────────────────────────────────────────────────
const StudyHeatmap = ({ history }: { history?: Record<string, number> }) => {
  const [tooltip, setTooltip] = React.useState<{ date: string; count: number; x: number; y: number } | null>(null);
  const WEEKS = 17;
  const DAYS = 7;
  const totalDays = WEEKS * DAYS;

  // Build array of last `totalDays` days, oldest first
  const days = React.useMemo(() => {
    const result: { dateKey: string; count: number; weekday: number }[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ dateKey: key, count: history?.[key] || 0, weekday: d.getDay() });
    }
    return result;
  }, [history]);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-secondary/60';
    if (count < 5) return 'bg-primary/25';
    if (count < 10) return 'bg-primary/55';
    if (count < 20) return 'bg-primary/80';
    return 'bg-primary';
  };

  // Build weeks: array of 7-day columns
  const weeks: typeof days[] = [];
  for (let w = 0; w < WEEKS; w++) {
    weeks.push(days.slice(w * DAYS, w * DAYS + DAYS));
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="relative">
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none bg-popover border border-border rounded-lg px-2.5 py-1.5 text-xs shadow-md whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y - 36 }}
        >
          <span className="font-semibold">{tooltip.date}</span>
          {' — '}
          {tooltip.count > 0 ? <span>{tooltip.count} questions</span> : <span className="text-muted-foreground">No study</span>}
        </div>
      )}
      <div className="flex gap-1">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-1 mr-1">
          {dayLabels.map((l, i) => (
            <div key={i} className="h-3 w-3 text-[8px] text-muted-foreground/60 flex items-center justify-center">
              {i % 2 === 1 ? l : ''}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => (
              <div
                key={di}
                className={`h-3 w-3 rounded-sm cursor-default transition-opacity hover:opacity-80 ${getColor(day.count)}`}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const container = e.currentTarget.closest('.relative');
                  const cRect = container?.getBoundingClientRect();
                  setTooltip({
                    date: day.dateKey,
                    count: day.count,
                    x: rect.left - (cRect?.left || 0),
                    y: rect.top - (cRect?.top || 0),
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
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

import { COUNTRIES } from '../utils/holidays';

const Profile = () => {
  const { userProfile, setUserProfile } = useStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: userProfile.name,
    studyField: userProfile.studyField || '',
    originCountry: userProfile.originCountry || 'Global'
  });

  const handleSaveProfile = () => {
    setUserProfile({
      ...userProfile,
      name: formData.name,
      studyField: formData.studyField,
      originCountry: formData.originCountry
    });
    setIsEditing(false);
  };

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
      const userAch = (userProfile.achievements || []).find(ua => ua.id === ach.id);
      
      let displayAch = { ...ach };
      let unlocked = !!userAch;
      
      if (ach.levels) {
          const currentLevel = userAch?.level || 0;
          const levels = [...ach.levels].sort((a, b) => a.level - b.level);
          const maxLevel = levels[levels.length - 1].level;
          
          // Show next level if not maxed, otherwise show max level
          const targetLevel = currentLevel < maxLevel ? currentLevel + 1 : maxLevel;
          
          const targetDef = levels.find(l => l.level === targetLevel);
          if (targetDef) {
              displayAch = {
                  ...displayAch,
                  title: targetDef.title,
                  description: targetDef.description,
                  xp: targetDef.xp,
              };
              // It is unlocked only if we have reached this specific target level
              unlocked = currentLevel >= targetLevel;
          }
      }

      return {
        ...displayAch,
        unlocked,
        icon: ACHIEVEMENT_ICONS[displayAch.icon] || Trophy
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
                      <>
                        <img
                          src={getAvatarUrl(userProfile.avatar)}
                          alt="Avatar"
                          className="h-full w-full object-cover"
                        />
                      </>
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
            {isEditing ? (
              <div className="space-y-4 max-w-md mx-auto md:mx-0 bg-background/50 backdrop-blur-sm p-6 rounded-2xl border border-border/50">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Study Field / Career</label>
                  <input
                    type="text"
                    value={formData.studyField}
                    onChange={(e) => setFormData({ ...formData, studyField: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Origin Country</label>
                  <select
                    value={formData.originCountry}
                    onChange={(e) => setFormData({ ...formData, originCountry: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border bg-background"
                  >
                    <option value="">Select Country</option>
                    {COUNTRIES.filter(c => c.code === 'Global').map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                    ))}
                    <option disabled>──────────</option>
                    {COUNTRIES.filter(c => c.code !== 'Global').map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveProfile}
                    className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-lg text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                  <h2 className="text-4xl font-bold tracking-tight">{userProfile.name}</h2>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-muted-foreground"
                    title="Edit Profile"
                  >
                    <Pen size={16} />
                  </button>
                </div>
                
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
                    {userProfile.originCountry && (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-sm font-medium">
                        {(() => {
                          const country = COUNTRIES.find(c => c.code === userProfile.originCountry);
                          return country ? <>{country.flag} {country.name}</> : null;
                        })()}
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
            )}
            
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


      {/* Study Activity Heat-map */}
      <div className="space-y-3 px-1">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" /> Study Activity
        </h3>
        <div className="rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Last 17 weeks</span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Less</span>
              {['bg-secondary/60', 'bg-primary/25', 'bg-primary/55', 'bg-primary/80', 'bg-primary'].map(c => (
                <div key={c} className={`h-3 w-3 rounded-sm ${c}`} />
              ))}
              <span>More</span>
            </div>
          </div>
          <StudyHeatmap history={userProfile.stats?.studyHistory} />
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
                            <img 
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
