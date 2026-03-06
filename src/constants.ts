import { EnergyLevel, TaskStatus, Tag } from './types';

export const TAG_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#d946ef', '#14b8a6', '#facc15', '#fb7185', '#a855f7', '#22c55e', '#38bdf8', '#4ade80', '#f472b6', '#94a3b8',
];

export const DEFAULT_TAGS: Tag[] = [
  { id: '1', name: 'Trabajo', color: TAG_COLORS[0] },
  { id: '2', name: 'Ejercicio', color: TAG_COLORS[1] },
  { id: '3', name: 'Lectura', color: TAG_COLORS[2] },
  { id: '4', name: 'Creación juegos de mesa', color: TAG_COLORS[3] },
  { id: '5', name: 'Ocio', color: TAG_COLORS[4] },
  { id: '6', name: 'Limpieza', color: TAG_COLORS[19] },
];

export const ENERGY_LABELS = {
  [EnergyLevel.HIGH]: 'Alta Energía 🔥',
  [EnergyLevel.NORMAL]: 'Energía Normal 🙂',
  [EnergyLevel.LOW]: 'Baja Energía 🪫',
};

export const STATUS_LABELS = {
  [TaskStatus.PENDING]: 'Pendiente',
  [TaskStatus.IN_PROGRESS]: 'En Progreso',
  [TaskStatus.COMPLETED]: 'Completada',
};

export const XP_PER_POMODORO = 10;

export const LEVELS = [
  { level: 1, name: 'Principiante', minXp: 0 },
  { level: 2, name: 'Constructor de Enfoque', minXp: 100 },
  { level: 3, name: 'Trabajador Profundo', minXp: 300 },
  { level: 4, name: 'Máquina de Productividad', minXp: 600 },
  { level: 5, name: 'Maestro del Enfoque', minXp: 1000 },
];

export const DEFAULT_POMODORO_DURATION = 25;
export const BREAK_DURATION = 5;
export const INERTIA_DURATION = 3;
