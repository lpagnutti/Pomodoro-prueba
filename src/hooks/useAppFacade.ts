import { useStore } from '../store/useStore';
import { useTasks, useAddTask, useUpdateTask, useDeleteTask } from './useTasks';
import { useMedications, useMedicationLogs, useAddMedication, useUpdateMedication, useDeleteMedication, useTakeMedication } from './useMedications';
import { useIdeas, useAddIdea, useDeleteIdea } from './useIdeas';
import { useTags, useAddTag, useUpdateTag, useDeleteTag } from './useTags';
import { useNotes, useAddNote, useDeleteNote } from './useNotes';
import { useSessions, useAddSession } from './useSessions';
import { useMoodLogs, useAddMoodLog } from './useMoodLogs';
import { useReminders, useAddReminder, useCompleteReminder, useUpdateReminder, useDeleteReminder } from './useReminders';
import { useStats, useUpdateStats } from './useStats';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { TaskStatus } from '../types';

export const useApp = () => {
  const store = useStore();
  const userId = store.userId;

  // React Query Hooks
  const { data: tasks = [] } = useTasks(userId);
  const { data: medications = [] } = useMedications(userId);
  const { data: medicationLogs = [] } = useMedicationLogs(userId);
  const { data: ideas = [] } = useIdeas(userId);
  const { data: tags = [] } = useTags(userId);
  const { data: notes = [] } = useNotes(userId);
  const { data: sessions = [] } = useSessions(userId);
  const { data: moodLogs = [] } = useMoodLogs(userId);
  const { data: reminders = [] } = useReminders(userId);
  const { data: stats = { xp: 0, level: 1, totalPomodoros: 0 } } = useStats(userId);

  const addTaskMutation = useAddTask(userId);
  const updateTaskMutation = useUpdateTask(userId);
  const deleteTaskMutation = useDeleteTask(userId);
  const addMedicationMutation = useAddMedication(userId);
  const updateMedicationMutation = useUpdateMedication(userId);
  const deleteMedicationMutation = useDeleteMedication(userId);
  const takeMedicationMutation = useTakeMedication(userId);
  const addIdeaMutation = useAddIdea(userId);
  const deleteIdeaMutation = useDeleteIdea(userId);
  const addTagMutation = useAddTag(userId, tags);
  const updateTagMutation = useUpdateTag(userId);
  const deleteTagMutation = useDeleteTag(userId);
  const addNoteMutation = useAddNote(userId);
  const deleteNoteMutation = useDeleteNote(userId);
  const addMoodLogMutation = useAddMoodLog(userId);
  const addReminderMutation = useAddReminder(userId);
  const updateReminderMutation = useUpdateReminder(userId);
  const deleteReminderMutation = useDeleteReminder(userId);
  const completeReminderMutation = useCompleteReminder(userId);
  const addSessionMutation = useAddSession(userId);
  const updateStatsMutation = useUpdateStats(userId);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const completeTask = (id: string) => {
    updateTaskMutation.mutate({ id, updates: { status: TaskStatus.COMPLETED, completedAt: Date.now() } });
  };

  const convertIdeaToTask = (ideaId: string) => {
    const idea = ideas.find(i => i.id === ideaId);
    if (idea) {
      store.setDraftTask({ name: idea.text, fromIdeaId: ideaId } as any);
      store.setScreen('TASKS');
    }
  };

  const convertIdeaToReminder = (ideaId: string, datetime: number) => {
    const idea = ideas.find(i => i.id === ideaId);
    if (idea) {
      addReminderMutation.mutate({ title: idea.text, datetime });
      deleteIdeaMutation.mutate(ideaId);
    }
  };

  const toggleTimer = () => {
    if (store.isActive) {
      store.setIsActive(false);
      store.setExpectedEndTime(null);
    } else {
      store.setIsActive(true);
      store.setExpectedEndTime(Date.now() + store.timeLeft * 1000);
    }
  };

  const resetTimer = (options?: { reason?: 'FINISHED_EARLY' | 'INTERRUPTION' | 'DISTRACTION' | 'SKIP' }) => {
    if (store.isActive) {
      if (store.mode === 'WORK') {
        const elapsedMinutes = (store.duration * 60 - store.timeLeft) / 60;
        if (elapsedMinutes > 5) {
          addSessionMutation.mutate({
            id: crypto.randomUUID(),
            startTime: Date.now() - (elapsedMinutes * 60 * 1000),
            duration: elapsedMinutes,
            energyLevel: store.energyLevel,
            type: 'WORK',
            tasksWorkedOn: store.sessionTaskIds,
            userId: userId!
          });
        }
        
        if (options?.reason === 'DISTRACTION') {
          updateStatsMutation.mutate({ ...stats, xp: Math.max(0, stats.xp - 10) });
        }

        if (options?.reason === 'FINISHED_EARLY') {
          if (store.sessionTaskIds.length > 0) {
            store.setTasksToResolve([...store.sessionTaskIds]);
          }
          store.setShowFinishModal(true);
          store.setMode('BREAK');
          store.setTimeLeft(5 * 60);
          store.setIsActive(false);
          store.setExpectedEndTime(null);
          return;
        }
      }
    }
    store.setIsActive(false);
    store.setExpectedEndTime(null);
    store.setTimeLeft(Math.round(store.duration * 60));
    store.setMode('WORK');
    store.setSessionTaskIds([]);
    store.setActiveTaskIds([]);
  };

  const setTimerDuration = (minutes: number) => {
    const newDuration = Math.max(0.016, minutes);
    store.setDuration(newDuration);
    if (!store.isActive) {
      store.setTimeLeft(Math.round(newDuration * 60));
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    store.setActiveTaskIds(prev => {
      const isRemoving = prev.includes(taskId);
      if (isRemoving) {
        return prev.filter(id => id !== taskId);
      } else {
        store.setSessionTaskIds([...new Set([...store.sessionTaskIds, taskId])]);
        return [...prev, taskId];
      }
    });
  };

  const handleFinishTaskEarly = (taskId: string) => {
    completeTask(taskId);
    store.setActiveTaskIds(prev => prev.filter(id => id !== taskId));
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }
  };

  // Derived state
  const suggestedTasks = tasks.filter(t => t.status !== TaskStatus.COMPLETED).slice(0, 3);

  return {
    ...store,
    tasks, ideas, sessions, stats, tags, medications, medicationLogs,
    notes, moodLogs, reminders,
    addTask: addTaskMutation.mutate,
    updateTask: (id: string, updates: any) => updateTaskMutation.mutate({ id, updates }),
    deleteTask: deleteTaskMutation.mutate,
    addIdea: addIdeaMutation.mutate,
    deleteIdea: deleteIdeaMutation.mutate,
    addSession: addSessionMutation.mutate,
    completeTask,
    convertIdeaToTask,
    convertIdeaToReminder,
    addTag: (name: string, color?: string) => addTagMutation.mutate({ name, color }),
    updateTag: (id: string, updates: any) => updateTagMutation.mutate({ id, updates }),
    deleteTag: deleteTagMutation.mutate,
    addMedication: addMedicationMutation.mutate,
    updateMedication: (id: string, updates: any) => updateMedicationMutation.mutate({ id, updates }),
    deleteMedication: deleteMedicationMutation.mutate,
    takeMedication: (id: string) => {
      const med = medications.find(m => m.id === id);
      if (med) takeMedicationMutation.mutate({ id, med });
    },
    addNote: (content: string, title?: string) => addNoteMutation.mutate({ content, title }),
    deleteNote: deleteNoteMutation.mutate,
    addMoodLog: (mood: string, note?: string) => addMoodLogMutation.mutate({ mood, note }),
    addReminder: addReminderMutation.mutate,
    updateReminder: (id: string, updates: any) => updateReminderMutation.mutate({ id, updates }),
    deleteReminder: deleteReminderMutation.mutate,
    completeReminder: completeReminderMutation.mutate,
    seedMockData: () => {}, // Deprecated
    signIn,
    suggestedTasks,
    timer: {
      timeLeft: store.timeLeft,
      isActive: store.isActive,
      mode: store.mode,
      duration: store.duration,
      energyLevel: store.energyLevel,
      activeTaskIds: store.activeTaskIds,
      sessionTaskIds: store.sessionTaskIds,
      toggleTimer,
      resetTimer,
      setEnergyLevel: store.setEnergyLevel,
      setActiveTaskIds: store.setActiveTaskIds,
      setTimerDuration,
      handleFinishTaskEarly,
      toggleTaskSelection,
      requestNotificationPermission
    }
  };
};
