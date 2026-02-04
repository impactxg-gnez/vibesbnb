'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { createClient } from '@/lib/supabase/client';
import { Leaf, Check, X, MapPin, Truck, ExternalLink, ShieldCheck, Search } from 'lucide-react';
import toast from 'react-hot-toast';

interface Dispensary {
  id: string;
  user_id: string;
  name: string;
  description: string;
  location: string;
  status: 'pending' | 'active' | 'inactive';
  delivery_radius: number;
  created_at: string;
}

export default function AdminDispensariesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'active' | 'inactive'>('all');
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
    fetchDispensaries();
  }, [filterStatus]);

  const fetchDispensaries = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('dispensaries')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDispensaries(data || []);
    } catch (error: any) {
      console.error('Error fetching dispensaries:', error);
      toast.error('Failed to load dispensaries');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: 'active' | 'inactive' | 'pending') => {
    try {
      const { error } = await supabase
        .from('dispensaries')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Dispensary marked as ${status}`);
      fetchDispensaries();
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const filteredDispensaries = dispensaries.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Leaf className="text-primary-500 w-7 h-7" />
              Manage Dispensaries
            </h1>
            <p className="text-gray-500">Review and approve partner applications</p>
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="text-sm font-medium text-gray-500 mb-1">Pending Approval</div>
            <div className="text-2xl font-bold text-orange-500">
              {dispensaries.filter(d => d.status === 'pending').length}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="text-sm font-medium text-gray-500 mb-1">Active Partners</div>
            <div className="text-2xl font-bold text-green-500">
              {dispensaries.filter(d => d.status === 'active').length}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="text-sm font-medium text-gray-500 mb-1">Total Applications</div>
            <div className="text-2xl font-bold text-primary-500">{dispensaries.length}</div>
          </div>
        </div>

        {/* Dispensary List */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Dispensary</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Radius</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading dispensaries...</td>
                  </tr>
                ) : filteredDispensaries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No dispensaries found</td>
                  </tr>
                ) : (
                  filteredDispensaries.map((dispensary) => (
                    <tr key={dispensary.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{dispensary.name}</div>
                        <div className="text-xs text-gray-500">Applied on {new Date(dispensary.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-3 h-3" />
                          {dispensary.location}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Truck className="w-3 h-3" />
                          {dispensary.delivery_radius} mi
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          dispensary.status === 'active' ? 'bg-green-100 text-green-700' :
                          dispensary.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {dispensary.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {dispensary.status === 'pending' && (
                            <button
                              onClick={() => updateStatus(dispensary.id, 'active')}
                              className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition shadow-sm"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          {dispensary.status !== 'inactive' ? (
                            <button
                              onClick={() => updateStatus(dispensary.id, 'inactive')}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                              title="Reject/Deactivate"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                               onClick={() => updateStatus(dispensary.id, 'active')}
                               className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                               title="Reactivate"
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
