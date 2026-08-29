import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/src/lib/supabase';
import { syncProfile } from '@/src/lib/api';
import { syncPlatformFeesFromServer } from '@/src/lib/platformFees';
import {
  ensureHostRoleStored,
  userHasHostCapability,
  metadataIndicatesHost,
} from '@/src/lib/hostAccess';
import { setupPushNotifications } from '@/src/lib/pushNotifications';
import { isConfigured } from '@/src/lib/config';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isHost: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshHostStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);

  const refreshHostStatus = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    if (!u) {
      setIsHost(false);
      return;
    }
    if (metadataIndicatesHost(u)) {
      setIsHost(true);
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', u.id)
      .maybeSingle();
    const host =
      profile?.role === 'host' ||
      profile?.role === 'host_pending' ||
      (await userHasHostCapability(u));
    setIsHost(host);
    if (host) await ensureHostRoleStored();
  }, []);

  const afterAuth = useCallback(async () => {
    try {
      await syncProfile();
    } catch {
      /* optional when offline */
    }
    void syncPlatformFeesFromServer();
    void setupPushNotifications();
    await refreshHostStatus();
  }, [refreshHostStatus]);

  useEffect(() => {
    if (!isConfigured()) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (data.session?.user) void afterAuth();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) void afterAuth();
      else setIsHost(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [afterAuth]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      isHost,
      signIn,
      signUp,
      signOut,
      refreshHostStatus,
    }),
    [user, session, loading, isHost, signIn, signUp, signOut, refreshHostStatus]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
