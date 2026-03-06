import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Zap, Coffee, Lightbulb, Brain, ChevronRight, Plus, CheckCircle2, Bell, BellOff } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTasks } from '../hooks/useTasks';
import { useIdeas, useAddIdea } from '../hooks/useIdeas';
import { useTags } from '../hooks/useTags';
import { useTimerActions } from '../hooks/useTimerActions';
import { EnergyLevel, TaskStatus } from '../types';
import { ENERGY_LABELS, DEFAULT_POMODORO_DURATION, INERTIA_DURATION } from '../constants';
import { cn } from '../types';

const formatPomodoros = (num: number | undefined) => {
  if (num === undefined || num === null) return '0';
  return num % 1 === 0 ? num.toString() : num.toFixed(1);
};

export const Timer: React.FC = () => {
  const { 
    timeLeft, isActive, mode, duration, energyLevel, activeTaskIds,
    setEnergyLevel, setDraftTask, setScreen
  } = useStore();
  
  const userId = useStore(state => state.userId);
  const { data: tasks = [] } = useTasks(userId);
  const { data: tags = [] } = useTags(userId);
  const addIdeaMutation = useAddIdea(userId);
  
  const { 
    toggleTimer, resetTimer, completeTask,
    setTimerDuration, handleFinishTaskEarly, toggleTaskSelection,
    requestNotificationPermission
  } = useTimerActions();

  const addIdea = addIdeaMutation.mutate;
  const suggestedTasks = tasks.filter(t => t.status !== TaskStatus.COMPLETED).slice(0, 3);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const handleEnableNotifications = async () => {
    await requestNotificationPermission();
    setNotificationsEnabled(Notification.permission === 'granted');
  };

  const cycleEnergy = () => {
    const levels = [EnergyLevel.LOW, EnergyLevel.NORMAL, EnergyLevel.HIGH];
    const currentIndex = levels.indexOf(energyLevel);
    const nextIndex = (currentIndex + 1) % levels.length;
    setEnergyLevel(levels[nextIndex]);
  };

  const [showIdeaInput, setShowIdeaInput] = useState(false);
  const [ideaText, setIdeaText] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  // Play sound when timer completes (detected by timeLeft hitting 0)
  useEffect(() => {
    if (timeLeft === 0) {
      audioRef.current?.play();
    }
  }, [timeLeft]);

  const handleResetClick = () => {
    if (!isActive && timeLeft === duration * 60) return;

    const totalDuration = duration * 60;
    const elapsedTime = totalDuration - timeLeft;
    const percentage = elapsedTime / totalDuration;

    if (mode === 'WORK' && percentage >= 0.05) {
      if (isActive) toggleTimer(); // Pause the timer
      setShowResetModal(true);
    } else {
      resetTimer({ reason: 'SKIP' }); // Less than 5%, don't save session
    }
  };

  const handleResetConfirm = (reason: 'FINISHED_EARLY' | 'INTERRUPTION' | 'DISTRACTION') => {
    resetTimer({ reason });
    setShowResetModal(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (timeLeft / (duration * 60)) * 100;

  const canStart = isActive || mode === 'BREAK' || activeTaskIds.length > 0;

  const handleSaveIdea = () => {
    if (ideaText.trim()) {
      addIdea(ideaText);
      setIdeaText('');
      setShowIdeaInput(false);
    }
  };

  const [taskToFinish, setTaskToFinish] = useState<string | null>(null);
  const [showOverdue, setShowOverdue] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  const pendingTasks = tasks.filter(t => t.status !== TaskStatus.COMPLETED && !activeTaskIds.includes(t.id));
  
  const isBeforeToday = (timestamp: number) => {
    const d = new Date(timestamp);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < todayTime;
  };

  const isTodayOrFuture = (timestamp: number) => {
    const d = new Date(timestamp);
    d.setHours(0, 0, 0, 0);
    return d.getTime() >= todayTime;
  };

  const overdueTasks = pendingTasks.filter(t => {
    if (t.taskDate) {
      return isBeforeToday(t.taskDate);
    }
    return isBeforeToday(t.createdAt);
  });
  
  const defaultTasks = pendingTasks.filter(t => {
    if (t.taskDate) {
      return isTodayOrFuture(t.taskDate);
    }
    return isTodayOrFuture(t.createdAt);
  }); // Las actuales como default

  useEffect(() => {
    if (showOverdue && overdueTasks.length === 0) {
      setShowOverdue(false);
    }
  }, [overdueTasks.length, showOverdue]);

  const tasksToDisplay = showOverdue ? overdueTasks : defaultTasks;

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto p-4 space-y-4">
      {/* Timer Display */}
      <div className="relative w-48 h-48 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 208 208">
          <rect
            x="8"
            y="8"
            width="192"
            height="192"
            rx="48"
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            className="text-zinc-800"
          />
          <motion.rect
            x="8"
            y="8"
            width="192"
            height="192"
            rx="48"
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            pathLength="100"
            strokeDasharray="100"
            initial={{ strokeDashoffset: 100 }}
            animate={{ strokeDashoffset: 100 - progress }}
            className={cn(
              "transition-colors duration-500",
              mode === 'WORK' ? "text-emerald-500" : mode === 'BREAK' ? "text-blue-500" : "text-amber-500"
            )}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          {!isActive && (
            <div className="flex items-center gap-2 mb-1">
              <button 
                onClick={() => setTimerDuration(duration - 5)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition-colors text-xs font-bold"
              >
                -
              </button>
              <button 
                onClick={() => setTimerDuration(0.0166)}
                className="px-2 h-6 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition-colors text-[8px] font-bold uppercase tracking-tighter"
              >
                1s
              </button>
              <button 
                onClick={() => setTimerDuration(duration + 5)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition-colors text-xs font-bold"
              >
                +
              </button>
            </div>
          )}
          <span className="text-3xl font-mono font-bold tracking-tighter">
            {formatTime(timeLeft)}
          </span>
          {mode === 'WORK' && !isActive && (
            <button 
              onClick={cycleEnergy}
              className="text-xl my-1 hover:scale-110 active:scale-95 transition-transform"
              title="Cambiar nivel de energía"
            >
              {energyLevel === EnergyLevel.HIGH ? '🔥' : energyLevel === EnergyLevel.NORMAL ? '🙂' : '🪫'}
            </button>
          )}
          <span className="text-[9px] uppercase tracking-widest opacity-50">
            {mode === 'WORK' ? 'Enfoque' : 'Descanso'}
          </span>
        </div>
      </div>

      {/* Warning if no task */}
      {!isActive && mode === 'WORK' && activeTaskIds.length === 0 && (
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest text-center"
        >
          Selecciona una tarea para comenzar
        </motion.p>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => {
            setDraftTask({});
            setScreen('TASKS');
          }}
          className="p-3 rounded-full bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
          title="Agregar Tarea"
        >
          <Plus size={20} />
        </button>

        <button 
          onClick={handleResetClick}
          className="p-3 rounded-full bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
        >
          <RotateCcw size={20} />
        </button>
        
        <button 
          onClick={toggleTimer}
          disabled={!canStart}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg",
            isActive ? "bg-zinc-800 text-white cursor-not-allowed" : "bg-emerald-500 text-black",
            !canStart && "opacity-50 cursor-not-allowed grayscale"
          )}
        >
          {isActive ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
        </button>
 
        <button 
          onClick={() => setShowIdeaInput(true)}
          className="p-3 rounded-full bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
        >
          <Lightbulb size={20} />
        </button>

        <button 
          onClick={handleEnableNotifications}
          className={cn(
            "p-3 rounded-full transition-all",
            notificationsEnabled ? "bg-zinc-900 text-emerald-500" : "bg-zinc-900 text-zinc-500 hover:text-white"
          )}
          title={notificationsEnabled ? "Notificaciones activadas" : "Activar notificaciones (incluso si cierras la app)"}
        >
          {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
        </button>
      </div>

      {/* Quick Actions - REMOVED AS REQUESTED */}

      {/* Reset Justification Modal */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="text-amber-500" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">¿Por qué reinicias?</h3>
              <p className="text-zinc-500 text-sm mb-6">
                Has avanzado más del 5% del pomodoro. ¿Qué sucedió?
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleResetConfirm('FINISHED_EARLY')}
                  className="w-full p-4 rounded-2xl bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-700 transition-colors text-left"
                >
                  ✅ Terminé la tarea antes
                </button>
                <button 
                  onClick={() => handleResetConfirm('INTERRUPTION')}
                  className="w-full p-4 rounded-2xl bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-700 transition-colors text-left"
                >
                  📞 Tuve una interrupción importante
                </button>
                <button 
                  onClick={() => handleResetConfirm('DISTRACTION')}
                  className="w-full p-4 rounded-2xl bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-700 transition-colors text-left"
                >
                  📱 Me distraje / Procrastiné
                </button>
                <button 
                  onClick={() => setShowResetModal(false)}
                  className="w-full p-4 rounded-2xl bg-transparent text-zinc-500 font-bold hover:text-zinc-300 transition-colors mt-2"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Tasks or Suggested Tasks */}
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
            {activeTaskIds.length > 0 ? 'Trabajando en' : 'Tareas Pendientes'}
          </span>
          {overdueTasks.length > 0 && (
            <button 
              onClick={() => setShowOverdue(!showOverdue)}
              className={cn(
                "text-[9px] font-bold uppercase tracking-widest transition-colors",
                showOverdue ? "text-amber-500 hover:text-amber-400" : "text-zinc-500 hover:text-amber-500"
              )}
            >
              {showOverdue ? 'Ver Actuales' : `${overdueTasks.length} Atrasadas`}
            </button>
          )}
        </div>
        
        <div className="space-y-2">
          {/* Active Tasks First */}
          {tasks.filter(t => activeTaskIds.includes(t.id)).map(task => {
            const taskTag = tags.find(t => t.name === task.tag);
            const tagColor = taskTag?.color || '#10b981';
            return (
              <div 
                key={task.id}
                className="w-full flex items-center gap-3 bg-zinc-900 border border-emerald-500/30 rounded-2xl p-3 transition-all"
              >
                <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: tagColor }} />
                <div className="flex-1 min-w-0">
                  <span className="block text-[8px] font-bold uppercase tracking-tighter mb-0.5" style={{ color: tagColor }}>{task.tag}</span>
                  <h4 className="text-xs font-medium leading-tight truncate">{task.name}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleTaskSelection(task.id)}
                    className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
                    title="Deseleccionar"
                  >
                    <RotateCcw size={12} />
                  </button>
                  <button 
                    onClick={() => setTaskToFinish(task.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black text-[9px] font-bold uppercase tracking-tighter shadow-lg shadow-emerald-500/20"
                  >
                    Listo
                  </button>
                </div>
              </div>
            );
          })}

          {/* Then some pending tasks to select */}
          {tasksToDisplay
            .slice(0, 5)
            .map(task => {
              const taskTag = tags.find(t => t.name === task.tag);
              const tagColor = taskTag?.color || '#10b981';
              return (
                <button 
                  key={task.id}
                  onClick={() => toggleTaskSelection(task.id)}
                  className="w-full flex items-center gap-3 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-3 transition-all hover:border-zinc-700 group"
                >
                  <div className="w-1.5 h-6 rounded-full opacity-30 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: tagColor }} />
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-tighter group-hover:text-zinc-400">{task.tag}</span>
                      <span className="text-[8px] font-mono text-zinc-600">{formatPomodoros(task.actualPomodoros || 0)} / {formatPomodoros(task.estimatedPomodoros || 0)} 🍅</span>
                    </div>
                    <h4 className="text-xs font-medium leading-tight truncate text-zinc-500 group-hover:text-zinc-300">{task.name}</h4>
                  </div>
                  <Plus size={14} className="text-zinc-700 group-hover:text-emerald-500 transition-colors" />
                </button>
              );
            })}
          
          {tasks.filter(t => t.status !== TaskStatus.COMPLETED).length === 0 && (
            <div className="p-4 text-center border border-dashed border-zinc-800/50 rounded-xl">
              <p className="text-zinc-700 text-[8px] uppercase font-bold tracking-widest">Sin tareas pendientes</p>
            </div>
          )}
        </div>
      </div>

      {/* Idea Modal */}
      <AnimatePresence>
        {showIdeaInput && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-500/20 rounded-xl">
                  <Lightbulb className="text-amber-500" size={20} />
                </div>
                <h3 className="text-xl font-bold">Captura una Idea</h3>
              </div>
              <textarea
                autoFocus
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                placeholder="Escribe lo que se te ocurrió para no distraerte..."
                className="w-full bg-zinc-800 border-none rounded-2xl p-4 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500 min-h-[120px] mb-6 resize-none"
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowIdeaInput(false)}
                  className="flex-1 p-4 rounded-2xl bg-zinc-800 text-zinc-400 font-bold"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveIdea}
                  className="flex-1 p-4 rounded-2xl bg-emerald-500 text-black font-bold"
                >
                  Guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finish Task Confirmation Modal */}
      <AnimatePresence>
        {taskToFinish && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-emerald-500" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">¿Terminar tarea?</h3>
              <p className="text-zinc-500 text-sm mb-8">¿Estás seguro de que quieres marcar esta tarea como completada?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setTaskToFinish(null)}
                  className="flex-1 p-4 rounded-2xl bg-zinc-800 text-zinc-400 font-bold"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    handleFinishTaskEarly(taskToFinish);
                    setTaskToFinish(null);
                  }}
                  className="flex-1 p-4 rounded-2xl bg-emerald-500 text-black font-bold"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
