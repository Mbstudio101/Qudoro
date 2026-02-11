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

export interface UserProfile {
  name: string;
  avatar?: string;
  studyField?: string;
  lastVisit: number | null;
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
}

const INTERVALS = [0, 1, 3, 7, 14, 30, 60];

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
    (set) => ({
      questions: [] as Question[],
      sets: [] as ExamSet[],
      sessions: [] as StudySession[],
      userProfile: { name: 'Student', lastVisit: null } as UserProfile,
      addQuestion: (q) => {
        const id = uuidv4();
        set((state) => ({
          questions: [
            ...state.questions,
            { ...q, id, createdAt: Date.now(), box: 0, nextReviewDate: Date.now() },
          ],
        }));
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
      reviewQuestion: (id, performance) =>
        set((state) => {
          const question = state.questions.find((q) => q.id === id);
          if (!question) return state;

          let newBox = question.box || 0;

          if (performance === 'again') {
            newBox = 0;
          } else if (performance === 'hard') {
            newBox = 1;
          } else if (performance === 'good') {
            newBox = Math.min(INTERVALS.length - 1, newBox + 1);
          } else if (performance === 'easy') {
            newBox = Math.min(INTERVALS.length - 1, newBox + 2);
          }

          const intervalDays = INTERVALS[newBox];
          const nextReviewDate = Date.now() + intervalDays * 24 * 60 * 60 * 1000;

          return {
            questions: state.questions.map((q) =>
              q.id === id ? { ...q, box: newBox, nextReviewDate, lastReviewed: Date.now() } : q
            ),
          };
        }),
      addSet: (s) =>
        set((state) => ({
          sets: [...state.sets, { ...s, id: uuidv4(), createdAt: Date.now() }],
        })),
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
      addSession: (session) =>
        set((state) => ({
          sessions: [...state.sessions, { ...session, id: uuidv4() }],
        })),
      importData: (data) =>
        set(() => ({
          questions: data.questions,
          sets: data.sets,
        })),
      resetData: () => set({ questions: [], sets: [] }),
      setUserProfile: (profile) =>
        set((state) => ({
          userProfile: { ...state.userProfile, ...profile },
        })),
      updateLastVisit: () =>
        set((state) => ({
          userProfile: { ...state.userProfile, lastVisit: Date.now() },
        })),
    }),
    {
      name: 'qudoro-storage',
      storage: createJSONStorage(() => storage),
    }
  )
);
