'use client';

import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { openVibeBot } from '@/lib/concierge/openVibeBot';

const KEY = 'vibebot-home-nudge-dismissed';

export function VibeBotHomeNudge() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === '1') return;
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => setShow(true), 1600);
    return () => window.clearTimeout(t);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed z-[55] left-4 right-4 sm:left-auto sm:right-6 bottom-[calc(9.5rem+env(safe-area-inset-bottom,0px))] md:bottom-24 max-w-sm rounded-2xl border border-emerald-500/40 bg-gray-950/95 p-4 shadow-xl">
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Ask VibeBot</p>
          <p className="text-xs text-gray-400 mt-1">
            Describe a trip — neighborhood, dates, guests, budget — and get live VibesBNB listing
            links. Also pinned at the top of Messages.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => {
                dismiss();
                openVibeBot();
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
            >
              Try it
            </button>
            <button type="button" onClick={dismiss} className="text-xs text-gray-400 hover:text-white">
              Not now
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="text-gray-500 hover:text-white" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
