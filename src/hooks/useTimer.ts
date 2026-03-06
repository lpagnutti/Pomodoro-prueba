import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { EnergyLevel, Session, Task, UserStats } from '../types';
import { DEFAULT_POMODORO_DURATION, XP_PER_POMODORO, LEVELS } from '../constants';

interface UseTimerProps {
  userId: string | null;
  stats: UserStats;
  tasks: Task[];
  addSession: (session: Session) => void;
  updateStats: (stats: UserStats) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  sendNotification: (title: string, body: string) => void;
  setTasksToResolve: (ids: string[]) => void;
  setShowFinishModal: (show: boolean) => void;
  handleFirestoreError: (error: unknown, operationType: string, path: string | null) => void;
}

export function useTimer({
  userId,
  stats,
  tasks,
  addSession,
  updateStats,
  updateTask,
  sendNotification,
  setTasksToResolve,
  setShowFinishModal,
  handleFirestoreError
}: UseTimerProps) {
  const [expectedEndTime, setExpectedEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_POMODORO_DURATION * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'WORK' | 'BREAK'>('WORK');
  const [duration, setDuration] = useState(DEFAULT_POMODORO_DURATION);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>(EnergyLevel.NORMAL);
  const [activeTaskIds, setActiveTaskIds] = useState<string[]>([]);
  const [sessionTaskIds, setSessionTaskIds] = useState<string[]>([]);

  // Listen to Firestore timer state
  useEffect(() => {
    if (!userId) return;

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
    }, (error) => handleFirestoreError(error, 'get', `users/${userId}/timer/current`));

    return () => {
      unsubTimer();
    };
  }, [userId, handleFirestoreError]);

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
        handleFirestoreError(error, 'write', `users/${userId}/timer/current`);
      }
    };

    const timeout = setTimeout(syncTimer, 2000);
    return () => clearTimeout(timeout);
  }, [userId, expectedEndTime, isActive, mode, duration, energyLevel, activeTaskIds, sessionTaskIds, isActive ? null : timeLeft, handleFirestoreError]);

  const handleTimerComplete = useCallback(() => {
    setIsActive(false);
    setExpectedEndTime(null);
    
    if (mode === 'WORK') {
      sendNotification('Pomodoro Focus', '¡Tu Pomodoro ha terminado! Es hora de un descanso.');
      addSession({
        id: crypto.randomUUID(),
        startTime: Date.now() - (duration * 60 * 1000),
        duration,
        energyLevel,
        type: 'WORK',
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
      sendNotification('Pomodoro Focus', '¡El descanso ha terminado! ¿Listo para volver al trabajo?');
      setMode('WORK');
      setTimeLeft(DEFAULT_POMODORO_DURATION * 60);
      setDuration(DEFAULT_POMODORO_DURATION);
      setSessionTaskIds([]);
    }
  }, [mode, duration, energyLevel, sessionTaskIds, userId, addSession, sendNotification, setTasksToResolve, setShowFinishModal]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && expectedEndTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((expectedEndTime - now) / 1000));
        
        setTimeLeft(remaining);

        if (remaining === 0) {
          handleTimerComplete();
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, expectedEndTime, handleTimerComplete]);

  const toggleTimer = async () => {
    if (!isActive) {
      if (timeLeft === 0) {
        setTimeLeft(duration * 60);
        setExpectedEndTime(Date.now() + duration * 60 * 1000);
      } else {
        setExpectedEndTime(Date.now() + timeLeft * 1000);
      }
      if (mode === 'WORK' && sessionTaskIds.length === 0 && activeTaskIds.length > 0) {
        setSessionTaskIds([...activeTaskIds]);
      }
    } else {
      setExpectedEndTime(null);
    }
    setIsActive(!isActive);
  };

  const resetTimer = (options?: { reason?: 'FINISHED_EARLY' | 'INTERRUPTION' | 'DISTRACTION' | 'SKIP' }) => {
    if (options?.reason === 'SKIP') {
      if (mode === 'WORK') {
        setMode('BREAK');
        setTimeLeft(5 * 60);
        setDuration(5);
      } else {
        setMode('WORK');
        setTimeLeft(DEFAULT_POMODORO_DURATION * 60);
        setDuration(DEFAULT_POMODORO_DURATION);
        setSessionTaskIds([]);
      }
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
          const newStats = { ...stats, xp: Math.max(0, stats.xp - 10) };
          updateStats(newStats);
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
    if (options?.reason !== 'SKIP') {
      setTimeLeft(duration * 60);
    }
  };

  const setTimerDuration = (minutes: number) => {
    setDuration(minutes);
    setTimeLeft(minutes * 60);
    setIsActive(false);
    setExpectedEndTime(null);
  };

  const handleFinishTaskEarly = (taskId: string) => {
    updateTask(taskId, { status: 'COMPLETED', completedAt: Date.now() } as any);
    setActiveTaskIds(prev => prev.filter(id => id !== taskId));
    
    if (activeTaskIds.length === 1 && activeTaskIds[0] === taskId) {
      resetTimer({ reason: 'FINISHED_EARLY' });
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    setActiveTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  return {
    timeLeft,
    isActive,
    mode,
    duration,
    energyLevel,
    activeTaskIds,
    sessionTaskIds,
    toggleTimer,
    resetTimer,
    setEnergyLevel,
    setActiveTaskIds,
    setTimerDuration,
    handleFinishTaskEarly,
    toggleTaskSelection
  };
}
