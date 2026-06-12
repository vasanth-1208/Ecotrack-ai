'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestFootprint, setLatestFootprint] = useState<any>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'transportation' | 'homeEnergy' | 'food' | 'shopping' | 'waste' | 'overall'>('overall');
  const [targetValue, setTargetValue] = useState(300);
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2); // default 2 months out
    return d.toISOString().split('T')[0];
  });

  const [formLoading, setFormLoading] = useState(false);

  const fetchGoalsData = async () => {
    try {
      setLoading(true);
      const res = await api.goals.list();
      setGoals(res.goals);

      const histRes = await api.footprint.getHistory();
      if (histRes.history.length > 0) {
        setLatestFootprint(histRes.history[histRes.history.length - 1]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoalsData();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.goals.create({
        title,
        category,
        targetValue: Number(targetValue),
        targetDate
      });
      setTitle('');
      await fetchGoalsData(); // reload list
    } catch (err) {
      console.error(err);
      alert('Failed to create goal. Make sure details are valid.');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-semibold text-slate-600 dark:text-slate-400">Loading Goals Tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Emissions Reduction Goals</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Treat carbon like a budget. Set limits, complete milestones, and earn points.</p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Create Goal Form */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 h-fit">
          <h2 className="text-lg font-bold text-slate-850 dark:text-white mb-4">Set Reduction Target</h2>
          
          <form onSubmit={handleCreateGoal} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-xs font-bold text-slate-500 uppercase mb-1">Goal Description</label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Reduce flight hours by half"
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-xs font-bold text-slate-500 uppercase mb-1">Category Scope</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-600"
              >
                <option value="overall">Overall Footprint (total)</option>
                <option value="transportation">Transportation (commutes/flights)</option>
                <option value="homeEnergy">Home Energy (electricity/LPG)</option>
                <option value="food">Dietary & Food Habits</option>
                <option value="shopping">Shopping & Purchases</option>
                <option value="waste">Waste & Recycling</option>
              </select>
            </div>

            <div>
              <label htmlFor="targetValue" className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Monthly Emissions (kg CO₂)</label>
              <input
                id="targetValue"
                type="number"
                min="0"
                required
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-600"
              />
              {latestFootprint && (
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Current latest logged: <span className="font-bold">{Math.round(category === 'overall' ? latestFootprint.totalEmissions : latestFootprint[category === 'homeEnergy' ? 'energyEmissions' : category + 'Emissions'])} kg</span>
                </span>
              )}
            </div>

            <div>
              <label htmlFor="targetDate" className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Deadline Date</label>
              <input
                id="targetDate"
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <button
              type="submit"
              disabled={formLoading}
              className="w-full mt-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
            >
              {formLoading ? 'Setting Target...' : 'Create Goal Target 🎯'}
            </button>
          </form>
        </div>

        {/* Right Column: Goals Progress List */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-850 dark:text-white mb-6">Your Carbon Reduction Goals</h2>
          
          {goals.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <span className="text-4xl block mb-2">🎯</span>
              <p className="text-slate-500 text-sm font-semibold">No goals set yet. Set your first goal on the left pane!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {goals.map((goal) => {
                // Progress calculations for reduction goals:
                // goal.currentValue is where they are now, targetValue is goal.
                // We show how close current emissions are to target emissions
                const isCompleted = goal.status === 'completed';
                const isFailed = goal.status === 'failed';
                
                let progressPct = 0;
                if (isCompleted) {
                  progressPct = 100;
                } else if (goal.currentValue <= goal.targetValue) {
                  progressPct = 100;
                } else {
                  // If emissions increased, progress is 0%
                  const excess = goal.currentValue - goal.targetValue;
                  const totalDiff = Math.max(1, goal.currentValue);
                  progressPct = Math.max(0, Math.round(((totalDiff - excess) / totalDiff) * 100));
                }

                return (
                  <div key={goal.id} className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-150 dark:border-slate-800 space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-450 uppercase tracking-widest">{goal.category.toUpperCase()} SCOPE</span>
                        <h3 className="font-bold text-slate-850 dark:text-white text-base mt-0.5">{goal.title}</h3>
                      </div>
                      
                      {/* Status indicator */}
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        isCompleted ? 'bg-emerald-100 text-emerald-700' :
                        isFailed ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {isCompleted ? '🟢 Achieved' : isFailed ? '🔴 Overdue' : '🟡 Active'}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            isCompleted ? 'bg-emerald-500' : isFailed ? 'bg-red-400' : 'bg-amber-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 font-semibold">
                        <span>Current: {Math.round(goal.currentValue)} kg</span>
                        <span>Target: {Math.round(goal.targetValue)} kg</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-400 border-t border-slate-200/50 dark:border-slate-800/50 pt-3">
                      <span>Started: {goal.startDate}</span>
                      <span className="font-bold text-slate-550">Deadline: {goal.targetDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
