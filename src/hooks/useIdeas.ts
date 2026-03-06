import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Idea } from '../types';
import { useEffect } from 'react';

export const IDEA_KEYS = {
  all: ['ideas'] as const,
};

const EMPTY_IDEAS: Idea[] = [];

export function useIdeas(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(collection(db, 'users', userId, 'ideas'), (snapshot) => {
      const ideas = snapshot.docs.map(doc => doc.data() as Idea);
      queryClient.setQueryData(IDEA_KEYS.all, ideas);
    });

    return () => unsubscribe();
  }, [userId, queryClient]);

  return useQuery({
    queryKey: IDEA_KEYS.all,
    queryFn: async () => {
      if (!userId) return [];
      const snapshot = await getDocs(collection(db, 'users', userId, 'ideas'));
      return snapshot.docs.map(doc => doc.data() as Idea);
    },
    enabled: !!userId,
    staleTime: Infinity,
    initialData: EMPTY_IDEAS,
  });
}

export function useAddIdea(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      if (!userId) throw new Error('User not authenticated');
      const newIdea: Idea = {
        id: crypto.randomUUID(),
        text,
        createdAt: Date.now(),
      };
      await setDoc(doc(db, 'users', userId, 'ideas', newIdea.id), newIdea);
      return newIdea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IDEA_KEYS.all });
    }
  });
}

export function useDeleteIdea(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User not authenticated');
      await deleteDoc(doc(db, 'users', userId, 'ideas', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IDEA_KEYS.all });
    }
  });
}
