import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { getDb } from '../firebase';
import { Reminder } from '../types';
import { useEffect } from 'react';

export const REMINDER_KEYS = {
  all: ['reminders'] as const,
};

const EMPTY_REMINDERS: Reminder[] = [];

export function useReminders(userId: string | null) {
  const queryClient = useQueryClient();
  const db = getDb();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(collection(db, 'users', userId, 'reminders'), (snapshot) => {
      const reminders = snapshot.docs.map(doc => doc.data() as Reminder);
      queryClient.setQueryData(REMINDER_KEYS.all, reminders);
    });

    return () => unsubscribe();
  }, [userId, queryClient]);

  return useQuery({
    queryKey: REMINDER_KEYS.all,
    queryFn: async () => {
      if (!userId) return [];
      const snapshot = await getDocs(collection(db, 'users', userId, 'reminders'));
      return snapshot.docs.map(doc => doc.data() as Reminder);
    },
    enabled: !!userId,
    staleTime: Infinity,
    initialData: EMPTY_REMINDERS,
  });
}

export function useAddReminder(userId: string | null) {
  const queryClient = useQueryClient();
  const db = getDb();
  return useMutation({
    mutationFn: async (reminder: Partial<Reminder>) => {
      if (!userId) throw new Error('User not authenticated');
      const newReminder: Reminder = {
        id: crypto.randomUUID(),
        title: reminder.title || '',
        description: reminder.description,
        datetime: reminder.datetime || Date.now(),
        completed: false,
        createdAt: Date.now(),
      };
      await setDoc(doc(db, 'users', userId, 'reminders', newReminder.id), newReminder);
      return newReminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.all });
    }
  });
}

export function useCompleteReminder(userId: string | null) {
  const queryClient = useQueryClient();
  const db = getDb();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User not authenticated');
      await updateDoc(doc(db, 'users', userId, 'reminders', id), { completed: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.all });
    }
  });
}

export function useUpdateReminder(userId: string | null) {
  const queryClient = useQueryClient();
  const db = getDb();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Reminder> }) => {
      if (!userId) throw new Error('User not authenticated');
      await updateDoc(doc(db, 'users', userId, 'reminders', id), updates as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.all });
    }
  });
}

export function useDeleteReminder(userId: string | null) {
  const queryClient = useQueryClient();
  const db = getDb();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User not authenticated');
      await deleteDoc(doc(db, 'users', userId, 'reminders', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.all });
    }
  });
}
