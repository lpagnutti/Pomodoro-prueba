import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Task, TaskStatus } from '../types';
import { useEffect } from 'react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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

    const path = `users/${userId}/tasks`;
    const unsubscribe = onSnapshot(collection(db, 'users', userId, 'tasks'), (snapshot) => {
      const tasks = snapshot.docs.map(doc => doc.data() as Task);
      queryClient.setQueryData(TASK_KEYS.all, tasks);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [userId, queryClient]);

  return useQuery({
    queryKey: TASK_KEYS.all,
    queryFn: async () => {
      if (!userId) return [];
      const path = `users/${userId}/tasks`;
      try {
        const snapshot = await getDocs(collection(db, 'users', userId, 'tasks'));
        return snapshot.docs.map(doc => doc.data() as Task);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
      }
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
      const path = `users/${userId}/tasks/${newTask.id}`;
      try {
        await setDoc(doc(db, 'users', userId, 'tasks', newTask.id), newTask);
        return newTask;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
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
      const path = `users/${userId}/tasks/${id}`;
      try {
        await updateDoc(doc(db, 'users', userId, 'tasks', id), updates as any);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
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
      const path = `users/${userId}/tasks/${id}`;
      try {
        await deleteDoc(doc(db, 'users', userId, 'tasks', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.all });
    }
  });
}
