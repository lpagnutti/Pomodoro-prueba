/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, Suspense, lazy } from 'react';
import { useStore } from './store/useStore';
import { GlobalEffects } from './components/GlobalEffects';
import { Home as HomeIcon, ListTodo, History as HistoryIcon, BarChart2, Lightbulb, Pill, StickyNote, Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, Screen } from './types';
import { auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

// Lazy loaded components
const Home = lazy(() => import('./components/Home').then(m => ({ default: m.Home })));
const Timer = lazy(() => import('./components/Timer').then(m => ({ default: m.Timer })));
const TaskList = lazy(() => import('./components/TaskList').then(m => ({ default: m.TaskList })));
const Statistics = lazy(() => import('./components/Statistics').then(m => ({ default: m.Statistics })));
const History = lazy(() => import('./components/HistoryAndIdeas').then(m => ({ default: m.History })));
const IdeaList = lazy(() => import('./components/HistoryAndIdeas').then(m => ({ default: m.IdeaList })));
const MedicationTab = lazy(() => import('./components/MedicationTab').then(m => ({ default: m.MedicationTab })));
const NotesTab = lazy(() => import('./components/NotesTab').then(m => ({ default: m.NotesTab })));
const RemindersTab = lazy(() => import('./components/RemindersTab').then(m => ({ default: m.RemindersTab })));
const ChatBot = lazy(() => import('./components/ChatBot').then(m => ({ default: m.ChatBot })));

// Componente principal de navegación inferior
const Navigation: React.FC<{ current: Screen, setScreen: (s: Screen) => void }> = ({ current, setScreen }) => {
  const items = [
    { id: 'HOME', icon: HomeIcon, label: 'Inicio' },
    { id: 'TASKS', icon: ListTodo, label: 'Tareas' },
    { id: 'MEDICATIONS', icon: Pill, label: 'Meds' },
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
            onClick={() => setScreen(item.id as Screen)}
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
  const currentScreen = useStore(state => state.currentScreen);
  const setScreen = useStore(state => state.setScreen);
  const userId = useStore(state => state.userId);
  const isAuthReady = useStore(state => state.isAuthReady);
  const error = useStore(state => state.error);
  const setError = useStore(state => state.setError);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

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
      case 'MEDICATIONS': return <MedicationTab />;
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
            <Suspense fallback={<div className="flex items-center justify-center p-12 text-zinc-500">Cargando...</div>}>
              {renderScreen()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      {/* Barra de navegación inferior */}
      <Navigation current={currentScreen} setScreen={setScreen} />
      <Suspense fallback={null}>
        <ChatBot />
      </Suspense>
    </div>
  );
}

// Componente raíz que envuelve la aplicación con el proveedor de contexto
export default function App() {
  return (
    <>
      <GlobalEffects />
      <AppContent />
    </>
  );
}
