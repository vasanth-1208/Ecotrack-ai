'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setAuthToken } from '../../lib/api';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const res = await api.auth.login(email, password);
        setAuthToken(res.token);
        router.push('/dashboard');
      } else {
        const res = await api.auth.register(email, password, fullName);
        setAuthToken(res.token);
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-md border border-emerald-900/30 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        {/* Subtle decorative background circles */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-700/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>

        <div className="text-center mb-8">
          <span className="text-4xl block mb-2">🌱</span>
          <h1 className="text-3xl font-black tracking-wide text-emerald-400">ECOTRACK AI</h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest">Carbon Footprint Intelligence</p>
        </div>

        {/* Tab Headers */}
        <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-800/80 p-1 rounded-xl">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`py-2 text-sm font-bold rounded-lg transition-all focus-visible:outline focus-visible:outline-2 ${
              isLogin 
                ? 'bg-emerald-700 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`py-2 text-sm font-bold rounded-lg transition-all focus-visible:outline focus-visible:outline-2 ${
              !isLogin 
                ? 'bg-emerald-700 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/40 border border-red-800 text-red-200 text-sm rounded-lg" role="alert">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="fullName" className="block text-xs font-bold text-slate-350 uppercase tracking-wider mb-1">Full Name</label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full bg-slate-850 border border-slate-700 rounded-lg py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-slate-500"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-bold text-slate-350 uppercase tracking-wider mb-1">Email Address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full bg-slate-850 border border-slate-700 rounded-lg py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-slate-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold text-slate-350 uppercase tracking-wider mb-1">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-850 border border-slate-700 rounded-lg py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-2.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 disabled:bg-emerald-850 disabled:text-slate-450 font-bold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-550 flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6 leading-relaxed">
          EcoTrack AI supports Sustainable Development Goals 7, 11, 12, and 13.
        </p>
      </div>
    </div>
  );
}
