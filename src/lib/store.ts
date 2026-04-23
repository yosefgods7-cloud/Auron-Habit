import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from './utils';

export type HabitCategory = 'Physical' | 'Mental' | 'Social' | 'Recovery' | 'Creative' | 'Spiritual' | 'Productivity';
export type Timeslot = 'morning' | 'afternoon' | 'evening' | 'anytime';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  category: HabitCategory;
  protocol: string;
  nanoGoal?: string; // High-resistance alternative
  frequency: { type: 'daily' | 'days' | 'times', days?: boolean[], times?: number };
  timeslot: Timeslot;
  color: string;
  difficulty: number;
  why: string;
  description?: string;
  alarmEnabled?: boolean;
  reminderTime: string | null;
  graceDay: boolean;
  order: number;
  archived: boolean;
  createdAt: string;
}

export interface DayLog {
  habitId: string;
  date: string;
  completed: boolean;
  partial: number;
  note: string;
  completedAt: string | null;
  xpEarned: number;
  skipReason?: string;
}

export interface DailyReflection {
  good: string;
  improve: string;
  grateful: string;
}

export interface DailyData {
  mood?: number;
  intention?: string;
  reflection?: DailyReflection;
  forgeScore?: number;
  xpEarned?: number;
  stoicResponse?: string;
  forgeBrief?: string;
  survivalMode?: boolean;
  survivalHabits?: string[];
  gamePlan?: any;
  quote?: { text: string; author: string };
}

export interface DailyTask {
  id: string;
  title: string;
  completed: boolean;
  date: string;
  createdAt: string;
}

export interface GrowthLog {
  id: string;
  date: string;
  type: 'win' | 'lesson' | 'intention' | 'thought';
  text: string;
}

export interface Challenge {
  id: string;
  name: string;
  icon: string;
  description: string;
  durationDays: number;
  startDate: string | null;
  progressDays: number;
  completed: boolean;
  rewardBadge: string;
  isShared: boolean;
}

interface AppState {
  habits: Habit[];
  logs: DayLog[];
  dailyTasks: DailyTask[];
  daily: Record<string, DailyData>;
  growth: GrowthLog[];
  challenges: Challenge[];
  settings: {
    theme: string;
    userName: string;
    avatarEmoji: string;
    onboardingDone: boolean;
    geminiKey: string | null;
    identityStatement: string;
  };
  meta: {
    totalXP: number;
    level: number;
    installDate: string;
    totalDaysActive: number;
    totalRepsCompleted: number;
    currentStreak: number;
    longestStreak: number;
    geminiUsage: Record<string, { requests: number, tokensIn: number, tokensOut: number }>;
  };
  aiCache: Record<string, { text: string; timestamp: number }>;
  
  // Actions
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'archived' | 'order'>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  archiveHabit: (id: string) => void;
  deleteHabit: (id: string) => void;
  duplicateHabit: (id: string) => void;
  toggleLog: (habitId: string, date: string, xpEarned: number) => void;
  skipHabit: (habitId: string, date: string, reason: string) => void;
  clearSkip: (habitId: string, date: string) => void;
  
  addDailyTask: (task: Omit<DailyTask, 'id' | 'createdAt'>) => void;
  updateDailyTask: (id: string, updates: Partial<DailyTask>) => void;
  toggleDailyTask: (id: string) => void;
  deleteDailyTask: (id: string) => void;
  duplicateDailyTask: (id: string) => void;

  updateDaily: (date: string, updates: Partial<DailyData>) => void;
  addGrowthLog: (log: Omit<GrowthLog, 'id' | 'date'>) => void;
  updateSettings: (settings: Partial<AppState['settings']>) => void;
  completeOnboarding: (userName: string, avatarEmoji: string, defaultHabits: Omit<Habit, 'id' | 'createdAt' | 'archived' | 'order'>[]) => void;
  earnXp: (amount: number) => void;
  setAiCache: (key: string, data: { text: string; timestamp: number }) => void;
  trackAiUsage: (date: string, tokensIn: number, tokensOut: number) => void;

  startChallenge: (id: string) => void;
  progressChallenge: (id: string) => void;
  deleteGrowthLog: (id: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      habits: [],
      logs: [],
      dailyTasks: [],
      daily: {},
      growth: [],
      settings: {
        theme: 'obsidian',
        userName: 'Warrior',
        avatarEmoji: '🦁',
        onboardingDone: false,
        geminiKey: null,
        identityStatement: 'I am someone who leads by discipline and action.',
      },
      meta: {
        totalXP: 0,
        level: 1,
        installDate: new Date().toISOString(),
        totalDaysActive: 0,
        totalRepsCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        geminiUsage: {},
      },
      challenges: [
        { id: 'c1', name: '7-Day Hydration', icon: '💧', description: 'Log your water intake every day for 7 days.', durationDays: 7, startDate: null, progressDays: 0, completed: false, rewardBadge: 'Hydro-Initiate' },
        { id: 'c2', name: '14-Day Sleep Protocol', icon: '🛌', description: '7+ hours of sleep for 14 consecutive nights.', durationDays: 14, startDate: null, progressDays: 0, completed: false, rewardBadge: 'Sleep Master' },
        { id: 'c3', name: 'Digital Detox', icon: '📵', description: 'No social media for 3 days.', durationDays: 3, startDate: null, progressDays: 0, completed: false, rewardBadge: 'Unplugged' },
      ],
      aiCache: {},

      addHabit: (habit) => set((state) => ({
        habits: [...state.habits, { ...habit, id: generateId(), createdAt: new Date().toISOString(), archived: false, order: state.habits.length }]
      })),

      updateHabit: (id, updates) => set((state) => ({
        habits: state.habits.map((h) => h.id === id ? { ...h, ...updates } : h)
      })),

      archiveHabit: (id) => set((state) => ({
        habits: state.habits.map((h) => h.id === id ? { ...h, archived: true } : h)
      })),

      deleteHabit: (id) => set((state) => ({
        habits: state.habits.filter((h) => h.id !== id),
        logs: state.logs.filter((l) => l.habitId !== id)
      })),

      duplicateHabit: (id) => set((state) => {
        const habitToDuplicate = state.habits.find(h => h.id === id);
        if (!habitToDuplicate) return state;
        const newHabit = { 
          ...habitToDuplicate, 
          id: generateId(), 
          name: `${habitToDuplicate.name} (Copy)`,
          createdAt: new Date().toISOString(),
          order: state.habits.length
        };
        return { habits: [...state.habits, newHabit] };
      }),

      toggleLog: (habitId, date, xpEarned) => set((state) => {
        const existingInfo = state.logs.find(l => l.habitId === habitId && l.date === date);
        const isCompleted = existingInfo ? existingInfo.completed : false;
        
        let newLogs;
        if (existingInfo) {
          newLogs = state.logs.map(l => l.habitId === habitId && l.date === date ? 
            { ...l, completed: !isCompleted, partial: !isCompleted ? 1 : 0, xpEarned: !isCompleted ? xpEarned : 0, skipReason: !isCompleted ? undefined : l.skipReason } : l);
        } else {
          newLogs = [...state.logs, {
            habitId, date, completed: true, partial: 1, note: '', completedAt: new Date().toISOString(), xpEarned
          }];
        }
        
        return { logs: newLogs };
      }),

      skipHabit: (habitId, date, reason) => set((state) => {
        const existingInfo = state.logs.find(l => l.habitId === habitId && l.date === date);
        let newLogs;
        if (existingInfo) {
          newLogs = state.logs.map(l => l.habitId === habitId && l.date === date ? 
            { ...l, completed: false, partial: 0, xpEarned: 0, skipReason: reason } : l);
        } else {
          newLogs = [...state.logs, {
            habitId, date, completed: false, partial: 0, note: '', completedAt: null, xpEarned: 0, skipReason: reason
          }];
        }
        return { logs: newLogs };
      }),

      clearSkip: (habitId, date) => set((state) => {
         return {
            logs: state.logs.map(l => l.habitId === habitId && l.date === date ? 
              { ...l, skipReason: undefined } : l)
         };
      }),

      addDailyTask: (task) => set((state) => ({
        dailyTasks: [...(state.dailyTasks || []), { ...task, id: generateId(), createdAt: new Date().toISOString() }]
      })),

      updateDailyTask: (id, updates) => set((state) => ({
        dailyTasks: state.dailyTasks.map(t => t.id === id ? { ...t, ...updates } : t)
      })),

      toggleDailyTask: (id) => set((state) => ({
        dailyTasks: state.dailyTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
      })),

      deleteDailyTask: (id) => set((state) => ({
        dailyTasks: state.dailyTasks.filter(t => t.id !== id)
      })),

      duplicateDailyTask: (id) => set((state) => {
        const taskToDuplicate = state.dailyTasks.find(t => t.id === id);
        if (!taskToDuplicate) return state;
        const newTask = {
          ...taskToDuplicate,
          id: generateId(),
          title: `${taskToDuplicate.title} (Copy)`,
          createdAt: new Date().toISOString(),
          completed: false
        };
        return { dailyTasks: [...state.dailyTasks, newTask] };
      }),

      updateDaily: (date, updates) => set((state) => {
        const safeDaily = state.daily || {};
        const safeDateData = safeDaily[date] || {};
        return {
          daily: { ...safeDaily, [date]: { ...safeDateData, ...updates } }
        };
      }),

      addGrowthLog: (log) => set((state) => ({
        growth: [{ ...log, id: generateId(), date: new Date().toISOString() }, ...state.growth]
      })),

      deleteGrowthLog: (id) => set((state) => ({
        growth: state.growth.filter(g => g.id !== id)
      })),

      updateSettings: (updates) => set((state) => ({
        settings: { ...state.settings, ...updates }
      })),

      completeOnboarding: (userName, avatarEmoji, defaultHabits) => set((state) => ({
        settings: { ...state.settings, userName, avatarEmoji, onboardingDone: true },
        habits: [...state.habits, ...defaultHabits.map(h => ({ ...h, id: generateId(), createdAt: new Date().toISOString(), archived: false, order: state.habits.length }))]
      })),

      earnXp: (amount) => set((state) => {
        const newTotal = state.meta.totalXP + amount;
        return {
          meta: {
            ...state.meta,
            totalXP: newTotal,
          }
        };
      }),

      setAiCache: (key, data) => set((state) => ({
        aiCache: { ...state.aiCache, [key]: data }
      })),

      trackAiUsage: (date, tokensIn, tokensOut) => set((state) => {
        const current = state.meta.geminiUsage[date] || { requests: 0, tokensIn: 0, tokensOut: 0 };
        return {
          meta: {
            ...state.meta,
            geminiUsage: {
              ...state.meta.geminiUsage,
              [date]: {
                requests: current.requests + 1,
                tokensIn: current.tokensIn + tokensIn,
                tokensOut: current.tokensOut + tokensOut
              }
            }
          }
        };
      }),

      startChallenge: (id) => set((state) => ({
        challenges: state.challenges.map(c => 
          c.id === id ? { ...c, startDate: new Date().toISOString(), progressDays: 0, completed: false } : c
        )
      })),

      progressChallenge: (id) => set((state) => ({
        challenges: state.challenges.map(c => {
          if (c.id === id) {
            const newProgress = c.progressDays + 1;
            const isCompleted = newProgress >= c.durationDays;
            return {
              ...c,
              progressDays: newProgress,
              completed: isCompleted,
              ...(isCompleted && { startDate: null }) // Optionally clear startDate on complete, or keep it to track when it was done
            };
          }
          return c;
        })
      }))
    }),
    { name: 'auron-storage' }
  )
);
