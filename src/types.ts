import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export enum EnergyLevel {
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  LOW = 'LOW'
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  name: string;
  tag: string; // This will store the tag name or ID
  tags: string[]; // Additional tags if needed, but we'll focus on the primary 'tag'
  estimatedPomodoros: number;
  actualPomodoros: number;
  status: TaskStatus;
  createdAt: number;
  completedAt?: number;
  taskDate?: number;
}

export interface Idea {
  id: string;
  text: string;
  createdAt: number;
}

export interface Session {
  id: string;
  startTime: number;
  duration: number; // in minutes
  energyLevel: EnergyLevel;
  type: 'WORK' | 'BREAK';
  tasksWorkedOn: string[]; // IDs of tasks worked on during this session
  userId: string;
}

export interface UserStats {
  xp: number;
  level: number;
  totalPomodoros: number;
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  times: string[];
  notes?: string;
  stock: number;
  minStock: number;
  isActive: boolean;
  createdAt: number;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  medicationName: string;
  takenAt: number;
  dose: string;
}

export interface Note {
  id: string;
  content: string;
  createdAt: number;
  title?: string;
}

export interface MoodLog {
  id: string;
  mood: string;
  note?: string;
  createdAt: number;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  datetime: number; // timestamp
  completed: boolean;
  createdAt: number;
}
