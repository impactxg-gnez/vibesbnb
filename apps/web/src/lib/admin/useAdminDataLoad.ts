import { useCallback, useEffect, useRef, useState } from 'react';

type ReloadOptions = {
  /** When true, refresh data without the full-page loading state (keeps forms/modals mounted). */
  silent?: boolean;
};

/**
 * Run an admin data fetch once per signed-in user id.
 * Use `reload({ silent: true })` after saves so the UI does not unmount.
 */
export function useAdminDataLoad(
  userId: string | undefined,
  enabled: boolean,
  load: () => Promise<void>
) {
  const [initialLoading, setInitialLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const lastUserIdRef = useRef<string | undefined>();

  const reload = useCallback(
    async (options?: ReloadOptions) => {
      const silent = options?.silent ?? hasLoadedRef.current;
      if (!silent) setInitialLoading(true);
      try {
        await load();
      } finally {
        hasLoadedRef.current = true;
        if (!silent) setInitialLoading(false);
      }
    },
    [load]
  );

  useEffect(() => {
    if (!enabled || !userId) return;
    if (lastUserIdRef.current !== userId) {
      lastUserIdRef.current = userId;
      hasLoadedRef.current = false;
      setInitialLoading(true);
    }
    if (hasLoadedRef.current) return;
    void reload({ silent: false });
  }, [enabled, userId, reload]);

  return { initialLoading, reload };
}
