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
  dueDate?: number;
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
}

export interface UserStats {
  xp: number;
  level: number;
  totalPomodoros: number;
}
