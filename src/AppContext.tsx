import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Task, Idea, Session, EnergyLevel, TaskStatus, UserStats, Tag } from './types';
import { XP_PER_POMODORO, LEVELS, DEFAULT_POMODORO_DURATION, INERTIA_DURATION } from './constants';
import { db, auth } from './firebase';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, onSnapshot, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export const TAG_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#d946ef', '#14b8a6', '#facc15', '#fb7185', '#a855f7', '#22c55e', '#38bdf8', '#4ade80', '#f472b6', '#94a3b8',
];

const DEFAULT_TAGS: Tag[] = [
  { id: '1', name: 'Trabajo', color: TAG_COLORS[0] },
  { id: '2', name: 'Ejercicio', color: TAG_COLORS[1] },
  { id: '3', name: 'Lectura', color: TAG_COLORS[2] },
  { id: '4', name: 'Creación juegos de mesa', color: TAG_COLORS[3] },
  { id: '5', name: 'Ocio', color: TAG_COLORS[4] },
  { id: '6', name: 'Limpieza', color: TAG_COLORS[19] },
];

export type Screen = 'HOME' | 'TASKS' | 'HISTORY' | 'STATS' | 'IDEAS';

interface AppContextType {
  userId: string | null;
  isAuthReady: boolean;
  tasks: Task[];
  ideas: Idea[];
  sessions: Session[];
  tags: Tag[];
  stats: UserStats;
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
  tasksToResolve: string[];
  setTasksToResolve: (ids: string[]) => void;
  showFinishModal: boolean;
  setShowFinishModal: (show: boolean) => void;
  draftTask: Partial<Task> | null;
  setDraftTask: (task: Partial<Task> | null) => void;
  addTask: (task: Partial<Task>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addIdea: (text: string) => void;
  addSession: (session: Session) => void;
  completeTask: (id: string) => void;
  convertIdeaToTask: (ideaId: string) => void;
  addTag: (name: string, color?: string) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  seedMockData: () => void;
  signIn: () => Promise<void>;
  suggestedTasks: Task[];
  timer: {
    timeLeft: number;
    isActive: boolean;
    mode: 'WORK' | 'BREAK';
    duration: number;
    energyLevel: EnergyLevel;
    activeTaskIds: string[];
    sessionTaskIds: string[];
    toggleTimer: () => void;
    resetTimer: (options?: { reason?: 'FINISHED_EARLY' | 'INTERRUPTION' | 'DISTRACTION' | 'SKIP' }) => void;
    setEnergyLevel: (level: EnergyLevel) => void;
    setActiveTaskIds: (ids: string[] | ((prev: string[]) => string[])) => void;
    setTimerDuration: (minutes: number) => void;
    handleFinishTaskEarly: (taskId: string) => void;
    toggleTaskSelection: (taskId: string) => void;
  };
}

// Contexto principal de la aplicación que gestiona el estado global,
// autenticación y sincronización con Firebase Firestore.
const AppContext = createContext<AppContextType | undefined>(undefined);

// Proveedor del contexto que envuelve la aplicación y proporciona
// acceso a los datos y funciones de gestión.
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Estado local para los datos de la aplicación
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tags, setTags] = useState<Tag[]>(DEFAULT_TAGS);
  const [stats, setStats] = useState<UserStats>({ xp: 0, level: 1, totalPomodoros: 0 });

  // Solicitar permiso para notificaciones al cargar la app
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  // Escuchar cambios en el estado de autenticación de Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
      setIsAuthReady(true);
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  useEffect(() => {
    if (!userId) return;

    const unsubTasks = onSnapshot(collection(db, 'users', userId, 'tasks'), (snapshot) => {
      setTasks(snapshot.docs.map(doc => doc.data() as Task));
    });
    const unsubIdeas = onSnapshot(collection(db, 'users', userId, 'ideas'), (snapshot) => {
      setIdeas(snapshot.docs.map(doc => doc.data() as Idea));
    });
    const unsubSessions = onSnapshot(collection(db, 'users', userId, 'sessions'), (snapshot) => {
      setSessions(snapshot.docs.map(doc => doc.data() as Session));
    });
    const unsubTags = onSnapshot(collection(db, 'users', userId, 'tags'), (snapshot) => {
      const fetchedTags = snapshot.docs.map(doc => doc.data() as Tag);
      setTags(fetchedTags.length > 0 ? fetchedTags : DEFAULT_TAGS);
    });
    const unsubStats = onSnapshot(doc(db, 'users', userId, 'stats', 'current'), (snapshot) => {
      if (snapshot.exists()) setStats(snapshot.data() as UserStats);
    });

    return () => {
      unsubTasks(); unsubIdeas(); unsubSessions(); unsubTags(); unsubStats();
    };
  }, [userId]);

  const [currentScreen, setScreen] = useState<Screen>('HOME');
  const [tasksToResolve, setTasksToResolve] = useState<string[]>([]);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [draftTask, setDraftTask] = useState<Partial<Task> | null>(null);

  // Añade una nueva tarea a Firestore
  const addTask = async (task: Partial<Task>) => {
    if (!userId) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      name: task.name || 'Nueva Tarea',
      tag: task.tag || 'General',
      tags: task.tags || [],
      estimatedPomodoros: task.estimatedPomodoros || 1,
      actualPomodoros: 0,
      status: TaskStatus.PENDING,
      createdAt: Date.now(),
      ...task,
    };

    // Remove undefined values to prevent Firestore errors
    Object.keys(newTask).forEach(key => {
      if (newTask[key as keyof Task] === undefined) {
        delete newTask[key as keyof Task];
      }
    });

    await setDoc(doc(db, 'users', userId, 'tasks', newTask.id), newTask);
  };

  // Actualiza una tarea existente en Firestore
  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (!userId) return;
    
    // Remove undefined values to prevent Firestore errors
    const cleanedUpdates = { ...updates };
    Object.keys(cleanedUpdates).forEach(key => {
      if (cleanedUpdates[key as keyof Task] === undefined) {
        delete cleanedUpdates[key as keyof Task];
      }
    });

    await updateDoc(doc(db, 'users', userId, 'tasks', id), cleanedUpdates as any);
  };

  // Elimina una tarea de Firestore
  const deleteTask = async (id: string) => {
    if (!userId) return;
    await deleteDoc(doc(db, 'users', userId, 'tasks', id));
  };

  const addIdea = async (text: string) => {
    if (!userId) return;
    const newIdea: Idea = {
      id: crypto.randomUUID(),
      text,
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'users', userId, 'ideas', newIdea.id), newIdea);
  };

  const addSession = async (session: Session) => {
    if (!userId) return;
    await setDoc(doc(db, 'users', userId, 'sessions', session.id), session);
    
    if (session.type === 'WORK') {
      const xpGain = (session.duration / 25) * XP_PER_POMODORO;
      const newXp = stats.xp + xpGain;
      const newLevel = LEVELS.reduce((acc, curr) => newXp >= curr.minXp ? curr.level : acc, 1);
      
      const newStats = {
        ...stats,
        xp: newXp,
        level: newLevel,
        totalPomodoros: stats.totalPomodoros + (session.duration / 25)
      };
      setStats(newStats);
      await setDoc(doc(db, 'users', userId, 'stats', 'current'), { ...newStats, userId });

      // Update actual pomodoros for tasks worked on
      if (session.tasksWorkedOn.length > 0) {
        const fraction = (session.duration / 25) / session.tasksWorkedOn.length;
        for (const taskId of session.tasksWorkedOn) {
          const task = tasks.find(t => t.id === taskId);
          if (task) {
            await updateDoc(doc(db, 'users', userId, 'tasks', taskId), { actualPomodoros: task.actualPomodoros + fraction });
          }
        }
      }
    }
  };

  const completeTask = (id: string) => {
    updateTask(id, { status: TaskStatus.COMPLETED, completedAt: Date.now() });
  };

  const convertIdeaToTask = (ideaId: string) => {
    const idea = ideas.find(i => i.id === ideaId);
    if (idea) {
      setDraftTask({ name: idea.text });
      deleteDoc(doc(db, 'users', userId!, 'ideas', ideaId));
      setScreen('TASKS');
    }
  };

  const addTag = async (name: string, color?: string) => {
    if (!userId) return;
    let finalColor = color;
    if (!finalColor) {
      const usedColors = tags.map(t => t.color);
      const availableColors = TAG_COLORS.filter(c => !usedColors.includes(c));
      finalColor = availableColors.length > 0 
        ? availableColors[Math.floor(Math.random() * availableColors.length)]
        : TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
    }

    const newTag: Tag = {
      id: crypto.randomUUID(),
      name,
      color: finalColor,
    };
    await setDoc(doc(db, 'users', userId, 'tags', newTag.id), newTag);
  };

  const updateTag = async (id: string, updates: Partial<Tag>) => {
    if (!userId) return;
    await updateDoc(doc(db, 'users', userId, 'tags', id), updates as any);
  };

  const deleteTag = async (id: string) => {
    if (!userId) return;
    await deleteDoc(doc(db, 'users', userId, 'tags', id));
  };

  const seedMockData = () => {
    // Implement if needed, or skip for now
  };

  const [suggestedTasks, setSuggestedTasks] = useState<Task[]>([]);

  // Timer State (keep in memory for now, or sync to Firestore if needed)
  const [expectedEndTime, setExpectedEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_POMODORO_DURATION * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'WORK' | 'BREAK'>('WORK');
  const [duration, setDuration] = useState(DEFAULT_POMODORO_DURATION);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>(EnergyLevel.NORMAL);
  const [activeTaskIds, setActiveTaskIds] = useState<string[]>([]);
  const [sessionTaskIds, setSessionTaskIds] = useState<string[]>([]);

  const handleTimerComplete = useCallback(() => {
    setIsActive(false);
    setExpectedEndTime(null);
    
    if (mode === 'WORK') {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Pomodoro Focus', { body: '¡Tu Pomodoro ha terminado! Es hora de un descanso.' });
      }
      addSession({
        id: crypto.randomUUID(),
        startTime: Date.now() - (duration * 60 * 1000),
        duration: duration,
        energyLevel,
        type: mode,
        tasksWorkedOn: sessionTaskIds,
        userId: userId!
      });
      
      if (sessionTaskIds.length > 0) {
        setTasksToResolve([...sessionTaskIds]);
      }
      setShowFinishModal(true);
      
      setMode('BREAK');
      setTimeLeft(5 * 60);
    } else {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Pomodoro Focus', { body: '¡El descanso ha terminado! Es hora de volver al trabajo.' });
      }
      setMode('WORK');
      setTimeLeft(duration * 60);
      setSessionTaskIds([]);
      setActiveTaskIds([]);
    }
  }, [mode, duration, energyLevel, sessionTaskIds, addSession, userId]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && expectedEndTime) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.round((expectedEndTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) {
          handleTimerComplete();
        }
      }, 500);
    } else if (isActive && !expectedEndTime) {
      setExpectedEndTime(Date.now() + timeLeft * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, expectedEndTime, handleTimerComplete, timeLeft]);

  const toggleTimer = () => {
    if (isActive && mode === 'WORK') return;
    if (!isActive && mode === 'WORK' && activeTaskIds.length === 0) return;
    
    if (!isActive) {
      setExpectedEndTime(Date.now() + timeLeft * 1000);
      setIsActive(true);
    } else {
      setExpectedEndTime(null);
      setIsActive(false);
    }
  };
  
  const resetTimer = (options?: { reason?: 'FINISHED_EARLY' | 'INTERRUPTION' | 'DISTRACTION' | 'SKIP' }) => {
    if (mode === 'WORK') {
      const elapsedMinutes = (duration * 60 - timeLeft) / 60;
      
      if (options?.reason !== 'SKIP' && elapsedMinutes > 0.1) {
        if (options?.reason === 'FINISHED_EARLY' || options?.reason === 'INTERRUPTION') {
          addSession({
            id: crypto.randomUUID(),
            startTime: Date.now() - (elapsedMinutes * 60 * 1000),
            duration: elapsedMinutes,
            energyLevel,
            type: 'WORK',
            tasksWorkedOn: sessionTaskIds,
            userId: userId!
          });
        }
        
        if (options?.reason === 'DISTRACTION') {
          // Update stats in Firestore
          const newStats = { ...stats, xp: Math.max(0, stats.xp - 10) };
          setStats(newStats);
          if (userId) setDoc(doc(db, 'users', userId, 'stats', 'current'), { ...newStats, userId });
        }

        if (options?.reason === 'FINISHED_EARLY') {
          sessionTaskIds.forEach(id => completeTask(id));
          setShowFinishModal(true);
          setMode('BREAK');
          setTimeLeft(5 * 60);
          setIsActive(false);
          setExpectedEndTime(null);
          return;
        }
      }
    }
    setIsActive(false);
    setExpectedEndTime(null);
    setTimeLeft(Math.round(duration * 60));
    setMode('WORK');
    setSessionTaskIds([]);
    setActiveTaskIds([]);
  };

  const setTimerDuration = (minutes: number) => {
    const newDuration = Math.max(0.016, minutes);
    setDuration(newDuration);
    if (!isActive) {
      setTimeLeft(Math.round(newDuration * 60));
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    setActiveTaskIds(prev => {
      const isRemoving = prev.includes(taskId);
      if (isRemoving) {
        return prev.filter(id => id !== taskId);
      } else {
        setSessionTaskIds(sPrev => sPrev.includes(taskId) ? sPrev : [...sPrev, taskId]);
        return [...prev, taskId];
      }
    });
  };

  const handleFinishTaskEarly = (taskId: string) => {
    completeTask(taskId);
    setActiveTaskIds(prev => prev.filter(id => id !== taskId));
  };

  useEffect(() => {
    const completedIds = tasks.filter(t => t.status === TaskStatus.COMPLETED).map(t => t.id);
    if (activeTaskIds.some(id => completedIds.includes(id))) {
      setActiveTaskIds(prev => prev.filter(id => !completedIds.includes(id)));
    }
  }, [tasks, activeTaskIds]);

  useEffect(() => {
    const pending = tasks.filter(t => t.status !== TaskStatus.COMPLETED);
    if (pending.length === 0) {
      setSuggestedTasks([]);
      return;
    }
    const sorted = [...pending].sort((a, b) => a.estimatedPomodoros - b.estimatedPomodoros);
    setSuggestedTasks(sorted.slice(0, 5));
  }, [tasks]);

  return (
    <AppContext.Provider value={{ 
      userId,
      isAuthReady,
      tasks, ideas, sessions, stats, tags,
      currentScreen, setScreen,
      tasksToResolve, setTasksToResolve,
      showFinishModal, setShowFinishModal,
      draftTask, setDraftTask,
      addTask, updateTask, deleteTask, addIdea, addSession, completeTask,
      convertIdeaToTask,
      addTag, updateTag, deleteTag, seedMockData, signIn,
      suggestedTasks,
      timer: {
        timeLeft, isActive, mode, duration, energyLevel, activeTaskIds, sessionTaskIds,
        toggleTimer, resetTimer, setEnergyLevel, setActiveTaskIds,
        setTimerDuration, handleFinishTaskEarly, toggleTaskSelection
      }
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
