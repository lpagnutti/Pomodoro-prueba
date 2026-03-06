/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider } from './AppContext';
import { useApp } from './AppContext';
import { Timer } from './components/Timer';
import { TaskList } from './components/TaskList';
import { Statistics } from './components/Statistics';
import { History, IdeaList } from './components/HistoryAndIdeas';
import { MedicationTab } from './components/MedicationTab';
import { NotesTab } from './components/NotesTab';
import { RemindersTab } from './components/RemindersTab';
import { ChatBot } from './components/ChatBot';
import { Home as HomeIcon, ListTodo, History as HistoryIcon, BarChart2, Lightbulb, Pill, StickyNote, Bell, X } from 'lucide-react';
import { Home } from './components/Home';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './types';

type Screen = 'HOME' | 'TASKS' | 'HISTORY' | 'STATS' | 'IDEAS' | 'MEDS' | 'NOTES';

// Componente principal de navegación inferior
const Navigation: React.FC<{ current: Screen, setScreen: (s: Screen) => void }> = ({ current, setScreen }) => {
  const items = [
    { id: 'HOME', icon: HomeIcon, label: 'Inicio' },
    { id: 'TASKS', icon: ListTodo, label: 'Tareas' },
    { id: 'MEDS', icon: Pill, label: 'Meds' },
    { id: 'HISTORY', icon: HistoryIcon, label: 'Historial' },
    { id: 'STATS', icon: BarChart2, label: 'Stats' },
    { id: 'IDEAS', icon: Lightbulb, label: 'Ideas' },
    { id: 'NOTES', icon: StickyNote, label: 'Notas' },
    { id: 'REMINDERS', icon: Bell, label: 'Avisos' },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-zinc-800 px-6 py-4 z-40">
      <div className="max-w-md mx-auto flex justify-between items-center">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setScreen(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              current === item.id ? "text-emerald-500 scale-110" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <item.icon size={24} strokeWidth={current === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

// Componente que renderiza el contenido principal basado en la pantalla actual
function AppContent() {
  const { currentScreen, setScreen, userId, isAuthReady, signIn, error, setError } = useApp();

  // Si aún estamos comprobando la autenticación, mostrar una pantalla de carga o nada
  if (!isAuthReady) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Cargando...</div>;
  }

  // Si no hay usuario autenticado, mostrar pantalla de inicio de sesión
  if (!userId) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-bold mb-8">Pomodoro Focus</h1>
        <button 
          onClick={signIn}
          className="px-8 py-4 bg-emerald-500 text-black font-bold rounded-2xl hover:bg-emerald-400 transition-colors"
        >
          Iniciar sesión con Google
        </button>
      </div>
    );
  }

  // Renderiza el componente correspondiente a la pantalla seleccionada
  const renderScreen = () => {
    switch (currentScreen) {
      case 'HOME': return <Home />;
      case 'TASKS': return <TaskList />;
      case 'HISTORY': return <History />;
      case 'STATS': return <Statistics />;
      case 'IDEAS': return <IdeaList />;
      case 'MEDS': return <MedicationTab />;
      case 'NOTES': return <NotesTab />;
      case 'REMINDERS': return <RemindersTab />;
      default: return <Timer />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500/30">
      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-4 right-4 z-[100] bg-red-500 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between"
          >
            <p className="text-sm font-medium">{error}</p>
            <button onClick={() => setError(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pb-24">
        {/* Animaciones de transición entre pantallas */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>
      {/* Barra de navegación inferior */}
      <Navigation current={currentScreen} setScreen={setScreen} />
      <ChatBot />
    </div>
  );
}

// Componente raíz que envuelve la aplicación con el proveedor de contexto
export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
