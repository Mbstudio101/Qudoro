import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { calculateSM2 } from '../utils/sm2';
import { BlackboardCourse, BlackboardAssignment, BlackboardGrade, BlackboardToken } from '../types/blackboard';


export interface Question {
  id: string;
  profileId?: string;
  content: string;
  rationale: string;
  answer: string[];
  options?: string[];
  imageUrl?: string;
  tags: string[];
  domain?: string;
  questionStyle?: string;
  createdAt: number;
  box: number;
  nextReviewDate: number;
  lastReviewed?: number;
  // SM-2 Algorithm Fields
  easeFactor?: number;
  repetitions?: number;
  interval?: number;
}

export interface ExamSet {
  id: string;
  profileId?: string;
  title: string;
  description: string;
  questionIds: string[];
  createdAt: number;
}

export interface Profile {
  id: string;
  name: string;
  avatar?: string;
  studyField?: string;
  originCountry?: string; // e.g., "HT", "JM", "US"
  lastVisit: number | null;
  theme: 'light' | 'dark' | 'system';
  stats: UserStats;
  achievements: Achievement[];
  blackboard?: {
    isConnected: boolean;
    token?: BlackboardToken;
    schoolUrl?: string;
    clientId?: string;
    clientSecret?: string;
    courses: BlackboardCourse[];
    assignments: BlackboardAssignment[];
    grades: BlackboardGrade[];
    lastSync?: number;
  };
}

export interface Account {
  id: string;
  name: string;
  email: string;
  password: string;
  country: string;
  profiles: Profile[];
}

export interface StudySession {
  id: string;
  profileId?: string;
  setId: string;
  date: number;
  score: number;
  totalQuestions: number;
  incorrectQuestionIds: string[];
  duration?: number; // seconds
}

export interface CalendarEvent {
  id: string;
  profileId?: string;
  title: string;
  date: number; // timestamp
  type: 'assignment' | 'exam' | 'quiz' | 'study' | 'other';
  completed: boolean;
  description?: string;
  time?: string; // e.g., "14:00"
}

export interface Note {
  id: string;
  profileId?: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface AchievementLevel {
  level: number;
  title: string;
  description: string;
  xp: number;
  threshold: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: number;
  xp?: number;
  level?: number;
  levels?: AchievementLevel[];
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

// Legacy support: We keep UserProfile as an alias for Profile for now, 
// but in the store "userProfile" will represent the ACTIVE profile.
export type UserProfile = Profile;

interface AppState {
  // Auth State
  accounts: Account[];
  isAuthenticated: boolean;
  currentAccountId: string | null;
  activeProfileId: string | null;

  // Actions
  signup: (data: { name: string; email: string; password: string; field: string; country: string }) => void;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  createProfile: (name: string, studyField: string) => void;
  selectProfile: (profileId: string) => void;

  questions: Question[];
  sets: ExamSet[];
  sessions: StudySession[];
  calendarEvents: CalendarEvent[];
  notes: Note[];
  userProfile: UserProfile; // The Active Profile
  addQuestion: (q: Omit<Question, 'id' | 'createdAt' | 'box' | 'nextReviewDate' | 'lastReviewed' | 'easeFactor' | 'repetitions' | 'interval'>) => string;
  updateQuestion: (id: string, q: Partial<Question>) => void;
  deleteQuestion: (id: string) => void;
  reviewQuestion: (id: string, performance: 'again' | 'hard' | 'good' | 'easy') => void;
  addSet: (s: Omit<ExamSet, 'id' | 'createdAt'>) => string;
  updateSet: (id: string, s: Partial<ExamSet>) => void;
  deleteSet: (id: string) => void;
  addQuestionToSet: (setId: string, questionId: string) => void;
  addSession: (session: Omit<StudySession, 'id'>) => void;
  // Calendar Actions
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateCalendarEvent: (id: string, event: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;
  toggleEventCompletion: (id: string) => void;
  // Note Actions
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateNote: (id: string, note: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  importData: (data: { questions: Question[]; sets: ExamSet[] }) => void;
  resetData: () => void;
  setUserProfile: (profile: Partial<UserProfile>) => void;
  updateLastVisit: () => void;
  checkAchievements: () => void;
  addXp: (amount: number) => void;
  // Blackboard
  connectBlackboard: (token: BlackboardToken, schoolUrl?: string) => void;
  disconnectBlackboard: () => void;
  updateBlackboardData: (data: { courses: BlackboardCourse[], assignments: BlackboardAssignment[], grades: BlackboardGrade[] }) => void;
  setBlackboardConfig: (config: { clientId: string; clientSecret: string }) => void;
}

// const INTERVALS = [0, 1, 3, 7, 14, 30, 60];

// Achievement Definitions
export const AVAILABLE_ACHIEVEMENTS = [
  // Small Wins (Tiered)
  { 
    id: 'first_step', 
    title: 'First Step', 
    description: 'Complete your first study session', 
    icon: 'flag', 
    xp: 50,
    levels: [
      { level: 1, threshold: 1, title: 'First Step', description: 'Complete your first study session', xp: 25 },
      { level: 2, threshold: 2, title: 'Second Step', description: 'Complete your second study session', xp: 75 },
      { level: 3, threshold: 3, title: 'Third Step', description: 'Complete your third study session', xp: 150 },
      { level: 4, threshold: 10, title: 'Habit Former', description: 'Complete 10 study sessions', xp: 500 },
      { level: 5, threshold: 50, title: 'Bookworm', description: 'Complete 50 study sessions', xp: 1500 }
    ]
  },
  { 
    id: 'quick_learner', 
    title: 'Quick Learner', 
    description: 'Answer 10 questions correctly', 
    icon: 'zap', 
    xp: 25,
    levels: [
      { level: 1, threshold: 10, title: 'Quick Learner', description: 'Answer 10 questions correctly', xp: 25 },
      { level: 2, threshold: 50, title: 'Knowledge Seeker', description: 'Answer 50 questions correctly', xp: 75 },
      { level: 3, threshold: 100, title: 'Centurion', description: 'Answer 100 questions correctly', xp: 200 },
      { level: 4, threshold: 500, title: 'Brainiac', description: 'Answer 500 questions correctly', xp: 500 },
      { level: 5, threshold: 1000, title: 'Marathoner', description: 'Answer 1000 questions correctly', xp: 1500 }
    ]
  },
  { 
    id: 'note_taker', 
    title: 'Note Taker', 
    description: 'Create 5 custom questions', 
    icon: 'pen', 
    xp: 75,
    levels: [
      { level: 1, threshold: 5, title: 'Note Taker', description: 'Create 5 custom questions', xp: 75 },
      { level: 2, threshold: 20, title: 'Scribe', description: 'Create 20 custom questions', xp: 150 },
      { level: 3, threshold: 50, title: 'Author', description: 'Create 50 custom questions', xp: 300 }
    ]
  },
  
  // Milestones
  { 
    id: 'scholar', 
    title: 'Scholar', 
    description: 'Complete 10 exam sets', 
    icon: 'book', 
    xp: 300,
    levels: [
      { level: 1, threshold: 10, title: 'Scholar', description: 'Complete 10 exam sets', xp: 300 },
      { level: 2, threshold: 25, title: 'Researcher', description: 'Complete 25 exam sets', xp: 600 },
      { level: 3, threshold: 50, title: 'Professor', description: 'Complete 50 exam sets', xp: 1200 },
      { level: 4, threshold: 100, title: 'Dean', description: 'Complete 100 exam sets', xp: 2500 },
      { level: 5, threshold: 250, title: 'Chancellor', description: 'Complete 250 exam sets', xp: 5000 }
    ]
  },
  { 
    id: 'mastery', 
    title: 'Mastery', 
    description: 'Master 20 questions (Box 5)', 
    icon: 'crown', 
    xp: 1000,
    levels: [
      { level: 1, threshold: 20, title: 'Mastery', description: 'Master 20 questions', xp: 1000 },
      { level: 2, threshold: 50, title: 'Expert', description: 'Master 50 questions', xp: 2000 },
      { level: 3, threshold: 100, title: 'Guru', description: 'Master 100 questions', xp: 4000 },
      { level: 4, threshold: 500, title: 'Sage', description: 'Master 500 questions', xp: 8000 },
      { level: 5, threshold: 1000, title: 'Oracle', description: 'Master 1000 questions', xp: 15000 }
    ]
  },
  
  // Behavioral Gains
  { 
    id: 'consistent', 
    title: 'Consistent', 
    description: 'Maintain a 3-day study streak', 
    icon: 'flame', 
    xp: 200,
    levels: [
      { level: 1, threshold: 3, title: 'Consistent', description: 'Maintain a 3-day study streak', xp: 200 },
      { level: 2, threshold: 7, title: 'Committed', description: 'Maintain a 7-day study streak', xp: 400 },
      { level: 3, threshold: 14, title: 'Unstoppable', description: 'Maintain a 14-day study streak', xp: 800 },
      { level: 4, threshold: 30, title: 'Monthly Master', description: 'Maintain a 30-day study streak', xp: 1500 },
      { level: 5, threshold: 100, title: 'Iron Will', description: 'Maintain a 100-day study streak', xp: 5000 }
    ]
  },
  { 
    id: 'dedicated', 
    title: 'Dedicated', 
    description: 'Study for over 60 minutes total', 
    icon: 'clock', 
    xp: 150,
    levels: [
      { level: 1, threshold: 60, title: 'Dedicated', description: 'Study for over 1 hour total', xp: 150 },
      { level: 2, threshold: 300, title: 'Focused', description: 'Study for over 5 hours total', xp: 300 },
      { level: 3, threshold: 600, title: 'Diligent', description: 'Study for over 10 hours total', xp: 600 },
      { level: 4, threshold: 1440, title: 'Tireless', description: 'Study for over 24 hours total', xp: 1200 },
      { level: 5, threshold: 6000, title: 'Time Lord', description: 'Study for over 100 hours total', xp: 3000 }
    ]
  },
  { id: 'night_owl', title: 'Night Owl', description: 'Complete a session after 10 PM', icon: 'moon', xp: 100 },
  { id: 'early_bird', title: 'Early Bird', description: 'Complete a session before 8 AM', icon: 'sun', xp: 100 },
  { id: 'weekend_warrior', title: 'Weekend Warrior', description: 'Study on a weekend', icon: 'calendar', xp: 150 },
  
  // Custom Badges
  { 
    id: 'mentorship', 
    title: 'Mentorship', 
    description: 'Score 100% on 5 different sets', 
    icon: 'crown', 
    xp: 1000,
    levels: [
      { level: 1, threshold: 5, title: 'Mentorship', description: 'Score 100% on 5 different sets', xp: 1000 },
      { level: 2, threshold: 10, title: 'Perfectionist', description: 'Score 100% on 10 different sets', xp: 2000 },
      { level: 3, threshold: 25, title: 'Flawless', description: 'Score 100% on 25 different sets', xp: 4000 },
      { level: 4, threshold: 50, title: 'Immaculate', description: 'Score 100% on 50 different sets', xp: 8000 },
      { level: 5, threshold: 100, title: 'Divine', description: 'Score 100% on 100 different sets', xp: 15000 }
    ]
  },
  { id: 'massed_practitioner', title: 'Massed Practitioner', description: 'Complete a single session lasting over 2 hours', icon: 'layers', xp: 800 },
  { id: 'all_nighter', title: 'All-nighter Puller', description: 'Study through the night (1 AM - 5 AM)', icon: 'moon', xp: 600 },
  { 
    id: 'leave_no_trace', 
    title: 'Leave No Trace', 
    description: 'Import 20+ sets from external sources', 
    icon: 'download', 
    xp: 300,
    levels: [
      { level: 1, threshold: 20, title: 'Leave No Trace', description: 'Import 20+ sets', xp: 300 },
      { level: 2, threshold: 50, title: 'Gatherer', description: 'Import 50+ sets', xp: 600 },
      { level: 3, threshold: 100, title: 'Collector', description: 'Import 100+ sets', xp: 1200 },
      { level: 4, threshold: 250, title: 'Archivist', description: 'Import 250+ sets', xp: 2500 },
      { level: 5, threshold: 500, title: 'Librarian', description: 'Import 500+ sets', xp: 5000 }
    ]
  },
  { id: 'hasty', title: 'Hasty', description: 'Complete an exam quickly (<15s/question) with >80% accuracy', icon: 'zap', xp: 700 },
  { id: 'happy_camper', title: 'Happy Camper', description: 'Wake up bright and early (5 AM - 8 AM) to complete an exam', icon: 'sun', xp: 400 },
  { id: 'daredevil', title: 'Daredevil', description: 'Complete a marathon session ending between 3 AM - 6 AM', icon: 'skull', xp: 1500 },

  // Long-term Goals
  { 
    id: 'legend', 
    title: 'Legend', 
    description: 'Reach Level 10', 
    icon: 'star', 
    xp: 2000,
    levels: [
      { level: 1, threshold: 10, title: 'Legend', description: 'Reach Level 10', xp: 2000 },
      { level: 2, threshold: 25, title: 'Mythic', description: 'Reach Level 25', xp: 5000 },
      { level: 3, threshold: 50, title: 'Ascended', description: 'Reach Level 50', xp: 10000 },
      { level: 4, threshold: 75, title: 'Immortal', description: 'Reach Level 75', xp: 25000 },
      { level: 5, threshold: 100, title: 'Godlike', description: 'Reach Level 100', xp: 50000 }
    ]
  },
];

const calculateLevel = (xp: number) => {
    if (typeof xp !== 'number' || isNaN(xp) || xp < 0) return 1;
    return Math.floor(Math.sqrt(xp / 100)) + 1;
};
// const xpForNextLevel = (level: number) => 100 * Math.pow(level, 2);

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

const initialStats: UserStats = {
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

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      accounts: [] as Account[],
      isAuthenticated: false,
      currentAccountId: null as string | null,
      activeProfileId: null as string | null,
      
      questions: [] as Question[],
      sets: [] as ExamSet[],
      sessions: [] as StudySession[],
      calendarEvents: [] as CalendarEvent[],
      notes: [] as Note[],
      userProfile: { 
        id: 'guest',
        name: 'Student', 
        lastVisit: null, 
        theme: 'system',
        stats: { ...initialStats },
        achievements: []
      } as UserProfile,

      signup: (data) => {
        const newAccount: Account = {
            id: uuidv4(),
            name: data.name,
            email: data.email,
            password: data.password, 
            country: data.country,
            profiles: []
        };
        
        const initialProfile: Profile = {
            id: uuidv4(),
            name: data.name,
            studyField: data.field,
            theme: 'system',
            lastVisit: Date.now(),
            stats: { ...initialStats },
            achievements: []
        };
        newAccount.profiles.push(initialProfile);
        
        set((state) => ({
            accounts: [...state.accounts, newAccount],
            isAuthenticated: true,
            currentAccountId: newAccount.id,
            activeProfileId: initialProfile.id,
            userProfile: initialProfile
        }));
      },

      login: (email, password) => {
        const state = get();
        const account = state.accounts.find(a => a.email === email && a.password === password);
        if (account) {
            set({ 
                isAuthenticated: true, 
                currentAccountId: account.id,
                activeProfileId: null, // Reset active profile to force selection
            });
            return true;
        }
        return false;
      },

      logout: () => set({ 
          isAuthenticated: false, 
          currentAccountId: null, 
          activeProfileId: null 
      }),

      createProfile: (name, studyField) => {
        const newProfile: Profile = {
            id: uuidv4(),
            name,
            studyField,
            theme: 'system',
            lastVisit: Date.now(),
            stats: { ...initialStats },
            achievements: []
        };

        set((state) => ({
            accounts: state.accounts.map(a => 
                a.id === state.currentAccountId 
                ? { ...a, profiles: [...a.profiles, newProfile] }
                : a
            )
        }));
      },

      selectProfile: (profileId) => {
        const state = get();
        const account = state.accounts.find(a => a.id === state.currentAccountId);
        if (!account) return;
        
        const profile = account.profiles.find(p => p.id === profileId);
        if (profile) {
            set({
                activeProfileId: profileId,
                userProfile: profile
            });
        }
      },

      addQuestion: (q) => {
        const id = uuidv4();
        const profileId = get().activeProfileId || '';
        set((state) => ({
          questions: [
            ...state.questions,
            { 
              ...q, 
              id, 
              profileId, 
              createdAt: Date.now(), 
              box: 0, 
              nextReviewDate: Date.now(),
              easeFactor: 2.5,
              repetitions: 0,
              interval: 0
            },
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

          // --- SM-2 Algorithm Implementation ---
          
          const currentSM2State = {
            easeFactor: question.easeFactor || 2.5,
            repetitions: question.repetitions || 0,
            interval: question.interval || 0
          };

          const { easeFactor, repetitions, interval } = calculateSM2(currentSM2State, performance);

          const nextReviewDate = Date.now() + interval * 24 * 60 * 60 * 1000;
          
          // Legacy 'box' support
          const box = Math.min(6, repetitions);

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

          const updatedProfile = { ...state.userProfile, stats: newStats };
          const updatedAccounts = state.accounts.map(a => 
             a.id === state.currentAccountId 
             ? { ...a, profiles: a.profiles.map(p => p.id === state.activeProfileId ? updatedProfile : p) }
             : a
          );

          return {
            questions: state.questions.map((q) =>
              q.id === id ? { 
                ...q, 
                box, 
                nextReviewDate, 
                lastReviewed: Date.now(),
                easeFactor,
                repetitions,
                interval
              } : q
            ),
            userProfile: updatedProfile,
            accounts: updatedAccounts
          };
        });
        get().checkAchievements();
      },
      addSet: (s) => {
        const id = uuidv4();
        const profileId = get().activeProfileId || '';
        set((state) => ({
          sets: [...state.sets, { ...s, id, profileId, createdAt: Date.now() }],
        }));
        get().checkAchievements();
        return id;
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
            
            // Streak Logic
            const now = new Date();
            const lastDate = new Date(newStats.lastStudyDate || 0);
            
            // Normalize to midnight for accurate day comparison
            const todayMidnight = new Date(now);
            todayMidnight.setHours(0,0,0,0);
            
            const lastMidnight = new Date(lastDate);
            lastMidnight.setHours(0,0,0,0);
            
            const diffTime = todayMidnight.getTime() - lastMidnight.getTime();
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            if (diffDays === 1) {
                // Consecutive day
                newStats.streakDays = (newStats.streakDays || 0) + 1;
            } else if (diffDays > 1) {
                // Missed a day
                newStats.streakDays = 1;
            } else if (diffDays === 0 && !newStats.streakDays) {
                // First study of the day for a new user/reset
                newStats.streakDays = 1;
            }
            
            newStats.lastStudyDate = Date.now();

            const profileId = state.activeProfileId || '';

            const updatedProfile = { ...state.userProfile, stats: newStats };
            const updatedAccounts = state.accounts.map(a => 
                a.id === state.currentAccountId 
                ? { ...a, profiles: a.profiles.map(p => p.id === state.activeProfileId ? updatedProfile : p) }
                : a
            );

            return {
                sessions: [...state.sessions, { ...session, id: uuidv4(), profileId }],
                userProfile: updatedProfile,
                accounts: updatedAccounts
            };
        });
        get().checkAchievements();
      },
      addCalendarEvent: (event) => {
        const profileId = get().activeProfileId || '';
        set((state) => ({
          calendarEvents: [...state.calendarEvents, { ...event, id: uuidv4(), profileId }],
        }));
      },
      updateCalendarEvent: (id, event) =>
        set((state) => ({
          calendarEvents: state.calendarEvents.map((e) =>
            e.id === id ? { ...e, ...event } : e
          ),
        })),
      deleteCalendarEvent: (id) =>
        set((state) => ({
          calendarEvents: state.calendarEvents.filter((e) => e.id !== id),
        })),
      toggleEventCompletion: (id) =>
        set((state) => ({
          calendarEvents: state.calendarEvents.map((e) =>
            e.id === id ? { ...e, completed: !e.completed } : e
          ),
        })),
      addNote: (note) => {
        const id = uuidv4();
        const profileId = get().activeProfileId || '';
        set((state) => ({
          notes: [...state.notes, { ...note, id, profileId, createdAt: Date.now(), updatedAt: Date.now() }],
        }));
        return id;
      },
      updateNote: (id, note) =>
        set((state) => ({
          notes: state.notes.map((n) => (n.id === id ? { ...n, ...note, updatedAt: Date.now() } : n)),
        })),
      deleteNote: (id) =>
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
        })),
      importData: (data) =>
        set((state) => {
          const newStats = { ...state.userProfile.stats };
          newStats.importedSetsCount = (newStats.importedSetsCount || 0) + data.sets.length;
          
          const updatedProfile = { ...state.userProfile, stats: newStats };
          const updatedAccounts = state.accounts.map(a => 
              a.id === state.currentAccountId 
              ? { ...a, profiles: a.profiles.map(p => p.id === state.activeProfileId ? updatedProfile : p) }
              : a
          );

          return {
            questions: [...state.questions, ...data.questions],
            sets: [...state.sets, ...data.sets],
            userProfile: updatedProfile,
            accounts: updatedAccounts
          };
        }),
      resetData: () =>
        set({
          questions: [],
          sets: [],
          sessions: [],
          calendarEvents: [],
          notes: [],
          accounts: [],
          isAuthenticated: false,
          currentAccountId: null,
          activeProfileId: null,
          userProfile: { 
            id: 'guest',
            name: 'Student', 
            lastVisit: null, 
            theme: 'system',
            stats: { ...initialStats },
            achievements: [] 
          },
        }),
      setUserProfile: (profile) =>
        set((state) => {
          const updatedProfile = { ...state.userProfile, ...profile };
          const updatedAccounts = state.accounts.map(a => 
            a.id === state.currentAccountId 
            ? { ...a, profiles: a.profiles.map(p => p.id === state.activeProfileId ? updatedProfile : p) }
            : a
          );
          return {
            userProfile: updatedProfile,
            accounts: updatedAccounts
          };
        }),
      updateLastVisit: () =>
        set((state) => {
            const now = Date.now();
            const rawStats = state.userProfile.stats;
            
            // Create a sanitized stats object to prevent NaN issues and ensure all fields exist
            const currentStats: UserStats = {
                totalQuestionsAnswered: rawStats?.totalQuestionsAnswered || 0,
                totalCorrectAnswers: rawStats?.totalCorrectAnswers || 0,
                totalStudyTime: rawStats?.totalStudyTime || 0,
                totalSetsCompleted: rawStats?.totalSetsCompleted || 0,
                streakDays: rawStats?.streakDays || 0,
                lastStudyDate: rawStats?.lastStudyDate || 0,
                xp: rawStats?.xp || 0,
                level: rawStats?.level || 1,
                perfectedSetIds: rawStats?.perfectedSetIds || [],
                importedSetsCount: rawStats?.importedSetsCount || 0
            };

            const lastDate = new Date(currentStats.lastStudyDate || 0);
            const today = new Date(now);
            
            // Normalize to midnight for accurate day comparison
            const todayMidnight = new Date(today);
            todayMidnight.setHours(0,0,0,0);
            
            const lastMidnight = new Date(lastDate);
            lastMidnight.setHours(0,0,0,0);
            
            const diffTime = todayMidnight.getTime() - lastMidnight.getTime();
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            let streak = currentStats.streakDays;

            // If user missed a day, reset streak to 0
            // We do NOT increment here; streak only increments on completed study sessions
            if (diffDays > 1) {
                streak = 0;
            }

            const updatedProfile = {
                ...state.userProfile,
                lastVisit: now,
                stats: {
                    ...currentStats,
                    streakDays: streak
                }
            };
            
            const updatedAccounts = state.accounts.map(a => 
                a.id === state.currentAccountId 
                ? { ...a, profiles: a.profiles.map(p => p.id === state.activeProfileId ? updatedProfile : p) }
                : a
            );

            return {
                userProfile: updatedProfile,
                accounts: updatedAccounts
            };
        }),
      addXp: (amount) => 
        set((state) => {
            const newXp = (state.userProfile.stats?.xp || 0) + amount;
            const updatedProfile = {
                ...state.userProfile,
                stats: {
                    ...state.userProfile.stats,
                    xp: newXp,
                    level: calculateLevel(newXp)
                }
            };
            const updatedAccounts = state.accounts.map(a => 
                a.id === state.currentAccountId 
                ? { ...a, profiles: a.profiles.map(p => p.id === state.activeProfileId ? updatedProfile : p) }
                : a
            );

            return {
                userProfile: updatedProfile,
                accounts: updatedAccounts
            };
        }),
      checkAchievements: () => 
        set((state) => {
            const stats = state.userProfile.stats;
            if (!stats) return state;
            const achievements = state.userProfile.achievements || [];
            const newAchievements = [...achievements];
            let updated = false;

            const checkTier = (id: string, value: number) => {
                const def = AVAILABLE_ACHIEVEMENTS.find(a => a.id === id);
                if (!def || !def.levels) return;

                let existingIndex = newAchievements.findIndex(a => a.id === id);
                const existing = newAchievements[existingIndex];
                const currentLevel = existing?.level || (existing ? 1 : 0);
                
                const levels = [...def.levels].sort((a, b) => a.level - b.level);

                for (const lvl of levels) {
                    if (lvl.level > currentLevel && value >= lvl.threshold) {
                         stats.xp += lvl.xp;
                         const newEntry: Achievement = {
                             id: def.id,
                             title: lvl.title,
                             description: lvl.description,
                             icon: def.icon,
                             xp: lvl.xp,
                             level: lvl.level,
                             unlockedAt: Date.now()
                         };
                         
                         if (existingIndex !== -1) {
                             newAchievements[existingIndex] = newEntry;
                         } else {
                             newAchievements.push(newEntry);
                             existingIndex = newAchievements.length - 1;
                         }
                         updated = true;
                    }
                }
            };

            const unlock = (id: string) => {
                if (!newAchievements.find(a => a.id === id)) {
                    const def = AVAILABLE_ACHIEVEMENTS.find(a => a.id === id);
                    if (def) {
                        newAchievements.push({ 
                            id: def.id,
                            title: def.title,
                            description: def.description,
                            icon: def.icon,
                            xp: def.xp,
                            unlockedAt: Date.now()
                        });
                        stats.xp += def.xp; 
                        updated = true;
                    }
                }
            };

            checkTier('first_step', state.sessions.length);
            checkTier('quick_learner', stats.totalCorrectAnswers);
            checkTier('note_taker', state.questions.filter(q => !q.imageUrl).length);
            checkTier('consistent', stats.streakDays);

            checkTier('scholar', stats.totalSetsCompleted);
            checkTier('mastery', state.questions.filter(q => q.box >= 5).length);
            checkTier('dedicated', stats.totalStudyTime);
            
            const lastSession = state.sessions[state.sessions.length - 1];
            if (lastSession) {
                const date = new Date(lastSession.date);
                const hour = date.getHours();
                
                if (hour >= 22) unlock('night_owl');
                if (hour < 8) unlock('early_bird');
                if (date.getDay() === 0 || date.getDay() === 6) unlock('weekend_warrior');
                
                if (hour >= 1 && hour <= 5) unlock('all_nighter');
                if (hour >= 5 && hour < 8) unlock('happy_camper');
                if (lastSession.duration && lastSession.duration >= 7200) unlock('massed_practitioner');
                
                if (lastSession.score === lastSession.totalQuestions && lastSession.totalQuestions > 0) {
                     if (!stats.perfectedSetIds.includes(lastSession.setId)) {
                         stats.perfectedSetIds.push(lastSession.setId);
                         updated = true;
                     }
                }
                checkTier('mentorship', stats.perfectedSetIds.length);

                if (lastSession.duration && lastSession.totalQuestions > 0) {
                    const avgTime = lastSession.duration / lastSession.totalQuestions;
                    const accuracy = lastSession.score / lastSession.totalQuestions;
                    if (avgTime < 15 && accuracy > 0.8) unlock('hasty');
                }

                if (lastSession.duration && lastSession.duration > 14400) {
                     const endTime = new Date(lastSession.date + (lastSession.duration * 1000));
                     const endHour = endTime.getHours();
                     if (endHour >= 3 && endHour <= 6) unlock('daredevil');
                }
            }
            
            checkTier('leave_no_trace', stats.importedSetsCount);
            checkTier('legend', stats.level);

            if (!updated) return state;

            const updatedProfile = {
                ...state.userProfile,
                achievements: newAchievements,
                stats: {
                    ...stats,
                    level: calculateLevel(stats.xp)
                }
            };

            const updatedAccounts = state.accounts.map(a => 
                a.id === state.currentAccountId 
                ? { ...a, profiles: a.profiles.map(p => p.id === state.activeProfileId ? updatedProfile : p) }
                : a
            );

            return {
                userProfile: updatedProfile,
                accounts: updatedAccounts
            };
        }),
      
      connectBlackboard: (token, schoolUrl) => set((state) => {
        // Ensure token is formatted as BlackboardToken if it's a string (backwards compatibility or cookie)
        // If token is just a string, we assume it's an access_token.
        // We really should update the signature of connectBlackboard, but let's handle it here.
        
        let tokenObj: BlackboardToken;
        if (typeof token === 'string') {
            tokenObj = {
                access_token: token,
                token_type: 'Bearer', // Default
                expires_in: 3600,
                scope: '',
                user_id: ''
            };
        } else {
            tokenObj = token;
        }

        const updatedProfile = {
            ...state.userProfile,
            blackboard: {
                clientId: state.userProfile.blackboard?.clientId,
                clientSecret: state.userProfile.blackboard?.clientSecret,
                isConnected: true,
                token: tokenObj,
                schoolUrl: schoolUrl || state.userProfile.blackboard?.schoolUrl,
                courses: [] as BlackboardCourse[],
                assignments: [] as BlackboardAssignment[],
                grades: [] as BlackboardGrade[],
                lastSync: Date.now()
            }
        };
        const updatedAccounts = state.accounts.map(acc => {
            if (acc.id === state.currentAccountId) {
                return {
                    ...acc,
                    profiles: acc.profiles.map(p => p.id === state.activeProfileId ? updatedProfile : p)
                };
            }
            return acc;
        });

        return { userProfile: updatedProfile, accounts: updatedAccounts };
      }),
      
      disconnectBlackboard: () => set((state) => {
        const updatedProfile = { ...state.userProfile };
        delete updatedProfile.blackboard;
        
         const updatedAccounts = state.accounts.map(acc => {
            if (acc.id === state.currentAccountId) {
                return {
                    ...acc,
                    profiles: acc.profiles.map(p => p.id === state.activeProfileId ? updatedProfile : p)
                };
            }
            return acc;
        });

        return { userProfile: updatedProfile, accounts: updatedAccounts };
      }),

      updateBlackboardData: (data) => set((state) => {
         if (!state.userProfile.blackboard) return state;

         const updatedProfile = {
             ...state.userProfile,
             blackboard: {
                 ...state.userProfile.blackboard,
                 ...data,
                 lastSync: Date.now()
             }
         };
         
         const updatedAccounts = state.accounts.map(acc => {
            if (acc.id === state.currentAccountId) {
                return {
                    ...acc,
                    profiles: acc.profiles.map(p => p.id === state.activeProfileId ? updatedProfile : p)
                };
            }
            return acc;
        });

        return { userProfile: updatedProfile, accounts: updatedAccounts };
      }),

      setBlackboardConfig: (config) => set((state) => {
        const updatedProfile = {
            ...state.userProfile,
            blackboard: {
                ...state.userProfile.blackboard,
                ...config,
                courses: state.userProfile.blackboard?.courses || [],
                assignments: state.userProfile.blackboard?.assignments || [],
                grades: state.userProfile.blackboard?.grades || [],
                isConnected: state.userProfile.blackboard?.isConnected || false
            }
        };

        const updatedAccounts = state.accounts.map(acc => {
            if (acc.id === state.currentAccountId) {
                return {
                    ...acc,
                    profiles: acc.profiles.map(p => p.id === state.activeProfileId ? updatedProfile : p)
                };
            }
            return acc;
        });

        return { userProfile: updatedProfile, accounts: updatedAccounts };
      }),
    }),
    {
      name: 'qudoro-storage',
      storage: createJSONStorage(() => storage),
    }
  )
);
