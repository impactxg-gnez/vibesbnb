'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { isAdminUser } from '@/lib/auth/isAdmin';
import {
  ensureStoredHostRole,
  metadataIndicatesHost,
  readStoredUserRoles,
  userHasHostCapability,
} from '@/lib/auth/hostAccess';
import { getImpersonatedHostId } from '@/lib/adminHostImpersonation';

/**
 * Resolves whether the signed-in user may use host dashboard / payouts.
 * Hydrates localStorage roles synchronously to avoid a false redirect to /profile.
 * Also checks profiles.role when metadata alone is inconclusive.
 */
export function useHostAccess(user: User | null | undefined, authLoading: boolean) {
  const [storedRoles, setStoredRoles] = useState<string[]>(() => readStoredUserRoles());
  const [profileHost, setProfileHost] = useState<boolean | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(false);

  useEffect(() => {
    setStoredRoles(readStoredUserRoles());
  }, [user?.id]);

  const adminImpersonating = Boolean(
    user && isAdminUser(user) && getImpersonatedHostId()
  );

  const localHost =
    userHasHostCapability(user, storedRoles) || adminImpersonating;

  // When metadata/localStorage do not yet say host, ask profiles (once).
  useEffect(() => {
    if (authLoading || !user) {
      setProfileHost(null);
      setCheckingProfile(false);
      return;
    }
    if (localHost || metadataIndicatesHost(user) || adminImpersonating) {
      setProfileHost(true);
      setCheckingProfile(false);
      return;
    }

    let cancelled = false;
    setCheckingProfile(true);
    void (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        if (cancelled) return;
        const isHost =
          data?.role === 'host' || data?.role === 'host_pending';
        setProfileHost(isHost);
        if (isHost) {
          ensureStoredHostRole();
          setStoredRoles(readStoredUserRoles());
        }
      } catch {
        if (!cancelled) setProfileHost(false);
      } finally {
        if (!cancelled) setCheckingProfile(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, localHost, adminImpersonating]);

  const canAccess = localHost || profileHost === true;
  const checking =
    authLoading || (!canAccess && (checkingProfile || profileHost === null));

  return {
    canAccess,
    checking,
    storedRoles,
    adminImpersonating,
  };
}
