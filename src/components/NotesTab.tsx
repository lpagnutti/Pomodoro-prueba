import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../AppContext';
import { StickyNote, Plus, Trash2, Search, Calendar, Heart, MessageSquare, ChevronDown, ChevronUp, Clock } from 'lucide-react';

export const NotesTab: React.FC = () => {
  const { notes, moodLogs, addNote, deleteNote } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'NOTES' | 'MOOD'>('NOTES');
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNoteContent.trim()) {
      addNote(newNoteContent, newNoteTitle || undefined);
      setNewNoteContent('');
      setNewNoteTitle('');
      setShowAddForm(false);
    }
  };

  const toggleDay = (dateStr: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  const filteredNotes = notes.filter(n => 
    n.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (n.title && n.title.toLowerCase().includes(searchQuery.toLowerCase()))
  ).sort((a, b) => b.createdAt - a.createdAt);

  const sortedMoodLogs = [...moodLogs].sort((a, b) => b.createdAt - a.createdAt);

  const groupNotesByDay = (notesList: typeof notes) => {
    const groups: { [key: string]: typeof notes } = {};
    notesList.forEach(note => {
      const date = new Date(note.createdAt);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(note);
    });
    return groups;
  };

  const groupedNotes = groupNotesByDay(filteredNotes);
  const sortedDays = Object.keys(groupedNotes).sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex flex-col w-full max-w-md mx-auto p-6 pb-24 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Reflexiones</h2>
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
          onClick={() => setActiveTab('NOTES')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            activeTab === 'NOTES' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500'
          }`}
        >
          Notas
        </button>
        <button 
          onClick={() => setActiveTab('MOOD')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            activeTab === 'MOOD' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500'
          }`}
        >
          Ánimo
        </button>
      </div>

      {activeTab === 'NOTES' ? (
        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar en tus notas..."
              className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl focus:outline-none focus:border-emerald-500 transition-colors text-sm"
            />
          </div>

          {filteredNotes.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="p-6 bg-zinc-900 rounded-full inline-block">
                <StickyNote size={48} className="text-zinc-700" />
              </div>
              <p className="text-zinc-500">No hay notas que coincidan.<br/>Escribe algo para recordarlo después.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDays.map((dateStr) => {
                const dayNotes = groupedNotes[dateStr];
                const date = new Date(dateStr + 'T12:00:00'); // Use noon to avoid timezone shifts
                const isExpanded = expandedDays[dateStr] !== false; // Default to expanded

                return (
                  <div key={dateStr} className="bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden">
                    <button 
                      onClick={() => toggleDay(dateStr)}
                      className="w-full p-6 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
                          {date.toLocaleDateString('es-LA', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-500">{dayNotes.length} notas</span>
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
                          <div className="p-6 pt-0 space-y-4">
                            {dayNotes.map(note => (
                              <motion.div 
                                layout
                                key={note.id}
                                className="bg-zinc-800/30 border border-zinc-700/30 rounded-2xl p-5 space-y-3 relative group"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <h3 className="text-sm font-bold text-zinc-200">{note.title}</h3>
                                    <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                                      <Clock size={10} />
                                      {new Date(note.createdAt).toLocaleTimeString('es-LA', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => deleteNote(note.id)}
                                    className="p-2 text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                                <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedMoodLogs.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="p-6 bg-zinc-900 rounded-full inline-block">
                <Heart size={48} className="text-zinc-700" />
              </div>
              <p className="text-zinc-500">Aún no has registrado cómo te sientes.<br/>¡Habla con el bot para empezar!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedMoodLogs.map(log => (
                <div key={log.id} className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 flex gap-4 items-start">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <Heart size={20} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-zinc-200 capitalize">{log.mood}</span>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                          {new Date(log.createdAt).toLocaleDateString('es-LA', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="text-[9px] text-zinc-600 font-mono">
                          {new Date(log.createdAt).toLocaleTimeString('es-LA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    {log.note && (
                      <p className="text-xs text-zinc-500 italic">"{log.note}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Note Modal */}
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
                <h3 className="text-xl font-bold">Nueva Nota</h3>
                <button onClick={() => setShowAddForm(false)} className="text-zinc-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddNote} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Título (Opcional)</label>
                  <input 
                    value={newNoteTitle}
                    onChange={e => setNewNoteTitle(e.target.value)}
                    className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-2xl focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Ej: Reflexión del día"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Contenido</label>
                  <textarea 
                    required
                    value={newNoteContent}
                    onChange={e => setNewNoteContent(e.target.value)}
                    className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-2xl focus:outline-none focus:border-emerald-500 transition-colors h-48 resize-none"
                    placeholder="Escribe lo que tienes en mente..."
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full p-5 rounded-2xl bg-emerald-500 text-black font-bold uppercase tracking-widest text-xs"
                >
                  Guardar Nota
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const X = ({ size, className }: { size: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
