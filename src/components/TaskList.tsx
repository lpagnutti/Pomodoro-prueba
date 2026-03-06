import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, CheckCircle2, Circle, Trash2, Tag, Folder, BarChart3, ChevronDown, ChevronUp, Palette, Edit2, Calendar as CalendarIcon } from 'lucide-react';
import { useApp, TAG_COLORS } from '../AppContext';
import { TaskStatus, Task, cn } from '../types';

const getRelativeTimeLabel = (timestamp: number, today: Date) => {
  const taskDate = new Date(timestamp);
  taskDate.setHours(0, 0, 0, 0);
  const todayDate = new Date(today);
  todayDate.setHours(0, 0, 0, 0);
  
  const diff = todayDate.getTime() - taskDate.getTime();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  
  if (days <= 0) return null;
  if (days === 1) return 'hace 1 día';
  return `hace ${days} días`;
};

export const TaskList: React.FC = () => {
  const { tasks, addTask, updateTask, deleteTask, completeTask, tags, addTag, updateTag, deleteTag, draftTask, setDraftTask } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showFuture, setShowFuture] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTag, setNewTag] = useState(tags[0]?.name || 'General');
  const [newEstimate, setNewEstimate] = useState(1);
  const [newDueDate, setNewDueDate] = useState<string>('');

  const [expandedTags, setExpandedTags] = useState<Record<string, boolean>>({});
  const [expandedCompletedTags, setExpandedCompletedTags] = useState<Record<string, boolean>>({});

  const toggleTag = (tagName: string) => {
    setExpandedTags(prev => ({ ...prev, [tagName]: !prev[tagName] }));
  };

  const toggleCompletedTag = (tagName: string) => {
    setExpandedCompletedTags(prev => ({ ...prev, [tagName]: !prev[tagName] }));
  };

  // Handle draft task from idea conversion
  React.useEffect(() => {
    if (draftTask) {
      setNewTaskName(draftTask.name || '');
      setNewTag(draftTask.tag || tags[0]?.name || 'General');
      setNewEstimate(draftTask.estimatedPomodoros || 1);
      setShowAddForm(true);
      setDraftTask(null);
    }
  }, [draftTask, tags, setDraftTask]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pendingTasks = tasks.filter(t => {
    if (t.status === TaskStatus.COMPLETED) return false;
    const isFuture = t.taskDate && t.taskDate > today.getTime();
    return showFuture ? isFuture : !isFuture;
  });
  
  const groupedTasks = pendingTasks.reduce((acc: Record<string, Task[]>, task) => {
    const tagName = task.tag || 'General';
    if (!acc[tagName]) acc[tagName] = [];
    acc[tagName].push(task);
    return acc;
  }, {});

  // Sort each group: Overdue first, then by due date, then by duration
  Object.keys(groupedTasks).forEach(tagName => {
    groupedTasks[tagName].sort((a, b) => {
      const aIsOverdue = a.createdAt < today.getTime();
      const bIsOverdue = b.createdAt < today.getTime();
      
      // Overdue tasks (created before today) always come first
      if (aIsOverdue && !bIsOverdue) return -1;
      if (!aIsOverdue && bIsOverdue) return 1;
      
      // If both are same status (both overdue or both today/future), sort by taskDate
      if (a.taskDate && b.taskDate) return a.taskDate - b.taskDate;
      if (a.taskDate) return -1;
      if (b.taskDate) return 1;
      
      // Finally by estimate
      return a.estimatedPomodoros - b.estimatedPomodoros;
    });
  });

  const completedTasks = tasks.filter(t => 
    t.status === TaskStatus.COMPLETED && 
    t.completedAt && 
    t.completedAt >= today.getTime()
  );

  const groupedCompletedTasks = completedTasks.reduce((acc: Record<string, Task[]>, task) => {
    const tagName = task.tag || 'General';
    if (!acc[tagName]) acc[tagName] = [];
    acc[tagName].push(task);
    return acc;
  }, {});

  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [taskToComplete, setTaskToComplete] = useState<string | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskName.trim()) {
      addTask({
        name: newTaskName,
        tag: newTag,
        estimatedPomodoros: newEstimate,
        taskDate: newDueDate ? new Date(newDueDate).getTime() : undefined,
      });
      setNewTaskName('');
      setNewEstimate(1);
      setNewDueDate('');
      setShowAddForm(false);
    }
  };

  const [showTagManager, setShowTagManager] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagName.trim()) {
      addTag(newTagName);
      setNewTagName('');
    }
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto p-6 pb-24 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Tareas</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowFuture(!showFuture)}
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors",
              showFuture ? "bg-emerald-500 text-black" : "bg-zinc-900 text-zinc-400"
            )}
          >
            {showFuture ? 'Ver Hoy' : 'Ver Futuro'}
          </button>
          <button 
            onClick={() => setShowTagManager(true)}
            className="p-3 rounded-2xl bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
          >
            <Tag size={20} />
          </button>
          <button 
            onClick={() => setShowAddForm(true)}
            className="p-3 rounded-2xl bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* Tag Manager Modal */}
      <AnimatePresence>
        {showTagManager && (
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
              <h3 className="text-xl font-bold mb-6">Gestionar Etiquetas</h3>
              
              <form onSubmit={handleAddTag} className="flex gap-2 mb-6">
                <input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Nueva etiqueta..."
                  className="flex-1 bg-zinc-800 border-none rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500"
                />
                <button 
                  type="submit"
                  className="p-2 bg-emerald-500 text-black rounded-xl"
                >
                  <Plus size={20} />
                </button>
              </form>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {tags.map(tag => (
                  <div key={tag.id} className="space-y-2 p-3 bg-zinc-800/50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: tag.color }}
                        />
                        {editingTagId === tag.id ? (
                          <input 
                            autoFocus
                            value={tag.name}
                            onChange={(e) => updateTag(tag.id, { name: e.target.value })}
                            onBlur={() => setEditingTagId(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingTagId(null)}
                            className="bg-transparent border-none p-0 text-sm focus:ring-0 w-32"
                          />
                        ) : (
                          <span 
                            onClick={() => setEditingTagId(tag.id)}
                            className="text-sm cursor-pointer hover:text-emerald-400 transition-colors"
                          >
                            {tag.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setEditingTagId(editingTagId === tag.id ? null : tag.id)}
                          className="text-zinc-500 hover:text-white transition-colors"
                        >
                          <Palette size={14} />
                        </button>
                        <button 
                          onClick={() => deleteTag(tag.id)}
                          className="text-zinc-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {editingTagId === tag.id && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-700/50">
                        {TAG_COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => updateTag(tag.id, { color })}
                            className={cn(
                              "w-5 h-5 rounded-full border-2 transition-transform hover:scale-125",
                              tag.color === color ? "border-white" : "border-transparent"
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setShowTagManager(false)}
                className="w-full p-4 mt-6 rounded-2xl bg-zinc-800 text-white font-bold"
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Task Form Overlay */}
      <AnimatePresence>
        {showAddForm && (
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
              className="w-full max-w-md bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-[40px] sm:rounded-[40px] p-8"
            >
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-8 sm:hidden" />
              <h3 className="text-2xl font-bold mb-6">Nueva Tarea</h3>
              <form onSubmit={handleAddTask} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Nombre de la tarea</label>
                  <input
                    autoFocus
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    placeholder="¿Qué vas a lograr?"
                    className="w-full bg-zinc-800 border-none rounded-2xl p-4 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Etiqueta</label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => setNewTag(tag.name)}
                          className={cn(
                            "px-3 py-2 rounded-xl text-xs font-medium transition-all border",
                            newTag === tag.name 
                              ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" 
                              : "bg-zinc-800 border-transparent text-zinc-500 hover:border-zinc-700"
                          )}
                          style={newTag === tag.name ? { borderColor: tag.color, color: tag.color, backgroundColor: `${tag.color}10` } : {}}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Fecha de Entrega (Opcional)</label>
                      <div className="relative">
                        <CalendarIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="date"
                          value={newDueDate}
                          onChange={(e) => setNewDueDate(e.target.value)}
                          className="w-full bg-zinc-800 border-none rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 [color-scheme:dark]"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Estimación (🍅)</label>
                      <div className="flex items-center gap-4 bg-zinc-800 rounded-2xl p-2">
                        <button
                          type="button"
                          onClick={() => setNewEstimate(prev => Math.max(0.5, prev - 0.5))}
                          className="p-3 rounded-xl bg-zinc-700 text-white hover:bg-zinc-600 transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <div className="flex-1 text-center font-mono text-xl font-bold">
                          {newEstimate}
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewEstimate(prev => prev + 0.5)}
                          className="p-3 rounded-xl bg-zinc-700 text-white hover:bg-zinc-600 transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 p-5 rounded-2xl bg-zinc-800 text-zinc-400 font-bold"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 p-5 rounded-2xl bg-emerald-500 text-black font-bold"
                  >
                    Crear Tarea
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending Tasks */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Pendientes</h3>
          <span className="text-xs text-zinc-600">{pendingTasks.length} tareas</span>
        </div>
        
        {pendingTasks.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-zinc-800 rounded-[32px]">
            <p className="text-zinc-600 text-sm">No hay tareas pendientes.<br/>¡Disfruta tu tiempo libre! ✨</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedTasks).map(([tagName, tagTasks]: [string, Task[]]) => {
              const tagObj = tags.find(t => t.name === tagName);
              const tagColor = tagObj?.color || '#10b981';
              const isExpanded = expandedTags[tagName];
              
              return (
                <div key={tagName} className="space-y-3">
                  <button 
                    onClick={() => toggleTag(tagName)}
                    className="flex items-center w-full gap-2 px-1 group"
                  >
                    <div className="w-1 h-3 rounded-full" style={{ backgroundColor: tagColor }} />
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">{tagName}</h4>
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-[10px] text-zinc-700 font-mono">{tagTasks.length} tareas</span>
                      <span className="text-[10px] text-zinc-700 font-mono">{tagTasks.reduce((sum, t) => sum + t.estimatedPomodoros, 0)} 🍅</span>
                      {isExpanded ? <ChevronUp size={12} className="text-zinc-600" /> : <ChevronDown size={12} className="text-zinc-600" />}
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        {tagTasks.map(task => {
                      const isOverdue = task.createdAt < today.getTime();
                      const relativeTime = getRelativeTimeLabel(task.createdAt, today);
                      const taskDateLabel = task.taskDate ? new Date(task.taskDate).toLocaleDateString('es-LA', { day: 'numeric', month: 'short' }) : null;
                      
                      return (
                        <motion.div 
                          layout
                          key={task.id}
                          className="group relative bg-zinc-900/40 border border-zinc-800/40 rounded-xl p-2.5 hover:border-zinc-700 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <button 
                              onClick={() => setTaskToComplete(task.id)}
                              className="flex-shrink-0 text-zinc-700 hover:text-emerald-500 transition-colors"
                            >
                              <Circle size={18} />
                            </button>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h5 className="text-xs font-medium leading-tight truncate text-zinc-200">{task.name}</h5>
                                {isOverdue && relativeTime && (
                                  <span className="text-[8px] font-bold text-amber-500/70 uppercase tracking-tighter">
                                    • {relativeTime}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[8px] font-mono text-zinc-600">
                                  {task.estimatedPomodoros} 🍅
                                </span>
                                {taskDateLabel && (
                                  <span className="text-[8px] flex items-center gap-1 text-zinc-500">
                                    <CalendarIcon size={8} /> {taskDateLabel}
                                  </span>
                                )}
                              </div>
                            </div>

                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => setTaskToEdit(task)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-800 hover:text-blue-500 transition-all"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button 
                                  onClick={() => setTaskToDelete(task.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-800 hover:text-red-500 transition-all"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
          </div>
        )}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && !showFuture && (
        <div className="space-y-4">
          <button 
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center justify-between w-full group"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">Completadas</h3>
              {showCompleted ? <ChevronUp size={14} className="text-zinc-600" /> : <ChevronDown size={14} className="text-zinc-600" />}
            </div>
            <span className="text-xs text-zinc-600">{completedTasks.length} tareas</span>
          </button>
          
          <AnimatePresence>
            {showCompleted && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-8 overflow-hidden"
              >
                {Object.entries(groupedCompletedTasks).map(([tagName, tagTasks]: [string, Task[]]) => {
                  const tagObj = tags.find(t => t.name === tagName);
                  const tagColor = tagObj?.color || '#10b981';
                  const isExpanded = expandedCompletedTags[tagName];
                  
                  return (
                    <div key={tagName} className="space-y-3">
                      <button 
                        onClick={() => toggleCompletedTag(tagName)}
                        className="flex items-center w-full gap-2 px-1 group"
                      >
                        <div className="w-1 h-3 rounded-full" style={{ backgroundColor: tagColor }} />
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">{tagName}</h4>
                        <div className="flex items-center gap-2 ml-auto">
                          <span className="text-[10px] text-zinc-700 font-mono">{tagTasks.length} tareas</span>
                          <span className="text-[10px] text-zinc-700 font-mono">{tagTasks.reduce((sum, t) => sum + t.actualPomodoros, 0).toFixed(1)} 🍅</span>
                          {isExpanded ? <ChevronUp size={12} className="text-zinc-600" /> : <ChevronDown size={12} className="text-zinc-600" />}
                        </div>
                      </button>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-2 overflow-hidden"
                          >
                            {tagTasks.map(task => {
                              const taskDateLabel = task.completedAt ? new Date(task.completedAt).toLocaleTimeString('es-LA', { hour: '2-digit', minute: '2-digit' }) : null;
                              
                              return (
                                <motion.div 
                                  layout
                                  key={task.id}
                                  className="group relative bg-zinc-900/40 border border-zinc-800/40 rounded-xl p-2.5 hover:border-zinc-700 transition-colors opacity-70"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="flex-shrink-0 text-emerald-500">
                                      <CheckCircle2 size={18} />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h5 className="text-xs font-medium leading-tight truncate text-zinc-400 line-through">{task.name}</h5>
                                      </div>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[8px] font-mono text-zinc-600">
                                          {task.actualPomodoros.toFixed(1)} 🍅
                                        </span>
                                        {taskDateLabel && (
                                          <span className="text-[8px] flex items-center gap-1 text-zinc-500">
                                            <CheckCircle2 size={8} /> {taskDateLabel}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <button 
                                        onClick={() => setTaskToDelete(task.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-800 hover:text-red-500 transition-all"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      {/* Edit Task Modal */}
      <AnimatePresence>
        {taskToEdit && (
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
              className="w-full max-w-md bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-[40px] sm:rounded-[40px] p-8"
            >
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-8 sm:hidden" />
              <h3 className="text-2xl font-bold mb-6">Editar Tarea</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Nombre de la tarea</label>
                  <input
                    autoFocus
                    value={taskToEdit.name}
                    onChange={(e) => setTaskToEdit({ ...taskToEdit, name: e.target.value })}
                    className="w-full bg-zinc-800 border-none rounded-2xl p-4 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Etiqueta</label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => setTaskToEdit({ ...taskToEdit, tag: tag.name })}
                          className={cn(
                            "px-3 py-2 rounded-xl text-xs font-medium transition-all border",
                            taskToEdit.tag === tag.name 
                              ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" 
                              : "bg-zinc-800 border-transparent text-zinc-500 hover:border-zinc-700"
                          )}
                          style={taskToEdit.tag === tag.name ? { borderColor: tag.color, color: tag.color, backgroundColor: `${tag.color}10` } : {}}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Fecha de Entrega</label>
                      <div className="relative">
                        <CalendarIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="date"
                          value={taskToEdit.taskDate ? new Date(taskToEdit.taskDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => setTaskToEdit({ ...taskToEdit, taskDate: e.target.value ? new Date(e.target.value).getTime() : undefined })}
                          className="w-full bg-zinc-800 border-none rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 [color-scheme:dark]"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Estimación (🍅)</label>
                      <div className="flex items-center gap-4 bg-zinc-800 rounded-2xl p-2">
                        <button
                          type="button"
                          onClick={() => setTaskToEdit({ ...taskToEdit, estimatedPomodoros: Math.max(0.5, taskToEdit.estimatedPomodoros - 0.5) })}
                          className="p-3 rounded-xl bg-zinc-700 text-white hover:bg-zinc-600 transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <div className="flex-1 text-center font-mono text-xl font-bold">
                          {taskToEdit.estimatedPomodoros}
                        </div>
                        <button
                          type="button"
                          onClick={() => setTaskToEdit({ ...taskToEdit, estimatedPomodoros: taskToEdit.estimatedPomodoros + 0.5 })}
                          className="p-3 rounded-xl bg-zinc-700 text-white hover:bg-zinc-600 transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setTaskToEdit(null)}
                    className="flex-1 p-5 rounded-2xl bg-zinc-800 text-zinc-400 font-bold"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      updateTask(taskToEdit.id, taskToEdit);
                      setTaskToEdit(null);
                    }}
                    className="flex-1 p-5 rounded-2xl bg-emerald-500 text-black font-bold"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {taskToDelete && (
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
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">¿Eliminar tarea?</h3>
              <p className="text-zinc-500 text-sm mb-8">Esta acción no se puede deshacer. Perderás el progreso de esta tarea.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setTaskToDelete(null)}
                  className="flex-1 p-4 rounded-2xl bg-zinc-800 text-zinc-400 font-bold"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    deleteTask(taskToDelete);
                    setTaskToDelete(null);
                  }}
                  className="flex-1 p-4 rounded-2xl bg-red-500 text-white font-bold"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Complete Confirmation Modal */}
      <AnimatePresence>
        {taskToComplete && (
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
              <h3 className="text-xl font-bold mb-2">¿Completar tarea?</h3>
              <p className="text-zinc-500 text-sm mb-8">¿Estás seguro de que quieres marcar esta tarea como completada?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setTaskToComplete(null)}
                  className="flex-1 p-4 rounded-2xl bg-zinc-800 text-zinc-400 font-bold"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    completeTask(taskToComplete);
                    setTaskToComplete(null);
                  }}
                  className="flex-1 p-4 rounded-2xl bg-emerald-500 text-black font-bold"
                >
                  Completar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
