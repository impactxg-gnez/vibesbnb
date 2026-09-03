'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import {
  containsContactInfo,
  getContactBlockUserMessage,
} from '@/lib/utils/contactFilter';
import toast from 'react-hot-toast';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';

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
  onMessagesRead?: () => void;
}

export default function ChatWindow({
  conversationId,
  title = 'Conversation',
  counterpartName,
  counterpartAvatar,
  onMessagesRead,
}: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [contactSharingAllowed, setContactSharingAllowed] = useState(false);
  const [blockBanner, setBlockBanner] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const onMessagesReadRef = useRef(onMessagesRead);
  const hasMarkedRead = useRef(false);
  const isLoadingRef = useRef(false);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    onMessagesReadRef.current = onMessagesRead;
  }, [onMessagesRead]);

  useEffect(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
  }, []);

  const loadMessages = useCallback(
    async (showLoading = true) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      if (showLoading) setLoading(true);
      try {
        const supabase = supabaseRef.current || createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const response = await fetch(
          `/api/chat/conversations/${conversationId}/messages`,
          {
            headers: {
              Authorization: `Bearer ${session?.access_token || ''}`,
            },
          }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load messages');
        }
        setContactSharingAllowed(Boolean(data.contactSharingAllowed));
        setMessages((prev) => {
          const serverMessages = data.messages || [];
          // Keep in-thread policy notices only on soft refresh; reset on full reload
          if (showLoading) return serverMessages;
          const notices = prev.filter((m) => m.isPolicyNotice);
          return [...serverMessages, ...notices];
        });
        if (showLoading) setBlockBanner(null);
      } catch (error: any) {
        console.error('[ChatWindow] load error', error);
        if (showLoading) {
          toast.error(error.message || 'Failed to load messages');
        }
      } finally {
        isLoadingRef.current = false;
        if (showLoading) setLoading(false);
        scrollToBottom();
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
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMessage.id)) {
                return prev;
              }
              return [...prev, newMessage];
            });
            scrollToBottom();
          }
        )
        .subscribe();

      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', onVis);
    };

    setup();

    return () => {
      isMounted = false;
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
      setMessages((prev) => [...prev, data.message]);
      scrollToBottom();
    } catch (error: any) {
      console.error('[ChatWindow] send error', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-800 rounded-xl">
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          {counterpartAvatar && (
            <img
              src={counterpartAvatar}
              alt={counterpartName || 'Participant'}
              className="w-10 h-10 rounded-full object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-white truncate">{title}</h3>
            {counterpartName && (
              <p className="text-sm text-gray-400 truncate">{counterpartName}</p>
            )}
          </div>
          {contactSharingAllowed ? (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-full">
              <ShieldCheck className="w-3 h-3" />
              Contact OK
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl text-sm ${
                    isOwn
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-gray-800 text-gray-100 rounded-bl-none'
                  }`}
                >
                  {!isOwn && message.sender_profile && (
                    <p className="text-xs font-semibold text-gray-200 mb-1">
                      {message.sender_profile.name}
                    </p>
                  )}
                  <p className="whitespace-pre-line break-words">{message.body}</p>
                  <span className="block mt-1 text-xs text-gray-200/70">
                    {new Date(message.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-gray-800 p-4">
        {blockBanner && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
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
        <textarea
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            contactSharingAllowed
              ? 'Message your host or guest…'
              : 'Ask about availability, amenities, or anything else…'
          }
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-gray-500"
        />
        <div className="flex justify-end mt-3">
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {contactSharingAllowed
            ? 'Booking confirmed — you can share contact details if needed. We still recommend keeping coordination in VibesBNB chat.'
            : 'Before a booking is confirmed, phone numbers, emails, links, map pins, and social handles in a message are blocked. Only that message is stopped — your chat stays open.'}
        </p>
      </div>
    </div>
  );
}
