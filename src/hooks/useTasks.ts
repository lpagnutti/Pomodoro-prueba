import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Task, TaskStatus } from '../types';
import { useEffect } from 'react';

// Keys
export const TASK_KEYS = {
  all: ['tasks'] as const,
};

const EMPTY_TASKS: Task[] = [];

// Hooks
export function useTasks(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(collection(db, 'users', userId, 'tasks'), (snapshot) => {
      const tasks = snapshot.docs.map(doc => doc.data() as Task);
      queryClient.setQueryData(TASK_KEYS.all, tasks);
    });

    return () => unsubscribe();
  }, [userId, queryClient]);

  return useQuery({
    queryKey: TASK_KEYS.all,
    queryFn: async () => {
      if (!userId) return [];
      const snapshot = await getDocs(collection(db, 'users', userId, 'tasks'));
      return snapshot.docs.map(doc => doc.data() as Task);
    },
    enabled: !!userId,
    staleTime: Infinity,
    initialData: EMPTY_TASKS,
  });
}

// Mutations
export function useAddTask(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (task: Partial<Task>) => {
      if (!userId) throw new Error('User not authenticated');
      const newTask: Task = {
        id: crypto.randomUUID(),
        name: task.name || 'Nueva Tarea',
        tag: task.tag || '',
        tags: task.tags || [],
        estimatedPomodoros: task.estimatedPomodoros || 1,
        actualPomodoros: 0,
        status: TaskStatus.PENDING,
        createdAt: Date.now(),
      };
      await setDoc(doc(db, 'users', userId, 'tasks', newTask.id), newTask);
      return newTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all });
    }
  });
}

export function useUpdateTask(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      if (!userId) throw new Error('User not authenticated');
      await updateDoc(doc(db, 'users', userId, 'tasks', id), updates as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all });
    }
  });
}

export function useDeleteTask(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User not authenticated');
      await deleteDoc(doc(db, 'users', userId, 'tasks', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all });
    }
  });
}
