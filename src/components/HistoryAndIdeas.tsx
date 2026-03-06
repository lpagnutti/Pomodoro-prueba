import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../AppContext';
import { Lightbulb, Calendar, CheckCircle2, PlusCircle, Database, ChevronDown, ChevronUp } from 'lucide-react';

export const History: React.FC = () => {
  const { tasks, tags, seedMockData } = useApp();
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [expandedTags, setExpandedTags] = useState<Record<string, boolean>>({});

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    return d;
  });

  const toggleDay = (dateStr: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  const toggleTag = (dateStr: string, tagName: string) => {
    const key = `${dateStr}-${tagName}`;
    setExpandedTags(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto p-6 pb-24 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Historial</h2>
        <button 
          onClick={() => seedMockData()}
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-emerald-500 transition-colors"
          title="Generar datos de prueba"
        >
          <Database size={16} />
        </button>
      </div>

      <div className="space-y-6">
        {last7Days.map((date, index) => {
          const isToday = index === 0;
          const dateStr = date.toISOString().split('T')[0];
          const isExpanded = isToday || expandedDays[dateStr];
          
          const dayTasks = tasks
            .filter(t => {
              if (t.status !== 'COMPLETED' || !t.completedAt) return false;
              const completedDate = new Date(t.completedAt);
              completedDate.setHours(0, 0, 0, 0);
              return completedDate.getTime() === date.getTime();
            })
            .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

          const totalPomodoros = dayTasks.reduce((sum, t) => sum + t.actualPomodoros, 0);
          const totalMinutes = totalPomodoros * 25;
          const hours = Math.floor(totalMinutes / 60);
          const minutes = Math.round(totalMinutes % 60);
          const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

          const groupedByTag = dayTasks.reduce((acc: any, task) => {
            const tagName = task.tag || 'General';
            if (!acc[tagName]) acc[tagName] = { tasks: [], pomodoros: 0 };
            acc[tagName].tasks.push(task);
            acc[tagName].pomodoros += task.actualPomodoros;
            return acc;
          }, {});

          return (
            <div key={dateStr} className="bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden">
              <button 
                onClick={() => toggleDay(dateStr)}
                className="w-full p-6 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="text-sm font-bold uppercase tracking-widest text-zinc-400">
                    {isToday ? 'Hoy' : date.toLocaleDateString('es-LA', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </span>
                  {dayTasks.length > 0 && (
                    <div className="flex items-center gap-3 text-xs font-mono text-emerald-500">
                      <span>{dayTasks.length} tareas</span>
                      <span>•</span>
                      <span>{totalPomodoros.toFixed(1)} 🍅 ({timeString})</span>
                    </div>
                  )}
                </div>
                <div className="text-zinc-600">
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-0 border-t border-zinc-800/50">
                      {dayTasks.length === 0 ? (
                        <div className="py-8 text-center">
                          <p className="text-zinc-500 text-sm">No hay tareas completadas este día.</p>
                        </div>
                      ) : (
                        <div className="space-y-8 mt-6">
                          {Object.entries(groupedByTag).map(([tagName, data]: [string, any]) => {
                            const tagObj = tags.find(t => t.name === tagName);
                            const tagColor = tagObj?.color || '#10b981';
                            const tagKey = `${dateStr}-${tagName}`;
                            const isTagExpanded = expandedTags[tagKey];
                            
                            return (
                              <div key={tagName} className="space-y-4">
                                <button 
                                  onClick={() => toggleTag(dateStr, tagName)}
                                  className="flex items-center w-full gap-2 group"
                                >
                                  <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: tagColor }} />
                                  <h3 className="text-xs font-bold uppercase tracking-widest group-hover:opacity-80 transition-opacity" style={{ color: tagColor }}>
                                    {tagName}
                                  </h3>
                                  <div className="flex items-center gap-3 ml-auto">
                                    <span className="text-[10px] text-zinc-600 font-mono">{data.tasks.length} tareas</span>
                                    <span className="text-[10px] text-zinc-600 font-mono">{data.pomodoros.toFixed(1)} 🍅</span>
                                    {isTagExpanded ? <ChevronUp size={14} className="text-zinc-600" /> : <ChevronDown size={14} className="text-zinc-600" />}
                                  </div>
                                </button>
                                
                                <AnimatePresence>
                                  {isTagExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="space-y-3 overflow-hidden"
                                    >
                                      {data.tasks.map((task: any) => (
                                        <div 
                                          key={task.id}
                                          className="flex items-center gap-4 bg-zinc-800/30 rounded-2xl p-4"
                                        >
                                          <div className="p-2 rounded-lg" style={{ backgroundColor: `${tagColor}10` }}>
                                            <CheckCircle2 size={18} style={{ color: tagColor }} />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-medium truncate text-zinc-300">{task.name}</h4>
                                            <p className="text-[10px] text-zinc-500">
                                              {new Date(task.completedAt).toLocaleTimeString('es-LA', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <span className="text-xs font-mono font-bold text-zinc-400">{task.actualPomodoros.toFixed(1)} 🍅</span>
                                          </div>
                                        </div>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
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
