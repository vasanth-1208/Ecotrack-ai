'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '../lib/api';

export default function Home() {
  const router = useRouter();

  React.useEffect(() => {
    const token = getAuthToken();
    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/auth');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-800 dark:text-slate-100">
      <div className="flex flex-col items-center gap-4">
        {/* Loading Spinner */}
        <div className="w-12 h-12 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-semibold text-lg tracking-wide text-emerald-800 dark:text-emerald-400">Loading EcoTrack AI...</p>
      </div>
    </div>
  );
}
