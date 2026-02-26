import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';
import {
  Activity,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  Star,
  Trophy,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Button from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import Input from '../components/ui/Input';
import { getHolidayForToday } from '../utils/holidays';
import { getQuotesByField } from '../utils/quotes';

// Animated count-up hook (ease-out cubic)
const useCountUp = (target: number, duration = 900) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
    if (target === 0) return;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.floor(eased * target));
      if (t < 1) requestAnimationFrame(tick);
      else setCount(target);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return count;
};

const MILESTONES = [
  { label: 'Quick Learner',    icon: '⚡', threshold: 10   },
  { label: 'Knowledge Seeker', icon: '📖', threshold: 50   },
  { label: 'Centurion',        icon: '🏛️', threshold: 100  },
  { label: 'Brainiac',         icon: '🧠', threshold: 500  },
  { label: 'Marathoner',       icon: '🏃', threshold: 1000 },
];

const Dashboard = () => {
  const {
    questions: allQuestions,
    sets: allSets,
    userProfile,
    setUserProfile,
    updateLastVisit,
    activeProfileId,
    getDailyChallenge,
  } = useStore();

  const dailyChallenge = allSets.length > 0 ? getDailyChallenge() : null;
  const questions = useMemo(
    () => allQuestions.filter(q => !q.profileId || q.profileId === activeProfileId),
    [allQuestions, activeProfileId],
  );
  const sets = useMemo(
    () => allSets.filter(s => !s.profileId || s.profileId === activeProfileId),
    [allSets, activeProfileId],
  );

  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');
  const [dailyQuote, setDailyQuote] = useState(() => {
    const q = getQuotesByField(userProfile.studyField);
    return q[Math.floor(Math.random() * q.length)];
  });
  const [todaysHoliday, setTodaysHoliday] = useState<{ name: string; emoji: string; country: string } | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(userProfile.name);
  const barChartContainerRef = useRef<HTMLDivElement | null>(null);
  const [barChartReady, setBarChartReady] = useState(false);

  useEffect(() => {
    const q = getQuotesByField(userProfile.studyField);
    setDailyQuote(q[Math.floor(Math.random() * q.length)]);
    const now = Date.now();
    if (!userProfile.lastVisit || now - userProfile.lastVisit > 3600000) updateLastVisit();
    const hour = new Date().getHours();
    const g = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    setGreeting(`${g}, ${userProfile.name}!`);
    const h = getHolidayForToday(userProfile.originCountry);
    setTodaysHoliday(h ? { name: h.holiday.name, emoji: h.holiday.emoji, country: h.countryName } : null);
  }, [userProfile.lastVisit, userProfile.name, userProfile.originCountry, userProfile.studyField, updateLastVisit]);

  useEffect(() => {
    const check = () => {
      const r = barChartContainerRef.current?.getBoundingClientRect();
      setBarChartReady(Boolean(r && r.width > 20 && r.height > 20));
    };
    check();
    const id = requestAnimationFrame(check);
    window.addEventListener('resize', check);
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', check); };
  }, []);

  // ── XP / Level ────────────────────────────────────────────────────────────
  const xp    = userProfile.stats.xp    || 0;
  const level = userProfile.stats.level || 1;
  const currentLevelXp = 100 * Math.pow(level - 1, 2);
  const nextLevelXp    = 100 * Math.pow(level,     2);
  const xpProgress     = xp - currentLevelXp;
  const xpNeeded       = nextLevelXp - currentLevelXp;
  const xpPct          = Math.min(100, Math.round((xpProgress / xpNeeded) * 100));

  // ── Streak / week view ────────────────────────────────────────────────────
  const streakDays    = userProfile.stats.streakDays   || 0;
  const lastStudyDate = userProfile.stats.lastStudyDate || 0;
  const todayKey      = new Date().toISOString().slice(0, 10);
  const studiedToday  = new Date(lastStudyDate).toISOString().slice(0, 10) === todayKey;

  const weekHistory = useMemo(() => {
    const history = userProfile.stats.studyHistory || {};
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      return {
        key,
        label: d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 1),
        studied: (history[key] || 0) > 0,
        isToday: key === todayKey,
      };
    });
  }, [userProfile.stats.studyHistory, todayKey]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = Date.now();
    const totalQuestions = questions.length;
    const totalSets      = sets.length;
    const cardsDue       = questions.filter(q => !q.nextReviewDate || q.nextReviewDate <= now).length;
    const mastered       = questions.filter(q => (q.box || 0) >= 5).length;
    const masteryRate    = totalQuestions > 0 ? Math.round((mastered / totalQuestions) * 100) : 0;
    const learning       = questions.filter(q => !q.box || q.box <= 1).length;
    const reviewing      = questions.filter(q => (q.box || 0) > 1 && (q.box || 0) < 5).length;
    return { totalQuestions, totalSets, cardsDue, mastered, masteryRate, learning, reviewing };
  }, [questions, sets]);

  // ── Next achievement ──────────────────────────────────────────────────────
  const nextMilestone = useMemo(() => {
    const correct = userProfile.stats.totalCorrectAnswers || 0;
    for (const m of MILESTONES) {
      if (correct < m.threshold) {
        return { ...m, current: correct, pct: Math.round((correct / m.threshold) * 100) };
      }
    }
    return null;
  }, [userProfile.stats.totalCorrectAnswers]);

  // ── Due chart ─────────────────────────────────────────────────────────────
  const dueData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const start = new Date(date.setHours(0,  0,  0,   0)).getTime();
      const end   = new Date(date.setHours(23, 59, 59, 999)).getTime();
      let count = questions.filter(q => q.nextReviewDate >= start && q.nextReviewDate <= end).length;
      if (i === 0) count += questions.filter(q => q.nextReviewDate < start).length;
      return { day: i === 0 ? 'Today' : days[new Date(start).getDay()], count };
    });
  }, [questions]);

  // ── Mastery distribution ──────────────────────────────────────────────────
  const masteryData = [
    { name: 'Learning',  value: stats.learning,  color: '#f59e0b' },
    { name: 'Reviewing', value: stats.reviewing, color: '#3b82f6' },
    { name: 'Mastered',  value: stats.mastered,  color: '#10b981' },
  ].filter(d => d.value > 0);

  // ── Insights ──────────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const list: { text: string; action: string; onClick: () => void; icon: React.ReactNode }[] = [];
    if (stats.cardsDue > 0) {
      list.push({ text: `You have ${stats.cardsDue} cards due for review today.`, action: 'Review Now', onClick: () => navigate('/flashcards'), icon: <Zap className="text-amber-500" /> });
    } else if (stats.totalQuestions > 0) {
      list.push({ text: "You're all caught up on reviews! Great job.", action: 'Practice Sets', onClick: () => navigate('/sets'), icon: <CheckCircle2 className="text-emerald-500" /> });
    }
    if (stats.totalQuestions === 0) {
      list.push({ text: 'Question bank is empty. Start adding questions.', action: 'Add Questions', onClick: () => navigate('/questions'), icon: <BookOpen className="text-blue-500" /> });
    } else if (stats.masteryRate < 10 && stats.totalQuestions > 10) {
      list.push({ text: "Mastery rate is low. Try Cram Mode to boost retention.", action: 'Go to Sets', onClick: () => navigate('/sets'), icon: <TrendingUp className="text-indigo-500" /> });
    }
    return list;
  }, [stats, navigate]);

  const handleNameSave = (e: React.FormEvent) => {
    e.preventDefault();
    setUserProfile({ name: newName });
    setIsEditingName(false);
  };

  if (!activeProfileId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <p>No profile selected.</p>
        <Button onClick={() => navigate('/profiles')}>Select a Profile</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div className="flex-1">
            {isEditingName ? (
              <form onSubmit={handleNameSave} className="flex items-center gap-2 mb-1">
                <Input value={newName} onChange={e => setNewName(e.target.value)} className="h-9 w-48" autoFocus />
                <Button size="sm" type="submit">Save</Button>
              </form>
            ) : (
              <h1
                className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-purple-600 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setIsEditingName(true)}
                title="Click to edit name"
              >
                {greeting}
              </h1>
            )}
            <p className="text-sm text-muted-foreground mt-1 italic">
              "{dailyQuote.text}" <span className="not-italic text-primary/80">— {dailyQuote.author}</span>
            </p>
          </div>
          <Button onClick={() => navigate('/flashcards')} className="shadow-lg shadow-primary/20 shrink-0 self-start">
            <Zap className="mr-2 h-4 w-4" /> Start Review
          </Button>
        </div>

        {/* XP Hero Bar */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-linear-to-r from-primary/10 via-purple-500/8 to-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-4"
        >
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/20 shrink-0">
            <Star className="h-5 w-5 text-primary fill-primary/50" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold text-primary">Level {level}</span>
              <span className="text-xs text-muted-foreground">{xpProgress.toLocaleString()} / {xpNeeded.toLocaleString()} XP</span>
            </div>
            <div className="h-3 rounded-full bg-primary/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-linear-to-r from-primary to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${xpPct}%` }}
                transition={{ duration: 1.4, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(xpNeeded - xpProgress).toLocaleString()} XP to Level {level + 1}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-xl shrink-0">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-bold">{xp.toLocaleString()} XP</span>
          </div>
        </motion.div>

        {/* Holiday Ticker */}
        {todaysHoliday && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-linear-to-r from-primary/20 via-primary/10 to-transparent border border-primary/20 p-3 rounded-xl flex items-center gap-3 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-primary animate-pulse" />
            <div className="text-2xl animate-bounce">{todaysHoliday.emoji}</div>
            <div>
              <p className="font-bold text-primary">Happy {todaysHoliday.name}!</p>
              <p className="text-xs text-muted-foreground">Celebrating in {todaysHoliday.country} today.</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Quick Actions Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Streak Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`rounded-2xl border p-5 flex flex-col gap-3 ${
            !studiedToday && streakDays > 0
              ? 'border-orange-400/60 bg-linear-to-br from-orange-500/15 to-red-500/5'
              : 'border-orange-300/35 bg-linear-to-br from-orange-500/8 to-amber-500/4'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className={`h-5 w-5 ${streakDays > 0 ? 'text-orange-500 fill-orange-400/60' : 'text-muted-foreground'}`} />
              <span className="font-bold text-sm">Study Streak</span>
            </div>
            <span className="text-2xl font-black text-orange-500">{streakDays}<span className="text-sm font-normal text-muted-foreground ml-1">days</span></span>
          </div>

          {/* 7-day blocks */}
          <div className="flex gap-1 items-end">
            {weekHistory.map(day => (
              <div key={day.key} className="flex flex-col items-center gap-1 flex-1">
                <div className={`w-full rounded-md transition-all ${
                  day.studied
                    ? day.isToday
                      ? 'h-7 bg-orange-500 shadow-sm shadow-orange-500/40'
                      : 'h-6 bg-orange-400/70'
                    : day.isToday
                      ? 'h-7 border border-dashed border-orange-400/60 bg-orange-200/30 dark:bg-orange-900/20'
                      : 'h-5 bg-secondary'
                }`} />
                <span className="text-[9px] text-muted-foreground font-medium">{day.label}</span>
              </div>
            ))}
          </div>

          {!studiedToday && streakDays > 0 && (
            <p className="text-xs font-medium text-orange-600 dark:text-orange-400 animate-pulse">⚠️ Study today to protect your streak!</p>
          )}
          {studiedToday && (
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">✅ Streak safe for today!</p>
          )}
          {streakDays === 0 && !studiedToday && (
            <p className="text-xs text-muted-foreground">Study today to start a streak!</p>
          )}
        </motion.div>

        {/* Flashcards Quick-start */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ y: -3 }}
          className="rounded-2xl border border-blue-300/35 bg-linear-to-br from-blue-500/8 to-indigo-500/5 p-5 flex flex-col justify-between gap-3 cursor-pointer group"
          onClick={() => navigate('/flashcards')}
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-blue-500/15 group-hover:bg-blue-500/25 transition-colors">
              <Layers className="h-5 w-5 text-blue-500" />
            </div>
            {stats.cardsDue > 0 && (
              <span className="text-xs font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full">
                {stats.cardsDue} due
              </span>
            )}
          </div>
          <div>
            <p className="font-bold text-base">Flashcards</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.cardsDue > 0 ? `${stats.cardsDue} cards waiting for review` : 'All caught up! Keep reviewing.'}
            </p>
          </div>
          <Button size="sm" variant="outline" className="border-blue-300/50 hover:border-blue-400 w-full">
            Start Review →
          </Button>
        </motion.div>

        {/* Daily Challenge or Practice fallback */}
        {dailyChallenge ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            whileHover={!dailyChallenge.completedAt ? { y: -3 } : {}}
            className={`rounded-2xl border p-5 flex flex-col justify-between gap-3 cursor-pointer group ${
              dailyChallenge.completedAt
                ? 'border-green-400/35 bg-linear-to-br from-green-500/8 to-emerald-500/4'
                : 'border-yellow-400/50 bg-linear-to-br from-yellow-500/12 to-orange-500/5'
            }`}
            onClick={() => !dailyChallenge.completedAt && navigate(`/practice/${dailyChallenge.setId}?mode=cram&challenge=1`)}
          >
            <div className="flex items-center justify-between">
              <div className={`p-2.5 rounded-xl transition-colors ${
                dailyChallenge.completedAt
                  ? 'bg-green-500/15'
                  : 'bg-yellow-500/15 group-hover:bg-yellow-500/25'
              }`}>
                <Zap className={`h-5 w-5 ${dailyChallenge.completedAt ? 'text-green-500' : 'text-yellow-500'}`} />
              </div>
              {!dailyChallenge.completedAt && (
                <span className="text-xs font-bold bg-yellow-500 text-white px-2 py-0.5 rounded-full">2× XP</span>
              )}
            </div>
            <div>
              <p className="font-bold text-base">Daily Challenge</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {dailyChallenge.setTitle} · {dailyChallenge.questionIds.length} questions
              </p>
              {dailyChallenge.completedAt && (
                <p className="text-xs font-semibold text-green-600 mt-0.5">
                  +{dailyChallenge.questionIds.length * 20} bonus XP earned ✓
                </p>
              )}
            </div>
            {!dailyChallenge.completedAt ? (
              <Button size="sm" className="w-full bg-yellow-500 hover:bg-yellow-600 text-white border-0">
                Accept Challenge →
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="border-green-400/50 text-green-600 w-full"
                onClick={e => { e.stopPropagation(); navigate('/sets'); }}
              >
                Practice More →
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            whileHover={{ y: -3 }}
            className="rounded-2xl border border-purple-300/35 bg-linear-to-br from-purple-500/8 to-violet-500/4 p-5 flex flex-col justify-between gap-3 cursor-pointer group"
            onClick={() => navigate('/sets')}
          >
            <div className="p-2.5 rounded-xl bg-purple-500/15 w-fit group-hover:bg-purple-500/25 transition-colors">
              <Activity className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="font-bold text-base">Practice</p>
              <p className="text-xs text-muted-foreground mt-0.5">Test your knowledge with a quick quiz</p>
            </div>
            <Button size="sm" variant="outline" className="border-purple-300/50 hover:border-purple-400 w-full">
              Start Practice →
            </Button>
          </motion.div>
        )}
      </div>

      {/* ── Animated Stat Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStatCard
          title="Total Questions"
          value={stats.totalQuestions}
          icon={<BookOpen className="h-5 w-5 text-blue-500" />}
        />
        <AnimatedStatCard
          title="Due for Review"
          value={stats.cardsDue}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          highlight={stats.cardsDue > 0}
        />
        <AnimatedStatCard
          title="Mastery Rate"
          value={stats.masteryRate}
          suffix="%"
          icon={<Award className="h-5 w-5 text-emerald-500" />}
        />
        <AnimatedStatCard
          title="Study Sets"
          value={stats.totalSets}
          icon={<Layers className="h-5 w-5 text-indigo-500" />}
        />
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Upcoming Reviews Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold mb-5 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Upcoming Reviews
          </h3>
          <div ref={barChartContainerRef} className="h-[260px] w-full">
            {stats.totalQuestions > 0 && barChartReady ? (
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <BarChart data={dueData}>
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    cursor={{ fill: 'hsl(var(--muted) / 0.2)' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {dueData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.3)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Add questions to unlock your review timeline.
              </div>
            )}
          </div>
        </motion.div>

        {/* Right Column */}
        <div className="space-y-5">

          {/* Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-2xl p-5 shadow-sm"
          >
            <h3 className="text-base font-semibold mb-3">Insights</h3>
            <div className="space-y-3">
              {insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors">
                  <div className="mt-0.5 p-1.5 rounded-full bg-background shrink-0">{ins.icon}</div>
                  <div className="flex-1">
                    <p className="text-xs font-medium mb-1.5">{ins.text}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={ins.onClick}
                      className="h-auto p-0 text-xs text-primary hover:bg-transparent"
                    >
                      {ins.action} →
                    </Button>
                  </div>
                </div>
              ))}
              {insights.length === 0 && (
                <p className="text-xs text-muted-foreground">No pending insights. Keep up the good work!</p>
              )}
            </div>
          </motion.div>

          {/* Next Achievement Teaser */}
          {nextMilestone && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="bg-linear-to-br from-yellow-500/8 to-amber-500/4 border border-yellow-400/30 rounded-2xl p-5 shadow-sm"
            >
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" /> Next Achievement
              </h3>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{nextMilestone.icon}</span>
                <div>
                  <p className="font-bold text-sm">{nextMilestone.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {nextMilestone.current.toLocaleString()} / {nextMilestone.threshold.toLocaleString()} correct answers
                  </p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-yellow-500/15 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-linear-to-r from-yellow-400 to-amber-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${nextMilestone.pct}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {(nextMilestone.threshold - nextMilestone.current).toLocaleString()} more to unlock!
              </p>
            </motion.div>
          )}

          {/* Progress Distribution */}
          {stats.totalQuestions > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm"
            >
              <h3 className="text-base font-semibold mb-4">Progress Distribution</h3>
              <div className="space-y-3">
                {masteryData.map(d => {
                  const pct = Math.round((d.value / stats.totalQuestions) * 100);
                  return (
                    <div key={d.name}>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{d.name}</span>
                        <span className="font-medium">{d.value} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: d.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

// Animated stat card with count-up number
const AnimatedStatCard = ({
  title, value, icon, highlight = false, suffix = '',
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
  suffix?: string;
}) => {
  const displayed = useCountUp(value);
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      className={`p-5 rounded-2xl border shadow-sm transition-all cursor-default ${
        highlight ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <div className={`p-1.5 rounded-full ${highlight ? 'bg-primary/20' : 'bg-secondary'}`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-black tabular-nums">
        {displayed.toLocaleString()}{suffix}
      </div>
    </motion.div>
  );
};

export default Dashboard;
