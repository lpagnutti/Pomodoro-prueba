import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDocs, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Session } from '../types';
import { useEffect } from 'react';

export const SESSION_KEYS = {
  all: ['sessions'] as const,
};

const EMPTY_SESSIONS: Session[] = [];

export function useSessions(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(collection(db, 'users', userId, 'sessions'), (snapshot) => {
      const sessions = snapshot.docs.map(doc => doc.data() as Session);
      queryClient.setQueryData(SESSION_KEYS.all, sessions);
    });

    return () => unsubscribe();
  }, [userId, queryClient]);

  return useQuery({
    queryKey: SESSION_KEYS.all,
    queryFn: async () => {
      if (!userId) return [];
      const snapshot = await getDocs(collection(db, 'users', userId, 'sessions'));
      return snapshot.docs.map(doc => doc.data() as Session);
    },
    enabled: !!userId,
    staleTime: Infinity,
    initialData: EMPTY_SESSIONS,
  });
}

export function useAddSession(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (session: Session) => {
      if (!userId) throw new Error('User not authenticated');
      await setDoc(doc(db, 'users', userId, 'sessions', session.id), session);
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSION_KEYS.all });
    }
  });
}
