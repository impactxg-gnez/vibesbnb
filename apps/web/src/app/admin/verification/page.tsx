'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Check, X, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { getAccessTokenForAdminFetch } from '@/lib/supabase/adminSession';

interface HostDocumentRow {
  id: string;
  user_id: string;
  doc_type: string;
  storage_path: string;
  file_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  host_name?: string;
  rejection_reason?: string | null;
}

export default function DocumentVerificationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<HostDocumentRow[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    'pending'
  );
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && !isAdminUser(user)) {
      router.push('/');
    }
  }, [user, loading, router]);

  const loadDocuments = async () => {
    setLoadingDocs(true);
    try {
      const token = await getAccessTokenForAdminFetch();
      if (!token) throw new Error('No valid session — please sign in again.');

      const response = await fetch('/api/admin/host-documents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load documents');
      }
      setDocuments(data.documents || []);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Failed to load documents');
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (user && isAdminUser(user)) {
      loadDocuments();
    }
  }, [user]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return documents;
    return documents.filter((d) => d.status === statusFilter);
  }, [documents, statusFilter]);

  const openDocument = async (doc: HostDocumentRow) => {
    if (!doc.storage_path) {
      toast.error('No file path for this document');
      return;
    }
    setOpeningDocId(doc.id);
    try {
      const token = await getAccessTokenForAdminFetch();
      if (!token) throw new Error('No valid session — please sign in again.');
      const response = await fetch(
        `/api/admin/host-documents/signed-url?documentId=${encodeURIComponent(doc.id)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not open file');
      }
      window.open(data.url as string, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not open file');
    } finally {
      setOpeningDocId(null);
    }
  };

  const approve = async (doc: HostDocumentRow) => {
    setProcessingId(doc.id);
    try {
      const token = await getAccessTokenForAdminFetch();
      if (!token) throw new Error('No valid session — please sign in again.');
      const response = await fetch('/api/admin/host-documents', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documentId: doc.id, status: 'approved' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to approve');
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, status: 'approved' as const } : d))
      );
      toast.success('Document approved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  const reject = async (doc: HostDocumentRow) => {
    const reason = prompt('Reason for rejection (optional):');
    setProcessingId(doc.id);
    try {
      const token = await getAccessTokenForAdminFetch();
      if (!token) throw new Error('No valid session — please sign in again.');
      const response = await fetch('/api/admin/host-documents', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentId: doc.id,
          status: 'rejected',
          rejectionReason: reason || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to reject');
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                status: 'rejected' as const,
                rejection_reason: reason || d.rejection_reason,
              }
            : d
        )
      );
      toast.success('Document rejected');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading || loadingDocs) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!user || !isAdminUser(user)) {
    return null;
  }

  return (
    <AdminLayout>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Document Verification</h1>
          <p className="text-gray-500 mt-1">
            Review host-uploaded verification files. The storage bucket should be{' '}
            <strong>private</strong>; admins open files via short-lived signed URLs.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-center">
          <label className="text-sm text-gray-700">Filter</label>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            type="button"
            onClick={() => loadDocuments()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
          >
            Refresh
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Host
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    File
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                      No documents in this view. Hosts upload from Profile → Verification
                      documents.
                    </td>
                  </tr>
                ) : (
                  filtered.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900">{doc.host_name}</div>
                        <div className="text-gray-500 text-xs">{doc.user_id}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{doc.doc_type}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(doc.submitted_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            doc.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : doc.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          type="button"
                          disabled={openingDocId === doc.id || !doc.storage_path}
                          onClick={() => openDocument(doc)}
                          className="text-purple-600 hover:text-purple-800 inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {openingDocId === doc.id ? 'Opening…' : 'Open'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {doc.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={processingId === doc.id}
                              onClick={() => approve(doc)}
                              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={processingId === doc.id}
                              onClick={() => reject(doc)}
                              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {doc.status === 'rejected' && doc.rejection_reason && (
                          <p className="text-xs text-red-600 text-left max-w-xs ml-auto">
                            {doc.rejection_reason}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
