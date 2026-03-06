import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, PieChart, Pie } from 'recharts';
import { useApp } from '../AppContext';
import { TrendingUp, Target, Award, Zap, Calendar, Filter, ChevronDown, PieChart as PieChartIcon } from 'lucide-react';
import { TaskStatus, cn, EnergyLevel } from '../types';

const ENERGY_COLORS = {
  [EnergyLevel.HIGH]: '#ef4444',
  [EnergyLevel.NORMAL]: '#f59e0b',
  [EnergyLevel.LOW]: '#3b82f6',
};

const ENERGY_LABELS = {
  [EnergyLevel.HIGH]: 'Alta',
  [EnergyLevel.NORMAL]: 'Normal',
  [EnergyLevel.LOW]: 'Baja',
};

type Timeframe = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export const Statistics: React.FC = () => {
  const { sessions, tasks, stats, tags } = useApp();
  const [timeframe, setTimeframe] = useState<Timeframe>('DAY');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');

  // Helper to get date string
  const getDateStr = (date: Date) => date.toISOString().split('T')[0];

  // Get range of dates based on timeframe
  const getDates = () => {
    const dates: string[] = [];
    const now = new Date();
    
    if (timeframe === 'DAY') {
      // For day, we show hours
      for (let i = 23; i >= 0; i--) {
        const d = new Date();
        d.setHours(now.getHours() - i, 0, 0, 0);
        dates.push(d.toISOString()); // Use ISO string for unique keys
      }
    } else if (timeframe === 'WEEK') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        dates.push(getDateStr(d));
      }
    } else if (timeframe === 'MONTH') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        dates.push(getDateStr(d));
      }
    } else {
      // For year, we group by month
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    }
    return dates;
  };

  const dates = getDates();

  const activityData = dates.map(dateKey => {
    let periodTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED && t.completedAt);
    let periodSessions = sessions.filter(s => s.type === 'WORK');

    if (selectedTag !== 'ALL') {
      periodTasks = periodTasks.filter(t => t.tag === selectedTag);
      periodSessions = periodSessions.filter(s => 
        s.tasksWorkedOn.some(tid => tasks.find(t => t.id === tid)?.tag === selectedTag)
      );
    }

    let taskCount = 0;
    let pomodoroCount = 0;

    if (timeframe === 'DAY') {
      const dKey = new Date(dateKey);
      const hour = dKey.getHours();
      const dateStr = getDateStr(dKey);
      
      taskCount = periodTasks.filter(t => {
        const d = new Date(t.completedAt!);
        return getDateStr(d) === dateStr && d.getHours() === hour;
      }).length;

      pomodoroCount = periodSessions.filter(s => {
        const d = new Date(s.startTime);
        return getDateStr(d) === dateStr && d.getHours() === hour;
      }).reduce((sum, s) => sum + (s.duration / 25), 0);
    } else if (timeframe === 'YEAR') {
      // dateKey is YYYY-MM
      taskCount = periodTasks.filter(t => {
        const d = new Date(t.completedAt!);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === dateKey;
      }).length;

      pomodoroCount = periodSessions.filter(s => {
        const d = new Date(s.startTime);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === dateKey;
      }).reduce((sum, s) => sum + (s.duration / 25), 0);
    } else {
      // dateKey is YYYY-MM-DD
      taskCount = periodTasks.filter(t => getDateStr(new Date(t.completedAt!)) === dateKey).length;
      pomodoroCount = periodSessions.filter(s => getDateStr(new Date(s.startTime)) === dateKey).reduce((sum, s) => sum + (s.duration / 25), 0);
    }

    let label = '';
    if (timeframe === 'DAY') {
      label = `${new Date(dateKey).getHours()}h`;
    } else if (timeframe === 'WEEK') {
      label = new Date(dateKey).toLocaleDateString('es-LA', { weekday: 'short' });
    } else if (timeframe === 'MONTH') {
      label = new Date(dateKey).getDate().toString();
    } else {
      const [year, month] = dateKey.split('-');
      label = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('es-LA', { month: 'short' });
    }

    return {
      name: label,
      tareas: taskCount,
      pomodoros: parseFloat(pomodoroCount.toFixed(1))
    };
  });

  // Calculate accuracy and pomodoros based on timeframe and tag
  const getFilteredStats = () => {
    const now = new Date();
    let filteredTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED && t.completedAt);
    let filteredSessions = sessions.filter(s => s.type === 'WORK');

    if (selectedTag !== 'ALL') {
      filteredTasks = filteredTasks.filter(t => t.tag === selectedTag);
      filteredSessions = filteredSessions.filter(s => 
        s.tasksWorkedOn.some(tid => tasks.find(t => t.id === tid)?.tag === selectedTag)
      );
    }

    const startTime = new Date();
    if (timeframe === 'DAY') startTime.setHours(0, 0, 0, 0);
    else if (timeframe === 'WEEK') startTime.setDate(now.getDate() - 7);
    else if (timeframe === 'MONTH') startTime.setDate(now.getDate() - 30);
    else if (timeframe === 'YEAR') startTime.setFullYear(now.getFullYear() - 1);

    const periodTasks = filteredTasks.filter(t => t.completedAt! >= startTime.getTime());
    const periodSessions = filteredSessions.filter(s => s.startTime >= startTime.getTime());

    const totalEstimated = periodTasks.reduce((sum, t) => sum + t.estimatedPomodoros, 0);
    const totalActual = periodTasks.reduce((sum, t) => sum + t.actualPomodoros, 0);
    const accuracy = totalEstimated > 0 ? Math.round((Math.min(totalEstimated, totalActual) / Math.max(totalEstimated, totalActual)) * 100) : 0;
    const pomodoroCount = periodSessions.reduce((sum, s) => sum + (s.duration / 25), 0);

    return { accuracy, pomodoroCount, periodTasks };
  };

  const { accuracy, pomodoroCount, periodTasks } = getFilteredStats();

  // Prepare data for the pie chart
  const pieChartData = React.useMemo(() => {
    const tagCounts: Record<string, number> = {};
    let totalTasks = 0;

    periodTasks.forEach(task => {
      const tagName = task.tag || 'General';
      tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
      totalTasks++;
    });

    return Object.entries(tagCounts).map(([name, value]) => {
      const tagObj = tags.find(t => t.name === name);
      return {
        name,
        value,
        color: tagObj?.color || '#10b981',
        percentage: totalTasks > 0 ? Math.round((value / totalTasks) * 100) : 0
      };
    }).sort((a, b) => b.value - a.value); // Sort by value descending
  }, [periodTasks, tags]);

  // Calculate energy distribution
  const energyData = React.useMemo(() => {
    const filteredSessions = sessions.filter(s => s.type === 'WORK');
    const counts = {
      [EnergyLevel.HIGH]: 0,
      [EnergyLevel.NORMAL]: 0,
      [EnergyLevel.LOW]: 0,
    };
    filteredSessions.forEach(s => {
      if (s.energyLevel in counts) {
        counts[s.energyLevel]++;
      }
    });

    return [
      { name: ENERGY_LABELS[EnergyLevel.HIGH], value: counts[EnergyLevel.HIGH], color: ENERGY_COLORS[EnergyLevel.HIGH] },
      { name: ENERGY_LABELS[EnergyLevel.NORMAL], value: counts[EnergyLevel.NORMAL], color: ENERGY_COLORS[EnergyLevel.NORMAL] },
      { name: ENERGY_LABELS[EnergyLevel.LOW], value: counts[EnergyLevel.LOW], color: ENERGY_COLORS[EnergyLevel.LOW] },
    ].filter(d => d.value > 0);
  }, [sessions]);

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-xl">
          <p className="text-sm font-bold" style={{ color: data.color }}>{data.name}</p>
          <p className="text-xs text-zinc-400 mt-1">{data.value} sesiones</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto p-6 pb-24 space-y-8">
      <h2 className="text-3xl font-bold tracking-tight">Estadísticas</h2>

      {/* Level Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[40px] p-8 text-black shadow-xl shadow-emerald-500/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Nivel Actual</p>
            <h3 className="text-3xl font-black">NIVEL {stats.level}</h3>
          </div>
          <Award size={48} className="opacity-30" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span>PROGRESO XP</span>
            <span>{Math.round(stats.xp)} XP</span>
          </div>
          <div className="h-3 bg-black/20 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(stats.xp % 100)}%` }}
              className="h-full bg-white"
            />
          </div>
        </div>
      </div>

      {/* Timeframe Selector for Stats */}
      <div className="flex justify-center">
        <div className="flex bg-black rounded-xl p-1 w-full max-w-xs">
          {(['DAY', 'WEEK', 'MONTH', 'YEAR'] as Timeframe[]).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all",
                timeframe === tf ? "bg-zinc-800 text-white" : "text-zinc-600"
              )}
            >
              {tf === 'DAY' ? 'Hoy' : tf === 'WEEK' ? 'Sem' : tf === 'MONTH' ? 'Mes' : 'Año'}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
          <div className="p-2 bg-emerald-500/10 rounded-xl w-fit mb-3">
            <Target className="text-emerald-500" size={20} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Precisión</p>
          <h4 className="text-2xl font-bold">{accuracy}%</h4>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
          <div className="p-2 bg-blue-500/10 rounded-xl w-fit mb-3">
            <Zap className="text-blue-500" size={20} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Pomodoros</p>
          <h4 className="text-2xl font-bold">{pomodoroCount.toFixed(1)}</h4>
        </div>
      </div>

      {/* Activity Chart Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-500" />
              <h3 className="text-sm font-bold uppercase tracking-widest">Actividad</h3>
            </div>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-zinc-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Filtrar por Etiqueta</span>
              </div>
              <div className="flex bg-black rounded-lg p-0.5">
                <button
                  onClick={() => setSelectedTag('ALL')}
                  className={cn(
                    "px-3 py-1 text-[9px] font-bold rounded-md transition-all",
                    selectedTag === 'ALL' ? "bg-zinc-800 text-white" : "text-zinc-600"
                  )}
                >
                  Todas
                </button>
                <select 
                  value={selectedTag === 'ALL' ? '' : selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value || 'ALL')}
                  className="bg-transparent text-[9px] font-bold text-zinc-400 border-none focus:ring-0 px-2 py-1 cursor-pointer appearance-none outline-none"
                >
                  <option value="" disabled className="bg-zinc-900 text-zinc-500">Filtrar...</option>
                  {tags.map(tag => (
                    <option key={tag.id} value={tag.name} className="bg-zinc-900 text-zinc-300">
                      {tag.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={10} className="text-zinc-600 mr-1 self-center pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717a', fontSize: 10 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717a', fontSize: 10 }}
              />
              <Tooltip 
                cursor={{ fill: '#27272a' }}
                contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '16px', fontSize: '12px' }}
                itemStyle={{ padding: '2px 0' }}
              />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle"
                wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
              />
              <Bar dataKey="tareas" name="Tareas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={timeframe === 'MONTH' || timeframe === 'DAY' ? 4 : 8} />
              <Bar dataKey="pomodoros" name="Pomodoros" fill="#10b981" radius={[4, 4, 0, 0]} barSize={timeframe === 'MONTH' || timeframe === 'DAY' ? 4 : 8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Energy Distribution Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-amber-500" />
          <h3 className="text-sm font-bold uppercase tracking-widest">Distribución de Energía</h3>
        </div>
        
        <div className="h-64 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={energyData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {energyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-bold">{sessions.filter(s => s.type === 'WORK').length}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Sesiones</span>
          </div>
        </div>
      </div>

      {/* Tag Distribution */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 space-y-6">
        <div className="flex items-center gap-2">
          <PieChartIcon size={18} className="text-violet-500" />
          <h3 className="text-sm font-bold uppercase tracking-widest">Distribución por Etiqueta</h3>
        </div>
        
        <div className="h-64 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-bold">{periodTasks.length}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Tareas</span>
          </div>
        </div>

        {/* Custom Legend */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {pieChartData.map((entry, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs font-medium truncate max-w-[80px]">{entry.name}</span>
              </div>
              <span className="text-xs font-bold text-zinc-400">{entry.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
