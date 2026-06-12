'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { removeAuthToken, api } from '../lib/api';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [userStats, setUserStats] = React.useState<{ points: number; level: number; fullName: string } | null>(null);

  // Load user profile statistics dynamically on mount/pathname change
  React.useEffect(() => {
    if (pathname === '/auth') return;
    
    api.auth.me()
      .then(res => {
        setUserStats({
          points: res.user.points,
          level: res.user.level,
          fullName: res.user.fullName
        });
      })
      .catch(() => {
        // user unauthorized
      });
  }, [pathname]);

  if (pathname === '/auth') return null;

  const handleLogout = () => {
    removeAuthToken();
    router.push('/auth');
  };

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard', shortcut: 'Alt+D' },
    { name: 'Calculator', href: '/calculator', shortcut: 'Alt+C' },
    { name: 'AI Coach', href: '/coach', shortcut: 'Alt+A' },
    { name: 'Goals', href: '/goals', shortcut: 'Alt+G' },
    { name: 'Gamification', href: '/gamification', shortcut: 'Alt+I' },
    { name: 'Education', href: '/education', shortcut: 'Alt+E' },
  ];

  return (
    <nav className="bg-emerald-950 text-white shadow-md" role="navigation" aria-label="Main Navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2 font-black text-xl tracking-wider text-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 px-2 rounded">
              <span className="text-2xl">🌱</span> ECOTRACK AI
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none ${
                    isActive 
                      ? 'bg-emerald-800 text-emerald-300 shadow-inner'
                      : 'hover:bg-emerald-900/60 hover:text-emerald-200'
                  }`}
                  title={`${link.name} (Shortcut: ${link.shortcut})`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Right Side Statistics & Logout */}
          <div className="flex items-center gap-4">
            {userStats && (
              <div className="flex items-center gap-2 bg-emerald-900/80 px-3 py-1.5 rounded-lg border border-emerald-800 text-xs sm:text-sm shadow-sm">
                <span className="font-bold text-emerald-400">Lvl {userStats.level}</span>
                <span className="text-slate-400">|</span>
                <span className="font-bold text-amber-400">⭐ {userStats.points} pts</span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="py-1.5 px-3 bg-emerald-900/50 hover:bg-red-900/80 hover:text-red-200 font-semibold text-sm rounded-lg border border-emerald-850 hover:border-red-900 transition-all focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
              title="Logout from EcoTrack AI"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
