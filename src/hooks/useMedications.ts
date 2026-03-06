import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { Medication, MedicationLog } from '../types';
import { useEffect } from 'react';

// Keys
export const MEDICATION_KEYS = {
  all: ['medications'] as const,
  logs: ['medicationLogs'] as const,
};

const EMPTY_MEDICATIONS: Medication[] = [];
const EMPTY_LOGS: MedicationLog[] = [];

// Hooks
export function useMedications(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(collection(db, 'users', userId, 'medications'), (snapshot) => {
      const meds = snapshot.docs.map(doc => doc.data() as Medication);
      queryClient.setQueryData(MEDICATION_KEYS.all, meds);
    });

    return () => unsubscribe();
  }, [userId, queryClient]);

  return useQuery({
    queryKey: MEDICATION_KEYS.all,
    queryFn: async () => {
      if (!userId) return [];
      const snapshot = await getDocs(collection(db, 'users', userId, 'medications'));
      return snapshot.docs.map(doc => doc.data() as Medication);
    },
    enabled: !!userId,
    staleTime: Infinity,
    initialData: EMPTY_MEDICATIONS,
  });
}

export function useMedicationLogs(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(collection(db, 'users', userId, 'medicationLogs'), (snapshot) => {
      const logs = snapshot.docs.map(doc => doc.data() as MedicationLog);
      queryClient.setQueryData(MEDICATION_KEYS.logs, logs);
    });

    return () => unsubscribe();
  }, [userId, queryClient]);

  return useQuery({
    queryKey: MEDICATION_KEYS.logs,
    queryFn: async () => {
      if (!userId) return [];
      const snapshot = await getDocs(collection(db, 'users', userId, 'medicationLogs'));
      return snapshot.docs.map(doc => doc.data() as MedicationLog);
    },
    enabled: !!userId,
    staleTime: Infinity,
    initialData: EMPTY_LOGS,
  });
}

// Mutations
export function useAddMedication(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (med: Partial<Medication>) => {
      if (!userId) throw new Error('User not authenticated');
      const newMed: Medication = {
        id: crypto.randomUUID(),
        name: med.name || 'Nuevo Medicamento',
        dose: med.dose || '',
        frequency: med.frequency || '',
        times: med.times || [],
        notes: med.notes || '',
        stock: med.stock || 0,
        minStock: med.minStock || 5,
        isActive: true,
        createdAt: Date.now(),
      };
      await setDoc(doc(db, 'users', userId, 'medications', newMed.id), newMed);
      return newMed;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICATION_KEYS.all });
    }
  });
}

export function useUpdateMedication(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Medication> }) => {
      if (!userId) throw new Error('User not authenticated');
      await updateDoc(doc(db, 'users', userId, 'medications', id), updates as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICATION_KEYS.all });
    }
  });
}

export function useDeleteMedication(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User not authenticated');
      await deleteDoc(doc(db, 'users', userId, 'medications', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICATION_KEYS.all });
    }
  });
}

export function useTakeMedication(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, med }: { id: string; med: Medication }) => {
      if (!userId) throw new Error('User not authenticated');
      
      const newLog: MedicationLog = {
        id: crypto.randomUUID(),
        medicationId: id,
        medicationName: med.name,
        takenAt: Date.now(),
        dose: med.dose,
      };

      const medRef = doc(db, 'users', userId, 'medications', id);
      const logRef = doc(db, 'users', userId, 'medicationLogs', newLog.id);

      await runTransaction(db, async (transaction) => {
        const medDoc = await transaction.get(medRef);
        if (!medDoc.exists()) {
          throw new Error("Medication does not exist!");
        }

        const currentStock = medDoc.data().stock || 0;
        const newStock = Math.max(0, currentStock - 1);

        transaction.update(medRef, { stock: newStock });
        transaction.set(logRef, newLog);
      });
      
      return { newLog, med };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICATION_KEYS.logs });
      queryClient.invalidateQueries({ queryKey: MEDICATION_KEYS.all });
    }
  });
}
