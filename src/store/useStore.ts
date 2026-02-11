import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface Question {
  id: string;
  content: string;
  rationale: string;
  answer: string[];
  options?: string[];
  imageUrl?: string;
  tags: string[];
  createdAt: number;
  box: number;
  nextReviewDate: number;
  lastReviewed?: number;
}

export interface ExamSet {
  id: string;
  title: string;
  description: string;
  questionIds: string[];
  createdAt: number;
}

export interface StudySession {
  id: string;
  setId: string;
  date: number;
  score: number;
  totalQuestions: number;
  incorrectQuestionIds: string[];
  duration?: number; // seconds
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: number;
}

export interface UserStats {
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  totalStudyTime: number; // in minutes
  totalSetsCompleted: number;
  streakDays: number;
  lastStudyDate: number;
  xp: number;
  level: number;
  perfectedSetIds: string[];
  importedSetsCount: number;
}

export interface UserProfile {
  name: string;
  avatar?: string;
  studyField?: string;
  lastVisit: number | null;
  theme: 'light' | 'dark' | 'system';
  stats: UserStats;
  achievements: Achievement[];
}

interface AppState {
  questions: Question[];
  sets: ExamSet[];
  sessions: StudySession[];
  userProfile: UserProfile;
  addQuestion: (q: Omit<Question, 'id' | 'createdAt' | 'box' | 'nextReviewDate' | 'lastReviewed'>) => string;
  updateQuestion: (id: string, q: Partial<Question>) => void;
  deleteQuestion: (id: string) => void;
  reviewQuestion: (id: string, performance: 'again' | 'hard' | 'good' | 'easy') => void;
  addSet: (s: Omit<ExamSet, 'id' | 'createdAt'>) => void;
  updateSet: (id: string, s: Partial<ExamSet>) => void;
  deleteSet: (id: string) => void;
  addQuestionToSet: (setId: string, questionId: string) => void;
  removeQuestionFromSet: (setId: string, questionId: string) => void;
  addSession: (session: Omit<StudySession, 'id'>) => void;
  importData: (data: { questions: Question[]; sets: ExamSet[] }) => void;
  resetData: () => void;
  setUserProfile: (profile: Partial<UserProfile>) => void;
  updateLastVisit: () => void;
  checkAchievements: () => void;
  addXp: (amount: number) => void;
}

const INTERVALS = [0, 1, 3, 7, 14, 30, 60];

// Achievement Definitions
export const AVAILABLE_ACHIEVEMENTS = [
  // Small Wins
  { id: 'first_step', title: 'First Step', description: 'Complete your first study session', icon: 'flag', xp: 50 },
  { id: 'quick_learner', title: 'Quick Learner', description: 'Answer 10 questions correctly', icon: 'zap', xp: 100 },
  { id: 'note_taker', title: 'Note Taker', description: 'Create 5 custom questions', icon: 'pen', xp: 75 },
  
  // Milestones
  { id: 'centurion', title: 'Centurion', description: 'Answer 100 questions total', icon: 'shield', xp: 500 },
  { id: 'scholar', title: 'Scholar', description: 'Complete 10 exam sets', icon: 'book', xp: 300 },
  { id: 'mastery', title: 'Mastery', description: 'Master 20 questions (Box 5)', icon: 'crown', xp: 1000 },
  
  // Behavioral Gains
  { id: 'consistent', title: 'Consistent', description: 'Maintain a 3-day study streak', icon: 'flame', xp: 200 },
  { id: 'dedicated', title: 'Dedicated', description: 'Study for over 60 minutes total', icon: 'clock', xp: 150 },
  { id: 'night_owl', title: 'Night Owl', description: 'Complete a session after 10 PM', icon: 'moon', xp: 100 },
  { id: 'early_bird', title: 'Early Bird', description: 'Complete a session before 8 AM', icon: 'sun', xp: 100 },
  { id: 'weekend_warrior', title: 'Weekend Warrior', description: 'Study on a weekend', icon: 'calendar', xp: 150 },
  
  // Custom Badges
  { id: 'bookworm', title: 'Bookworm', description: 'Complete 50 full study sessions', icon: 'book_open', xp: 500 },
  { id: 'mentorship', title: 'Mentorship', description: 'Score 100% on 5 different sets', icon: 'crown', xp: 1000 },
  { id: 'massed_practitioner', title: 'Massed Practitioner', description: 'Complete a single session lasting over 2 hours', icon: 'layers', xp: 800 },
  { id: 'all_nighter', title: 'All-nighter Puller', description: 'Study through the night (1 AM - 5 AM)', icon: 'moon', xp: 600 },
  { id: 'leave_no_trace', title: 'Leave No Trace', description: 'Import 20+ sets from external sources', icon: 'download', xp: 300 },
  { id: 'hasty', title: 'Hasty', description: 'Complete an exam quickly (<15s/question) with >80% accuracy', icon: 'zap', xp: 700 },
  { id: 'happy_camper', title: 'Happy Camper', description: 'Wake up bright and early (5 AM - 8 AM) to complete an exam', icon: 'sun', xp: 400 },
  { id: 'daredevil', title: 'Daredevil', description: 'Complete a marathon session ending between 3 AM - 6 AM', icon: 'skull', xp: 1500 },

  // Long-term Goals
  { id: 'legend', title: 'Legend', description: 'Reach Level 10', icon: 'star', xp: 2000 },
  { id: 'marathon', title: 'Marathoner', description: 'Answer 1000 questions', icon: 'award', xp: 2500 },
];

const calculateLevel = (xp: number) => Math.floor(Math.sqrt(xp / 100)) + 1;
const xpForNextLevel = (level: number) => 100 * Math.pow(level, 2);

const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    // We need to handle the case where window.electron might not be available during SSR or initial render if not careful
    // But in Electron renderer it should be fine.
    if (typeof window === 'undefined' || !window.electron) return null;
    const value = await window.electron.store.get(name);
    return value ? JSON.stringify(value) : null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof window === 'undefined' || !window.electron) return;
    window.electron.store.set(name, JSON.parse(value));
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof window === 'undefined' || !window.electron) return;
    window.electron.store.set(name, null);
  },
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      questions: [] as Question[],
      sets: [] as ExamSet[],
      sessions: [] as StudySession[],
      userProfile: { 
        name: 'Student', 
        lastVisit: null, 
        theme: 'system',
        stats: {
          totalQuestionsAnswered: 0,
          totalCorrectAnswers: 0,
          totalStudyTime: 0,
          totalSetsCompleted: 0,
          streakDays: 0,
          lastStudyDate: 0,
          xp: 0,
          level: 1,
          perfectedSetIds: [],
          importedSetsCount: 0
        },
        achievements: []
      } as UserProfile,
      addQuestion: (q) => {
        const id = uuidv4();
        set((state) => ({
          questions: [
            ...state.questions,
            { ...q, id, createdAt: Date.now(), box: 0, nextReviewDate: Date.now() },
          ],
        }));
        get().checkAchievements();
        return id;
      },
      updateQuestion: (id, q) =>
        set((state) => ({
          questions: state.questions.map((item) =>
            item.id === id ? { ...item, ...q } : item
          ),
        })),
      deleteQuestion: (id) =>
        set((state) => ({
          questions: state.questions.filter((item) => item.id !== id),
          sets: state.sets.map((s) => ({
            ...s,
            questionIds: s.questionIds.filter((qid) => qid !== id),
          })),
        })),
      reviewQuestion: (id, performance) => {
        set((state) => {
          const question = state.questions.find((q) => q.id === id);
          if (!question) return state;

          let box = question.box || 0;
          if (performance === 'again') box = 0;
          else if (performance === 'hard') box = Math.max(0, box - 1);
          else if (performance === 'good') box = Math.min(INTERVALS.length - 1, box + 1);
          else if (performance === 'easy') box = Math.min(INTERVALS.length - 1, box + 2);

          const intervalDays = INTERVALS[box];
          const nextReviewDate = Date.now() + intervalDays * 24 * 60 * 60 * 1000;

          // Stats Update
          const newStats = { ...state.userProfile.stats };
          newStats.totalQuestionsAnswered += 1;
          if (performance === 'good' || performance === 'easy') {
            newStats.totalCorrectAnswers += 1;
          }
          
          // XP Gain
          let xpGain = 10;
          if (performance === 'good') xpGain = 20;
          if (performance === 'easy') xpGain = 30;
          newStats.xp += xpGain;
          newStats.level = calculateLevel(newStats.xp);

          return {
            questions: state.questions.map((q) =>
              q.id === id ? { ...q, box, nextReviewDate, lastReviewed: Date.now() } : q
            ),
            userProfile: { ...state.userProfile, stats: newStats }
          };
        });
        get().checkAchievements();
      },
      addSet: (s) => {
        set((state) => ({
          sets: [...state.sets, { ...s, id: uuidv4(), createdAt: Date.now() }],
        }));
        get().checkAchievements();
      },
      updateSet: (id, s) =>
        set((state) => ({
          sets: state.sets.map((item) => (item.id === id ? { ...item, ...s } : item)),
        })),
      deleteSet: (id) =>
        set((state) => ({
          sets: state.sets.filter((item) => item.id !== id),
        })),
      addQuestionToSet: (setId, questionId) =>
        set((state) => ({
          sets: state.sets.map((s) =>
            s.id === setId && !s.questionIds.includes(questionId)
              ? { ...s, questionIds: [...s.questionIds, questionId] }
              : s
          ),
        })),
      removeQuestionFromSet: (setId, questionId) =>
        set((state) => ({
          sets: state.sets.map((s) =>
            s.id === setId
              ? { ...s, questionIds: s.questionIds.filter((id) => id !== questionId) }
              : s
          ),
        })),
      addSession: (session) => {
        set((state) => {
            const newStats = { ...state.userProfile.stats };
            newStats.totalSetsCompleted += 1;
            
            // Calculate duration in minutes (session.duration is in seconds)
            // Fallback to 1 minute per question if duration is missing
            const durationInMinutes = session.duration 
                ? session.duration / 60 
                : Math.ceil(session.totalQuestions * 1);
            
            // Ensure we are adding to a number, handling potential NaN/undefined from legacy data
            const currentTotalTime = isNaN(newStats.totalStudyTime) ? 0 : (newStats.totalStudyTime || 0);
            newStats.totalStudyTime = currentTotalTime + durationInMinutes;

            newStats.xp += session.score * 5;
            newStats.level = calculateLevel(newStats.xp);

            return {
                sessions: [...state.sessions, { ...session, id: uuidv4() }],
                userProfile: { ...state.userProfile, stats: newStats }
            };
        });
        get().checkAchievements();
      },
      importData: (data) =>
        set((state) => {
          const newStats = { ...state.userProfile.stats };
          newStats.importedSetsCount = (newStats.importedSetsCount || 0) + data.sets.length;
          
          return {
            questions: [...state.questions, ...data.questions],
            sets: [...state.sets, ...data.sets],
            userProfile: { ...state.userProfile, stats: newStats }
          };
        }),
      resetData: () =>
        set({
          questions: [],
          sets: [],
          sessions: [],
          userProfile: { 
            name: 'Student', 
            lastVisit: null, 
            theme: 'system',
            stats: {
              totalQuestionsAnswered: 0,
              totalCorrectAnswers: 0,
              totalStudyTime: 0,
              totalSetsCompleted: 0,
              streakDays: 0,
              lastStudyDate: 0,
              xp: 0,
              level: 1,
              perfectedSetIds: [],
              importedSetsCount: 0
            },
            achievements: [] 
          },
        }),
      setUserProfile: (profile) =>
        set((state) => ({
          userProfile: { ...state.userProfile, ...profile },
        })),
      updateLastVisit: () =>
        set((state) => {
            const now = Date.now();
            // Sanitize stats to prevent NaN issues
            const currentStats = state.userProfile.stats || {
                totalQuestionsAnswered: 0,
                totalCorrectAnswers: 0,
                totalStudyTime: 0,
                totalSetsCompleted: 0,
                streakDays: 0,
                lastStudyDate: 0,
                xp: 0,
                level: 1,
                perfectedSetIds: [],
                importedSetsCount: 0
            };

            // Fix any NaN values
            if (isNaN(currentStats.totalStudyTime)) currentStats.totalStudyTime = 0;
            if (isNaN(currentStats.totalQuestionsAnswered)) currentStats.totalQuestionsAnswered = 0;
            if (isNaN(currentStats.totalCorrectAnswers)) currentStats.totalCorrectAnswers = 0;
            if (isNaN(currentStats.xp)) currentStats.xp = 0;

            const lastDate = new Date(currentStats.lastStudyDate || 0);
            const today = new Date(now);
            
            let streak = currentStats.streakDays || 0;
            
            if (lastDate.toDateString() !== today.toDateString()) {
                const diffTime = Math.abs(today.getTime() - lastDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                if (diffDays === 1) {
                    streak += 1;
                } else if (diffDays > 1 && currentStats.lastStudyDate !== 0) {
                    streak = 1; 
                } else if (!currentStats.lastStudyDate) {
                    streak = 1;
                }
            }

            return {
                userProfile: {
                    ...state.userProfile,
                    lastVisit: now,
                    stats: {
                        ...currentStats,
                        lastStudyDate: now,
                        streakDays: streak
                    }
                },
            };
        }),
      addXp: (amount) => 
        set((state) => {
            const newXp = (state.userProfile.stats?.xp || 0) + amount;
            return {
                userProfile: {
                    ...state.userProfile,
                    stats: {
                        ...state.userProfile.stats,
                        xp: newXp,
                        level: calculateLevel(newXp)
                    }
                }
            };
        }),
      checkAchievements: () => 
        set((state) => {
            const stats = state.userProfile.stats;
            if (!stats) return state;
            const achievements = state.userProfile.achievements || [];
            const newAchievements = [...achievements];
            let updated = false;

            const unlock = (id: string) => {
                if (!newAchievements.find(a => a.id === id)) {
                    const def = AVAILABLE_ACHIEVEMENTS.find(a => a.id === id);
                    if (def) {
                        newAchievements.push({ ...def, unlockedAt: Date.now() });
                        stats.xp += def.xp; 
                        updated = true;
                    }
                }
            };

            if (state.sessions.length >= 1) unlock('first_step');
            if (stats.totalCorrectAnswers >= 10) unlock('quick_learner');
            if (state.questions.filter(q => !q.imageUrl).length >= 5) unlock('note_taker');
            
            if (stats.totalQuestionsAnswered >= 100) unlock('centurion');
            if (stats.totalSetsCompleted >= 10) unlock('scholar');
            if (state.questions.filter(q => q.box >= 5).length >= 20) unlock('mastery');

            if (stats.streakDays >= 3) unlock('consistent');
            if (stats.totalStudyTime >= 60) unlock('dedicated');
            
            const lastSession = state.sessions[state.sessions.length - 1];
            if (lastSession) {
                const date = new Date(lastSession.date);
                const hour = date.getHours();
                
                // Existing
                if (hour >= 22) unlock('night_owl');
                if (hour < 8) unlock('early_bird');
                if (date.getDay() === 0 || date.getDay() === 6) unlock('weekend_warrior');

                // Custom Badges Logic
                
                // All-nighter: 1 AM - 5 AM
                if (hour >= 1 && hour <= 5) unlock('all_nighter');

                // Happy Camper: 5 AM - 8 AM
                if (hour >= 5 && hour < 8) unlock('happy_camper');

                // Massed Practitioner: > 2 hours (120 mins)
                // Note: duration is stored in seconds in addSession call in React components, 
                // but StudySession interface doesn't explicitly have duration field in this file yet (it was Omit<StudySession, 'id'>).
                // However, we passed 'duration' in Flashcards.tsx. Let's assume we can access it if we added it to interface,
                // but since we only have 'totalStudyTime' in stats, we might need to rely on that or add duration to interface.
                // Let's check StudySession interface again. It has date, score, totalQuestions. 
                // It does NOT have duration. We should add it to interface to be safe.
                
                // Mentorship: 100% score on 5 different sets
                if (lastSession.score === lastSession.totalQuestions && lastSession.totalQuestions > 0) {
                     if (!stats.perfectedSetIds.includes(lastSession.setId)) {
                         stats.perfectedSetIds.push(lastSession.setId);
                         updated = true;
                     }
                }
                if (stats.perfectedSetIds.length >= 5) unlock('mentorship');

                // Hasty: <15s/question AND >80% accuracy
                if (lastSession.duration && lastSession.totalQuestions > 0) {
                    const avgTime = lastSession.duration / lastSession.totalQuestions;
                    const accuracy = lastSession.score / lastSession.totalQuestions;
                    if (avgTime < 15 && accuracy > 0.8) unlock('hasty');
                }

                // Massed Practitioner: > 2 hours (7200 seconds)
                if (lastSession.duration && lastSession.duration > 7200) unlock('massed_practitioner');

                // Daredevil: > 4 hours (14400s) AND ending between 3 AM - 6 AM
                if (lastSession.duration && lastSession.duration > 14400) {
                     // date is Start time. End time = date + duration*1000
                     const endTime = new Date(lastSession.date + (lastSession.duration * 1000));
                     const endHour = endTime.getHours();
                     if (endHour >= 3 && endHour <= 6) unlock('daredevil');
                }
            }
            
            // Bookworm: 50 sessions
            if (state.sessions.length >= 50) unlock('bookworm');

            // Leave No Trace: 20+ imported sets
            if (stats.importedSetsCount >= 20) unlock('leave_no_trace');

            if (stats.level >= 10) unlock('legend');
            if (stats.totalQuestionsAnswered >= 1000) unlock('marathon');

            if (!updated) return state;

            return {
                userProfile: {
                    ...state.userProfile,
                    achievements: newAchievements,
                    stats: {
                        ...stats,
                        level: calculateLevel(stats.xp)
                    }
                }
            };
        })
    }),
    {
      name: 'qudoro-storage',
      storage: createJSONStorage(() => storage),
    }
  )
);
