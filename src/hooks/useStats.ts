import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { UserStats } from '../types';
import { useEffect } from 'react';

export const STATS_KEYS = {
  current: ['stats', 'current'] as const,
};

const DEFAULT_STATS: UserStats = { xp: 0, level: 1, totalPomodoros: 0 };

export function useStats(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(doc(db, 'users', userId, 'stats', 'current'), (snapshot) => {
      if (snapshot.exists()) {
        queryClient.setQueryData(STATS_KEYS.current, snapshot.data() as UserStats);
      } else {
        queryClient.setQueryData(STATS_KEYS.current, DEFAULT_STATS);
      }
    });

    return () => unsubscribe();
  }, [userId, queryClient]);

  return useQuery({
    queryKey: STATS_KEYS.current,
    queryFn: async () => {
      if (!userId) return DEFAULT_STATS;
      const snapshot = await getDoc(doc(db, 'users', userId, 'stats', 'current'));
      if (snapshot.exists()) {
        return snapshot.data() as UserStats;
      }
      return DEFAULT_STATS;
    },
    enabled: !!userId,
    staleTime: Infinity,
    initialData: DEFAULT_STATS,
  });
}

export function useUpdateStats(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newStats: UserStats) => {
      if (!userId) throw new Error('User not authenticated');
      await setDoc(doc(db, 'users', userId, 'stats', 'current'), { ...newStats, userId });
      return newStats;
    },
    onSuccess: (newStats) => {
      queryClient.setQueryData(STATS_KEYS.current, newStats);
    }
  });
}
