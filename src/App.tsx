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
import { Home, ListTodo, History as HistoryIcon, BarChart2, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './types';

type Screen = 'HOME' | 'TASKS' | 'HISTORY' | 'STATS' | 'IDEAS';

const Navigation: React.FC<{ current: Screen, setScreen: (s: Screen) => void }> = ({ current, setScreen }) => {
  const items = [
    { id: 'HOME', icon: Home, label: 'Inicio' },
    { id: 'TASKS', icon: ListTodo, label: 'Tareas' },
    { id: 'HISTORY', icon: HistoryIcon, label: 'Historial' },
    { id: 'STATS', icon: BarChart2, label: 'Stats' },
    { id: 'IDEAS', icon: Lightbulb, label: 'Ideas' },
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

function AppContent() {
  const { currentScreen, setScreen } = useApp();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'HOME': return <Timer />;
      case 'TASKS': return <TaskList />;
      case 'HISTORY': return <History />;
      case 'STATS': return <Statistics />;
      case 'IDEAS': return <IdeaList />;
      default: return <Timer />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500/30">
      <main className="pb-24">
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
      <Navigation current={currentScreen} setScreen={setScreen} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
