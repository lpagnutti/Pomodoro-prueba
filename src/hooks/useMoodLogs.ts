import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDocs, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { MoodLog } from '../types';
import { useEffect } from 'react';

export const MOOD_KEYS = {
  all: ['moodLogs'] as const,
};

const EMPTY_MOODS: MoodLog[] = [];

export function useMoodLogs(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(collection(db, 'users', userId, 'moodLogs'), (snapshot) => {
      const logs = snapshot.docs.map(doc => doc.data() as MoodLog);
      queryClient.setQueryData(MOOD_KEYS.all, logs);
    });

    return () => unsubscribe();
  }, [userId, queryClient]);

  return useQuery({
    queryKey: MOOD_KEYS.all,
    queryFn: async () => {
      if (!userId) return [];
      const snapshot = await getDocs(collection(db, 'users', userId, 'moodLogs'));
      return snapshot.docs.map(doc => doc.data() as MoodLog);
    },
    enabled: !!userId,
    staleTime: Infinity,
    initialData: EMPTY_MOODS,
  });
}

export function useAddMoodLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ mood, note }: { mood: string; note?: string }) => {
      if (!userId) throw new Error('User not authenticated');
      const newLog: MoodLog = {
        id: crypto.randomUUID(),
        mood,
        note,
        createdAt: Date.now(),
      };
      await setDoc(doc(db, 'users', userId, 'moodLogs', newLog.id), newLog);
      return newLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOOD_KEYS.all });
    }
  });
}
