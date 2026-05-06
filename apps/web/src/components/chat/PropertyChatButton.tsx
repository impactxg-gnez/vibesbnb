'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import ChatWindow from './ChatWindow';

interface PropertyChatButtonProps {
  propertyId: string;
  propertyName: string;
  checkIn?: string;
  checkOut?: string;
  selectedUnitIds?: string[];
}

export default function PropertyChatButton({
  propertyId,
  propertyName,
  checkIn,
  checkOut,
  selectedUnitIds,
}: PropertyChatButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationDetails, setConversationDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [booking, setBooking] = useState<any>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const openChat = async () => {
    if (!user) {
      toast.error('Please log in to message the host.');
      router.push('/login');
      return;
    }

    setIsOpen(true);
    if (conversationId || loading) return;

    setLoading(true);
    setDetailsError(null);
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start conversation');
      }
      setConversationId(data.conversation.id);
    } catch (error: any) {
      console.error('[PropertyChatButton] open error', error);
      toast.error(error.message || 'Unable to start chat');
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationDetails = async (id: string) => {
    try {
      setDetailsLoading(true);
      setDetailsError(null);
      const response = await fetch(`/api/chat/conversations?conversationId=${id}`);
      const data = await response.json();
      if (response.ok && data.conversations?.length) {
        setConversationDetails(data.conversations[0]);
      } else if (!response.ok) {
        setDetailsError(data?.error || 'Unable to load conversation');
      } else {
        setDetailsError('Unable to load conversation');
      }
    } catch (error) {
      console.error('Failed to load conversation details', error);
      setDetailsError('Unable to load conversation');
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (conversationId) {
      loadConversationDetails(conversationId);
    }
  }, [conversationId]);

  const bookingPath = useMemo(() => {
    const selected = selectedUnitIds && selectedUnitIds.length > 0 ? `&selectedUnits=${selectedUnitIds.join(',')}` : '';
    const dateParams = `${checkIn ? `&checkIn=${checkIn}` : ''}${checkOut ? `&checkOut=${checkOut}` : ''}`;
    return `/bookings/new?propertyId=${propertyId}${selected}${dateParams}`;
  }, [checkIn, checkOut, propertyId, selectedUnitIds]);

  const isViewerHost = conversationDetails?.host_id && user?.id ? conversationDetails.host_id === user.id : false;

  const sendBookingPrompt = async () => {
    if (!conversationId) return;
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Whenever you’re ready, tap “Request to book” in this chat to send your booking request.',
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send message');
      }
      toast.success('Sent booking prompt');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send prompt');
    }
  };

  useEffect(() => {
    const bookingId = conversationDetails?.booking_id;
    if (!bookingId || !isOpen) {
      setBooking(null);
      return;
    }
    let cancelled = false;
    setBookingLoading(true);
    const supabase = createClient();
    (async () => {
      try {
        const { data, error } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
        if (cancelled) return;
        if (error) throw error;
        setBooking(data);
      } catch {
        if (!cancelled) setBooking(null);
      } finally {
        if (!cancelled) setBookingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationDetails?.booking_id, isOpen]);

  const acceptBookingFromChat = async () => {
    if (!booking?.id) return;
    try {
      const response = await fetch('/api/bookings/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to accept booking');
      toast.success('Approved. Guest can pay now.');
      await loadConversationDetails(conversationId as string);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to approve');
    }
  };

  const rejectBookingFromChat = async () => {
    if (!booking?.id) return;
    const reason = window.prompt('Reason for declining?');
    if (!reason) return;
    try {
      const response = await fetch('/api/bookings/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to reject booking');
      toast.success('Declined. Guest has been notified.');
      await loadConversationDetails(conversationId as string);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to decline');
    }
  };

  return (
    <>
      <button
        onClick={openChat}
        className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition font-semibold text-lg flex items-center justify-center gap-2"
      >
        <MessageCircle size={20} />
        Message Host
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Chat about {propertyName}
                </h3>
                <p className="text-sm text-gray-400">
                  Ask the host anything before booking.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isViewerHost && (
                  <button
                    onClick={() => {
                      if (!user) {
                        router.push(`/login?next=${encodeURIComponent(bookingPath)}`);
                        return;
                      }
                      router.push(bookingPath);
                    }}
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-semibold"
                  >
                    Request to book
                  </button>
                )}
                {isViewerHost && (
                  <button
                    onClick={sendBookingPrompt}
                    className="px-3 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 text-sm font-semibold"
                    disabled={!conversationId}
                    title={!conversationId ? 'Open the conversation first' : undefined}
                  >
                    Send booking prompt
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 p-4">
              {conversationId && conversationDetails ? (
                <ChatWindow
                  conversationId={conversationId}
                  title={conversationDetails.properties?.name || 'Direct Messages'}
                  counterpartName={
                    conversationDetails.host_id === user?.id
                      ? conversationDetails.traveller_name || 'Guest'
                      : conversationDetails.host_name || 'Host'
                  }
                  counterpartAvatar={
                    conversationDetails.host_id === user?.id
                      ? conversationDetails.traveller_avatar
                      : conversationDetails.host_avatar
                  }
                  onMessagesRead={() => loadConversationDetails(conversationId)}
                />
              ) : (
                <div className="text-gray-400 h-full flex flex-col items-center justify-center gap-3">
                  {(loading || detailsLoading) && (
                    <>
                      <div className="h-8 w-8 rounded-full border-2 border-gray-600 border-t-emerald-500 animate-spin" />
                      <div>Loading conversation…</div>
                    </>
                  )}
                  {!loading && !detailsLoading && detailsError && (
                    <div className="text-center">
                      <div className="text-gray-300 font-semibold mb-1">Unable to load conversation</div>
                      <div className="text-gray-500 text-sm">{detailsError}</div>
                      <button
                        onClick={() => {
                          if (conversationId) loadConversationDetails(conversationId);
                          else openChat();
                        }}
                        className="mt-4 px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 text-sm font-semibold"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  {!loading && !detailsLoading && !detailsError && (
                    <div>Loading conversation…</div>
                  )}
                </div>
              )}
            </div>

            {conversationId && conversationDetails && (
              <div className="border-t border-gray-800 px-6 py-3 flex items-center justify-between gap-3">
                <div className="text-xs text-gray-500">
                  {bookingLoading
                    ? 'Checking booking status…'
                    : booking?.status
                      ? `Booking: ${String(booking.status).replaceAll('_', ' ')}`
                      : 'No booking request attached yet.'}
                </div>
                <div className="flex items-center gap-2">
                  {!isViewerHost && (
                    <button
                      onClick={() => router.push(bookingPath)}
                      className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-semibold"
                    >
                      Request to book
                    </button>
                  )}
                  {isViewerHost && booking?.status === 'pending_approval' && (
                    <>
                      <button
                        onClick={rejectBookingFromChat}
                        className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-semibold"
                      >
                        Decline
                      </button>
                      <button
                        onClick={acceptBookingFromChat}
                        className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-semibold"
                      >
                        Approve
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

