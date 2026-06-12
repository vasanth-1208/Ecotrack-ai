import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '../components/Navbar';
import AccessibilityPanel from '../components/AccessibilityPanel';
import SimulatorModal from '../components/SimulatorModal';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EcoTrack AI - Carbon Footprint Tracking & Reduction Platform',
  description: 'AI-Powered Sustainability Coach, carbon budget calculator, ESG/SDG aligned challenges, and interactive reduction dashboards.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col`}>
        <Navbar />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <AccessibilityPanel />
        <SimulatorModal />
      </body>
    </html>
  );
}
