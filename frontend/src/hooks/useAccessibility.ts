import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface AccessibilitySettings {
  dyslexiaFont: boolean;
  reducedMotion: boolean;
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  dyslexiaFont: false,
  reducedMotion: false,
  fontSize: 'md',
};

export const useAccessibility = () => {
  const router = useRouter();
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [showHelp, setShowHelp] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ecotrack_accessibility');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error('Failed to parse saved accessibility settings', e);
      }
    }
  }, []);

  // Apply changes to document elements
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const body = document.body;

    // 1. Dyslexia Font
    if (settings.dyslexiaFont) {
      body.classList.add('dyslexia-font');
    } else {
      body.classList.remove('dyslexia-font');
    }

    // 2. Reduced Motion
    if (settings.reducedMotion) {
      body.classList.add('reduced-motion');
    } else {
      body.classList.remove('reduced-motion');
    }

    // 3. Font Size Scaling
    body.classList.remove('text-scale-sm', 'text-scale-md', 'text-scale-lg', 'text-scale-xl');
    body.classList.add(`text-scale-${settings.fontSize}`);

    // Save to localStorage
    localStorage.setItem('ecotrack_accessibility', JSON.stringify(settings));
  }, [settings]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Must use Alt key
      if (!e.altKey) return;

      const key = e.key.toLowerCase();

      switch (key) {
        case 'd':
          e.preventDefault();
          router.push('/dashboard');
          break;
        case 'c':
          e.preventDefault();
          router.push('/calculator');
          break;
        case 'a':
          e.preventDefault();
          router.push('/coach');
          break;
        case 'g':
          e.preventDefault();
          router.push('/goals');
          break;
        case 'e':
          e.preventDefault();
          router.push('/education');
          break;
        case 's':
          e.preventDefault();
          // Dispatch custom event to trigger simulator modal
          window.dispatchEvent(new CustomEvent('toggle-simulator'));
          break;
        case 'h':
          e.preventDefault();
          setShowHelp(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  return {
    settings,
    updateSetting,
    showHelp,
    setShowHelp,
  };
};
