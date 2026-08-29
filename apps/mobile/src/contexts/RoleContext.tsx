import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AppMode } from '@/src/lib/hostAccess';
import { getAppMode, setAppMode } from '@/src/lib/hostAccess';
import { useAuth } from './AuthContext';

type RoleContextValue = {
  mode: AppMode;
  setMode: (mode: AppMode) => Promise<void>;
  canSwitchToHost: boolean;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { isHost } = useAuth();
  const [mode, setModeState] = useState<AppMode>('traveling');

  useEffect(() => {
    void getAppMode().then(setModeState);
  }, []);

  const setMode = async (next: AppMode) => {
    if (next === 'hosting' && !isHost) return;
    await setAppMode(next);
    setModeState(next);
  };

  const value = useMemo(
    () => ({
      mode,
      setMode,
      canSwitchToHost: isHost,
    }),
    [mode, isHost]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
