import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, Download, Star, User, Eye, RefreshCw, UploadCloud, Globe,
  ChevronLeft, X, Heart, GitFork, Share2, Check, Filter, UserPlus, UserCheck,
  BookmarkCheck, ClipboardCopy, Hash,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Textarea from '../components/ui/Textarea';
import { useStore } from '../store/useStore';
import { marketplaceApi, readImportedLinks, saveImportedLink } from '../services/marketplace/marketplaceApi';
import type {
  DiscoverSort, DiscoverTab, ImportedSetLink, MarketplaceAuthor,
  NursingSubject, PublishSetInput, SharedSetDetail, SharedSetSummary, SharedSetVisibility,
} from '../types/marketplace';
import { NURSING_SUBJECTS } from '../types/marketplace';
import { getSupabaseClient } from '../services/marketplace/supabaseClient';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getAvatarUrl } from '../utils/avatar';
import { COUNTRIES } from '../utils/holidays';
import { DISCOVER_BOOKMARKS_KEY, DISCOVER_FOLLOWING_KEY, DISCOVER_REVIEWS_KEY } from '../utils/storageKeys';

// ── Subject metadata ──────────────────────────────────────────────────────────
const SUBJECT_META: Record<string, { emoji: string; short: string; color: string; bg: string; activeBg: string }> = {
  'Fundamentals of Nursing':                     { emoji: '🏥', short: 'Fundamentals',  color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20',    activeBg: 'bg-blue-500/30 border-blue-500/50' },
  'Health Assessment':                           { emoji: '🩺', short: 'Assessment',    color: 'text-cyan-600 dark:text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20',    activeBg: 'bg-cyan-500/30 border-cyan-500/50' },
  'Pharmacology':                                { emoji: '💊', short: 'Pharmacology',  color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20', activeBg: 'bg-purple-500/30 border-purple-500/50' },
  'Pathophysiology':                             { emoji: '🔬', short: 'Pathophysio',   color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20',      activeBg: 'bg-red-500/30 border-red-500/50' },
  'Medical-Surgical Nursing':                    { emoji: '🩹', short: 'Med-Surg',      color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20', activeBg: 'bg-orange-500/30 border-orange-500/50' },
  'Mental Health/Psychiatric Nursing':           { emoji: '🧠', short: 'Mental Health', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/20', activeBg: 'bg-violet-500/30 border-violet-500/50' },
  'Obstetrics & Gynecology (Maternity) Nursing': { emoji: '🤱', short: 'OB/GYN',        color: 'text-pink-600 dark:text-pink-400',    bg: 'bg-pink-500/10 border-pink-500/20 hover:bg-pink-500/20',    activeBg: 'bg-pink-500/30 border-pink-500/50' },
  'Pediatric Nursing':                           { emoji: '👶', short: 'Pediatrics',    color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20',  activeBg: 'bg-green-500/30 border-green-500/50' },
  'Community/Public Health Nursing':             { emoji: '🌍', short: 'Community',     color: 'text-teal-600 dark:text-teal-400',    bg: 'bg-teal-500/10 border-teal-500/20 hover:bg-teal-500/20',    activeBg: 'bg-teal-500/30 border-teal-500/50' },
  'Nursing Research & Evidence-Based Practice':  { emoji: '📊', short: 'Research',      color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20', activeBg: 'bg-indigo-500/30 border-indigo-500/50' },
  'Nursing Management/Leadership':               { emoji: '👩‍💼', short: 'Management',  color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20',  activeBg: 'bg-amber-500/30 border-amber-500/50' },
};

// ── LocalStorage helpers ──────────────────────────────────────────────────────

type LocalReview = { setId: string; rating: number; text: string };

const readBookmarks = (): Set<string>              => { try { const r = localStorage.getItem(DISCOVER_BOOKMARKS_KEY); return r ? new Set(JSON.parse(r) as string[]) : new Set(); } catch { return new Set(); } };
const saveBookmarks = (s: Set<string>)             => localStorage.setItem(DISCOVER_BOOKMARKS_KEY, JSON.stringify([...s]));
const readFollowing = (): Set<string>              => { try { const r = localStorage.getItem(DISCOVER_FOLLOWING_KEY); return r ? new Set(JSON.parse(r) as string[]) : new Set(); } catch { return new Set(); } };
const saveFollowing = (s: Set<string>)             => localStorage.setItem(DISCOVER_FOLLOWING_KEY, JSON.stringify([...s]));
const readReviews   = (): Map<string, LocalReview> => { try { const r = localStorage.getItem(DISCOVER_REVIEWS_KEY); if (!r) return new Map(); return new Map((JSON.parse(r) as LocalReview[]).map(rv => [rv.setId, rv])); } catch { return new Map(); } };
const saveReviews   = (m: Map<string, LocalReview>) => localStorage.setItem(DISCOVER_REVIEWS_KEY, JSON.stringify([...m.values()]));

// ── Resolved author shape ─────────────────────────────────────────────────────
type ResolvedAuthor = { displayName: string; avatarUrl?: string; country?: string; studyField?: string; bio?: string };

const getCountryInfo = (code?: string) => !code ? null : COUNTRIES.find(c => c.code === code) ?? null;

const avatarSrc = (url?: string, seed?: string): string => {
  if (!url) return getAvatarUrl(seed || 'user');
  return url.startsWith('http') ? url : getAvatarUrl(url);
};

// ── Sub-components ────────────────────────────────────────────────────────────
const AuthorAvatar = ({ avatarUrl, displayName, size = 'sm' }: { avatarUrl?: string; displayName: string; size?: 'sm' | 'md' | 'lg' }) => {
  const cls = { sm: 'h-8 w-8', md: 'h-12 w-12', lg: 'h-20 w-20' }[size];
  const ic  = { sm: 14, md: 20, lg: 36 }[size];
  return (
    <div className={`${cls} rounded-full overflow-hidden bg-primary/10 border-2 border-border shrink-0 flex items-center justify-center`}>
      {avatarUrl || displayName
        ? <img src={avatarSrc(avatarUrl, displayName)} alt={displayName} className="w-full h-full object-cover" />
        : <User size={ic} className="text-muted-foreground" />}
    </div>
  );
};

const StarDisplay = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) => {
  const filled = Math.round(rating);
  const cls = size === 'md' ? 'h-4 w-4' : 'h-3 w-3';
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map(s => <Star key={s} className={`${cls} ${s <= filled ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/25'}`} />)}
    </span>
  );
};

const StarInput = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const [hov, setHov] = useState(0);
  return (
    <div className="flex gap-1 justify-center">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)} onMouseEnter={() => setHov(s)} onMouseLeave={() => setHov(0)} className="p-1 transition-transform hover:scale-125">
          <Star className={`h-9 w-9 transition-colors ${s <= (hov || value) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
        </button>
      ))}
    </div>
  );
};

// ── SetCard ───────────────────────────────────────────────────────────────────
const SetCard = ({
  set, imported, updateAvailable, importing, forking,
  resolveAuthor, bookmarked, myReview, copiedId,
  onImport, onFork, onPreview, onAuthorClick, onBookmark, onCopyCode, onTagClick,
}: {
  set: SharedSetSummary; imported?: ImportedSetLink; updateAvailable: boolean;
  importing: boolean; forking: boolean;
  resolveAuthor: (a: MarketplaceAuthor) => ResolvedAuthor;
  bookmarked: boolean; myReview?: LocalReview; copiedId: string | null;
  onImport: () => void; onFork: () => void; onPreview: () => void;
  onAuthorClick: (a: MarketplaceAuthor) => void; onBookmark: () => void;
  onCopyCode: () => void; onTagClick: (tag: string) => void;
}) => {
  const author  = resolveAuthor(set.author);
  const country = getCountryInfo(author.country);
  const isCopied = copiedId === set.id;

  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm flex flex-col overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-200">
      {/* Author banner */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-secondary/20 border-b border-border/30">
        <button type="button" onClick={() => onAuthorClick(set.author)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
          <AuthorAvatar avatarUrl={author.avatarUrl} displayName={author.displayName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">{author.displayName}</p>
            {country
              ? <p className="text-xs text-muted-foreground">{country.flag} {country.name}</p>
              : <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> Community</p>}
          </div>
        </button>
        <button type="button" onClick={onBookmark} className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors shrink-0">
          <Heart className={`h-4 w-4 transition-colors ${bookmarked ? 'fill-red-500 text-red-500' : 'text-muted-foreground hover:text-red-400'}`} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-semibold text-base line-clamp-2 leading-snug mb-1">{set.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2">{set.description}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUBJECT_META[set.subject] && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${SUBJECT_META[set.subject].bg} ${SUBJECT_META[set.subject].color}`}>
              {SUBJECT_META[set.subject].emoji} {SUBJECT_META[set.subject].short}
            </span>
          )}
          {set.tags.slice(0, 2).map(tag => (
            <button key={tag} type="button" onClick={() => onTagClick(tag)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 text-xs text-muted-foreground transition-colors">
              <Hash className="h-2.5 w-2.5" />{tag}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{set.ratingAverage.toFixed(1)}<span className="opacity-60">({set.ratingCount})</span></span>
          <span className="flex items-center gap-1"><Download className="h-3 w-3" />{set.downloads.toLocaleString()}</span>
          <span className="ml-auto font-medium">{set.questionCount} Qs</span>
        </div>
        {myReview && (
          <div className="flex items-center gap-2 bg-yellow-500/10 rounded-lg px-2 py-1.5">
            <StarDisplay rating={myReview.rating} />
            {myReview.text && <span className="text-xs text-muted-foreground truncate">{myReview.text}</span>}
          </div>
        )}
        {imported && !updateAvailable && <p className="text-xs text-green-600 font-medium">Imported (v{imported.remoteVersion})</p>}
        {updateAvailable && <p className="text-xs text-amber-600 font-medium">Update available (v{set.version})</p>}
        <div className="mt-auto space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <Button type="button" variant="outline" onClick={onPreview} className="text-xs h-8"><Eye className="mr-1.5 h-3.5 w-3.5" />Preview</Button>
            <Button type="button" onClick={onImport} disabled={importing} className="text-xs h-8">
              {updateAvailable ? <><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Update</> : <><Download className="mr-1.5 h-3.5 w-3.5" />Import</>}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Button type="button" variant="outline" onClick={onFork} disabled={forking} className="text-xs h-7 text-muted-foreground">
              <GitFork className="mr-1 h-3 w-3" />Fork
            </Button>
            <Button type="button" variant="outline" onClick={onCopyCode} className={`text-xs h-7 transition-colors ${isCopied ? 'text-green-600 border-green-500/50' : 'text-muted-foreground'}`}>
              {isCopied ? <><Check className="mr-1 h-3 w-3" />Copied</> : <><Share2 className="mr-1 h-3 w-3" />Share</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Author Profile Panel ──────────────────────────────────────────────────────
const AuthorProfilePanel = ({
  author, allItems, resolveAuthor, importLinksByRemoteSet,
  importingSetId, forkingSetId, myReviews, bookmarks, copiedId,
  following, onFollowToggle, onImport, onFork, onPreview, onBookmark, onCopyCode, onClose,
}: {
  author: MarketplaceAuthor; allItems: SharedSetSummary[];
  resolveAuthor: (a: MarketplaceAuthor) => ResolvedAuthor;
  importLinksByRemoteSet: Map<string, ImportedSetLink>;
  importingSetId: string | null; forkingSetId: string | null;
  myReviews: Map<string, LocalReview>; bookmarks: Set<string>; copiedId: string | null;
  following: Set<string>; onFollowToggle: (id: string) => void;
  onImport: (s: SharedSetSummary) => void; onFork: (s: SharedSetSummary) => void;
  onPreview: (id: string) => void; onBookmark: (id: string) => void;
  onCopyCode: (id: string) => void; onClose: () => void;
}) => {
  const resolved      = resolveAuthor(author);
  const country       = getCountryInfo(resolved.country);
  const authorSets    = allItems.filter(s => s.author.id === author.id);
  const isFollowing   = following.has(author.id);
  const totalDownloads = authorSets.reduce((sum, s) => sum + s.downloads, 0);

  return (
    <div className="flex flex-col h-full gap-5">
      <div className="flex justify-end shrink-0">
        <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"><X className="h-4 w-4" /></button>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/20 via-background to-background border border-border/50 p-5 shrink-0">
        <div className="absolute -top-8 -right-8 opacity-5 blur-2xl"><User size={180} /></div>
        <div className="relative z-10 flex items-start gap-4">
          <AuthorAvatar avatarUrl={resolved.avatarUrl} displayName={resolved.displayName} size="lg" />
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold tracking-tight truncate">{resolved.displayName}</h3>
            {resolved.studyField && <p className="text-sm text-muted-foreground mt-0.5">{resolved.studyField}</p>}
            {resolved.bio && <p className="text-xs text-muted-foreground mt-2 line-clamp-3 leading-relaxed">{resolved.bio}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              {country && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                  {country.flag} {country.name}
                </span>
              )}
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-medium">{authorSets.length} sets</span>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 text-xs font-medium">
                <Download className="h-3 w-3" />{totalDownloads.toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onFollowToggle(author.id)}
              className={`mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isFollowing
                  ? 'bg-primary/10 text-primary border border-primary/30 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {isFollowing ? <><UserCheck className="h-3.5 w-3.5" />Following</> : <><UserPlus className="h-3.5 w-3.5" />Follow</>}
            </button>
          </div>
        </div>
      </div>

      {/* Sets list */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Sets by {resolved.displayName} ({authorSets.length})
        </h4>
        {authorSets.length === 0
          ? <p className="text-sm text-muted-foreground">No public sets yet.</p>
          : authorSets.map(set => {
              const imp = importLinksByRemoteSet.get(set.id);
              const upd = !!imp && set.version > imp.remoteVersion;
              const myR = myReviews.get(set.id);
              return (
                <div key={set.id} className="rounded-xl border border-border/40 bg-card/40 p-3 flex items-start gap-3 hover:border-border/70 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1">{set.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{set.description}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{set.ratingAverage.toFixed(1)}</span>
                      <span className="flex items-center gap-0.5"><Download className="h-3 w-3" />{set.downloads.toLocaleString()}</span>
                      <span>{set.questionCount} Qs</span>
                      {imp && !upd && <span className="text-green-600">Imported</span>}
                      {upd && <span className="text-amber-600">Update avail.</span>}
                      {myR && <StarDisplay rating={myR.rating} />}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => onBookmark(set.id)} className="p-1.5 rounded hover:bg-secondary transition-colors">
                      <Heart className={`h-3.5 w-3.5 ${bookmarks.has(set.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                    </button>
                    <button type="button" onClick={() => onPreview(set.id)} className="p-1.5 rounded hover:bg-secondary transition-colors"><Eye className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button type="button" onClick={() => onImport(set)} disabled={importingSetId === set.id} className="p-1.5 rounded hover:bg-secondary transition-colors">
                      {upd ? <RefreshCw className="h-3.5 w-3.5 text-amber-500" /> : <Download className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                    <button type="button" onClick={() => onFork(set)} disabled={forkingSetId === set.id} className="p-1.5 rounded hover:bg-secondary transition-colors"><GitFork className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button type="button" onClick={() => onCopyCode(set.id)} className="p-1.5 rounded hover:bg-secondary transition-colors">
                      {copiedId === set.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Share2 className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
              );
            })
        }
      </div>
    </div>
  );
};

// ── Main Discover ─────────────────────────────────────────────────────────────
const Discover = () => {
  const {
    addQuestion, addQuestionToSet, addSet,
    sets: allSets, questions: allQuestions,
    activeProfileId, updateQuestion, updateSet, userProfile,
  } = useStore();

  const sets      = useMemo(() => allSets.filter(s => !s.profileId || s.profileId === activeProfileId), [allSets, activeProfileId]);
  const questions = useMemo(() => allQuestions.filter(q => !q.profileId || q.profileId === activeProfileId), [allQuestions, activeProfileId]);

  // Core state
  const [loading,    setLoading]    = useState(true);
  const [items,      setItems]      = useState<SharedSetSummary[]>([]);
  const [query,      setQuery]      = useState('');
  const [subject,    setSubject]    = useState<NursingSubject | ''>('');
  const [sort,       setSort]       = useState<DiscoverSort>('popular');
  const [activeTab,  setActiveTab]  = useState<DiscoverTab>('all');
  const [activeTag,  setActiveTag]  = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [advFilters, setAdvFilters] = useState({ minQuestions: 0, minRating: 0 });

  // Preview
  const [selectedSet,     setSelectedSet]     = useState<SharedSetDetail | null>(null);
  const [isPreviewOpen,   setIsPreviewOpen]   = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Set<string>>(new Set());
  const [importingSetId,  setImportingSetId]  = useState<string | null>(null);
  const [forkingSetId,    setForkingSetId]    = useState<string | null>(null);
  const [importLinksVersion, setImportLinksVersion] = useState(0);

  // Social
  const [bookmarks, setBookmarks] = useState<Set<string>>(readBookmarks);
  const [following, setFollowing] = useState<Set<string>>(readFollowing);
  const [myReviews, setMyReviews] = useState<Map<string, LocalReview>>(readReviews);
  const [ratingTarget, setRatingTarget] = useState<SharedSetSummary | null>(null);
  const [ratingForm,   setRatingForm]   = useState({ rating: 0, text: '' });
  const [copiedId,     setCopiedId]     = useState<string | null>(null);

  // Author panel
  const [viewingAuthor, setViewingAuthor] = useState<MarketplaceAuthor | null>(null);

  // Import by code
  const [codeInput,       setCodeInput]       = useState('');
  const [codeError,       setCodeError]       = useState('');
  const [importingCode,   setImportingCode]   = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  // Track whether Supabase is configured (env vars present)
  const [supabaseAvailable] = useState(() => getSupabaseClient() !== null);

  // Publish — uses the app's existing Supabase session (no separate sign-in)
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [isPublishOpen,   setIsPublishOpen]   = useState(false);
  const [publishing,      setPublishing]      = useState(false);
  const [publishError,    setPublishError]    = useState('');
  const [publishData,     setPublishData]     = useState({
    localSetId: '', subject: '' as NursingSubject | '',
    tags: '', visibility: 'public' as SharedSetVisibility, descriptionOverride: '',
  });

  // ── The app profile IS the author profile ─────────────────────────────────
  // No separate author profile setup needed — we use userProfile directly.
  const myAuthorProfile = useMemo((): ResolvedAuthor => ({
    displayName: userProfile.name,
    avatarUrl:   userProfile.avatar ? getAvatarUrl(userProfile.avatar) : undefined,
    country:     userProfile.originCountry,
    studyField:  userProfile.studyField,
    bio:         undefined,
  }), [userProfile]);

  // Resolve any author: if it's the current user, use their live app profile
  const resolveAuthor = useCallback((author: MarketplaceAuthor): ResolvedAuthor => {
    if (supabaseSession?.user?.id && author.id === supabaseSession.user.id) {
      return myAuthorProfile;
    }
    return {
      displayName: author.displayName,
      avatarUrl:   author.avatarUrl,
      country:     author.country,
      studyField:  author.studyField,
      bio:         author.bio,
    };
  }, [supabaseSession?.user?.id, myAuthorProfile]);

  // ── Data loading ──────────────────────────────────────────────────────────
  const reloadDiscover = useCallback(async () => {
    setLoading(true);
    try {
      const res = await marketplaceApi.discoverSets({ query, subject, sort, page: 1, pageSize: 50 });
      setItems(res.items);
    } finally { setLoading(false); }
  }, [query, sort, subject]);

  useEffect(() => { void reloadDiscover(); }, [reloadDiscover]);

  // ── Supabase session (silently picked up from the app's existing login) ───
  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb) return;
    let mounted = true;
    void sb.auth.getSession().then(({ data }) => { if (mounted) setSupabaseSession(data.session ?? null); });
    const { data: listener } = sb.auth.onAuthStateChange((_e: AuthChangeEvent, s: Session | null) => setSupabaseSession(s));
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  const importLinksByRemoteSet = useMemo(() => {
    const links = readImportedLinks();
    const map = new Map<string, ImportedSetLink>();
    for (const l of links) map.set(l.remoteSetId, l);
    return map;
  }, [importLinksVersion]);

  // ── Computed ──────────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    let r = [...items];
    if (activeTab === 'trending')  r = [...r].sort((a, b) => b.downloads - a.downloads);
    else if (activeTab === 'new')  r = [...r].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (activeTab === 'saved')     r = r.filter(s => bookmarks.has(s.id));
    else if (activeTab === 'following') r = r.filter(s => following.has(s.author.id));
    if (activeTag)                   r = r.filter(s => s.tags.some(t => t.toLowerCase() === activeTag.toLowerCase()));
    if (advFilters.minQuestions > 0) r = r.filter(s => s.questionCount >= advFilters.minQuestions);
    if (advFilters.minRating > 0)    r = r.filter(s => s.ratingAverage >= advFilters.minRating);
    return r;
  }, [items, activeTab, bookmarks, following, activeTag, advFilters]);

  const featuredAuthors = useMemo(() => {
    const map = new Map<string, { author: MarketplaceAuthor; totalDownloads: number; setCount: number }>();
    for (const item of items) {
      const ex = map.get(item.author.id);
      if (ex) { ex.totalDownloads += item.downloads; ex.setCount++; }
      else map.set(item.author.id, { author: item.author, totalDownloads: item.downloads, setCount: 1 });
    }
    return [...map.values()].sort((a, b) => b.totalDownloads - a.totalDownloads).slice(0, 6);
  }, [items]);

  const subjectCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(item.subject, (counts.get(item.subject) ?? 0) + 1);
    return counts;
  }, [items]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const toggleBookmark = (setId: string) => setBookmarks(prev => { const n = new Set(prev); n.has(setId) ? n.delete(setId) : n.add(setId); saveBookmarks(n); return n; });
  const toggleFollow   = (id: string)    => setFollowing(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); saveFollowing(n); return n; });
  const copyCode       = (setId: string) => { void navigator.clipboard.writeText(setId); setCopiedId(setId); setTimeout(() => setCopiedId(null), 2000); };

  const submitReview = () => {
    if (!ratingTarget || ratingForm.rating === 0) return;
    const review: LocalReview = { setId: ratingTarget.id, rating: ratingForm.rating, text: ratingForm.text };
    setMyReviews(prev => { const n = new Map(prev); n.set(ratingTarget.id, review); saveReviews(n); return n; });
    setRatingTarget(null);
    setRatingForm({ rating: 0, text: '' });
  };

  const openPreview = async (setId: string) => {
    const detail = await marketplaceApi.getSetById(setId);
    if (!detail) return;
    setSelectedSet(detail);
    setRevealedAnswers(new Set());
    setIsPreviewOpen(true);
  };

  const importSet = async (setSummary: SharedSetSummary) => {
    setImportingSetId(setSummary.id);
    try {
      const detail = await marketplaceApi.getSetById(setSummary.id);
      if (!detail) return;
      const importedLink = importLinksByRemoteSet.get(detail.id);
      const canMerge = importedLink && detail.version > importedLink.remoteVersion;

      if (canMerge) {
        const localSet = sets.find(s => s.id === importedLink.localSetId);
        if (!localSet) return;
        const qMap = new Map((importedLink.questionLinks || []).map(l => [l.remoteQuestionId, l.localQuestionId]));
        const nextLinks: { remoteQuestionId: string; localQuestionId: string }[] = [];
        const orderedIds: string[] = [];
        for (const rq of detail.questions) {
          const lid = qMap.get(rq.remoteQuestionId);
          const lq  = lid ? questions.find(q => q.id === lid) : undefined;
          if (lq) {
            updateQuestion(lq.id, { content: rq.content, rationale: rq.rationale, answer: rq.answers, options: rq.options, tags: rq.tags });
            nextLinks.push({ remoteQuestionId: rq.remoteQuestionId, localQuestionId: lq.id });
            orderedIds.push(lq.id);
          } else {
            const lqId = addQuestion({ content: rq.content, rationale: rq.rationale, answer: rq.answers, options: rq.options, tags: rq.tags });
            addQuestionToSet(localSet.id, lqId);
            nextLinks.push({ remoteQuestionId: rq.remoteQuestionId, localQuestionId: lqId });
            orderedIds.push(lqId);
          }
        }
        const linkedIds = new Set((importedLink.questionLinks || []).map(x => x.localQuestionId));
        updateSet(localSet.id, { title: detail.title, description: `${detail.description} (Imported)`, questionIds: [...orderedIds, ...localSet.questionIds.filter(id => !linkedIds.has(id))] });
        saveImportedLink({ remoteSetId: detail.id, remoteVersion: detail.version, localSetId: localSet.id, importedAt: Date.now(), questionLinks: nextLinks });
        setImportLinksVersion(v => v + 1);
        return;
      }

      const localSetId = addSet({ title: detail.title, description: `${detail.description} (Imported)`, questionIds: [] });
      const qLinks: { remoteQuestionId: string; localQuestionId: string }[] = [];
      for (const q of detail.questions) {
        const lqId = addQuestion({ content: q.content, rationale: q.rationale, answer: q.answers, options: q.options, tags: q.tags });
        addQuestionToSet(localSetId, lqId);
        qLinks.push({ remoteQuestionId: q.remoteQuestionId, localQuestionId: lqId });
      }
      saveImportedLink({ remoteSetId: detail.id, remoteVersion: detail.version, localSetId, importedAt: Date.now(), questionLinks: qLinks });
      setImportLinksVersion(v => v + 1);
      if (!myReviews.has(detail.id)) setRatingTarget(setSummary);
    } finally { setImportingSetId(null); }
  };

  const forkSet = async (setSummary: SharedSetSummary) => {
    setForkingSetId(setSummary.id);
    try {
      const detail = await marketplaceApi.getSetById(setSummary.id);
      if (!detail) return;
      const authorName = resolveAuthor(detail.author).displayName;
      const localSetId = addSet({ title: `${detail.title} (Fork)`, description: `Forked from ${authorName}. ${detail.description}`, questionIds: [] });
      for (const q of detail.questions) {
        const lqId = addQuestion({ content: q.content, rationale: q.rationale, answer: q.answers, options: q.options, tags: q.tags });
        addQuestionToSet(localSetId, lqId);
      }
    } finally { setForkingSetId(null); }
  };

  const handleImportByCode = async () => {
    if (!codeInput.trim()) return;
    setCodeError('');
    setImportingCode(true);
    try {
      const detail = await marketplaceApi.getSetById(codeInput.trim());
      if (!detail) { setCodeError('Set not found. Check the code and try again.'); return; }
      await importSet({ id: detail.id, slug: detail.slug, title: detail.title, description: detail.description, tags: detail.tags, subject: detail.subject, visibility: detail.visibility, version: detail.version, downloads: detail.downloads, ratingAverage: detail.ratingAverage, ratingCount: detail.ratingCount, questionCount: detail.questionCount, createdAt: detail.createdAt, updatedAt: detail.updatedAt, author: detail.author });
      setCodeInput('');
      setIsCodeModalOpen(false);
    } finally { setImportingCode(false); }
  };

  // Publish — no separate author profile step, just use userProfile
  const openPublishModal = () => {
    if (!supabaseSession?.user) {
      // Not signed into Supabase — redirect to the app's main login
      window.location.hash = '/login';
      return;
    }
    setPublishData({ localSetId: sets[0]?.id || '', subject: '', tags: '', visibility: 'public', descriptionOverride: '' });
    setPublishError('');
    setIsPublishOpen(true);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishError('');
    const localSet = sets.find(s => s.id === publishData.localSetId);
    if (!localSet) { setPublishError('Choose a local set first.'); return; }
    if (!publishData.subject) { setPublishError('Choose a subject.'); return; }
    const localQs = localSet.questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean);
    if (localQs.length === 0) { setPublishError('Selected set has no questions.'); return; }
    const payload: PublishSetInput = {
      title: localSet.title,
      description: publishData.descriptionOverride.trim() || localSet.description || '',
      subject: publishData.subject,
      tags: publishData.tags.split(',').map(t => t.trim()).filter(Boolean),
      visibility: publishData.visibility,
      questions: localQs.map((q, i) => ({ remoteQuestionId: q.id, content: q.content, rationale: q.rationale, options: q.options || [], answers: q.answer, tags: q.tags, orderIndex: i + 1 })),
    };
    setPublishing(true);
    try { await marketplaceApi.publishSet(payload); setIsPublishOpen(false); await reloadDiscover(); }
    catch (err) { setPublishError(err instanceof Error ? err.message : 'Failed to publish.'); }
    finally { setPublishing(false); }
  };

  const TABS: { id: DiscoverTab; label: string }[] = [
    { id: 'all',       label: 'All Sets' },
    { id: 'trending',  label: '🔥 Trending' },
    { id: 'new',       label: '✨ New' },
    { id: 'saved',     label: `♥ Saved${bookmarks.size > 0 ? ` (${bookmarks.size})` : ''}` },
    { id: 'following', label: `Following${following.size > 0 ? ` (${following.size})` : ''}` },
  ];

  return (
    <div className="space-y-6 pb-20">

      {/* ── Supabase offline banner ───────────────────────────────────────── */}
      {!supabaseAvailable && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-700 dark:text-amber-400">
          <Globe className="h-4 w-4 shrink-0" />
          <span>
            <strong>Online features unavailable.</strong> Publishing and account sync require Supabase configuration. You can still browse and import from the local mock catalogue.
          </span>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Discover</h2>
          <p className="text-muted-foreground text-sm">Browse, import, and share community question sets.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Show who they'll publish as — no separate sign-in needed */}
          {supabaseSession?.user && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/50 border border-border/40 text-sm text-muted-foreground">
              <AuthorAvatar avatarUrl={myAuthorProfile.avatarUrl} displayName={myAuthorProfile.displayName} size="sm" />
              <span className="hidden sm:block max-w-[140px] truncate font-medium text-foreground">{myAuthorProfile.displayName}</span>
              {(() => { const c = getCountryInfo(myAuthorProfile.country); return c ? <span className="text-base">{c.flag}</span> : null; })()}
            </div>
          )}
          <Button type="button" variant="outline" className="text-xs h-8" onClick={() => setIsCodeModalOpen(true)}>
            <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" />Import by Code
          </Button>
          <Button type="button" onClick={openPublishModal} disabled={sets.length === 0}>
            <UploadCloud className="mr-2 h-4 w-4" />Publish Set
          </Button>
        </div>
      </div>

      {/* ── Featured Authors ──────────────────────────────────────────────────── */}
      {featuredAuthors.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /> Top Contributors
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {featuredAuthors.map(({ author, totalDownloads, setCount }) => {
              const r  = resolveAuthor(author);
              const c  = getCountryInfo(r.country);
              const iF = following.has(author.id);
              return (
                <div key={author.id} className="shrink-0 w-44 rounded-2xl border border-border/50 bg-card/50 p-4 flex flex-col items-center gap-2 text-center cursor-pointer hover:border-primary/30 hover:shadow-md transition-all" onClick={() => setViewingAuthor(author)}>
                  <AuthorAvatar avatarUrl={r.avatarUrl} displayName={r.displayName} size="md" />
                  <div className="w-full">
                    <p className="font-semibold text-sm truncate">{r.displayName}</p>
                    {c && <p className="text-xs text-muted-foreground">{c.flag} {c.name}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{setCount} sets · {totalDownloads.toLocaleString()} imports</p>
                  </div>
                  <button type="button" onClick={e => { e.stopPropagation(); toggleFollow(author.id); }} className={`w-full text-xs py-1 rounded-lg font-medium transition-colors ${iF ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                    {iF ? 'Following' : '+ Follow'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Subject Category Cards ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <BookmarkCheck className="h-3.5 w-3.5" /> Browse by Subject
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          <button type="button" onClick={() => setSubject('')} className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${!subject ? 'bg-foreground text-background border-foreground' : 'bg-card/50 border-border/50 hover:bg-secondary/50 text-muted-foreground'}`}>All</button>
          {NURSING_SUBJECTS.map(sub => {
            const meta   = SUBJECT_META[sub];
            const count  = subjectCounts.get(sub) ?? 0;
            const active = subject === sub;
            return (
              <button key={sub} type="button" onClick={() => setSubject(active ? '' : sub)} className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${active ? `${meta?.activeBg} ${meta?.color}` : `${meta?.bg} ${meta?.color}`}`}>
                <span>{meta?.emoji}</span><span>{meta?.short}</span>
                {count > 0 && <span className="opacity-60 text-xs">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active tag badge */}
      {activeTag && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Tag:</span>
          <span className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium border border-primary/20">
            <Hash className="h-3.5 w-3.5" />{activeTag}
            <button type="button" onClick={() => setActiveTag('')} className="ml-1 hover:opacity-70"><X className="h-3.5 w-3.5" /></button>
          </span>
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto border-b border-border/50" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(tab => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`shrink-0 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Search + Filters ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-card/30 p-3 rounded-xl border border-border/50">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search title, tag, author…" className="pl-10" />
          </div>
          <select value={sort} onChange={e => setSort(e.target.value as DiscoverSort)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={activeTab === 'trending' || activeTab === 'new'}>
            <option value="popular">Most Popular</option>
            <option value="new">Recently Updated</option>
            <option value="rating">Highest Rated</option>
          </select>
          <button type="button" onClick={() => setShowFilters(v => !v)} className={`h-10 flex items-center justify-center gap-2 px-3 rounded-md border text-sm font-medium transition-colors ${showFilters ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background text-muted-foreground hover:text-foreground'}`}>
            <Filter className="h-4 w-4" />Filters{(advFilters.minQuestions > 0 || advFilters.minRating > 0) ? ' ●' : ''}
          </button>
        </div>

        {showFilters && (
          <div className="rounded-xl border border-border/50 bg-card/30 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Min. Questions: {advFilters.minQuestions === 0 ? 'Any' : `${advFilters.minQuestions}+`}</label>
              <input type="range" min={0} max={20} step={1} value={advFilters.minQuestions} onChange={e => setAdvFilters(p => ({ ...p, minQuestions: Number(e.target.value) }))} className="w-full accent-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Min. Rating</label>
              <div className="flex gap-2">
                {[0, 3, 3.5, 4, 4.5].map(r => (
                  <button key={r} type="button" onClick={() => setAdvFilters(p => ({ ...p, minRating: r }))} className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${advFilters.minRating === r ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-secondary'}`}>
                    {r === 0 ? 'Any' : `${r}★`}
                  </button>
                ))}
              </div>
            </div>
            {(advFilters.minQuestions > 0 || advFilters.minRating > 0) && (
              <div className="sm:col-span-2">
                <button type="button" onClick={() => setAdvFilters({ minQuestions: 0, minRating: 0 })} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <X className="h-3 w-3" />Clear filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Main grid + author panel ─────────────────────────────────────────── */}
      <div className="flex gap-6 items-start">
        <div className={`flex-1 min-w-0 ${viewingAuthor ? 'hidden lg:block' : ''}`}>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1,2,3,4,5,6].map(i => <div key={i} className="rounded-2xl border border-border/30 bg-card/30 h-60 animate-pulse" />)}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              {activeTab === 'saved'     ? 'No bookmarked sets yet — heart any set to save it.' :
               activeTab === 'following' ? 'Follow some authors to see their sets here.' :
               'No sets match your filters.'}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map(set => {
                const imported = importLinksByRemoteSet.get(set.id);
                const updateAvailable = !!imported && set.version > imported.remoteVersion;
                return (
                  <SetCard
                    key={set.id} set={set} imported={imported}
                    updateAvailable={updateAvailable}
                    importing={importingSetId === set.id}
                    forking={forkingSetId === set.id}
                    resolveAuthor={resolveAuthor}
                    bookmarked={bookmarks.has(set.id)}
                    myReview={myReviews.get(set.id)}
                    copiedId={copiedId}
                    onImport={() => void importSet(set)}
                    onFork={() => void forkSet(set)}
                    onPreview={() => void openPreview(set.id)}
                    onAuthorClick={a => setViewingAuthor(a)}
                    onBookmark={() => toggleBookmark(set.id)}
                    onCopyCode={() => copyCode(set.id)}
                    onTagClick={tag => { setActiveTag(tag); setViewingAuthor(null); }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {viewingAuthor && (
          <div className="lg:w-[400px] lg:shrink-0 lg:sticky lg:top-4 w-full">
            <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
              <button type="button" onClick={() => setViewingAuthor(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 lg:hidden">
                <ChevronLeft className="h-4 w-4" />Back
              </button>
              <div className="flex-1 overflow-y-auto">
                <AuthorProfilePanel
                  author={viewingAuthor} allItems={items}
                  resolveAuthor={resolveAuthor}
                  importLinksByRemoteSet={importLinksByRemoteSet}
                  importingSetId={importingSetId} forkingSetId={forkingSetId}
                  myReviews={myReviews} bookmarks={bookmarks} copiedId={copiedId}
                  following={following} onFollowToggle={toggleFollow}
                  onImport={s => void importSet(s)} onFork={s => void forkSet(s)}
                  onPreview={id => void openPreview(id)}
                  onBookmark={toggleBookmark} onCopyCode={copyCode}
                  onClose={() => setViewingAuthor(null)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Preview Modal ─────────────────────────────────────────────────────── */}
      <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title={selectedSet ? `${selectedSet.title} — Preview` : 'Preview'} maxWidth="max-w-3xl">
        {selectedSet && (() => {
          const author = resolveAuthor(selectedSet.author);
          const country = getCountryInfo(author.country);
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <AuthorAvatar avatarUrl={author.avatarUrl} displayName={author.displayName} size="md" />
                <div>
                  <p className="font-semibold">{author.displayName}</p>
                  {country && <p className="text-xs text-muted-foreground">{country.flag} {country.name}</p>}
                </div>
                <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                  <StarDisplay rating={selectedSet.ratingAverage} size="md" />
                  <span>{selectedSet.ratingAverage.toFixed(1)} · {selectedSet.questionCount} Qs · v{selectedSet.version}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{selectedSet.description}</p>
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {selectedSet.questions.map((q, i) => (
                  <div key={q.id} className="rounded-lg border border-border/50 p-4 bg-card/50 space-y-2">
                    <p className="font-medium text-sm">{i + 1}. {q.content}</p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {q.options.map(opt => (
                        <div key={opt} className={`px-2 py-1 rounded transition-colors ${revealedAnswers.has(q.id) && q.answers.includes(opt) ? 'bg-green-500/15 text-green-700 dark:text-green-400 font-medium' : ''}`}>
                          • {opt}
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => setRevealedAnswers(prev => { const n = new Set(prev); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; })} className="text-xs text-primary hover:underline">
                      {revealedAnswers.has(q.id) ? 'Hide answer' : 'Show answer'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Rating Modal ──────────────────────────────────────────────────────── */}
      <Modal isOpen={!!ratingTarget} onClose={() => setRatingTarget(null)} title="Rate This Set" maxWidth="max-w-md">
        {ratingTarget && (
          <div className="space-y-5">
            <div className="text-center">
              <p className="font-semibold text-lg">{ratingTarget.title}</p>
              <p className="text-sm text-muted-foreground mt-1">How would you rate this set?</p>
            </div>
            <StarInput value={ratingForm.rating} onChange={r => setRatingForm(p => ({ ...p, rating: r }))} />
            <Textarea value={ratingForm.text} onChange={e => setRatingForm(p => ({ ...p, text: e.target.value }))} placeholder="Leave a short review (optional)…" className="min-h-[80px]" />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setRatingTarget(null)}>Skip</Button>
              <Button type="button" onClick={submitReview} disabled={ratingForm.rating === 0}>Submit Rating</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Import by Code Modal ──────────────────────────────────────────────── */}
      <Modal isOpen={isCodeModalOpen} onClose={() => { setIsCodeModalOpen(false); setCodeInput(''); setCodeError(''); }} title="Import by Code" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Paste a set code shared by another user to import it directly.</p>
          <Input value={codeInput} onChange={e => { setCodeInput(e.target.value); setCodeError(''); }} placeholder="Paste set code here…" />
          {codeError && <p className="text-sm text-destructive">{codeError}</p>}
          <p className="text-xs text-muted-foreground">Tip: codes look like <code className="bg-muted px-1 rounded">set_fundamentals_safety_001</code></p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsCodeModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => void handleImportByCode()} disabled={importingCode || !codeInput.trim()}>
              {importingCode ? 'Importing…' : 'Import'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Publish Modal ─────────────────────────────────────────────────────── */}
      <Modal isOpen={isPublishOpen} onClose={() => setIsPublishOpen(false)} title="Publish Set to Community" maxWidth="max-w-2xl">
        <form onSubmit={handlePublish} className="space-y-4">
          {/* Show publishing identity — taken straight from their profile */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/40">
            <AuthorAvatar avatarUrl={myAuthorProfile.avatarUrl} displayName={myAuthorProfile.displayName} size="md" />
            <div>
              <p className="font-semibold text-sm">Publishing as <span className="text-primary">{myAuthorProfile.displayName}</span></p>
              <p className="text-xs text-muted-foreground">
                {(() => { const c = getCountryInfo(myAuthorProfile.country); return c ? `${c.flag} ${c.name}` : ''; })()}
                {myAuthorProfile.studyField ? ` · ${myAuthorProfile.studyField}` : ''}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Your name, avatar and country are taken from your Profile page.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Local Set</label>
            <select required value={publishData.localSetId} onChange={e => setPublishData(p => ({ ...p, localSetId: e.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select set…</option>
              {sets.map(s => <option key={s.id} value={s.id}>{s.title} ({s.questionIds.length} questions)</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <select required value={publishData.subject} onChange={e => setPublishData(p => ({ ...p, subject: e.target.value as NursingSubject }))} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select subject…</option>
                {NURSING_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Visibility</label>
              <select value={publishData.visibility} onChange={e => setPublishData(p => ({ ...p, visibility: e.target.value as SharedSetVisibility }))} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tags</label>
            <Input value={publishData.tags} onChange={e => setPublishData(p => ({ ...p, tags: e.target.value }))} placeholder="fundamentals, delegation, safety" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description Override (optional)</label>
            <Input value={publishData.descriptionOverride} onChange={e => setPublishData(p => ({ ...p, descriptionOverride: e.target.value }))} placeholder="Leave blank to use local set description" />
          </div>
          {publishError && <p className="text-sm text-destructive">{publishError}</p>}
          <div className="flex justify-end"><Button type="submit" disabled={publishing}>{publishing ? 'Publishing…' : 'Publish Set'}</Button></div>
        </form>
      </Modal>
    </div>
  );
};

export default Discover;
