'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminUser } from '@/lib/auth/isAdmin';
import {
  clearImpersonatedHost,
  getImpersonatedHostId,
  getImpersonationHostLabel,
  onImpersonationChanged,
} from '@/lib/adminHostImpersonation';
import { ShieldAlert, X } from 'lucide-react';

export function HostImpersonationBanner() {
  const { user } = useAuth();
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAdminUser(user)) {
      setActive(false);
      return;
    }
    const sync = () => {
      const id = getImpersonatedHostId();
      setActive(!!id);
      setLabel(getImpersonationHostLabel());
    };
    sync();
    return onImpersonationChanged(sync);
  }, [user]);

  if (!active) return null;

  return (
    <div className="border-b border-amber-500/40 bg-amber-950/90 text-amber-100">
      <div className="container mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400" aria-hidden />
          <p className="text-sm font-medium">
            Admin support mode: managing listings for{' '}
            <span className="text-white font-semibold truncate">{label || 'host'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin/users"
            className="text-xs font-semibold text-amber-200 hover:text-white underline underline-offset-2"
          >
            Admin users
          </Link>
          <button
            type="button"
            onClick={() => {
              clearImpersonatedHost();
              router.push('/admin');
              router.refresh();
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-100 hover:bg-amber-500/30 border border-amber-500/40"
          >
            <X className="w-3.5 h-3.5" />
            Exit host view
          </button>
        </div>
      </div>
    </div>
  );
}
