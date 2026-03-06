import { create } from 'zustand';
import { Screen, Task, EnergyLevel, Reminder } from '../types';

interface AppState {
  // Auth
  userId: string | null;
  isAuthReady: boolean;
  setAuth: (userId: string | null, isAuthReady: boolean) => void;

  // UI
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
  error: string | null;
  setError: (error: string | null) => void;
  showFinishModal: boolean;
  setShowFinishModal: (show: boolean) => void;
  tasksToResolve: string[];
  setTasksToResolve: (ids: string[]) => void;
  draftTask: Partial<Task> | null;
  setDraftTask: (task: Partial<Task> | null) => void;

  // Notifications
  pushSubscription: PushSubscription | null;
  setPushSubscription: (sub: PushSubscription | null) => void;
  activeReminder: Reminder | null;
  setActiveReminder: (reminder: Reminder | null) => void;
  activeMedicationReminder: {
    medicationId: string;
    medicationName: string;
    dose: string;
    scheduledTime: string;
  } | null;
  setActiveMedicationReminder: (reminder: any) => void;

  // Timer State
  timeLeft: number;
  isActive: boolean;
  mode: 'WORK' | 'BREAK';
  duration: number;
  energyLevel: EnergyLevel;
  activeTaskIds: string[];
  sessionTaskIds: string[];
  expectedEndTime: number | null;

  // Timer Actions
  setTimeLeft: (time: number) => void;
  setIsActive: (isActive: boolean) => void;
  setMode: (mode: 'WORK' | 'BREAK') => void;
  setDuration: (duration: number) => void;
  setEnergyLevel: (level: EnergyLevel) => void;
  setActiveTaskIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setSessionTaskIds: (ids: string[]) => void;
  setExpectedEndTime: (time: number | null) => void;
}

export const useStore = create<AppState>((set) => ({
  // Auth
  userId: null,
  isAuthReady: false,
  setAuth: (userId, isAuthReady) => set({ userId, isAuthReady }),

  // UI
  currentScreen: 'HOME',
  setScreen: (screen) => set({ currentScreen: screen }),
  error: null,
  setError: (error) => set({ error }),
  showFinishModal: false,
  setShowFinishModal: (showFinishModal) => set({ showFinishModal }),
  tasksToResolve: [],
  setTasksToResolve: (tasksToResolve) => set({ tasksToResolve }),
  draftTask: null,
  setDraftTask: (draftTask) => set({ draftTask }),

  // Notifications
  pushSubscription: null,
  setPushSubscription: (pushSubscription) => set({ pushSubscription }),
  activeReminder: null,
  setActiveReminder: (activeReminder) => set({ activeReminder }),
  activeMedicationReminder: null,
  setActiveMedicationReminder: (activeMedicationReminder) => set({ activeMedicationReminder }),

  // Timer State
  timeLeft: 25 * 60,
  isActive: false,
  mode: 'WORK',
  duration: 25,
  energyLevel: EnergyLevel.HIGH,
  activeTaskIds: [],
  sessionTaskIds: [],
  expectedEndTime: null,

  // Timer Actions
  setTimeLeft: (timeLeft) => set({ timeLeft }),
  setIsActive: (isActive) => set({ isActive }),
  setMode: (mode) => set({ mode }),
  setDuration: (duration) => set({ duration }),
  setEnergyLevel: (energyLevel) => set({ energyLevel }),
  setActiveTaskIds: (updater) => set((state) => ({
    activeTaskIds: typeof updater === 'function' ? updater(state.activeTaskIds) : updater
  })),
  setSessionTaskIds: (sessionTaskIds) => set({ sessionTaskIds }),
  setExpectedEndTime: (expectedEndTime) => set({ expectedEndTime }),
}));
