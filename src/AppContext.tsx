import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Task, Idea, Session, EnergyLevel, TaskStatus, UserStats, Tag } from './types';
import { XP_PER_POMODORO, LEVELS, DEFAULT_POMODORO_DURATION, INERTIA_DURATION } from './constants';

export const TAG_COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#d946ef', // Fuchsia
  '#14b8a6', // Teal
  '#facc15', // Yellow
  '#fb7185', // Rose
  '#a855f7', // Purple
  '#22c55e', // Green
  '#38bdf8', // Sky
  '#4ade80', // Light Green
  '#f472b6', // Light Pink
  '#94a3b8', // Slate
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
  tasks: Task[];
  ideas: Idea[];
  sessions: Session[];
  tags: Tag[];
  stats: UserStats;
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
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
    resetTimer: () => void;
    setEnergyLevel: (level: EnergyLevel) => void;
    setActiveTaskIds: (ids: string[] | ((prev: string[]) => string[])) => void;
    setTimerDuration: (minutes: number) => void;
    handleFinishTaskEarly: (taskId: string) => void;
    toggleTaskSelection: (taskId: string) => void;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('adhd_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [ideas, setIdeas] = useState<Idea[]>(() => {
    const saved = localStorage.getItem('adhd_ideas');
    return saved ? JSON.parse(saved) : [];
  });

  const [sessions, setSessions] = useState<Session[]>(() => {
    const saved = localStorage.getItem('adhd_sessions');
    return saved ? JSON.parse(saved) : [];
  });

  const [tags, setTags] = useState<Tag[]>(() => {
    const saved = localStorage.getItem('adhd_tags');
    const parsed = saved ? JSON.parse(saved) : DEFAULT_TAGS;
    // Migration: ensure all tags have a color from the palette if they are using the old default
    return parsed.map((tag: Tag, index: number) => {
      if (!tag.color || tag.color === '#10b981') {
        return { ...tag, color: TAG_COLORS[index % TAG_COLORS.length] };
      }
      return tag;
    });
  });

  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('adhd_stats');
    return saved ? JSON.parse(saved) : { xp: 0, level: 1, totalPomodoros: 0 };
  });

  const [currentScreen, setScreen] = useState<Screen>('HOME');
  const [draftTask, setDraftTask] = useState<Partial<Task> | null>(null);

  useEffect(() => {
    localStorage.setItem('adhd_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('adhd_ideas', JSON.stringify(ideas));
  }, [ideas]);

  useEffect(() => {
    localStorage.setItem('adhd_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('adhd_tags', JSON.stringify(tags));
  }, [tags]);

  useEffect(() => {
    localStorage.setItem('adhd_stats', JSON.stringify(stats));
  }, [stats]);

  const addTask = (task: Partial<Task>) => {
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
    setTasks(prev => [newTask, ...prev]);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const addIdea = (text: string) => {
    const newIdea: Idea = {
      id: crypto.randomUUID(),
      text,
      createdAt: Date.now(),
    };
    setIdeas(prev => [newIdea, ...prev]);
  };

  const addSession = (session: Session) => {
    setSessions(prev => [session, ...prev]);
    
    if (session.type === 'WORK') {
      const xpGain = (session.duration / 25) * XP_PER_POMODORO;
      const newXp = stats.xp + xpGain;
      const newLevel = LEVELS.reduce((acc, curr) => newXp >= curr.minXp ? curr.level : acc, 1);
      
      setStats(prev => ({
        ...prev,
        xp: newXp,
        level: newLevel,
        totalPomodoros: prev.totalPomodoros + (session.duration / 25)
      }));

      // Update actual pomodoros for tasks worked on
      if (session.tasksWorkedOn.length > 0) {
        const fraction = (session.duration / 25) / session.tasksWorkedOn.length;
        setTasks(prev => prev.map(t => 
          session.tasksWorkedOn.includes(t.id) 
            ? { ...t, actualPomodoros: t.actualPomodoros + fraction }
            : t
        ));
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
      setIdeas(prev => prev.filter(i => i.id !== ideaId));
      setScreen('TASKS');
    }
  };

  const addTag = (name: string, color?: string) => {
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
    setTags(prev => [...prev, newTag]);
  };

  const updateTag = (id: string, updates: Partial<Tag>) => {
    setTags(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTag = (id: string) => {
    setTags(prev => prev.filter(t => t.id !== id));
  };

  const seedMockData = () => {
    const newTasks: Task[] = [];
    tags.forEach(tag => {
      for (let i = 1; i <= 10; i++) {
        const hasDueDate = Math.random() > 0.5;
        newTasks.push({
          id: crypto.randomUUID(),
          name: `Tarea ${i} de ${tag.name}`,
          tag: tag.name,
          tags: [],
          estimatedPomodoros: Math.floor(Math.random() * 4) + 1,
          actualPomodoros: 0,
          status: TaskStatus.PENDING,
          createdAt: Date.now() - (Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date in last 7 days
          dueDate: hasDueDate ? Date.now() + (Math.random() * 14 * 24 * 60 * 60 * 1000) : undefined, // Random future date up to 14 days
        });
      }
    });
    setTasks(prev => [...newTasks, ...prev]);
  };

  const [suggestedTasks, setSuggestedTasks] = useState<Task[]>([]);

  // Timer State
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem('adhd_timer_timeLeft');
    return saved ? parseInt(saved) : DEFAULT_POMODORO_DURATION * 60;
  });
  const [isActive, setIsActive] = useState(() => {
    const saved = localStorage.getItem('adhd_timer_isActive');
    return saved === 'true';
  });
  const [mode, setMode] = useState<'WORK' | 'BREAK'>(() => {
    const saved = localStorage.getItem('adhd_timer_mode');
    return (saved as any) === 'BREAK' ? 'BREAK' : 'WORK';
  });
  const [duration, setDuration] = useState(() => {
    const saved = localStorage.getItem('adhd_timer_duration');
    return saved ? parseInt(saved) : DEFAULT_POMODORO_DURATION;
  });
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>(() => {
    const saved = localStorage.getItem('adhd_timer_energyLevel');
    return (saved as any) || EnergyLevel.NORMAL;
  });
  const [activeTaskIds, setActiveTaskIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('adhd_timer_activeTaskIds');
    return saved ? JSON.parse(saved) : [];
  });
  const [sessionTaskIds, setSessionTaskIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('adhd_timer_sessionTaskIds');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('adhd_timer_timeLeft', timeLeft.toString());
    localStorage.setItem('adhd_timer_isActive', isActive.toString());
    localStorage.setItem('adhd_timer_mode', mode);
    localStorage.setItem('adhd_timer_duration', duration.toString());
    localStorage.setItem('adhd_timer_energyLevel', energyLevel);
    localStorage.setItem('adhd_timer_activeTaskIds', JSON.stringify(activeTaskIds));
    localStorage.setItem('adhd_timer_sessionTaskIds', JSON.stringify(sessionTaskIds));
  }, [timeLeft, isActive, mode, duration, energyLevel, activeTaskIds, sessionTaskIds]);

  const handleTimerComplete = useCallback(() => {
    setIsActive(false);
    
    if (mode === 'WORK') {
      addSession({
        id: crypto.randomUUID(),
        startTime: Date.now() - (duration * 60 * 1000),
        duration: duration,
        energyLevel,
        type: mode,
        tasksWorkedOn: sessionTaskIds
      });
      setMode('BREAK');
      setTimeLeft(5 * 60);
    } else {
      setMode('WORK');
      setTimeLeft(duration * 60);
      setSessionTaskIds([]);
      setActiveTaskIds([]);
    }
  }, [mode, duration, energyLevel, sessionTaskIds, addSession]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, handleTimerComplete]);

  const toggleTimer = () => {
    if (isActive && mode === 'WORK') {
      // Prevent pausing during work mode
      return;
    }
    if (!isActive && mode === 'WORK' && activeTaskIds.length === 0) {
      // Don't start if no task is selected in work mode
      return;
    }
    setIsActive(!isActive);
  };
  
  const resetTimer = () => {
    if (isActive && mode === 'WORK') {
      // If resetting during work, count it as a spent session (partial duration)
      const elapsedMinutes = (duration * 60 - timeLeft) / 60;
      if (elapsedMinutes > 0.1) { // Only count if at least 6 seconds passed
        addSession({
          id: crypto.randomUUID(),
          startTime: Date.now() - (elapsedMinutes * 60 * 1000),
          duration: elapsedMinutes,
          energyLevel,
          type: 'WORK',
          tasksWorkedOn: sessionTaskIds
        });
      }
    }
    setIsActive(false);
    setTimeLeft(Math.round(duration * 60));
    setMode('WORK');
    setSessionTaskIds([]);
    setActiveTaskIds([]);
  };

  const setTimerDuration = (minutes: number) => {
    // Allow very small duration for testing if requested
    const newDuration = Math.max(0.016, minutes); // 0.016 min is approx 1 second
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

  // Safety check: remove tasks from activeTaskIds if they are completed elsewhere
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
    // Sort by estimatedPomodoros (ascending) and take top 3
    const sorted = [...pending].sort((a, b) => a.estimatedPomodoros - b.estimatedPomodoros);
    setSuggestedTasks(sorted.slice(0, 3));
  }, [tasks]);

  return (
    <AppContext.Provider value={{ 
      tasks, ideas, sessions, stats, tags,
      currentScreen, setScreen,
      draftTask, setDraftTask,
      addTask, updateTask, deleteTask, addIdea, addSession, completeTask,
      convertIdeaToTask,
      addTag, updateTag, deleteTag, seedMockData,
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
