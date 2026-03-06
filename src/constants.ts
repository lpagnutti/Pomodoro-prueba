import { EnergyLevel, TaskStatus } from './types';

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
