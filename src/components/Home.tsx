import React, { useState, useEffect } from 'react';
import { Timer } from './Timer';
import { TaskList } from './TaskList';
import { Plus, CheckCircle2, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { MOTIVATIONAL_QUOTES } from '../constants/quotes';

// Componente principal de la pantalla de inicio
export const Home: React.FC = () => {
  const { tasks, setDraftTask, setScreen, tasksToResolve, setTasksToResolve, showFinishModal, setShowFinishModal, completeTask } = useApp();
  const [quote, setQuote] = useState('');

  // Efecto para mostrar confeti y una cita motivacional al terminar un Pomodoro
  useEffect(() => {
    if (showFinishModal && !quote) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
      setQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
    } else if (!showFinishModal) {
      setQuote('');
    }
  }, [showFinishModal, quote]);

  const currentTaskToResolveId = tasksToResolve[0];
  const task = tasks.find(t => t.id === currentTaskToResolveId);

  // Maneja la resolución de tareas al terminar un Pomodoro
  const handleResolve = (completed: boolean) => {
    if (completed && task) {
      completeTask(task.id);
    }
    const nextTasks = tasksToResolve.slice(1);
    setTasksToResolve(nextTasks);
    if (nextTasks.length === 0) {
      setShowFinishModal(false);
    }
  };

  // Cierra el modal de finalización
  const handleCloseFinishModal = () => {
    setTasksToResolve([]);
    setShowFinishModal(false);
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto p-4 space-y-6">
      <Timer />

      <button 
        onClick={() => {
          setDraftTask({});
          setScreen('TASKS');
        }}
        className="w-full py-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center gap-2 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
      >
        <Plus size={20} />
        <span className="font-bold">Agregar Tarea</span>
      </button>

      {/* Task Resolution Modal */}
      <AnimatePresence>
        {showFinishModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center flex flex-col items-center relative"
            >
              <button 
                onClick={handleCloseFinishModal}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="text-emerald-500" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-4">¡Pomodoro Completado!</h3>
              
              {quote && (
                <div className="mb-6 p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
                  <p className="text-sm text-zinc-300 italic">"{quote}"</p>
                </div>
              )}

              {task ? (
                <>
                  <p className="text-zinc-400 text-sm mb-2">¿Has completado la tarea?</p>
                  <p className="text-lg font-medium text-white mb-8">"{task.name}"</p>
                  
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => handleResolve(false)}
                      className="flex-1 p-4 rounded-2xl bg-zinc-800 text-zinc-400 font-bold hover:bg-zinc-700 transition-colors"
                    >
                      Aún no
                    </button>
                    <button 
                      onClick={() => handleResolve(true)}
                      className="flex-1 p-4 rounded-2xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-colors"
                    >
                      Sí, completada
                    </button>
                  </div>
                  {tasksToResolve.length > 1 && (
                    <p className="mt-4 text-xs text-zinc-500">
                      Quedan {tasksToResolve.length - 1} tarea(s) por revisar
                    </p>
                  )}
                </>
              ) : (
                <button 
                  onClick={handleCloseFinishModal}
                  className="w-full p-4 rounded-2xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-colors mt-4"
                >
                  Continuar
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
