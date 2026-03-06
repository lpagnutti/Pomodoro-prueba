import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { useApp } from '../hooks/useAppFacade';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const ChatBot: React.FC = () => {
  const { addNote, addMoodLog, tasks, medications } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('pomodoro_chat_messages');
    const savedDate = localStorage.getItem('pomodoro_chat_date');
    const today = new Date().toDateString();

    if (saved && savedDate === today) {
      return JSON.parse(saved);
    }
    return [{ role: 'model', text: '¡Hola! Soy tu asistente de enfoque. ¿Cómo te sientes hoy?' }];
  });
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    localStorage.setItem('pomodoro_chat_messages', JSON.stringify(messages));
    localStorage.setItem('pomodoro_chat_date', new Date().toDateString());
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const model = "gemini-3.1-pro-preview";
      
      const systemInstruction = `
        Eres un asistente personal de enfoque y bienestar. 
        Tu objetivo es ayudar al usuario a gestionar su productividad y salud mental.
        
        Contexto actual del usuario:
        - Tareas pendientes: ${tasks.filter(t => t.status !== 'COMPLETED').length}
        - Medicamentos registrados: ${medications.length}
        
        Instrucciones:
        1. Pregunta periódicamente cómo se siente el usuario.
        2. Si el usuario menciona sentimientos, estados de ánimo o reflexiones importantes, identifícalas.
        3. Tienes herramientas especiales (simuladas por texto) para guardar notas o registros de ánimo.
        4. Si detectas que el usuario quiere guardar una nota, responde confirmando que la guardarás.
        5. Si detectas un estado de ánimo claro (ej: feliz, estresado, cansado), menciónalo.
        
        IMPORTANTE: Si el usuario te cuenta algo que parece una nota importante o un diario, usa el formato especial al final de tu respuesta:
        [SAVE_NOTE: contenido de la nota]
        [SAVE_MOOD: estado de ánimo]
        
        Mantén un tono empático, profesional y motivador.
      `;

      const chat = ai.chats.create({
        model,
        config: {
          systemInstruction,
        },
        history: messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }))
      });

      const result = await chat.sendMessage({ message: userMessage });
      const responseText = result.text || '';

      // Parse special commands
      const noteMatch = responseText.match(/\[SAVE_NOTE: (.*?)\]/);
      const moodMatch = responseText.match(/\[SAVE_MOOD: (.*?)\]/);

      if (noteMatch) {
        addNote(noteMatch[1], 'Nota de Chat');
      }
      if (moodMatch) {
        addMoodLog(moodMatch[1], userMessage);
      }

      // Clean response text from commands
      const cleanText = responseText.replace(/\[SAVE_NOTE: .*?\]/g, '').replace(/\[SAVE_MOOD: .*?\]/g, '').trim();

      setMessages(prev => [...prev, { role: 'model', text: cleanText || 'Entendido.' }]);
    } catch (error) {
      console.error('Error in ChatBot:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Lo siento, tuve un problema al procesar tu mensaje. ¿Podrías repetirlo?' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-50 p-4 bg-emerald-500 text-black rounded-full shadow-2xl flex items-center justify-center"
      >
        <Bot size={28} />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed inset-0 z-[60] md:inset-auto md:bottom-24 md:right-6 md:w-96 md:h-[600px] bg-zinc-900 border border-zinc-800 md:rounded-[32px] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-zinc-800/50 border-b border-zinc-700/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Asistente AI</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">En línea</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((m, i) => (
                <motion.div
                  initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user' 
                      ? 'bg-emerald-500 text-black font-medium rounded-tr-none' 
                      : 'bg-zinc-800 text-zinc-200 rounded-tl-none'
                  }`}>
                    {m.text}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-emerald-500" />
                    <span className="text-xs text-zinc-500">Pensando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 bg-zinc-800/30 border-t border-zinc-700/50">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSend()}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="p-3 bg-emerald-500 text-black rounded-2xl disabled:opacity-50 transition-all active:scale-95"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
