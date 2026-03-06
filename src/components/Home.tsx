import React, { useState } from 'react';
import { Timer } from './Timer';
import { TaskList } from './TaskList';
import { Plus, CheckCircle2, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { motion, AnimatePresence } from 'framer-motion';

export const Home: React.FC = () => {
  const { tasks, setDraftTask, setScreen, taskToResolve, setTaskToResolve, completeTask } = useApp();

  const task = tasks.find(t => t.id === taskToResolve);

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
        {task && (
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
              <h3 className="text-xl font-bold mb-2">¿Tarea resuelta?</h3>
              <p className="text-zinc-500 text-sm mb-8">¿Has completado la tarea: "{task.name}"?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setTaskToResolve(null)}
                  className="flex-1 p-4 rounded-2xl bg-zinc-800 text-zinc-400 font-bold"
                >
                  No
                </button>
                <button 
                  onClick={() => {
                    completeTask(task.id);
                    setTaskToResolve(null);
                  }}
                  className="flex-1 p-4 rounded-2xl bg-emerald-500 text-black font-bold"
                >
                  Sí, completada
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
