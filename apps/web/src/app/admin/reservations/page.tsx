'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Calendar, Search, Filter, Eye, Edit, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Reservation {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  property_id: string;
  property_name: string;
  property_image?: string;
  location: string;
  check_in: string;
  check_out: string;
  guests: number;
  kids?: number;
  pets?: number;
  total_price: number;
  status: 'pending_approval' | 'accepted' | 'rejected' | 'confirmed' | 'pending' | 'cancelled';
  payment_status?: 'pending' | 'paid' | 'refunded' | 'failed';
  rating?: number;
  created_at: string;
}

export default function ManageReservationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_approval' | 'accepted' | 'rejected' | 'confirmed' | 'pending' | 'cancelled'>('all');
  const [loadingReservations, setLoadingReservations] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && user.user_metadata?.role !== 'admin') {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.user_metadata?.role === 'admin') {
      loadReservations();
    }
  }, [user]);

  useEffect(() => {
    let filtered = reservations;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.property_name?.toLowerCase().includes(query) ||
          r.user_name?.toLowerCase().includes(query) ||
          r.user_email?.toLowerCase().includes(query) ||
          r.location?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    setFilteredReservations(filtered);
  }, [searchQuery, statusFilter, reservations]);

  const loadReservations = async () => {
    setLoadingReservations(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform bookings to reservations with user info
      const reservationsData: Reservation[] = (data || []).map((booking: any) => ({
        id: booking.id,
        user_id: booking.user_id,
        user_name: booking.guest_name || `User ${booking.user_id.substring(0, 8)}`,
        user_email: booking.guest_email || `user-${booking.user_id.substring(0, 8)}@example.com`,
        property_id: booking.property_id,
        property_name: booking.property_name,
        property_image: booking.property_image,
        location: booking.location,
        check_in: booking.check_in,
        check_out: booking.check_out,
        guests: booking.guests,
        kids: booking.kids,
        pets: booking.pets,
        total_price: Number(booking.total_price || 0),
        status: booking.status as 'pending_approval' | 'accepted' | 'rejected' | 'confirmed' | 'pending' | 'cancelled',
        payment_status: booking.payment_status,
        rating: booking.rating,
        created_at: booking.created_at,
      }));

      setReservations(reservationsData);
      setFilteredReservations(reservationsData);
    } catch (error) {
      console.error('Error loading reservations:', error);
      toast.error('Failed to load reservations');
    } finally {
      setLoadingReservations(false);
    }
  };

  const handleUpdateStatus = async (reservationId: string, newStatus: 'confirmed' | 'pending' | 'cancelled') => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', reservationId);

      if (error) throw error;

      setReservations(
        reservations.map((r) => (r.id === reservationId ? { ...r, status: newStatus } : r))
      );
      setFilteredReservations(
        filteredReservations.map((r) => (r.id === reservationId ? { ...r, status: newStatus } : r))
      );
      toast.success('Reservation status updated');
    } catch (error) {
      console.error('Error updating reservation:', error);
      toast.error('Failed to update reservation status');
    }
  };

  if (loading || loadingReservations) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!user || user.user_metadata?.role !== 'admin') {
    return null;
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Reservations</h1>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search reservations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="accepted">Accepted</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Reservations Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guest
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      {loadingReservations ? 'Loading reservations...' : 'No reservations found'}
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map((reservation) => (
                    <tr key={reservation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{reservation.user_name}</div>
                          <div className="text-sm text-gray-500">{reservation.user_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{reservation.property_name}</div>
                        <div className="text-sm text-gray-500">{reservation.location}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{new Date(reservation.check_in).toLocaleDateString()}</div>
                        <div className="text-gray-500">to</div>
                        <div>{new Date(reservation.check_out).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {reservation.guests} {reservation.guests === 1 ? 'guest' : 'guests'}
                        {reservation.kids && reservation.kids > 0 && `, ${reservation.kids} kids`}
                        {reservation.pets && reservation.pets > 0 && `, ${reservation.pets} pets`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${reservation.total_price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            reservation.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : reservation.status === 'accepted'
                              ? 'bg-blue-100 text-blue-800'
                              : reservation.status === 'pending_approval' || reservation.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {reservation.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            reservation.payment_status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : reservation.payment_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : reservation.payment_status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {reservation.payment_status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {reservation.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(reservation.id, 'confirmed')}
                                className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                                title="Confirm"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(reservation.id, 'cancelled')}
                                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <Link
                            href={`/listings/${reservation.property_id}`}
                            target="_blank"
                            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                            title="View Property"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
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

