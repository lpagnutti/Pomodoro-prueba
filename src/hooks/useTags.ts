import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Tag } from '../types';
import { useEffect } from 'react';
import { TAG_COLORS, DEFAULT_TAGS } from '../constants';

export const TAG_KEYS = {
  all: ['tags'] as const,
};

export function useTags(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(collection(db, 'users', userId, 'tags'), (snapshot) => {
      const fetchedTags = snapshot.docs.map(doc => doc.data() as Tag);
      queryClient.setQueryData(TAG_KEYS.all, fetchedTags.length > 0 ? fetchedTags : DEFAULT_TAGS);
    });

    return () => unsubscribe();
  }, [userId, queryClient]);

  return useQuery({
    queryKey: TAG_KEYS.all,
    queryFn: async () => {
      if (!userId) return DEFAULT_TAGS;
      const snapshot = await getDocs(collection(db, 'users', userId, 'tags'));
      const fetchedTags = snapshot.docs.map(doc => doc.data() as Tag);
      return fetchedTags.length > 0 ? fetchedTags : DEFAULT_TAGS;
    },
    enabled: !!userId,
    staleTime: Infinity,
    initialData: DEFAULT_TAGS,
  });
}

export function useAddTag(userId: string | null, existingTags: Tag[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      if (!userId) throw new Error('User not authenticated');
      let finalColor = color;
      if (!finalColor) {
        const usedColors = existingTags.map(t => t.color);
        const availableColors = TAG_COLORS.filter(c => !usedColors.includes(c));
        finalColor = availableColors.length > 0 
          ? availableColors[Math.floor(Math.random() * availableColors.length)]
          : TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
      }

      const newTag: Tag = {
        id: crypto.randomUUID(),
        name,
        color: finalColor,
      };
      await setDoc(doc(db, 'users', userId, 'tags', newTag.id), newTag);
      return newTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAG_KEYS.all });
    }
  });
}

export function useUpdateTag(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Tag> }) => {
      if (!userId) throw new Error('User not authenticated');
      await updateDoc(doc(db, 'users', userId, 'tags', id), updates as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAG_KEYS.all });
    }
  });
}

export function useDeleteTag(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User not authenticated');
      await deleteDoc(doc(db, 'users', userId, 'tags', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAG_KEYS.all });
    }
  });
}
