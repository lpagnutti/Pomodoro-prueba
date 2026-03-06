import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../AppContext';
import { Lightbulb, Calendar, CheckCircle2, PlusCircle, Database, ChevronDown, ChevronUp, Trash2, Sparkles, X, Clock, ListTodo, Bell } from 'lucide-react';

const formatPomodoros = (num: number | undefined) => {
  if (num === undefined || num === null) return '0';
  return num % 1 === 0 ? num.toString() : num.toFixed(1);
};

// Componente de visualización de historial y lista de ideas
export const History: React.FC = () => {
  const { tasks, tags, seedMockData } = useApp();
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [expandedTags, setExpandedTags] = useState<Record<string, boolean>>({});

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generar los últimos 7 días
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    return d;
  });

  // Alternar expansión de un día
  const toggleDay = (dateStr: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  // Alternar expansión de una etiqueta dentro de un día
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
            if (!acc[tagName]) acc[tagName] = { tasks: [], actualPomodoros: 0, estimatedPomodoros: 0 };
            acc[tagName].tasks.push(task);
            acc[tagName].actualPomodoros += task.actualPomodoros;
            acc[tagName].estimatedPomodoros += task.estimatedPomodoros;
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
                                    <div className="w-1 h-3 rounded-full" style={{ backgroundColor: tagColor }} />
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                      {tagName}
                                    </h3>
                                    <div className="flex items-center gap-2 ml-auto">
                                      <span className="text-[10px] text-zinc-700 font-mono">{data.tasks.length} tareas</span>
                                      <span className="text-[10px] text-zinc-700 font-mono">{formatPomodoros(data.actualPomodoros)} / {formatPomodoros(data.estimatedPomodoros)} 🍅</span>
                                      {isTagExpanded ? <ChevronUp size={12} className="text-zinc-600" /> : <ChevronDown size={12} className="text-zinc-600" />}
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

// Componente de lista de ideas
export const IdeaList: React.FC = () => {
  const { ideas, convertIdeaToTask, convertIdeaToReminder, deleteIdea } = useApp();
  const [refiningIndex, setRefiningIndex] = useState<number | null>(null);
  const [conversionId, setConversionId] = useState<string | null>(null);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');

  const startRefining = () => {
    if (ideas.length > 0) setRefiningIndex(0);
  };

  const nextIdea = () => {
    if (refiningIndex !== null) {
      if (refiningIndex < ideas.length - 1) {
        setRefiningIndex(refiningIndex + 1);
      } else {
        setRefiningIndex(null);
      }
    }
  };

  const handleConvertClick = (id: string) => {
    setConversionId(id);
  };

  const confirmConvertToTask = () => {
    if (conversionId) {
      convertIdeaToTask(conversionId);
      setConversionId(null);
      setRefiningIndex(null);
    }
  };

  const confirmConvertToReminder = () => {
    if (conversionId && reminderDate && reminderTime) {
      const datetime = new Date(`${reminderDate}T${reminderTime}`).getTime();
      convertIdeaToReminder(conversionId, datetime);
      setConversionId(null);
      setRefiningIndex(null);
      setReminderDate('');
      setReminderTime('');
    }
  };

  const convertToReminderIn1Hour = () => {
    if (conversionId) {
      const datetime = Date.now() + 3600000;
      convertIdeaToReminder(conversionId, datetime);
      setConversionId(null);
      setRefiningIndex(null);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteIdea(id);
    if (refiningIndex !== null) {
      if (ideas.length <= 1) {
        setRefiningIndex(null);
      } else if (refiningIndex >= ideas.length - 1) {
        setRefiningIndex(ideas.length - 2);
      }
    }
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto p-6 pb-24 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Ideas</h2>
        {ideas.length > 0 && (
          <button 
            onClick={startRefining}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-amber-400 transition-colors"
          >
            <Sparkles size={14} />
            Depurar
          </button>
        )}
      </div>
      
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
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleDelete(idea.id)}
                    className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                    title="Eliminar idea"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleConvertClick(idea.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl transition-all group/btn"
                  >
                    <PlusCircle size={14} className="group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Convertir</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Refinement Modal */}
      <AnimatePresence>
        {refiningIndex !== null && ideas[refiningIndex] && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-[40px] w-full max-w-sm p-8 relative"
            >
              <button 
                onClick={() => setRefiningIndex(null)}
                className="absolute top-6 right-6 text-zinc-500 hover:text-white"
              >
                <X size={24} />
              </button>

              <div className="flex flex-col items-center text-center space-y-6">
                <div className="p-4 bg-amber-500/10 rounded-full">
                  <Sparkles size={32} className="text-amber-500" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Depurando Ideas</h3>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest">Idea {refiningIndex + 1} de {ideas.length}</p>
                </div>

                <div className="w-full p-6 bg-zinc-800/50 rounded-3xl border border-zinc-700/50">
                  <p className="text-lg italic text-zinc-200">"{ideas[refiningIndex].text}"</p>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full">
                  <button 
                    onClick={() => handleDelete(ideas[refiningIndex].id)}
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-zinc-800 hover:bg-red-500/10 hover:text-red-500 rounded-3xl transition-all group"
                  >
                    <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Descartar</span>
                  </button>
                  <button 
                    onClick={() => handleConvertClick(ideas[refiningIndex].id)}
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-emerald-500 text-black rounded-3xl transition-all hover:bg-emerald-400 group"
                  >
                    <PlusCircle size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Convertir</span>
                  </button>
                </div>

                <button 
                  onClick={nextIdea}
                  className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                >
                  Omitir por ahora
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversion Modal */}
      <AnimatePresence>
        {conversionId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-[40px] w-full max-w-sm p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Convertir Idea</h3>
                <button onClick={() => setConversionId(null)} className="text-zinc-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={confirmConvertToTask}
                  className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl flex items-center gap-4 transition-colors group"
                >
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                    <ListTodo size={24} />
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-zinc-200">Convertir a Tarea</h4>
                    <p className="text-xs text-zinc-500">Añadir a tu lista de tareas pendientes</p>
                  </div>
                </button>

                <div className="p-4 bg-zinc-800 rounded-2xl space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                      <Bell size={24} />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-zinc-200">Convertir a Recordatorio</h4>
                      <p className="text-xs text-zinc-500">Programar una notificación</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={convertToReminderIn1Hour}
                      className="p-3 bg-zinc-700 hover:bg-zinc-600 rounded-xl text-xs font-bold text-zinc-300 transition-colors"
                    >
                      En 1 hora
                    </button>
                    <div className="col-span-2 grid grid-cols-2 gap-2">
                       <input 
                        type="date" 
                        value={reminderDate}
                        onChange={e => setReminderDate(e.target.value)}
                        className="p-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
                      />
                      <input 
                        type="time" 
                        value={reminderTime}
                        onChange={e => setReminderTime(e.target.value)}
                        className="p-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button 
                      onClick={confirmConvertToReminder}
                      disabled={!reminderDate || !reminderTime}
                      className="col-span-2 p-3 bg-amber-500 text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Programar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
