import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Zap, Coffee, Lightbulb, Brain, ChevronRight, Plus, CheckCircle2 } from 'lucide-react';
import { useApp } from '../AppContext';
import { EnergyLevel, TaskStatus } from '../types';
import { ENERGY_LABELS, DEFAULT_POMODORO_DURATION, INERTIA_DURATION } from '../constants';
import { cn } from '../types';

export const Timer: React.FC = () => {
  const { tasks, addIdea, suggestedTasks, timer, tags } = useApp();
  const { 
    timeLeft, isActive, mode, duration, energyLevel, activeTaskIds,
    toggleTimer, resetTimer, setEnergyLevel,
    setTimerDuration, handleFinishTaskEarly, toggleTaskSelection
  } = timer;

  const cycleEnergy = () => {
    const levels = [EnergyLevel.LOW, EnergyLevel.NORMAL, EnergyLevel.HIGH];
    const currentIndex = levels.indexOf(energyLevel);
    const nextIndex = (currentIndex + 1) % levels.length;
    setEnergyLevel(levels[nextIndex]);
  };

  const [showIdeaInput, setShowIdeaInput] = useState(false);
  const [ideaText, setIdeaText] = useState('');
  
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

  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [taskToFinish, setTaskToFinish] = useState<string | null>(null);

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
          onClick={resetTimer}
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
      </div>

      {/* Quick Actions - REMOVED AS REQUESTED */}

      {/* Active Tasks or Suggested Tasks */}
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
            {activeTaskIds.length > 0 ? 'Trabajando en' : 'Tareas Pendientes'}
          </span>
          <button 
            onClick={() => setShowTaskPicker(true)}
            className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400"
          >
            Ver todas
          </button>
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
          {tasks
            .filter(t => t.status !== TaskStatus.COMPLETED && !activeTaskIds.includes(t.id))
            .slice(0, 3)
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
                      <span className="text-[8px] font-mono text-zinc-600">{task.estimatedPomodoros} 🍅</span>
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

      {/* Task Picker Modal */}
      <AnimatePresence>
        {showTaskPicker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-md bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-[40px] sm:rounded-[40px] p-8 max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-8 sm:hidden" />
              <h3 className="text-2xl font-bold mb-6">Seleccionar Tareas</h3>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {tasks.filter(t => t.status !== TaskStatus.COMPLETED).map(task => {
                  const taskTag = tags.find(t => t.name === task.tag);
                  const tagColor = taskTag?.color || '#10b981';
                  const isActive = activeTaskIds.includes(task.id);
                  
                  return (
                    <button
                      key={task.id}
                      onClick={() => toggleTaskSelection(task.id)}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4",
                        isActive 
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" 
                          : "bg-zinc-800/50 border-transparent text-zinc-400"
                      )}
                    >
                      <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: tagColor, opacity: isActive ? 1 : 0.3 }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-tighter opacity-70" style={{ color: isActive ? tagColor : undefined }}>{task.tag}</span>
                          {isActive && <span className="text-[10px] font-bold uppercase">Activa</span>}
                        </div>
                        <p className="font-medium truncate">{task.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button 
                onClick={() => setShowTaskPicker(false)}
                className="w-full p-5 mt-6 rounded-2xl bg-emerald-500 text-black font-bold"
              >
                Listo
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
