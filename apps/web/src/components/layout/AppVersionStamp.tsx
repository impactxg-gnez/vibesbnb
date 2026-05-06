'use client';

import { APP_VERSION } from '@/lib/appVersion';

export function AppVersionStamp() {
  return (
    <div
      className="pointer-events-none fixed bottom-3 right-3 z-[9999] select-none rounded-md border border-white/10 bg-black/55 px-2 py-1 font-mono text-[10px] leading-none text-gray-400 backdrop-blur-sm"
      aria-hidden
    >
      v{APP_VERSION}
    </div>
  );
}
