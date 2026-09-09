'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { getHeadersForAdminFetch } from '@/lib/supabase/adminSession';
import toast from 'react-hot-toast';

type ProofRow = {
  id: string;
  property_id: string;
  feature_key: string;
  image_url: string;
  caption: string | null;
  status: string;
  created_at: string;
  property_name?: string;
};

export default function AdaptedAccessibilityAdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<ProofRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isAdminUser(user)) router.push('/');
  }, [user, loading, router]);

  const load = useCallback(async () => {
    setLoadingRows(true);
    try {
      const headers = await getHeadersForAdminFetch();
      const res = await fetch('/api/admin/accessibility-proofs?status=pending', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setRows(data.proofs || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load proofs');
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  }, []);

  useEffect(() => {
    if (user && isAdminUser(user)) void load();
  }, [user, load]);

  const review = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const headers = await getHeadersForAdminFetch();
      const res = await fetch('/api/admin/accessibility-proofs', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      toast.success(status === 'approved' ? 'Proof approved' : 'Proof rejected');
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Adapted accessibility proofs</h1>
          <p className="text-muted text-sm mt-1">
            Review host proof photos for accessibility claims. Approving all pending proofs for a
            property can mark it Adapted verified.
          </p>
        </div>
        {loadingRows ? (
          <p className="text-muted" role="status">
            Loading…
          </p>
        ) : rows.length === 0 ? (
          <p className="text-muted">No pending proofs.</p>
        ) : (
          <ul className="space-y-4">
            {rows.map((row) => (
              <li
                key={row.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row gap-4"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={row.image_url}
                  alt={`Proof for ${row.feature_key}`}
                  className="w-full md:w-48 h-32 object-cover rounded-lg bg-black"
                />
                <div className="flex-1 space-y-2">
                  <p className="font-semibold text-white">{row.property_name || row.property_id}</p>
                  <p className="text-sm text-primary-400">{row.feature_key}</p>
                  {row.caption ? <p className="text-sm text-muted">{row.caption}</p> : null}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      className="btn-primary !py-2 !px-4 text-sm"
                      onClick={() => void review(row.id, 'approved')}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn-secondary !py-2 !px-4 text-sm"
                      onClick={() => void review(row.id, 'rejected')}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}
