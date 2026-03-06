import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useMedications, useMedicationLogs } from '../hooks/useMedications';
import { useReminders } from '../hooks/useReminders';
import { useSessions, useAddSession } from '../hooks/useSessions';
import { useStats, useUpdateStats } from '../hooks/useStats';
import { XP_PER_POMODORO, LEVELS } from '../constants';
import { Session } from '../types';

export function GlobalEffects() {
  const {
    userId,
    setAuth,
    timeLeft,
    isActive,
    mode,
    duration,
    energyLevel,
    activeTaskIds,
    sessionTaskIds,
    expectedEndTime,
    setTimeLeft,
    setIsActive,
    setMode,
    setDuration,
    setExpectedEndTime,
    setTasksToResolve,
    setShowFinishModal,
    setActiveMedicationReminder,
    setActiveReminder,
    setError,
    pushSubscription,
  } = useStore();

  const { data: medications = [] } = useMedications(userId);
  const { data: medicationLogs = [] } = useMedicationLogs(userId);
  const { data: reminders = [] } = useReminders(userId);
  const { data: stats } = useStats(userId);
  const addSessionMutation = useAddSession(userId);
  const updateStatsMutation = useUpdateStats(userId);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuth(user ? user.uid : null, true);
    });
    return unsubscribe;
  }, [setAuth]);

  // Connection Test
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
  }, [userId, setError]);

  // Timer Tick Logic
  useEffect(() => {
    if (!isActive || !expectedEndTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.round((expectedEndTime - now) / 1000));
      
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setIsActive(false);
        setExpectedEndTime(null);
        
        // Play sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log("Audio play blocked", e));

        if (mode === 'WORK') {
          // Handle work session finish
          const newSession: Session = {
            id: crypto.randomUUID(),
            duration,
            energyLevel,
            startTime: Date.now() - (duration * 60 * 1000),
            type: 'WORK',
            tasksWorkedOn: sessionTaskIds,
            userId: userId || 'anonymous',
          };
          
          if (userId) {
            addSessionMutation.mutate(newSession);
            if (stats) {
              const newXp = stats.xp + XP_PER_POMODORO;
              const nextLevelConfig = LEVELS.find(l => l.level === stats.level + 1);
              const newLevel = nextLevelConfig && newXp >= nextLevelConfig.minXp ? stats.level + 1 : stats.level;
              
              updateStatsMutation.mutate({
                xp: newXp,
                level: newLevel,
                totalPomodoros: stats.totalPomodoros + 1
              });
            }
          }

          if (activeTaskIds.length > 0) {
            setTasksToResolve([...activeTaskIds]);
            setShowFinishModal(true);
          } else {
            setMode('BREAK');
            const breakDuration = 5;
            setDuration(breakDuration);
            setTimeLeft(breakDuration * 60);
          }
        } else {
          // Handle break finish
          setMode('WORK');
          const workDuration = 25;
          setDuration(workDuration);
          setTimeLeft(workDuration * 60);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isActive, expectedEndTime, mode, duration, energyLevel, activeTaskIds, sessionTaskIds, userId, stats, addSessionMutation, updateStatsMutation, setTimeLeft, setIsActive, setExpectedEndTime, setTasksToResolve, setShowFinishModal, setMode, setDuration]);

  // Timer Sync (Read)
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
      }
    });

    return () => unsubTimer();
  }, [userId, setExpectedEndTime, setTimeLeft, setIsActive, setMode, setDuration]);

  // Timer Sync (Write - Debounced)
  const timerStateRef = useRef({ expectedEndTime, timeLeft, isActive, mode, duration, energyLevel, activeTaskIds, sessionTaskIds });
  useEffect(() => {
    timerStateRef.current = { expectedEndTime, timeLeft, isActive, mode, duration, energyLevel, activeTaskIds, sessionTaskIds };
  }, [expectedEndTime, timeLeft, isActive, mode, duration, energyLevel, activeTaskIds, sessionTaskIds]);

  useEffect(() => {
    if (!userId) return;
    const timeout = setTimeout(() => {
      setDoc(doc(db, 'users', userId, 'timer', 'current'), timerStateRef.current);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [expectedEndTime, timeLeft, isActive, mode, duration, energyLevel, activeTaskIds, sessionTaskIds, userId]);

  return null;
}
