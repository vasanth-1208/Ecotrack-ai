'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

export const SimulatorModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Simulation Inputs
  const [dietChange, setDietChange] = useState<'vegetarian' | 'vegan' | 'none'>('none');
  const [carKmReduced, setCarKmReduced] = useState(50);
  const [publicTransportKmIncreased, setPublicTransportKmIncreased] = useState(50);
  const [electricityReducedPercent, setElectricityReducedPercent] = useState(10);

  // Simulation Results
  const [results, setResults] = useState<any>(null);

  // Listen to toggle event from accessibility keyboard shortcut Alt+S
  useEffect(() => {
    const handleToggle = () => {
      setIsOpen(prev => !prev);
    };
    window.addEventListener('toggle-simulator', handleToggle);
    return () => window.removeEventListener('toggle-simulator', handleToggle);
  }, []);

  // Run simulation on input changes
  useEffect(() => {
    if (!isOpen) return;

    const runSimulation = async () => {
      setLoading(true);
      try {
        const res = await api.simulator.run({
          dietChange,
          carKmReduced,
          publicTransportKmIncreased,
          electricityReducedPercent
        });
        setResults(res);
      } catch (err) {
        console.error('Simulation calculation failed', err);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(runSimulation, 300);
    return () => clearTimeout(debounceTimer);
  }, [isOpen, dietChange, carKmReduced, publicTransportKmIncreased, electricityReducedPercent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-800 dark:text-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] min-h-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sim-title"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <div>
              <h3 id="sim-title" className="font-bold text-lg text-emerald-800 dark:text-emerald-450">AI Carbon Reduction Simulator</h3>
              <span className="text-[10px] text-slate-500 font-bold uppercase">Simulate lifestyle upgrades instantly</span>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-655"
            aria-label="Close simulator"
          >
            ✕
          </button>
        </div>

        {/* Modal content body */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-sm">
          
          {/* Inputs Section */}
          <div className="space-y-4">
            
            {/* Input 1: Diet Swap */}
            <div>
              <label htmlFor="sim-diet" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Diet Swap</label>
              <select
                id="sim-diet"
                value={dietChange}
                onChange={(e) => setDietChange(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-850 rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-emerald-600"
              >
                <option value="none">No change in diet</option>
                <option value="vegetarian">Switch to Vegetarian Diet</option>
                <option value="vegan">Switch to Vegan (Plant-based) Diet</option>
              </select>
            </div>

            {/* Input 2: Commute Swap */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="sim-car" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Car km reduced</label>
                <input
                  id="sim-car"
                  type="number"
                  min="0"
                  value={carKmReduced}
                  onChange={(e) => setCarKmReduced(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-850 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label htmlFor="sim-transit" className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Bus km increased</label>
                <input
                  id="sim-transit"
                  type="number"
                  min="0"
                  value={publicTransportKmIncreased}
                  onChange={(e) => setPublicTransportKmIncreased(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-850 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Input 3: Energy Swap */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="sim-energy" className="block text-xs font-bold text-slate-500 uppercase">Electricity reduction (%)</label>
                <span className="text-xs font-bold text-emerald-600">{electricityReducedPercent}%</span>
              </div>
              <input
                id="sim-energy"
                type="range"
                min="0"
                max="100"
                value={electricityReducedPercent}
                onChange={(e) => setElectricityReducedPercent(Number(e.target.value))}
                className="w-full accent-emerald-700 cursor-pointer h-2 bg-slate-100 rounded-lg"
              />
            </div>

          </div>

          {/* Results Section */}
          <div className="border-t border-slate-100 dark:border-slate-850 pt-5 space-y-4">
            <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Projected Environmental Impact</h4>

            {loading && !results ? (
              <div className="flex justify-center items-center py-6">
                <div className="w-6 h-6 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : results ? (
              <div className="grid grid-cols-3 gap-3 text-center">
                
                {/* Metric 1: Carbon saved */}
                <div className="p-3 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-250 dark:border-emerald-900 rounded-xl">
                  <span className="text-[10px] text-emerald-650 dark:text-emerald-400 font-bold uppercase block">Carbon Saved</span>
                  <p className="text-lg font-black mt-1 text-emerald-850 dark:text-white">{results.annualCo2SavedKg} kg</p>
                  <span className="text-[9px] text-slate-500 block mt-0.5">per year</span>
                </div>

                {/* Metric 2: Money saved */}
                <div className="p-3 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-250 dark:border-emerald-900 rounded-xl">
                  <span className="text-[10px] text-emerald-650 dark:text-emerald-400 font-bold uppercase block">Money Saved</span>
                  <p className="text-lg font-black mt-1 text-emerald-850 dark:text-white">₹{results.annualMoneySavedInr}</p>
                  <span className="text-[9px] text-slate-500 block mt-0.5">per year</span>
                </div>

                {/* Metric 3: Trees planted */}
                <div className="p-3 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-250 dark:border-emerald-900 rounded-xl">
                  <span className="text-[10px] text-emerald-650 dark:text-emerald-400 font-bold uppercase block">Trees Equivalent</span>
                  <p className="text-lg font-black mt-1 text-emerald-850 dark:text-white">{results.treesEquivalent}</p>
                  <span className="text-[9px] text-slate-500 block mt-0.5">mature trees</span>
                </div>

              </div>
            ) : null}
          </div>

        </div>

        {/* Footer */}
        <button
          onClick={() => setIsOpen(false)}
          className="w-full mt-6 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg transition-all"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
export default SimulatorModal;
