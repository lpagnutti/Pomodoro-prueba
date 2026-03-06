import React from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../AppContext';
import { Lightbulb, Calendar, CheckCircle2, PlusCircle, Database } from 'lucide-react';

export const History: React.FC = () => {
  const { tasks, tags, seedMockData } = useApp();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTasks = tasks
    .filter(t => t.status === 'COMPLETED' && t.completedAt && t.completedAt >= today.getTime())
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  const groupedByTag = todayTasks.reduce((acc: any, task) => {
    const tagName = task.tag || 'General';
    if (!acc[tagName]) acc[tagName] = { tasks: [], pomodoros: 0 };
    acc[tagName].tasks.push(task);
    acc[tagName].pomodoros += task.actualPomodoros;
    return acc;
  }, {});

  const totalTasks = todayTasks.length;
  const totalPomodoros = todayTasks.reduce((sum, t) => sum + t.actualPomodoros, 0);

  return (
    <div className="flex flex-col w-full max-w-md mx-auto p-6 pb-24 space-y-8">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Hoy</h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => seedMockData()}
              className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-emerald-500 transition-colors"
              title="Generar datos de prueba"
            >
              <Database size={16} />
            </button>
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              {new Date().toLocaleDateString('es-LA', { day: 'numeric', month: 'long' })}
            </span>
          </div>
        </div>
        {todayTasks.length > 0 && (
          <div className="flex gap-4 mt-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Total Tareas</span>
              <span className="text-lg font-bold text-emerald-500">{totalTasks}</span>
            </div>
            <div className="flex flex-col border-l border-zinc-800 pl-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Total Pomodoros</span>
              <span className="text-lg font-bold text-emerald-500">{totalPomodoros.toFixed(1)} 🍅</span>
            </div>
          </div>
        )}
      </div>

      {todayTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="p-6 bg-zinc-900 rounded-full">
            <Calendar size={48} className="text-zinc-700" />
          </div>
          <p className="text-zinc-500">Aún no has completado tareas hoy.<br/>¡Cada paso cuenta!</p>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(groupedByTag).map(([tagName, data]: [string, any]) => {
            const tagObj = tags.find(t => t.name === tagName);
            const tagColor = tagObj?.color || '#10b981';
            
            return (
              <div key={tagName} className="space-y-4">
                <div className="flex items-center gap-2 sticky top-0 bg-black py-2 z-10">
                  <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: tagColor }} />
                  <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: tagColor }}>
                    {tagName}
                  </h3>
                  <div className="flex items-center gap-3 ml-auto">
                    <span className="text-[10px] text-zinc-600 font-mono">{data.tasks.length} tareas</span>
                    <span className="text-[10px] text-zinc-600 font-mono">{data.pomodoros.toFixed(1)} 🍅</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {data.tasks.map((task: any) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={task.id}
                      className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
                    >
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${tagColor}10` }}>
                        <CheckCircle2 size={18} style={{ color: tagColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">{task.name}</h4>
                        <p className="text-[10px] text-zinc-500">Completada a las {new Date(task.completedAt).toLocaleTimeString('es-LA', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold">{task.actualPomodoros.toFixed(1)} 🍅</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const IdeaList: React.FC = () => {
  const { ideas, convertIdeaToTask } = useApp();

  return (
    <div className="flex flex-col w-full max-w-md mx-auto p-6 pb-24 space-y-8">
      <h2 className="text-3xl font-bold tracking-tight">Ideas</h2>
      
      {ideas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="p-6 bg-zinc-900 rounded-full">
            <Lightbulb size={48} className="text-zinc-700" />
          </div>
          <p className="text-zinc-500">No has capturado ideas todavía.<br/>Úsalas durante tus Pomodoros para no distraerte.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {ideas.map((idea) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={idea.id}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
              <p className="text-lg leading-relaxed mb-4">{idea.text}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  {new Date(idea.createdAt).toLocaleDateString('es-LA', { day: 'numeric', month: 'short' })}
                </span>
                <button 
                  onClick={() => convertIdeaToTask(idea.id)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl transition-all group/btn"
                >
                  <PlusCircle size={14} className="group-hover/btn:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">Convertir a Tarea</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
