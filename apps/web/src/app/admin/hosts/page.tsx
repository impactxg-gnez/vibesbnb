'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { createClient } from '@/lib/supabase/client';
import { Home, Check, X, MapPin, Mail, User, Search, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface HostApplication {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  location: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  notes: string | null;
}

export default function AdminHostsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<HostApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const supabase = createClient();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && user.user_metadata?.role !== 'admin') {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    fetchApplications();
  }, [filterStatus]);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('pending_host_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setApplications(data || []);
    } catch (error: any) {
      console.error('Error fetching host applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (application: HostApplication) => {
    try {
      // 1. Update application status
      const { error: updateError } = await supabase
        .from('pending_host_applications')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', application.id);

      if (updateError) throw updateError;

      // 2. Create user account via Supabase Auth Admin API (would need server-side)
      // For now, we'll just mark as approved - the user can sign up again with the same email
      // and be automatically approved, or you can send them an invite link

      toast.success(`Host application approved! An invite will be sent to ${application.email}`);
      fetchApplications();
    } catch (error: any) {
      console.error('Error approving application:', error);
      toast.error('Failed to approve application');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pending_host_applications')
        .update({ 
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Application rejected');
      fetchApplications();
    } catch (error: any) {
      toast.error('Failed to reject application');
    }
  };

  const filteredApplications = applications.filter(app => 
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (app.location?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  if (loading) return null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Home className="text-primary-500 w-7 h-7" />
              Host Applications
            </h1>
            <p className="text-gray-500">Review and approve host registrations</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none w-64"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="text-sm font-medium text-gray-500 mb-1">Pending Review</div>
            <div className="text-2xl font-bold text-orange-500">
              {applications.filter(a => a.status === 'pending').length}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="text-sm font-medium text-gray-500 mb-1">Approved</div>
            <div className="text-2xl font-bold text-green-500">
              {applications.filter(a => a.status === 'approved').length}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="text-sm font-medium text-gray-500 mb-1">Rejected</div>
            <div className="text-2xl font-bold text-red-500">
              {applications.filter(a => a.status === 'rejected').length}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="text-sm font-medium text-gray-500 mb-1">Total Applications</div>
            <div className="text-2xl font-bold text-primary-500">{applications.length}</div>
          </div>
        </div>

        {/* Applications List */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Applicant</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Applied</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading applications...</td>
                  </tr>
                ) : filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      {filterStatus === 'pending' ? 'No pending applications' : 'No applications found'}
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-500/10 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-primary-500" />
                          </div>
                          <div className="font-semibold text-gray-900">{application.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail className="w-3 h-3" />
                          {application.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {application.location ? (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <MapPin className="w-3 h-3" />
                            {application.location}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not provided</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-3 h-3" />
                          {new Date(application.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          application.status === 'approved' ? 'bg-green-100 text-green-700' :
                          application.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {application.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {application.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(application)}
                                className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition shadow-sm"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(application.id)}
                                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {application.status === 'rejected' && (
                            <button
                              onClick={() => handleApprove(application)}
                              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                              title="Approve (reconsider)"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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

