'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

type ThemeToggleProps = {
  variant?: 'icon' | 'menu';
};

export function ThemeToggle({ variant = 'icon' }: ThemeToggleProps) {
  const { theme, setTheme, mounted } = useTheme();

  if (!mounted) {
    if (variant === 'menu') {
      return (
        <div className="px-4 py-2">
          <div className="h-9 rounded-xl bg-white/5" aria-hidden />
        </div>
      );
    }
    return <div className="p-2 w-9 h-9" aria-hidden />;
  }

  if (variant === 'menu') {
    return (
      <div className="px-3 py-2" role="group" aria-label="Color theme">
        <p className="px-1 mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          Appearance
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setTheme('light')}
            aria-pressed={theme === 'light'}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-2 text-xs font-bold transition-colors ${
              theme === 'light'
                ? 'bg-primary-500 text-black'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            <Sun size={14} aria-hidden />
            Light
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            aria-pressed={theme === 'dark'}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-2 text-xs font-bold transition-colors ${
              theme === 'dark'
                ? 'bg-primary-500 text-black'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            <Moon size={14} aria-hidden />
            Dark
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="p-2 rounded-full border border-white/10 bg-white/5 hover:bg-primary-500/10 hover:border-primary-500/40 transition-colors"
      aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-espresso" />
      ) : (
        <Sun className="w-5 h-5 text-primary-400" />
      )}
    </button>
  );
}
