'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import {
  containsContactInfo,
  getContactBlockUserMessage,
} from '@/lib/utils/contactFilter';
import toast from 'react-hot-toast';
import { AlertTriangle, ArrowLeft, Calendar, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react';
import { deleteOwnMessage } from '@/lib/chat/inboxActions';
import { requestUnreadMessagesRefresh } from '@/lib/chat/unreadMessageCount';
import { formatCalendarDate } from '@/lib/dateUtils';
import { parseSpecialOffer, type SpecialOfferContext } from '@/lib/specialOffer';
import { SpecialOfferCard } from '@/components/chat/SpecialOfferCard';
import { SpecialOfferComposer } from '@/components/chat/SpecialOfferComposer';

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender_profile?: {
    name: string;
    avatar: string;
  } | null;
  /** Local-only policy notice (not stored / not delivered to the other party) */
  isPolicyNotice?: boolean;
  policyReason?: string;
}

interface ChatWindowProps {
  conversationId: string;
  title?: string;
  counterpartName?: string;
  counterpartAvatar?: string;
  /** Traveller-selected stay dates (shown to host + guest in the chat header). */
  inquiryCheckIn?: string | null;
  inquiryCheckOut?: string | null;
  onMessagesRead?: () => void;
  /** Phone: return to the conversation list. Hidden from lg and up. */
  onBack?: () => void;
}

function mergeThreadMessages(serverMessages: Message[], prev: Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const message of serverMessages) {
    if (message?.id) byId.set(message.id, message);
  }
  const now = Date.now();
  for (const message of prev) {
    if (!message?.id || byId.has(message.id)) continue;
    if (message.isPolicyNotice) {
      byId.set(message.id, message);
      continue;
    }
    const created = Date.parse(message.created_at);
    // Keep a just-sent bubble if a stale GET raced ahead of the insert.
    if (Number.isFinite(created) && now - created < 120_000) {
      byId.set(message.id, message);
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)
  );
}

function upsertMessage(prev: Message[], incoming: Message | null | undefined): Message[] {
  if (!incoming?.id) return prev;
  if (prev.some((message) => message.id === incoming.id)) return prev;
  return mergeThreadMessages(prev, [incoming]);
}

function formatInquiryStay(checkIn?: string | null, checkOut?: string | null): string | null {
  if (!checkIn || !checkOut) return null;
  const inLabel = formatCalendarDate(checkIn, { month: 'short', day: 'numeric', year: 'numeric' });
  const outLabel = formatCalendarDate(checkOut, { month: 'short', day: 'numeric', year: 'numeric' });
  if (!inLabel || !outLabel) return `${String(checkIn).slice(0, 10)} → ${String(checkOut).slice(0, 10)}`;
  return `${inLabel} → ${outLabel}`;
}

export default function ChatWindow({
  conversationId,
  title = 'Conversation',
  counterpartName,
  counterpartAvatar,
  inquiryCheckIn,
  inquiryCheckOut,
  onMessagesRead,
  onBack,
}: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [contactSharingAllowed, setContactSharingAllowed] = useState(false);
  const [viewerIsHost, setViewerIsHost] = useState(false);
  const [offerContext, setOfferContext] = useState<SpecialOfferContext | null>(null);
  const [offerComposerOpen, setOfferComposerOpen] = useState(false);
  const [sendingOffer, setSendingOffer] = useState(false);
  const [blockBanner, setBlockBanner] = useState<string | null>(null);
  const [chatPropertyId, setChatPropertyId] = useState<string | null>(null);
  const [chatBookingId, setChatBookingId] = useState<string | null>(null);
  const [chatBookingStatus, setChatBookingStatus] = useState<string | null>(null);
  const [chatPaymentStatus, setChatPaymentStatus] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const onMessagesReadRef = useRef(onMessagesRead);
  const hasMarkedRead = useRef(false);
  const loadAbortRef = useRef<AbortController | null>(null);
  const loadForConversationRef = useRef(conversationId);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const inquiryStayLabel = formatInquiryStay(inquiryCheckIn, inquiryCheckOut);

  useEffect(() => {
    onMessagesReadRef.current = onMessagesRead;
  }, [onMessagesRead]);

  useEffect(() => {
    setOfferComposerOpen(false);
    setViewerIsHost(false);
    setOfferContext(null);
    setChatPropertyId(null);
    setChatBookingId(null);
    setChatBookingStatus(null);
    setChatPaymentStatus(null);
    setMessages([]);
    setInput('');
    setBlockBanner(null);
    setLoading(true);
  }, [conversationId]);

  useEffect(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
  }, []);

  const loadMessages = useCallback(
    async (showLoading = true) => {
      loadAbortRef.current?.abort();
      const abort = new AbortController();
      loadAbortRef.current = abort;
      const requestedId = conversationId;
      loadForConversationRef.current = requestedId;

      if (showLoading) setLoading(true);
      try {
        const supabase = supabaseRef.current || createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const response = await fetch(
          `/api/chat/conversations/${requestedId}/messages`,
          {
            cache: 'no-store',
            headers: {
              Authorization: `Bearer ${session?.access_token || ''}`,
              'Cache-Control': 'no-cache',
            },
            signal: abort.signal,
          }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load messages');
        }
        if (abort.signal.aborted || loadForConversationRef.current !== requestedId) {
          return;
        }
        setContactSharingAllowed(Boolean(data.contactSharingAllowed));
        setViewerIsHost(Boolean(data.viewerIsHost));
        setOfferContext(data.specialOfferContext || null);
        setChatPropertyId(data.propertyId || null);
        setChatBookingId(data.bookingId || null);
        setChatBookingStatus(data.bookingStatus || null);
        setChatPaymentStatus(data.paymentStatus || null);
        setMessages((prev) => mergeThreadMessages(data.messages || [], prev));
        if (showLoading) setBlockBanner(null);
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        console.error('[ChatWindow] load error', error);
        if (showLoading) {
          toast.error(error.message || 'Failed to load messages');
        }
      } finally {
        if (!abort.signal.aborted && loadForConversationRef.current === requestedId) {
          if (showLoading) setLoading(false);
          scrollToBottom();
        }
      }
    },
    [conversationId]
  );

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null =
      null;

    const onFocus = () => {
      if (isMounted) void loadMessages(false);
    };

    const onVis = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        void loadMessages(false);
      }
    };

    const setup = async () => {
      if (!isMounted) return;

      await loadMessages(true);
      hasMarkedRead.current = false;

      const supabase = supabaseRef.current || createClient();
      channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            if (!isMounted) return;
            const newMessage = payload.new as Message;
            setMessages((prev) => upsertMessage(prev, newMessage));
            scrollToBottom();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            if (!isMounted) return;
            const removedId = (payload.old as { id?: string } | null)?.id;
            if (!removedId) {
              void loadMessages(false);
              return;
            }
            setMessages((prev) => prev.filter((message) => message.id !== removedId));
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED' && isMounted) {
            void loadMessages(false);
          }
        });

      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', onVis);
    };

    setup();

    return () => {
      isMounted = false;
      loadAbortRef.current?.abort();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
      if (channel) {
        const supabase = supabaseRef.current;
        if (supabase) supabase.removeChannel(channel);
      }
    };
  }, [conversationId, loadMessages]);

  useEffect(() => {
    if (hasMarkedRead.current) return;

    const markRead = async () => {
      try {
        const supabase = supabaseRef.current || createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        await fetch(`/api/chat/conversations/${conversationId}/read`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
        });
        hasMarkedRead.current = true;
        onMessagesReadRef.current?.();
        requestUnreadMessagesRefresh();
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    };

    const timeout = setTimeout(markRead, 1000);
    return () => clearTimeout(timeout);
  }, [conversationId]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const showMessageBlocked = (reason?: string | null, serverMessage?: string) => {
    const notice = getContactBlockUserMessage(reason, serverMessage);
    setBlockBanner(notice);
    setMessages((prev) => [
      ...prev,
      {
        id: `policy-${Date.now()}`,
        sender_id: user?.id || 'system',
        body: notice,
        created_at: new Date().toISOString(),
        isPolicyNotice: true,
        policyReason: reason || undefined,
      },
    ]);
    toast.error('Message blocked — chat is still open. See why below.', {
      duration: 4000,
    });
    scrollToBottom();
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message? It will be removed from the conversation for both of you.')) {
      return;
    }
    setDeletingMessageId(messageId);
    try {
      await deleteOwnMessage(conversationId, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      onMessagesReadRef.current?.();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not delete message');
    } finally {
      setDeletingMessageId(null);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // Client-side pre-check (server still enforces). Only this message is blocked.
    if (!contactSharingAllowed) {
      const contactCheck = containsContactInfo(input);
      if (contactCheck.blocked) {
        showMessageBlocked(contactCheck.reason);
        return;
      }
    }

    setSending(true);
    setBlockBanner(null);
    try {
      const supabase = supabaseRef.current || createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `/api/chat/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({ message: input.trim() }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        if (data.code === 'CONTACT_INFO_BLOCKED' || data.conversationBlocked === false) {
          showMessageBlocked(data.reason, data.error);
          return;
        }
        throw new Error(data.error || 'Failed to send message');
      }
      if (typeof data.contactSharingAllowed === 'boolean') {
        setContactSharingAllowed(data.contactSharingAllowed);
      }
      setInput('');
      setMessages((prev) => upsertMessage(prev, data.message));
      scrollToBottom();
    } catch (error: any) {
      console.error('[ChatWindow] send error', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSendOffer = async (offerNightly: number, _discountPercent: number) => {
    setSendingOffer(true);
    try {
      const supabase = supabaseRef.current || createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch(
        `/api/chat/conversations/${conversationId}/special-offer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({ offerNightly }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send special offer');
      if (data.message) {
        setMessages((prev) => upsertMessage(prev, data.message));
      }
      setOfferComposerOpen(false);
      toast.success('Special offer sent');
      scrollToBottom();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to send special offer');
    } finally {
      setSendingOffer(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-900 border-0 rounded-none lg:border lg:border-gray-800 lg:rounded-xl">
      <div className="shrink-0 px-3 py-2 lg:px-4 lg:py-3 border-b border-gray-800">
        <div className="flex items-center gap-2 lg:gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="lg:hidden shrink-0 p-1.5 -ml-1 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white"
              aria-label="Back to conversations"
            >
              <ArrowLeft size={20} />
            </button>
          ) : null}
          {counterpartAvatar && (
            <img
              src={counterpartAvatar}
              alt={counterpartName || 'Participant'}
              className="w-8 h-8 lg:w-10 lg:h-10 rounded-full object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm lg:text-lg font-semibold text-white truncate">{title}</h3>
            {counterpartName && (
              <p className="text-xs lg:text-sm text-gray-400 truncate">{counterpartName}</p>
            )}
          </div>
          {contactSharingAllowed ? (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-full">
              <ShieldCheck className="w-3 h-3" />
              <span className="hidden sm:inline">Contact OK</span>
            </span>
          ) : null}
        </div>
        {inquiryStayLabel ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 truncate">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span className="font-semibold">{inquiryStayLabel}</span>
          </p>
        ) : null}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 lg:p-4 space-y-3 lg:space-y-4" data-chat-scroll>
        {loading ? (
          <div className="text-gray-400 text-center">Loading messages...</div>
        ) : messages.length === 0 ? (
          <p className="text-gray-400 text-center text-sm">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((message) => {
            if (message.isPolicyNotice) {
              return (
                <div key={message.id} className="flex justify-center px-2">
                  <div className="max-w-md w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                      <div>
                        <p className="font-semibold text-amber-200 mb-1">
                          Message not delivered
                        </p>
                        <p className="text-amber-100/90 whitespace-pre-line">
                          {message.body}
                        </p>
                        <p className="mt-2 text-xs text-amber-200/70">
                          Your chat is still open. Remove phone numbers, emails,
                          links, or social handles and send again.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const isOwn = message.sender_id === user?.id;
            const offer = parseSpecialOffer(message.body);
            return (
              <div
                key={message.id}
                className={`group flex items-end gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <button
                  type="button"
                  onClick={() => void handleDeleteMessage(message.id)}
                  disabled={deletingMessageId === message.id}
                  className={`opacity-70 lg:opacity-0 lg:group-hover:opacity-100 p-1.5 rounded-full text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-40 ${
                    isOwn ? '' : 'order-last'
                  }`}
                  aria-label="Delete message"
                  title="Delete message"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div
                  className={
                    offer
                      ? 'max-w-xs md:max-w-md'
                      : `max-w-xs md:max-w-md px-4 py-2 rounded-2xl text-sm ${
                          isOwn
                            ? 'bg-emerald-600 text-white rounded-br-none'
                            : 'bg-gray-800 text-gray-100 rounded-bl-none'
                        }`
                  }
                >
                  {offer ? (
                    <>
                      <SpecialOfferCard
                        offer={offer}
                        isHostViewer={viewerIsHost}
                        propertyId={chatPropertyId}
                        conversationId={conversationId}
                        bookingId={chatBookingId}
                        bookingStatus={chatBookingStatus}
                        paymentStatus={chatPaymentStatus}
                      />
                      <span className="block mt-1 text-[10px] lg:text-xs text-gray-400 text-right">
                        {new Date(message.created_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </>
                  ) : (
                    <>
                      {!isOwn && message.sender_profile && (
                        <p className="text-xs font-semibold text-gray-200 mb-1">
                          {message.sender_profile.name}
                        </p>
                      )}
                      <p className="whitespace-pre-line break-words">{message.body}</p>
                      <span className="block mt-1 text-[10px] lg:text-xs text-gray-200/70">
                        {new Date(message.created_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="shrink-0 border-t border-gray-800 p-2 lg:p-4">
        {blockBanner && (
          <div className="mb-2 lg:mb-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <p className="flex-1">{blockBanner}</p>
            <button
              type="button"
              onClick={() => setBlockBanner(null)}
              className="text-amber-200/80 hover:text-white"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {offerComposerOpen && viewerIsHost && offerContext ? (
          <SpecialOfferComposer
            context={offerContext}
            sending={sendingOffer}
            onCancel={() => setOfferComposerOpen(false)}
            onSend={handleSendOffer}
          />
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={input}
            enterKeyHint="send"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={
              contactSharingAllowed
                ? 'Message your host or guest…'
                : 'Ask about availability, amenities, or anything else…'
            }
            className="flex-1 min-h-[44px] max-h-24 lg:max-h-none px-3 py-2.5 lg:px-4 lg:py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-gray-500 resize-none lg:min-h-[5.5rem]"
          />
          {viewerIsHost && offerContext && !offerComposerOpen ? (
            <button
              type="button"
              onClick={() => setOfferComposerOpen(true)}
              className="shrink-0 h-11 px-3 lg:h-auto lg:px-3 lg:py-2 rounded-lg border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 text-sm font-semibold inline-flex items-center gap-1.5"
              title="Send a special offer"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Offer</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="shrink-0 h-11 px-4 lg:h-auto lg:px-5 lg:py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        <p className="hidden lg:block text-xs text-gray-500 mt-2">
          {contactSharingAllowed
            ? 'Booking confirmed — you can share contact details if needed. We still recommend keeping coordination in VibesBNB chat.'
            : 'Before a booking is confirmed, phone numbers, emails, links, map pins, and social handles in a message are blocked. Only that message is stopped — your chat stays open.'}
        </p>
        <p className="lg:hidden text-[10px] text-gray-500 mt-1">
          {contactSharingAllowed
            ? 'You can share contact details in this chat.'
            : 'Phone numbers and emails are blocked until a booking is confirmed.'}
        </p>
      </div>
    </div>
  );
}
