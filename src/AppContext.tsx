import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Task, Idea, Session, EnergyLevel, TaskStatus, UserStats, Tag, Medication, MedicationLog, Note, MoodLog, Reminder } from './types';
import { XP_PER_POMODORO, LEVELS, DEFAULT_POMODORO_DURATION, INERTIA_DURATION } from './constants';
import { db, auth } from './firebase';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, onSnapshot, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useMedications, useMedicationLogs, useAddMedication, useUpdateMedication, useDeleteMedication, useTakeMedication } from './hooks/useMedications';
import { useTasks, useAddTask, useUpdateTask, useDeleteTask } from './hooks/useTasks';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We don't throw here to avoid crashing the whole app, but we log it
}

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

export type Screen = 'HOME' | 'TASKS' | 'HISTORY' | 'STATS' | 'IDEAS' | 'MEDS' | 'NOTES' | 'REMINDERS';

interface AppContextType {
  userId: string | null;
  isAuthReady: boolean;
  tasks: Task[];
  ideas: Idea[];
  sessions: Session[];
  tags: Tag[];
  medications: Medication[];
  medicationLogs: MedicationLog[];
  notes: Note[];
  moodLogs: MoodLog[];
  reminders: Reminder[];
  stats: UserStats;
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
  tasksToResolve: string[];
  setTasksToResolve: (ids: string[]) => void;
  showFinishModal: boolean;
  setShowFinishModal: (show: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  draftTask: Partial<Task> | null;
  setDraftTask: (task: Partial<Task> | null) => void;
  addTask: (task: Partial<Task>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addIdea: (text: string) => void;
  deleteIdea: (id: string) => void;
  addSession: (session: Session) => void;
  completeTask: (id: string) => void;
  convertIdeaToTask: (ideaId: string) => void;
  convertIdeaToReminder: (ideaId: string, datetime: number) => void;
  addTag: (name: string, color?: string) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  addMedication: (med: Partial<Medication>) => void;
  updateMedication: (id: string, updates: Partial<Medication>) => void;
  deleteMedication: (id: string) => void;
  takeMedication: (id: string) => void;
  addNote: (content: string, title?: string) => void;
  deleteNote: (id: string) => void;
  addMoodLog: (mood: string, note?: string) => void;
  addReminder: (reminder: Partial<Reminder>) => void;
  updateReminder: (id: string, updates: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  completeReminder: (id: string) => void;
  activeReminder: Reminder | null;
  setActiveReminder: (reminder: Reminder | null) => void;
  activeMedicationReminder: {
    medicationId: string;
    medicationName: string;
    dose: string;
    scheduledTime: string;
  } | null;
  setActiveMedicationReminder: (reminder: {
    medicationId: string;
    medicationName: string;
    dose: string;
    scheduledTime: string;
  } | null) => void;
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
    requestNotificationPermission: () => Promise<void>;
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
  
  // React Query Hooks
  const { data: tasks = [] } = useTasks(userId);
  const { data: medications = [] } = useMedications(userId);
  const { data: medicationLogs = [] } = useMedicationLogs(userId);
  
  const addTaskMutation = useAddTask(userId);
  const updateTaskMutation = useUpdateTask(userId);
  const deleteTaskMutation = useDeleteTask(userId);
  
  const addMedicationMutation = useAddMedication(userId);
  const updateMedicationMutation = useUpdateMedication(userId);
  const deleteMedicationMutation = useDeleteMedication(userId);
  const takeMedicationMutation = useTakeMedication(userId);

  // Local state for other entities (to be migrated later)
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tags, setTags] = useState<Tag[]>(DEFAULT_TAGS);
  const [notes, setNotes] = useState<Note[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [stats, setStats] = useState<UserStats>({ xp: 0, level: 1, totalPomodoros: 0 });

  // Solicitar permiso para notificaciones al cargar la app
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  const sendNotification = (title: string, body: string) => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      // Intentar usar el Service Worker para mayor fiabilidad
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            body,
            icon: 'https://picsum.photos/seed/pomodoro/192/192',
            badge: 'https://picsum.photos/seed/pomodoro/192/192',
            vibrate: [100, 50, 100],
          } as any);
        });
      } else {
        // Fallback a notificación estándar
        new Notification(title, { body });
      }
    }
  };

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

    const unsubSessions = onSnapshot(collection(db, 'users', userId, 'sessions'), (snapshot) => {
      setSessions(snapshot.docs.map(doc => doc.data() as Session));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/sessions`));

    const unsubTags = onSnapshot(collection(db, 'users', userId, 'tags'), (snapshot) => {
      const fetchedTags = snapshot.docs.map(doc => doc.data() as Tag);
      setTags(fetchedTags.length > 0 ? fetchedTags : DEFAULT_TAGS);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/tags`));

    const unsubStats = onSnapshot(doc(db, 'users', userId, 'stats', 'current'), (snapshot) => {
      if (snapshot.exists()) setStats(snapshot.data() as UserStats);
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${userId}/stats/current`));

    const unsubTimer = onSnapshot(doc(db, 'users', userId, 'timer', 'current'), (snapshot) => {
      if (snapshot.exists() && !snapshot.metadata.hasPendingWrites) {
        const data = snapshot.data();
        if (data.expectedEndTime !== undefined) setExpectedEndTime(data.expectedEndTime);
        if (data.timeLeft !== undefined) setTimeLeft(data.timeLeft);
        if (data.isActive !== undefined) setIsActive(data.isActive);
        if (data.mode) setMode(data.mode);
        if (data.duration) setDuration(data.duration);
        if (data.energyLevel) setEnergyLevel(data.energyLevel);
        if (data.activeTaskIds) setActiveTaskIds(data.activeTaskIds);
        if (data.sessionTaskIds) setSessionTaskIds(data.sessionTaskIds);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${userId}/timer/current`));

    const unsubNotes = onSnapshot(collection(db, 'users', userId, 'notes'), (snapshot) => {
      setNotes(snapshot.docs.map(doc => doc.data() as Note));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/notes`));

    const unsubMoodLogs = onSnapshot(collection(db, 'users', userId, 'moodLogs'), (snapshot) => {
      setMoodLogs(snapshot.docs.map(doc => doc.data() as MoodLog));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/moodLogs`));

    const unsubReminders = onSnapshot(collection(db, 'users', userId, 'reminders'), (snapshot) => {
      setReminders(snapshot.docs.map(doc => doc.data() as Reminder));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/reminders`));

    return () => {
      unsubIdeas(); unsubSessions(); unsubTags(); unsubStats(); unsubTimer(); unsubNotes(); unsubMoodLogs(); unsubReminders();
    };
  }, [userId]);

  const [currentScreen, setScreen] = useState<Screen>('HOME');
  const [tasksToResolve, setTasksToResolve] = useState<string[]>([]);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftTask, setDraftTask] = useState<Partial<Task> | null>(null);

  // Connection test
  useEffect(() => {
    if (!userId) return;
    const testConnection = async () => {
      try {
        const { getDocFromServer } = await import('firebase/firestore');
        await getDocFromServer(doc(db, 'users', userId, 'stats', 'current'));
      } catch (err) {
        if (err instanceof Error && err.message.includes('the client is offline')) {
          setError("Error de conexión con Firebase. Por favor, revisa tu conexión.");
        }
      }
    };
    testConnection();
  }, [userId]);

  // Task Actions (Delegated to Mutations)
  const addTask = (task: Partial<Task>) => {
    addTaskMutation.mutate(task);
    // Handle idea conversion if needed
    if ((task as any).fromIdeaId) {
       deleteDoc(doc(db, 'users', userId!, 'ideas', (task as any).fromIdeaId));
    }
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    updateTaskMutation.mutate({ id, updates });
  };

  const deleteTask = (id: string) => {
    deleteTaskMutation.mutate(id);
  };

  const addIdea = async (text: string) => {
    if (!userId) return;
    const newIdea: Idea = {
      id: crypto.randomUUID(),
      text,
      createdAt: Date.now(),
    };
    try {
      await setDoc(doc(db, 'users', userId, 'ideas', newIdea.id), newIdea);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/ideas/${newIdea.id}`);
    }
  };

  const deleteIdea = async (id: string) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'ideas', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}/ideas/${id}`);
    }
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
      setDraftTask({ name: idea.text, fromIdeaId: ideaId } as any);
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

  const addMedication = (med: Partial<Medication>) => {
    addMedicationMutation.mutate(med);
  };

  const updateMedication = (id: string, updates: Partial<Medication>) => {
    updateMedicationMutation.mutate({ id, updates });
  };

  const deleteMedication = (id: string) => {
    deleteMedicationMutation.mutate(id);
  };

  const takeMedication = (id: string) => {
    const med = medications.find(m => m.id === id);
    if (!med) return;
    takeMedicationMutation.mutate({ id, med });

    if (med.stock - 1 <= med.minStock) {
      sendNotification('Pomodoro Focus', `¡Atención! Te queda poco stock de ${med.name}.`);
      // Add shopping reminder for tomorrow at the same time
      addReminder({
        title: `Comprar ${med.name}`,
        description: `El stock de ${med.name} es bajo (${med.stock - 1} restantes).`,
        datetime: Date.now() + 24 * 60 * 60 * 1000, // Tomorrow at this time
      });
    }
  };

  const addNote = async (content: string, title?: string) => {
    if (!userId) return;
    const newNote: Note = {
      id: crypto.randomUUID(),
      content,
      title: title || 'Nueva Nota',
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'users', userId, 'notes', newNote.id), newNote);
  };

  const deleteNote = async (id: string) => {
    if (!userId) return;
    await deleteDoc(doc(db, 'users', userId, 'notes', id));
  };

  const addMoodLog = async (mood: string, note?: string) => {
    if (!userId) return;
    const newLog: MoodLog = {
      id: crypto.randomUUID(),
      mood,
      note,
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'users', userId, 'moodLogs', newLog.id), newLog);
  };

  const addReminder = async (reminder: Partial<Reminder>) => {
    if (!userId) return;
    const newReminder: Reminder = {
      id: crypto.randomUUID(),
      title: reminder.title || 'Nuevo Recordatorio',
      description: reminder.description || '',
      datetime: reminder.datetime || Date.now() + 3600000, // Default 1 hour
      completed: false,
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'users', userId, 'reminders', newReminder.id), newReminder);
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    if (!userId) return;
    await updateDoc(doc(db, 'users', userId, 'reminders', id), updates as any);
  };

  const deleteReminder = async (id: string) => {
    if (!userId) return;
    await deleteDoc(doc(db, 'users', userId, 'reminders', id));
  };

  const completeReminder = async (id: string) => {
    if (!userId) return;
    await updateDoc(doc(db, 'users', userId, 'reminders', id), { completed: true });
  };

  const convertIdeaToReminder = async (ideaId: string, datetime: number) => {
    if (!userId) return;
    const idea = ideas.find(i => i.id === ideaId);
    if (idea) {
      await addReminder({
        title: idea.text,
        description: 'Convertido desde idea',
        datetime,
      });
      await deleteIdea(ideaId);
    }
  };

  const seedMockData = () => {
    // Implement if needed, or skip for now
  };

  const suggestedTasks = React.useMemo(() => {
    const pending = tasks.filter(t => t.status !== TaskStatus.COMPLETED);
    if (pending.length === 0) return [];
    return [...pending].sort((a, b) => a.estimatedPomodoros - b.estimatedPomodoros).slice(0, 5);
  }, [tasks]);

  // Timer State (keep in memory for now, or sync to Firestore if needed)
  const [expectedEndTime, setExpectedEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_POMODORO_DURATION * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'WORK' | 'BREAK'>('WORK');
  const [duration, setDuration] = useState(DEFAULT_POMODORO_DURATION);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>(EnergyLevel.NORMAL);
  const [activeTaskIds, setActiveTaskIds] = useState<string[]>([]);
  const [sessionTaskIds, setSessionTaskIds] = useState<string[]>([]);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
  const [activeReminder, setActiveReminder] = useState<Reminder | null>(null);
  const [activeMedicationReminder, setActiveMedicationReminder] = useState<{
    medicationId: string;
    medicationName: string;
    dose: string;
    scheduledTime: string;
  } | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Listen for user interaction to enable audio
  useEffect(() => {
    const handleInteraction = () => {
      setHasInteracted(true);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  // Helper to convert VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Poll for medication reminders (in-app)
  useEffect(() => {
    const checkMedications = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

      // Check if we already have an active reminder to avoid overwriting
      if (activeMedicationReminder) return;

      for (const med of medications) {
        // Treat undefined as true for backward compatibility
        if (med.isActive === false) continue;

        // Normalize times to ensure HH:MM format matches
        const normalizedTimes = med.times.map(t => {
          const [h, m] = t.split(':').map(Number);
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        });

        if (normalizedTimes.includes(currentTimeStr)) {
          // Check if already taken today at this time
          // This is a simple check, could be more robust with full date comparison
          const takenToday = medicationLogs.some(log => {
            const logDate = new Date(log.takenAt);
            return log.medicationId === med.id &&
                   logDate.getDate() === now.getDate() &&
                   logDate.getMonth() === now.getMonth() &&
                   logDate.getFullYear() === now.getFullYear() &&
                   Math.abs(logDate.getHours() - currentHour) < 1 && // Within 1 hour window
                   Math.abs(logDate.getMinutes() - currentMinute) < 30; // Within 30 min window
          });

          if (!takenToday) {
             // Check if we recently alerted for this (to avoid spamming every second of the minute)
             // For simplicity in this implementation, we rely on the modal being open to block new ones
             // or we could add a 'lastAlerted' timestamp to the medication object in a local state wrapper
             
             // Simple debounce: only trigger if seconds are < 5 (run check every 5s)
             // But since we run this interval every 5s, it might trigger multiple times in the same minute.
             // We need a way to know "we already showed the alert for 08:00 today".
             // Let's assume the user deals with the modal. If they close it, we shouldn't show it again immediately.
             // We can use a session-based set of "alerted keys".
             const alertKey = `${med.id}-${currentTimeStr}-${now.getDate()}`;
             if (!sessionStorage.getItem(alertKey)) {
               setActiveMedicationReminder({
                 medicationId: med.id,
                 medicationName: med.name,
                 dose: med.dose,
                 scheduledTime: currentTimeStr
               });
               sessionStorage.setItem(alertKey, 'true');
               
               // Play sound only if user has interacted
               if (hasInteracted) {
                 const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                 audio.play().catch(e => console.log("Audio play blocked (expected if no interaction)", e));
               }
               return; // Only show one at a time
             }
          }
        }
      }
    };

    const interval = setInterval(checkMedications, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [medications, medicationLogs, activeMedicationReminder]);

  // Schedule medication reminders
  useEffect(() => {
    if (!userId || !pushSubscription || medications.length === 0) return;

    const scheduleReminders = async () => {
      const now = new Date();

      for (const med of medications) {
        if (!med.active) continue;

        for (const time of med.times) {
          const [hours, minutes] = time.split(':').map(Number);
          const reminderTime = new Date(now);
          reminderTime.setHours(hours, minutes, 0, 0);

          // If time has passed today, schedule for tomorrow
          if (reminderTime.getTime() <= now.getTime()) {
            reminderTime.setDate(reminderTime.getDate() + 1);
          }

          const delay = reminderTime.getTime() - now.getTime();

          // Only schedule if it's within the next 24 hours
          if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
            fetch('/api/notifications/schedule', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subscription: pushSubscription,
                delay,
                title: 'Recordatorio de Medicación',
                body: `Es hora de tomar ${med.name} (${med.dose}).`,
                userId: `${userId}_med_${med.id}_${time}`
              })
            });
          }
        }
      }
    };

    scheduleReminders();
    // Re-schedule every hour to keep it fresh
    const interval = setInterval(scheduleReminders, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId, pushSubscription, medications]);

  // Schedule general reminders
  useEffect(() => {
    if (!userId || !pushSubscription || reminders.length === 0) return;

    const scheduleGeneralReminders = async () => {
      const now = Date.now();

      for (const reminder of reminders) {
        if (reminder.completed) continue;

        const delay = reminder.datetime - now;

        // Only schedule if it's within the next 24 hours and in the future
        if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
          fetch('/api/notifications/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscription: pushSubscription,
              delay,
              title: 'Recordatorio',
              body: reminder.title,
              userId: `${userId}_reminder_${reminder.id}`
            })
          });
        }
      }
    };

    scheduleGeneralReminders();
    const interval = setInterval(scheduleGeneralReminders, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId, pushSubscription, reminders]);

  // Poll for active reminders (in-app)
  useEffect(() => {
    const checkReminders = () => {
      const now = Date.now();
      // Find a reminder that is due within the last minute and hasn't been completed
      // We use a small window to avoid re-triggering old reminders if the app was closed
      const dueReminder = reminders.find(r => 
        !r.completed && 
        r.datetime <= now && 
        r.datetime > now - 60000 // 1 minute window
      );
      
      if (dueReminder && !activeReminder) {
        setActiveReminder(dueReminder);
        // Play sound only if user has interacted
        if (hasInteracted) {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(e => console.log("Audio play blocked (expected if no interaction)", e));
        }
      }
    };

    const interval = setInterval(checkReminders, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [reminders, activeReminder]);

  const requestNotificationPermission = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        // Get VAPID public key from server
        const response = await fetch('/api/vapid-public-key');
        const { publicKey } = await response.json();
        
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
        
        setPushSubscription(subscription);
        
        // Send subscription to server
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription, userId })
        });
      }
    } catch (error) {
      console.error('Error setting up push notifications:', error);
    }
  };

  // Register SW on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.error('SW registration failed:', err));
    }
  }, []);

  // Sync timer state to Firestore
  useEffect(() => {
    if (!userId) return;
    
    const syncTimer = async () => {
      try {
        const timerData = {
          expectedEndTime,
          timeLeft,
          isActive,
          mode,
          duration,
          energyLevel,
          activeTaskIds,
          sessionTaskIds,
          updatedAt: Date.now()
        };
        await setDoc(doc(db, 'users', userId, 'timer', 'current'), timerData);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${userId}/timer/current`);
      }
    };

    // Sync when important states change
    const timeout = setTimeout(syncTimer, 2000);
    return () => clearTimeout(timeout);
  }, [userId, expectedEndTime, isActive, mode, duration, energyLevel, activeTaskIds, sessionTaskIds, isActive ? null : timeLeft]);

  const handleTimerComplete = useCallback(() => {
    setIsActive(false);
    setExpectedEndTime(null);
    
    if (mode === 'WORK') {
      sendNotification('Pomodoro Focus', '¡Tu Pomodoro ha terminado! Es hora de un descanso.');
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
      sendNotification('Pomodoro Focus', '¡El descanso ha terminado! Es hora de volver al trabajo.');
      setMode('WORK');
      setTimeLeft(duration * 60);
      setSessionTaskIds([]);
      setActiveTaskIds([]);
    }
  }, [mode, duration, energyLevel, sessionTaskIds, addSession, userId]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      if (!expectedEndTime) {
        setExpectedEndTime(Date.now() + timeLeft * 1000);
      } else {
        interval = setInterval(() => {
          const remaining = Math.max(0, Math.round((expectedEndTime - Date.now()) / 1000));
          setTimeLeft(remaining);
          if (remaining === 0) {
            handleTimerComplete();
          }
        }, 500);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, expectedEndTime, handleTimerComplete]);

  const toggleTimer = async () => {
    if (isActive && mode === 'WORK') return;
    if (!isActive && mode === 'WORK' && activeTaskIds.length === 0) return;
    
    if (!isActive) {
      const newEndTime = Date.now() + timeLeft * 1000;
      setExpectedEndTime(newEndTime);
      setIsActive(true);

      // Schedule push notification if subscribed
      if (pushSubscription && mode === 'WORK') {
        fetch('/api/notifications/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: pushSubscription,
            delay: timeLeft * 1000,
            title: 'Pomodoro Focus',
            body: '¡Tu sesión ha terminado! Es hora de un descanso.',
            userId
          })
        });
      }
    } else {
      setExpectedEndTime(null);
      setIsActive(false);
      
      // Cancel push notification
      if (userId) {
        fetch('/api/notifications/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
      }
    }
  };
  
  const resetTimer = (options?: { reason?: 'FINISHED_EARLY' | 'INTERRUPTION' | 'DISTRACTION' | 'SKIP' }) => {
    // Cancel push notification
    if (userId) {
      fetch('/api/notifications/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
    }

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
          if (sessionTaskIds.length > 0) {
            setTasksToResolve([...sessionTaskIds]);
          }
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

  return (
    <AppContext.Provider value={{ 
      userId,
      isAuthReady,
      tasks, ideas, sessions, stats, tags, medications, medicationLogs,
      notes, moodLogs, reminders,
      currentScreen, setScreen,
      tasksToResolve, setTasksToResolve,
      showFinishModal, setShowFinishModal,
      error, setError,
      draftTask, setDraftTask,
      addTask, updateTask, deleteTask, addIdea, deleteIdea, addSession, completeTask,
      convertIdeaToTask, convertIdeaToReminder,
      addTag, updateTag, deleteTag, 
      addMedication, updateMedication, deleteMedication, takeMedication,
      addNote, deleteNote, addMoodLog,
      addReminder, updateReminder, deleteReminder, completeReminder,
      activeReminder, setActiveReminder,
      activeMedicationReminder, setActiveMedicationReminder,
      seedMockData, signIn,
      suggestedTasks,
      timer: {
        timeLeft, isActive, mode, duration, energyLevel, activeTaskIds, sessionTaskIds,
        toggleTimer, resetTimer, setEnergyLevel, setActiveTaskIds,
        setTimerDuration, handleFinishTaskEarly, toggleTaskSelection,
        requestNotificationPermission
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
