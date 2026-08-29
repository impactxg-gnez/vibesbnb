'use client';

import { useEffect } from 'react';
import { syncPlatformFeesFromServer } from '@/lib/platformPricing';

/** Load platform fee settings once per session so quotes match admin-configured rates. */
export function PlatformFeeSync() {
  useEffect(() => {
    void syncPlatformFeesFromServer();
  }, []);
  return null;
}
