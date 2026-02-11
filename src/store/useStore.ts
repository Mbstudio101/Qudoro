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
          level: 1
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
            newStats.totalStudyTime += Math.ceil(session.totalQuestions * 1); 
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
        set((state) => ({
          questions: [...state.questions, ...data.questions],
          sets: [...state.sets, ...data.sets],
        })),
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
              level: 1
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
            const lastDate = new Date(state.userProfile.stats?.lastStudyDate || 0);
            const today = new Date(now);
            
            let streak = state.userProfile.stats?.streakDays || 0;
            
            if (lastDate.toDateString() !== today.toDateString()) {
                const diffTime = Math.abs(today.getTime() - lastDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                if (diffDays === 1) {
                    streak += 1;
                } else if (diffDays > 1 && state.userProfile.stats?.lastStudyDate !== 0) {
                    streak = 1; 
                } else if (!state.userProfile.stats?.lastStudyDate) {
                    streak = 1;
                }
            }

            return {
                userProfile: {
                    ...state.userProfile,
                    lastVisit: now,
                    stats: {
                        ...state.userProfile.stats,
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
                if (date.getHours() >= 22) unlock('night_owl');
                if (date.getHours() < 8) unlock('early_bird');
                if (date.getDay() === 0 || date.getDay() === 6) unlock('weekend_warrior');
            }

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
