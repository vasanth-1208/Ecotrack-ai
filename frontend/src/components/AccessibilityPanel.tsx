'use client';

import React from 'react';
import { useAccessibility } from '../hooks/useAccessibility';

export const AccessibilityPanel: React.FC = () => {
  const { settings, updateSetting, showHelp, setShowHelp } = useAccessibility();
  const [isOpen, setIsOpen] = React.useState(false);

  // Toggle simulator via custom event from shortcuts (just to show it works)
  React.useEffect(() => {
    const handleToggleSim = () => {
      // Handled in pages or simulator component
      console.log('Shortcuts trigger simulator');
    };
    window.addEventListener('toggle-simulator', handleToggleSim);
    return () => window.removeEventListener('toggle-simulator', handleToggleSim);
  }, []);

  return (
    <>
      {/* Floating Panel Trigger Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="fixed bottom-6 right-6 z-50 p-3 bg-emerald-700 text-white rounded-full shadow-lg hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all flex items-center justify-center aria-label='Accessibility Menu'"
        title="Accessibility Settings (Alt + H for Shortcuts)"
        aria-expanded={isOpen}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-accessibility">
          <circle cx="12" cy="4" r="1" />
          <path d="m18 10 1-1" />
          <path d="m6 10-1-1" />
          <path d="m12 6-1.5 5h3Z" />
          <path d="M12 11v7h2" />
          <path d="M12 18v-7H10v7H8" />
          <path d="m9 6 3 .5 3-.5" />
        </svg>
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <div 
          className="fixed bottom-20 right-6 z-50 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-5 text-slate-800 dark:text-slate-200 animate-in fade-in slide-in-from-bottom-5 duration-200"
          role="dialog"
          aria-label="Accessibility Menu Options"
        >
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="font-bold text-lg text-emerald-800 dark:text-emerald-400">Accessibility Panel</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              aria-label="Close settings"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* 1. Dyslexia Font Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="dyslexia-toggle" className="font-semibold text-sm block">Dyslexia-Friendly Font</label>
                <span className="text-xs text-slate-500">Improves readability for users</span>
              </div>
              <input
                id="dyslexia-toggle"
                type="checkbox"
                checked={settings.dyslexiaFont}
                onChange={(e) => updateSetting('dyslexiaFont', e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
              />
            </div>

            {/* 2. Reduced Motion Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="motion-toggle" className="font-semibold text-sm block">Reduced Motion</label>
                <span className="text-xs text-slate-500">Disables animations and transitions</span>
              </div>
              <input
                id="motion-toggle"
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => updateSetting('reducedMotion', e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
              />
            </div>

            {/* 3. Text Scaling Control */}
            <div>
              <span className="font-semibold text-sm block mb-1">Font Size Adjustment</span>
              <div className="grid grid-cols-4 gap-1">
                {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => updateSetting('fontSize', size)}
                    className={`p-1.5 text-xs font-bold rounded border transition-all ${
                      settings.fontSize === size
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {size.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Keyboard Shortcuts Helper Trigger */}
            <button
              onClick={() => setShowHelp(true)}
              className="w-full mt-2 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-400 font-semibold text-sm rounded-lg border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              ⌨️ Keyboard Shortcuts Help
            </button>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Dialog Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div 
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
          >
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 id="shortcuts-title" className="font-bold text-xl text-emerald-800 dark:text-emerald-400">Keyboard Shortcuts (Alt + Key)</h3>
              <button 
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label="Close shortcuts dialog"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-50 dark:border-slate-800/50">
                <span>Go to Dashboard</span>
                <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold">Alt + D</kbd>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-50 dark:border-slate-800/50">
                <span>Open Carbon Calculator Wizard</span>
                <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold">Alt + C</kbd>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-50 dark:border-slate-800/50">
                <span>Go to AI Sustainability Coach</span>
                <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold">Alt + A</kbd>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-50 dark:border-slate-800/50">
                <span>Go to Goals Tracker</span>
                <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold">Alt + G</kbd>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-50 dark:border-slate-800/50">
                <span>Go to Educational Hub</span>
                <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold">Alt + E</kbd>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-50 dark:border-slate-800/50">
                <span>Open AI Carbon Simulator</span>
                <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold">Alt + S</kbd>
              </div>
              <div className="flex justify-between items-center text-sm py-1">
                <span>Toggle this Help menu</span>
                <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold">Alt + H</kbd>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full mt-6 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm rounded-lg transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  );
};
export default AccessibilityPanel;
