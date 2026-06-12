'use client';

import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../lib/api';

interface ChatMessage {
  role: 'user' | 'model';
  parts: string;
}

export default function CoachPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roadmap' | 'plan' | 'spikes'>('roadmap');
  
  // Insights State
  const [insights, setInsights] = useState<any>(null);
  
  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCoachData = async () => {
      try {
        setLoading(true);
        const insRes = await api.ai.getInsights();
        setInsights(insRes.insights);
        
        // Initial coach message
        setChatHistory([
          {
            role: 'model',
            parts: `Hello! I'm your AI Sustainability Coach. I've audited your latest footprint of **${Math.round(insRes.insights.roadmap.recommendedOffsetsKg * 2)} kg CO₂**. Your highest contributor is analyzed on the left pane. Ask me any environmental questions or ask about specific strategies!`
          }
        ]);
      } catch (err) {
        console.error('Fetch Coach Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCoachData();
  }, []);

  // Auto scroll to latest chat bubble
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', parts: userMsg }]);
    setChatLoading(true);

    try {
      const res = await api.ai.chat(userMsg, chatHistory);
      setChatHistory(prev => [...prev, { role: 'model', parts: res.reply }]);
    } catch (err: any) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'model', parts: 'Apologies, I encountered a connection issue. Please ask again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-semibold text-slate-600 dark:text-slate-400">Consulting AI Sustainability Coach...</p>
        </div>
      </div>
    );
  }

  // Fallback if no logs
  if (!insights) {
    return (
      <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 flex flex-col items-center justify-center text-center">
        <div className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8">
          <span className="text-5xl block mb-4">🤖</span>
          <h2 className="text-2xl font-bold text-slate-850 dark:text-white mb-2">AI Coach is Locked</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
            Please log at least one monthly footprint first so the coach can audit your emissions and generate custom roadmaps.
          </p>
          <a
            href="/calculator"
            className="inline-block py-2.5 px-6 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg shadow transition-all focus:ring-2 focus:ring-emerald-500"
          >
            Start Carbon Calculator
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 flex flex-col h-[calc(100vh-4rem)]">
      <div className="max-w-7xl mx-auto w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* Left Pane: Structured AI Insights (Roadmap, Action Plan, Spikes) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col min-h-0">
          
          {/* Tab Headers */}
          <div className="grid grid-cols-3 bg-slate-100 dark:bg-slate-850 p-1.5 rounded-t-2xl border-b border-slate-200 dark:border-slate-800">
            {(['roadmap', 'plan', 'spikes'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 text-xs font-bold rounded-lg transition-all focus-visible:outline focus-visible:outline-2 ${
                  activeTab === tab
                    ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-450 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab === 'roadmap' && '🗺️ Roadmap'}
                {tab === 'plan' && '🗓️ Action Plan'}
                {tab === 'spikes' && '⚡ Spikes Audits'}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            
            {/* ROADMAP TAB */}
            {activeTab === 'roadmap' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div>
                  <h3 className="font-bold text-slate-850 dark:text-white text-sm uppercase mb-3">Immediate Targets</h3>
                  <div className="space-y-2.5">
                    {insights.roadmap.immediateTargets.map((tgt: string, idx: number) => (
                      <div key={idx} className="flex gap-2 text-sm leading-relaxed text-slate-655 dark:text-slate-400">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{tgt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-850 dark:text-white text-sm uppercase mb-3">Long-Term Strategy</h3>
                  <div className="space-y-2.5">
                    {insights.roadmap.longTermGoals.map((tgt: string, idx: number) => (
                      <div key={idx} className="flex gap-2 text-sm leading-relaxed text-slate-655 dark:text-slate-400">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{tgt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-250 dark:border-emerald-900 rounded-xl">
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-400 text-xs uppercase mb-1">Recommended Monthly Offset</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Complete carbon neutrality can be achieved by purchasing offsets for <span className="font-bold text-slate-800 dark:text-white">{insights.roadmap.recommendedOffsetsKg} kg CO₂</span> (approx. 50% of your footprint). Visit the offsets calculator tab.
                  </p>
                </div>
              </div>
            )}

            {/* ACTION PLAN TAB */}
            {activeTab === 'plan' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <h3 className="font-bold text-slate-850 dark:text-white text-sm uppercase mb-1">Weekly Habits Action Plan</h3>
                <p className="text-xs text-slate-500 mb-2">Engage in these dynamic weekly habits to start lowering your footprint.</p>

                <div className="space-y-3">
                  {insights.weeklyActionPlan.map((act: any, idx: number) => (
                    <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{act.habit}</p>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{act.impact}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                        <span>Difficulty: {act.difficulty.toUpperCase()}</span>
                        <span className="font-bold text-emerald-600">{act.sdgAlignments.join(', ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SPIKES AUDITS TAB */}
            {activeTab === 'spikes' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <h3 className="font-bold text-slate-850 dark:text-white text-sm uppercase mb-1">Emission Spikes Analysis</h3>
                
                {insights.spikeExplanation ? (
                  <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-250 dark:border-amber-900 rounded-xl">
                    <p className="text-sm text-slate-655 dark:text-slate-400 leading-relaxed">
                      {insights.spikeExplanation}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                    <p className="text-sm text-slate-500 font-medium">
                      🎉 No carbon spikes detected! Your emissions are stable or decreasing compared to last month.
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Right Pane: AI Coach Interactive Chatbot */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col min-h-0">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/55 dark:bg-slate-900 rounded-t-2xl">
            <span className="text-2xl">🤖</span>
            <div>
              <h3 className="font-bold text-slate-850 dark:text-white text-sm">EcoTrack AI Sustainability Coach</h3>
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Active & Aligned with UN SDGs</span>
            </div>
          </div>

          {/* Chat bubbles viewport */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.map((msg, i) => (
              <div 
                key={i} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-700 text-white rounded-tr-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/50 dark:border-slate-700/50'
                  }`}
                >
                  {/* Basic parser to make bold text ** work */}
                  {msg.parts.split('\n').map((line, lineIdx) => {
                    const parsedLine = line.split('**').map((part, partIdx) => 
                      partIdx % 2 === 1 ? <strong key={partIdx} className="font-black text-emerald-950 dark:text-emerald-400">{part}</strong> : part
                    );
                    return <p key={lineIdx} className={lineIdx > 0 ? 'mt-1.5' : ''}>{parsedLine}</p>;
                  })}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-none p-4 flex gap-1.5 items-center border border-slate-200/50 dark:border-slate-700/50">
                  <div className="w-2 h-2 bg-emerald-700 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-emerald-700 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-emerald-700 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input form */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <input
              type="text"
              required
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about AC savings, meat consumption impact, carbon offsets..."
              className="flex-1 bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
            <button
              type="submit"
              disabled={chatLoading}
              className="px-5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center"
              title="Send Message"
            >
              Send
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
