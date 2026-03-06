import { useStore } from '../store/useStore';
import { useAddSession } from './useSessions';
import { useUpdateStats, useStats } from './useStats';
import { useUpdateTask } from './useTasks';
import { TaskStatus } from '../types';

export function useTimerActions() {
  const store = useStore();
  const userId = store.userId;
  const addSessionMutation = useAddSession(userId);
  const updateStatsMutation = useUpdateStats(userId);
  const { data: stats } = useStats(userId);
  const updateTaskMutation = useUpdateTask(userId);

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
        
        if (options?.reason === 'DISTRACTION' && stats) {
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

  const completeTask = (id: string) => {
    updateTaskMutation.mutate({ id, updates: { status: TaskStatus.COMPLETED, completedAt: Date.now() } });
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

  return {
    toggleTimer,
    resetTimer,
    setTimerDuration,
    toggleTaskSelection,
    completeTask,
    handleFinishTaskEarly,
    requestNotificationPermission
  };
}
