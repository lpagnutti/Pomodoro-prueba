import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../AppContext';
import { Bell, Plus, Trash2, CheckCircle2, Circle, Calendar, Clock, X } from 'lucide-react';

export const RemindersTab: React.FC = () => {
  const { reminders, addReminder, deleteReminder, completeReminder } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('');
  const [view, setView] = useState<'PENDING' | 'COMPLETED'>('PENDING');

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim() && newDate && newTime) {
      const datetime = new Date(`${newDate}T${newTime}`).getTime();
      addReminder({
        title: newTitle,
        description: newDescription,
        datetime,
      });
      setNewTitle('');
      setNewDescription('');
      setNewDate(new Date().toISOString().split('T')[0]);
      setNewTime('');
      setShowAddForm(false);
    }
  };

  const filteredReminders = reminders
    .filter(r => view === 'PENDING' ? !r.completed : r.completed)
    .sort((a, b) => a.datetime - b.datetime);

  return (
    <div className="flex flex-col w-full max-w-md mx-auto p-6 pb-24 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Recordatorios</h2>
        <button 
          onClick={() => setShowAddForm(true)}
          className="p-3 bg-emerald-500 text-black rounded-2xl hover:bg-emerald-400 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
        <button 
          onClick={() => setView('PENDING')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            view === 'PENDING' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500'
          }`}
        >
          Pendientes
        </button>
        <button 
          onClick={() => setView('COMPLETED')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            view === 'COMPLETED' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500'
          }`}
        >
          Completados
        </button>
      </div>

      <div className="space-y-4">
        {filteredReminders.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="p-6 bg-zinc-900 rounded-full inline-block">
              <Bell size={48} className="text-zinc-700" />
            </div>
            <p className="text-zinc-500">No hay recordatorios {view === 'PENDING' ? 'pendientes' : 'completados'}.</p>
          </div>
        ) : (
          filteredReminders.map(reminder => (
            <motion.div 
              layout
              key={reminder.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 group"
            >
              <button 
                onClick={() => completeReminder(reminder.id)}
                disabled={reminder.completed}
                className={`p-2 rounded-full transition-colors ${reminder.completed ? 'text-emerald-500' : 'text-zinc-600 hover:text-emerald-500'}`}
              >
                {reminder.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
              </button>
              
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-bold truncate ${reminder.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                  {reminder.title}
                </h3>
                {reminder.description && (
                  <p className="text-xs text-zinc-500 truncate">{reminder.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-emerald-500">
                  <Calendar size={10} />
                  <span>{new Date(reminder.datetime).toLocaleDateString('es-LA')}</span>
                  <Clock size={10} className="ml-1" />
                  <span>{new Date(reminder.datetime).toLocaleTimeString('es-LA', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <button 
                onClick={() => deleteReminder(reminder.id)}
                className="p-2 text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Reminder Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-[40px] w-full max-w-sm p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Nuevo Recordatorio</h3>
                <button onClick={() => setShowAddForm(false)} className="text-zinc-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddReminder} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Título</label>
                  <input 
                    required
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-2xl focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Ej: Reunión de equipo"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Descripción (Opcional)</label>
                  <textarea 
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-2xl focus:outline-none focus:border-emerald-500 transition-colors h-24 resize-none"
                    placeholder="Detalles adicionales..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Fecha</label>
                    <input 
                      required
                      type="date"
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-2xl focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Hora</label>
                    <input 
                      required
                      type="time"
                      value={newTime}
                      onChange={e => setNewTime(e.target.value)}
                      className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-2xl focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full p-5 rounded-2xl bg-emerald-500 text-black font-bold uppercase tracking-widest text-xs"
                >
                  Guardar Recordatorio
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
