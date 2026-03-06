import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../AppContext';
import { Pill, Plus, Trash2, Clock, Info, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, History } from 'lucide-react';
import { Medication } from '../types';

export const MedicationTab: React.FC = () => {
  const { medications, medicationLogs, addMedication, updateMedication, deleteMedication, takeMedication } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState('');
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(5);
  const [notes, setNotes] = useState('');
  const [times, setTimes] = useState<string[]>(['']);

  const resetForm = () => {
    setName('');
    setDose('');
    setFrequency('');
    setStock(0);
    setMinStock(5);
    setNotes('');
    setTimes(['']);
    setEditingMed(null);
    setShowAddForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const medData = {
      name,
      dose,
      frequency,
      stock: Number(stock),
      minStock: Number(minStock),
      notes,
      times: times.filter(t => t.trim() !== ''),
    };

    if (editingMed) {
      updateMedication(editingMed.id, medData);
    } else {
      addMedication(medData);
    }
    resetForm();
  };

  const handleEdit = (med: Medication) => {
    setEditingMed(med);
    setName(med.name);
    setDose(med.dose);
    setFrequency(med.frequency);
    setStock(med.stock);
    setMinStock(med.minStock);
    setNotes(med.notes || '');
    setTimes(med.times.length > 0 ? med.times : ['08:00']);
    setShowAddForm(true);
  };

  const generateTimesFromFrequency = (start: string, hours: number) => {
    const [h, m] = start.split(':').map(Number);
    const newTimes: string[] = [];
    for (let i = 0; i < 24; i += hours) {
      const currentH = (h + i) % 24;
      newTimes.push(`${currentH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
    setTimes(newTimes);
  };

  const sortedLogs = [...medicationLogs].sort((a, b) => b.takenAt - a.takenAt);

  return (
    <div className="flex flex-col w-full max-w-md mx-auto p-6 pb-24 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Medicación</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition-colors"
          >
            <History size={20} />
          </button>
          <button 
            onClick={() => setShowAddForm(true)}
            className="p-3 bg-emerald-500 text-black rounded-2xl hover:bg-emerald-400 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {showHistory ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Historial de Tomas</h3>
            <button onClick={() => setShowHistory(false)} className="text-[10px] text-emerald-500 font-bold uppercase">Volver</button>
          </div>
          {sortedLogs.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 text-sm">No hay registros aún.</div>
          ) : (
            <div className="space-y-3">
              {sortedLogs.map(log => (
                <div key={log.id} className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold">{log.medicationName}</h4>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                      {new Date(log.takenAt).toLocaleString('es-LA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-zinc-400">{log.dose}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {medications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="p-6 bg-zinc-900 rounded-full">
                <Pill size={48} className="text-zinc-700" />
              </div>
              <p className="text-zinc-500">No has agregado medicamentos.<br/>Mantén el control de tu salud aquí.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {medications.map(med => (
                <motion.div 
                  layout
                  key={med.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                        <Pill size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold leading-tight">{med.name}</h3>
                        <p className="text-xs text-zinc-500 font-medium">{med.dose} • {med.frequency}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleEdit(med)}
                      className="p-2 text-zinc-600 hover:text-white transition-colors"
                    >
                      <Info size={18} />
                    </button>
                  </div>

                  {med.times.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {med.times.map((time, i) => (
                        <div key={i} className="px-3 py-1 bg-zinc-800 rounded-full flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          <Clock size={10} />
                          {time}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Stock</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-mono font-bold ${med.stock <= med.minStock ? 'text-amber-500' : 'text-zinc-300'}`}>
                          {med.stock} unidades
                        </span>
                        {med.stock <= med.minStock && <AlertCircle size={14} className="text-amber-500" />}
                      </div>
                    </div>
                    <button 
                      onClick={() => takeMedication(med.id)}
                      disabled={med.stock <= 0}
                      className="px-6 py-3 bg-emerald-500 disabled:opacity-50 disabled:grayscale text-black rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all active:scale-95"
                    >
                      Tomar
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
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
              className="bg-zinc-900 border border-zinc-800 rounded-[40px] w-full max-w-sm p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">{editingMed ? 'Editar Medicamento' : 'Nuevo Medicamento'}</h3>
                <button onClick={resetForm} className="text-zinc-500 hover:text-white"><X size={24} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Nombre</label>
                  <input 
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-2xl focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Ej: Paracetamol"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Dosis</label>
                    <input 
                      required
                      value={dose}
                      onChange={e => setDose(e.target.value)}
                      className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-2xl focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="Ej: 500mg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Frecuencia</label>
                    <input 
                      required
                      value={frequency}
                      onChange={e => setFrequency(e.target.value)}
                      className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-2xl focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="Ej: Cada 8h"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Horarios</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => generateTimesFromFrequency(times[0] || '08:00', 8)}
                        className="text-[9px] font-bold uppercase tracking-tighter text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg"
                      >
                        Cada 8h
                      </button>
                      <button 
                        type="button"
                        onClick={() => generateTimesFromFrequency(times[0] || '08:00', 12)}
                        className="text-[9px] font-bold uppercase tracking-tighter text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg"
                      >
                        Cada 12h
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {times.map((time, index) => (
                      <div key={index} className="flex gap-2 items-center bg-zinc-800/50 p-2 rounded-2xl border border-zinc-700/30">
                        <div className="flex-1 flex items-center gap-3 px-3">
                          <Clock size={16} className="text-zinc-500" />
                          <input 
                            type="time"
                            value={time}
                            onChange={e => {
                              const newTimes = [...times];
                              newTimes[index] = e.target.value;
                              setTimes(newTimes);
                            }}
                            className="bg-transparent text-white font-mono text-lg focus:outline-none w-full"
                          />
                        </div>
                        {times.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => setTimes(times.filter((_, i) => i !== index))}
                            className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        type="button"
                        onClick={() => setTimes([...times, '12:00'])}
                        className="p-3 border border-dashed border-zinc-700 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus size={14} /> Personalizado
                      </button>
                      <div className="flex gap-1">
                        {[
                          { t: '08:00', l: 'Mañana' },
                          { t: '14:00', l: 'Tarde' },
                          { t: '22:00', l: 'Noche' }
                        ].map(({ t, l }) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTimes(prev => prev.includes(t) ? prev : [...prev, t].sort())}
                            className="flex-1 flex flex-col items-center justify-center py-1 bg-zinc-800 text-zinc-400 rounded-xl hover:text-white transition-colors"
                          >
                            <span className="text-[7px] uppercase font-bold opacity-50">{l}</span>
                            <span className="text-[9px] font-bold">{t}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Stock Actual</label>
                    <input 
                      type="number"
                      required
                      value={stock}
                      onChange={e => setStock(Number(e.target.value))}
                      className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-2xl focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Mínimo Alerta</label>
                    <input 
                      type="number"
                      required
                      value={minStock}
                      onChange={e => setMinStock(Number(e.target.value))}
                      className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-2xl focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Notas (Opcional)</label>
                  <textarea 
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-2xl focus:outline-none focus:border-emerald-500 transition-colors h-24 resize-none"
                    placeholder="Ej: Tomar con comida"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  {editingMed && (
                    <button 
                      type="button"
                      onClick={() => {
                        deleteMedication(editingMed.id);
                        resetForm();
                      }}
                      className="p-5 rounded-2xl bg-red-500/10 text-red-500"
                    >
                      <Trash2 size={24} />
                    </button>
                  )}
                  <button 
                    type="submit"
                    className="flex-1 p-5 rounded-2xl bg-emerald-500 text-black font-bold uppercase tracking-widest text-xs"
                  >
                    {editingMed ? 'Guardar Cambios' : 'Crear Medicamento'}
                  </button>
                </div>
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
