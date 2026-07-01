'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Search, Eye, Check, X, Phone, Mail, MessageCircle, Loader2 } from 'lucide-react';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { getHeadersForAdminFetch } from '@/lib/supabase/adminSession';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Reservation {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone?: string | null;
  user_whatsapp?: string | null;
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

function formatGuestParty(guests: number, kids?: number, pets?: number): string {
  let text = `${guests} guest${guests === 1 ? '' : 's'}`;
  if (kids != null && Number(kids) > 0) {
    text += `, ${kids} kid${kids === 1 ? '' : 's'}`;
  }
  if (pets != null && Number(pets) > 0) {
    text += `, ${pets} pet${pets === 1 ? '' : 's'}`;
  }
  return text;
}

function formatBookedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ManageReservationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending_approval' | 'accepted' | 'rejected' | 'confirmed' | 'pending' | 'cancelled'
  >('all');
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && !isAdminUser(user)) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && isAdminUser(user)) {
      loadReservations();
    }
  }, [user?.id]);

  useEffect(() => {
    let filtered = reservations;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.property_name?.toLowerCase().includes(query) ||
          r.user_name?.toLowerCase().includes(query) ||
          r.user_email?.toLowerCase().includes(query) ||
          r.user_phone?.toLowerCase().includes(query) ||
          r.user_whatsapp?.toLowerCase().includes(query) ||
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
      const headers = await getHeadersForAdminFetch();
      if (!headers.Authorization) {
        throw new Error('No valid session — please sign in again.');
      }

      const response = await fetch('/api/admin/bookings', {
        headers: { ...headers },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load bookings');
      }

      const reservationsData: Reservation[] = (data.bookings || []).map((booking: Record<string, unknown>) => ({
        id: String(booking.id),
        user_id: String(booking.user_id),
        user_name:
          (booking.guest_name as string) ||
          `User ${String(booking.user_id).substring(0, 8)}`,
        user_email:
          (booking.guest_email as string) ||
          (booking.profile_email as string) ||
          '',
        user_phone: (booking.guest_phone as string) || null,
        user_whatsapp: (booking.guest_whatsapp as string) || null,
        property_id: String(booking.property_id),
        property_name: String(booking.property_name || ''),
        property_image: booking.property_image as string | undefined,
        location: String(booking.location || ''),
        check_in: String(booking.check_in),
        check_out: String(booking.check_out),
        guests: Number(booking.guests) || 0,
        kids: booking.kids != null ? Number(booking.kids) : undefined,
        pets: booking.pets != null ? Number(booking.pets) : undefined,
        total_price: Number(booking.total_price || 0),
        status: booking.status as Reservation['status'],
        payment_status: booking.payment_status as Reservation['payment_status'],
        rating: booking.rating != null ? Number(booking.rating) : undefined,
        created_at: String(booking.created_at),
      }));

      setReservations(reservationsData);
      setFilteredReservations(reservationsData);
    } catch (error: unknown) {
      console.error('Error loading reservations:', error);
      const message = error instanceof Error ? error.message : 'Failed to load reservations';
      toast.error(message);
    } finally {
      setLoadingReservations(false);
    }
  };

  const runAdminAction = async (
    reservationId: string,
    action: 'accept' | 'reject',
    reason?: string
  ) => {
    const key = `${action}-${reservationId}`;
    setActionLoading(key);
    try {
      const headers = await getHeadersForAdminFetch();
      if (!headers.Authorization) {
        throw new Error('No valid session — please sign in again.');
      }

      const response = await fetch(`/api/admin/bookings/${reservationId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(action === 'reject' ? { reason } : {}),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} booking`);
      }

      toast.success(
        action === 'accept'
          ? 'Booking approved — guest notified to pay and confirm.'
          : 'Booking rejected — guest notified.'
      );
      await loadReservations();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Failed to ${action} booking`;
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = (reservationId: string) => {
    if (!confirm('Approve this booking? The traveller will receive an email with a payment link.')) {
      return;
    }
    void runAdminAction(reservationId, 'accept');
  };

  const handleReject = (reservationId: string) => {
    const reason =
      window.prompt('Reason for rejecting this booking (sent to the traveller):')?.trim() || '';
    if (!reason) {
      toast.error('A rejection reason is required.');
      return;
    }
    void runAdminAction(reservationId, 'reject', reason);
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

  if (!user || !isAdminUser(user)) {
    return null;
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Reservations</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by guest, email, phone, or property..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guest &amp; contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Booked
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
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                      No reservations found
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map((reservation) => {
                    const isPendingApproval = reservation.status === 'pending_approval';
                    const acceptLoading = actionLoading === `accept-${reservation.id}`;
                    const rejectLoading = actionLoading === `reject-${reservation.id}`;

                    return (
                      <tr key={reservation.id} className="hover:bg-gray-50 align-top">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{reservation.user_name}</div>
                          {reservation.user_email ? (
                            <a
                              href={`mailto:${reservation.user_email}`}
                              className="mt-1 flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800"
                            >
                              <Mail className="w-3.5 h-3.5 shrink-0" />
                              {reservation.user_email}
                            </a>
                          ) : (
                            <span className="text-sm text-gray-400">No email on file</span>
                          )}
                          {reservation.user_phone ? (
                            <a
                              href={`tel:${reservation.user_phone}`}
                              className="mt-1 flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
                            >
                              <Phone className="w-3.5 h-3.5 shrink-0" />
                              {reservation.user_phone}
                            </a>
                          ) : null}
                          {reservation.user_whatsapp &&
                          reservation.user_whatsapp !== reservation.user_phone ? (
                            <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                              WhatsApp: {reservation.user_whatsapp}
                            </div>
                          ) : null}
                          {!reservation.user_phone && !reservation.user_whatsapp && (
                            <p className="mt-1 text-xs text-gray-400">No phone on profile</p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <time dateTime={reservation.created_at}>
                            {formatBookedAt(reservation.created_at)}
                          </time>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {reservation.property_name}
                          </div>
                          <div className="text-sm text-gray-500">{reservation.location}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>{new Date(reservation.check_in).toLocaleDateString()}</div>
                          <div className="text-gray-500">to</div>
                          <div>{new Date(reservation.check_out).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatGuestParty(reservation.guests, reservation.kids, reservation.pets)}
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
                                  : reservation.status === 'pending_approval' ||
                                      reservation.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {reservation.status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
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
                            {isPendingApproval && (
                              <>
                                <button
                                  onClick={() => handleApprove(reservation.id)}
                                  disabled={acceptLoading || rejectLoading}
                                  className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition disabled:opacity-60"
                                  title="Approve & send payment link"
                                >
                                  {acceptLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleReject(reservation.id)}
                                  disabled={acceptLoading || rejectLoading}
                                  className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition disabled:opacity-60"
                                  title="Reject booking"
                                >
                                  {rejectLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <X className="w-4 h-4" />
                                  )}
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
