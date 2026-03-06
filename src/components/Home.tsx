import React, { useState, useEffect } from 'react';
import { Timer } from './Timer';
import { TaskList } from './TaskList';
import { Plus, CheckCircle2, X, Bell, Calendar, Clock, Pill } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTasks, useUpdateTask } from '../hooks/useTasks';
import { useReminders, useCompleteReminder, useUpdateReminder } from '../hooks/useReminders';
import { useMedications, useMedicationLogs, useTakeMedication } from '../hooks/useMedications';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { MOTIVATIONAL_QUOTES } from '../constants/quotes';
import { TaskStatus } from '../types';

// Componente principal de la pantalla de inicio
export const Home: React.FC = () => {
  const userId = useStore(state => state.userId);
  const setDraftTask = useStore(state => state.setDraftTask);
  const setScreen = useStore(state => state.setScreen);
  const tasksToResolve = useStore(state => state.tasksToResolve);
  const setTasksToResolve = useStore(state => state.setTasksToResolve);
  const showFinishModal = useStore(state => state.showFinishModal);
  const setShowFinishModal = useStore(state => state.setShowFinishModal);
  const activeReminder = useStore(state => state.activeReminder);
  const setActiveReminder = useStore(state => state.setActiveReminder);
  const activeMedicationReminder = useStore(state => state.activeMedicationReminder);
  const setActiveMedicationReminder = useStore(state => state.setActiveMedicationReminder);

  const { data: tasks = [] } = useTasks(userId);
  const { data: reminders = [] } = useReminders(userId);
  const { data: medications = [] } = useMedications(userId);
  const { data: medicationLogs = [] } = useMedicationLogs(userId);

  const updateTaskMutation = useUpdateTask(userId);
  const completeReminderMutation = useCompleteReminder(userId);
  const updateReminderMutation = useUpdateReminder(userId);
  const takeMedicationMutation = useTakeMedication(userId);

  const completeTask = (id: string) => updateTaskMutation.mutate({ id, updates: { status: TaskStatus.COMPLETED, completedAt: Date.now() } });
  const completeReminder = completeReminderMutation.mutate;
  const updateReminder = (id: string, updates: any) => updateReminderMutation.mutate({ id, updates });
  const takeMedication = (id: string) => {
    const med = medications.find(m => m.id === id);
    if (med) takeMedicationMutation.mutate({ id, med });
  };
  const [quote, setQuote] = useState('');
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Efecto para mostrar confeti y una cita motivacional al terminar un Pomodoro
  useEffect(() => {
    if (showFinishModal && !quote && canvasRef.current) {
      const myConfetti = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: true
      });

      myConfetti({
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
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  const handleCloseActiveReminder = () => {
    setActiveReminder(null);
    setShowSnoozeOptions(false);
  };

  const handleCompleteActiveReminder = () => {
    if (activeReminder) {
      completeReminder(activeReminder.id);
      setActiveReminder(null);
      setShowSnoozeOptions(false);
    }
  };

  const handleSnooze = (minutes: number) => {
    if (activeReminder) {
      const newTime = Date.now() + minutes * 60 * 1000;
      updateReminder(activeReminder.id, { datetime: newTime });
      setActiveReminder(null);
      setShowSnoozeOptions(false);
    }
  };

  const handleTakeMedication = () => {
    if (activeMedicationReminder) {
      takeMedication(activeMedicationReminder.medicationId);
      setActiveMedicationReminder(null);
    }
  };

  const handleCloseMedicationReminder = () => {
    setActiveMedicationReminder(null);
  };

  const upcomingReminders = reminders
    .filter(r => !r.completed && r.datetime > Date.now())
    .sort((a, b) => a.datetime - b.datetime)
    .slice(0, 3);

  const getUpcomingMedications = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentMinutesTotal = currentHour * 60 + currentMinute;

    const upcoming: { med: any, time: string, minutesTotal: number }[] = [];

    medications.forEach(med => {
      // Treat undefined as true for backward compatibility
      if (med.isActive === false) return;

      med.times.forEach(time => {
        const [h, m] = time.split(':').map(Number);
        const timeMinutesTotal = h * 60 + m;

        // Check if this specific dose has been taken today
        const taken = medicationLogs.some(log => {
           const logDate = new Date(log.takenAt);
           return log.medicationId === med.id &&
                  logDate.getDate() === now.getDate() &&
                  logDate.getMonth() === now.getMonth() &&
                  logDate.getFullYear() === now.getFullYear() &&
                  Math.abs(logDate.getHours() - h) < 1 && // Within 1 hour window
                  Math.abs(logDate.getMinutes() - m) < 30;
        });

        // Show if it's in the future OR if it's overdue (past time but not taken)
        // For overdue, we limit to, say, 6 hours past to avoid showing yesterday's missed meds as "today's"
        // Actually, let's just show everything for "today" that hasn't been taken.
        // If timeMinutesTotal < currentMinutesTotal, it's overdue.
        
        if (!taken) {
          upcoming.push({ med, time, minutesTotal: timeMinutesTotal });
        }
      });
    });

    // Sort by time
    return upcoming.sort((a, b) => a.minutesTotal - b.minutesTotal);
  };

  const upcomingMedications = getUpcomingMedications();

  return (
    <div className="flex flex-col w-full max-w-md mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-bold">Inicio</h2>
        <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800">
          <Clock size={12} />
          <span>{currentTime.toLocaleTimeString('es-LA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
      </div>
      <Timer />
      
      {/* Upcoming Medications */}
      {upcomingMedications.length > 0 && (
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
              Próximas Tomas
            </span>
            <button 
              onClick={() => setScreen('MEDICATIONS')}
              className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400"
            >
              Ver todas
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {upcomingMedications.map(({ med, time, minutesTotal }) => {
              const now = new Date();
              const currentMinutes = now.getHours() * 60 + now.getMinutes();
              const isOverdue = minutesTotal < currentMinutes;
              
              return (
                <div 
                  key={`${med.id}-${time}`} 
                  className={`flex items-center gap-3 border rounded-2xl p-3 transition-all ${
                    isOverdue 
                      ? 'bg-red-500/10 border-red-500/30' 
                      : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${isOverdue ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    <Pill size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-zinc-200 truncate">{med.name}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                      <Clock size={10} />
                      <span className={isOverdue ? 'text-red-400 font-bold' : ''}>
                        {time} {isOverdue ? '(Atrasado)' : ''}
                      </span>
                      <span className="text-zinc-600">•</span>
                      <span>{med.dose}</span>
                    </div>
                  </div>
                  {isOverdue && (
                    <button
                      onClick={() => takeMedication(med.id)}
                      className="px-3 py-1.5 bg-red-500 text-white text-[10px] font-bold rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Tomar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Reminders */}
      {upcomingReminders.length > 0 && (
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
              Próximos Recordatorios
            </span>
            <button 
              onClick={() => setScreen('REMINDERS')}
              className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400"
            >
              Ver todos
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {upcomingReminders.map(reminder => (
              <div 
                key={reminder.id} 
                className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-3 transition-all hover:bg-zinc-800/50"
              >
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                  <Bell size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-zinc-200 truncate">{reminder.title}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                    <Calendar size={10} />
                    <span>{new Date(reminder.datetime).toLocaleDateString('es-LA')}</span>
                    <Clock size={10} className="ml-1" />
                    <span>{new Date(reminder.datetime).toLocaleTimeString('es-LA', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Canvas for confetti */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-[70]"
        style={{ width: '100%', height: '100%' }}
      />

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
      {/* Active Reminder Modal */}
      <AnimatePresence>
        {activeReminder && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center relative"
            >
              <button 
                onClick={handleCloseActiveReminder}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              {showSnoozeOptions ? (
                <>
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="text-zinc-400" size={32} />
                  </div>
                  <h3 className="text-xl font-bold mb-6">Posponer por...</h3>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <button 
                      onClick={() => handleSnooze(10)} 
                      className="p-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 font-bold text-zinc-300 transition-colors"
                    >
                      10 min
                    </button>
                    <button 
                      onClick={() => handleSnooze(30)} 
                      className="p-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 font-bold text-zinc-300 transition-colors"
                    >
                      30 min
                    </button>
                    <button 
                      onClick={() => handleSnooze(60)} 
                      className="p-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 font-bold text-zinc-300 transition-colors"
                    >
                      1 hora
                    </button>
                    <button 
                      onClick={() => handleSnooze(1440)} 
                      className="p-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 font-bold text-zinc-300 transition-colors"
                    >
                      Mañana
                    </button>
                  </div>
                  <button 
                    onClick={() => setShowSnoozeOptions(false)}
                    className="w-full p-3 rounded-xl bg-transparent text-zinc-500 hover:text-white font-medium"
                  >
                    Volver
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Bell className="text-amber-500" size={32} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">¡Recordatorio!</h3>
                  <p className="text-lg font-medium text-white mb-4">"{activeReminder.title}"</p>
                  {activeReminder.description && (
                    <p className="text-sm text-zinc-400 mb-6 bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/50">
                      {activeReminder.description}
                    </p>
                  )}
                  
                  <div className="flex gap-3 w-full mt-6">
                    <button 
                      onClick={() => setShowSnoozeOptions(true)}
                      className="flex-1 p-4 rounded-2xl bg-zinc-800 text-zinc-400 font-bold hover:bg-zinc-700 transition-colors"
                    >
                      Posponer
                    </button>
                    <button 
                      onClick={handleCompleteActiveReminder}
                      className="flex-1 p-4 rounded-2xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-colors"
                    >
                      Completado
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Active Medication Reminder Modal */}
      <AnimatePresence>
        {activeMedicationReminder && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center relative"
            >
              <button 
                onClick={handleCloseMedicationReminder}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Pill className="text-red-500" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">¡Hora de tu Medicación!</h3>
              <p className="text-lg font-medium text-white mb-1">"{activeMedicationReminder.medicationName}"</p>
              <p className="text-sm text-zinc-400 mb-6 bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/50">
                Dosis: {activeMedicationReminder.dose}
              </p>
              
              <div className="flex gap-3 w-full mt-6">
                <button 
                  onClick={handleCloseMedicationReminder}
                  className="flex-1 p-4 rounded-2xl bg-zinc-800 text-zinc-400 font-bold hover:bg-zinc-700 transition-colors"
                >
                  Posponer
                </button>
                <button 
                  onClick={handleTakeMedication}
                  className="flex-1 p-4 rounded-2xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-colors"
                >
                  Tomar ahora
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
