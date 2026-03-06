import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Note } from '../types';
import { useEffect } from 'react';

export const NOTE_KEYS = {
  all: ['notes'] as const,
};

const EMPTY_NOTES: Note[] = [];

export function useNotes(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(collection(db, 'users', userId, 'notes'), (snapshot) => {
      const notes = snapshot.docs.map(doc => doc.data() as Note);
      queryClient.setQueryData(NOTE_KEYS.all, notes);
    });

    return () => unsubscribe();
  }, [userId, queryClient]);

  return useQuery({
    queryKey: NOTE_KEYS.all,
    queryFn: async () => {
      if (!userId) return [];
      const snapshot = await getDocs(collection(db, 'users', userId, 'notes'));
      return snapshot.docs.map(doc => doc.data() as Note);
    },
    enabled: !!userId,
    staleTime: Infinity,
    initialData: EMPTY_NOTES,
  });
}

export function useAddNote(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ content, title }: { content: string; title?: string }) => {
      if (!userId) throw new Error('User not authenticated');
      const newNote: Note = {
        id: crypto.randomUUID(),
        content,
        title: title || 'Nueva Nota',
        createdAt: Date.now(),
      };
      await setDoc(doc(db, 'users', userId, 'notes', newNote.id), newNote);
      return newNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTE_KEYS.all });
    }
  });
}

export function useDeleteNote(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User not authenticated');
      await deleteDoc(doc(db, 'users', userId, 'notes', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTE_KEYS.all });
    }
  });
}
