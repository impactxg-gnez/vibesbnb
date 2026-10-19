'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, History, Plus, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { writeStaySearch } from '@/lib/staySearchParams';
import type { ConciergeChatMessage, ConciergeChatSummary, StayCard } from '@/lib/concierge/types';
import {
  getActiveLocalChatId,
  getLocalChat,
  listLocalChats,
  newLocalChatId,
  saveLocalChat,
  setActiveLocalChatId,
} from '@/lib/concierge/localChats';

const WELCOME: ConciergeChatMessage = {
  id: 'welcome',
  role: 'assistant',
  body: 'Hi, I am VibeBot. Tell me where you want to stay, your dates, how many people, and a nightly budget. I will send matching VibesBNB listing links — I only suggest live stays in our catalog.',
  createdAt: new Date(0).toISOString(),
};

function ListingCards({ listings }: { listings: StayCard[] }) {
  if (!listings.length) return null;
  return (
    <div className="mt-2 space-y-2">
      {listings.map((listing) => (
        <Link
          key={listing.id}
          href={listing.href}
          onClick={() => {
            const params = new URLSearchParams(listing.href.split('?')[1] || '');
            writeStaySearch({
              checkIn: params.get('checkIn') || undefined,
              checkOut: params.get('checkOut') || undefined,
              guests: params.get('guests') ? Number(params.get('guests')) : undefined,
            });
          }}
          className="flex gap-3 rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-light)] text-[var(--ink)] hover:border-emerald-600 transition no-underline"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.cover}
            alt=""
            className="w-20 h-20 object-cover shrink-0 bg-[var(--surface)]"
          />
          <div className="py-2 pr-3 min-w-0">
            <p className="text-sm font-semibold truncate text-[var(--ink)]">{listing.name}</p>
            <p className="text-xs truncate text-[var(--muted)]">{listing.location}</p>
            <p className="text-xs mt-0.5 text-[var(--primary)]">
              From ${listing.guestNightly}/night · sleeps {listing.guests}
            </p>
            {listing.matchNotes.length > 0 ? (
              <p className="text-[10px] mt-0.5 text-[var(--alert-warning-ink)]">{listing.matchNotes[0]}</p>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}

function withWelcome(messages: ConciergeChatMessage[]): ConciergeChatMessage[] {
  const rest = messages.filter((m) => m.id !== 'welcome');
  return rest.length ? rest : [WELCOME];
}

function formatChatWhen(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function VibeBotThread({
  onBack,
  embedded = false,
  prefill,
}: {
  onBack?: () => void;
  embedded?: boolean;
  prefill?: string;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ConciergeChatMessage[]>([WELCOME]);
  const [chats, setChats] = useState<ConciergeChatSummary[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState(prefill || '');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const authHeader = useCallback(async () => {
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${sessionData.session?.access_token || ''}` };
  }, []);

  const persistGuest = (id: string | null, nextMessages: ConciergeChatMessage[]) => {
    if (user) return;
    const stored = nextMessages.filter((m) => m.id !== 'welcome');
    if (!stored.length) return;
    const cid = id || newLocalChatId();
    const firstUser = stored.find((m) => m.role === 'user');
    const last = stored[stored.length - 1];
    saveLocalChat({
      id: cid,
      title: (firstUser?.body || 'New chat').slice(0, 80),
      lastMessage: last?.body || '',
      lastMessageAt: last?.createdAt || new Date().toISOString(),
      messages: stored,
    });
    setConversationId(cid);
    setChats(listLocalChats());
  };

  const loadChats = useCallback(async (): Promise<ConciergeChatSummary[]> => {
    if (!user) {
      const local = listLocalChats();
      setChats(local);
      return local;
    }
    const res = await fetch('/api/concierge/chats', {
      headers: await authHeader(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data.chats) ? (data.chats as ConciergeChatSummary[]) : [];
    setChats(list);
    return list;
  }, [user, authHeader]);

  const loadMessages = useCallback(
    async (id: string | null) => {
      if (!user) {
        if (!id) {
          setMessages([WELCOME]);
          return;
        }
        const chat = getLocalChat(id);
        setMessages(withWelcome(chat?.messages || []));
        return;
      }
      const qs = id ? `?conversationId=${encodeURIComponent(id)}` : '';
      const res = await fetch(`/api/concierge/messages${qs}`, {
        headers: await authHeader(),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages(data.messages);
        return;
      }
      setMessages([WELCOME]);
    },
    [user, authHeader]
  );

  const load = useCallback(async () => {
    const list = await loadChats();
    const preferred = user ? list[0]?.id || null : getActiveLocalChatId() || list[0]?.id || null;
    setConversationId(preferred);
    await loadMessages(preferred);
  }, [loadChats, loadMessages, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (showHistory) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, showHistory]);

  const startNewChat = () => {
    setConversationId(null);
    if (!user) setActiveLocalChatId(null);
    setMessages([WELCOME]);
    setShowHistory(false);
    setInput('');
  };

  const openChat = async (id: string) => {
    setConversationId(id);
    if (!user) setActiveLocalChatId(id);
    setShowHistory(false);
    await loadMessages(id);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const userMsg: ConciergeChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      body: text,
      createdAt: new Date().toISOString(),
    };
    const history = [...messages, userMsg];
    setMessages(history);
    persistGuest(conversationId, history);
    setSending(true);
    try {
      const res = await fetch('/api/concierge/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await authHeader()),
        },
        body: JSON.stringify({
          message: text,
          conversationId,
          history: history
            .filter((m) => m.id !== 'welcome')
            .map((m) => ({ role: m.role, body: m.body })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'VibeBot could not reply');
      const assistant = data.message as ConciergeChatMessage;
      const nextId =
        typeof data.conversationId === 'string' && data.conversationId
          ? data.conversationId
          : conversationId;
      if (nextId && nextId !== conversationId) setConversationId(nextId);
      setMessages((prev) => {
        const next = [...prev, assistant];
        persistGuest(nextId, next);
        return next;
      });
      void loadChats();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'VibeBot could not reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`flex flex-col min-h-0 h-full ${embedded ? '' : 'bg-gray-900'}`}>
      <div className={`shrink-0 px-3 py-2 lg:px-4 lg:py-3 border-b border-gray-800 flex items-center gap-2 ${embedded ? 'pr-12' : ''}`}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="lg:hidden p-1.5 -ml-1 rounded-lg text-gray-300 hover:bg-gray-800"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
        ) : null}
        <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm lg:text-base font-semibold text-white">VibeBot</p>
          <p className="text-xs text-gray-400 truncate">
            {showHistory ? 'Your chats' : 'Ask for dates, guests, and budget — get listing links'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowHistory((open) => !open);
            void loadChats();
          }}
          className={`p-2 rounded-lg ${showHistory ? 'bg-gray-800 text-emerald-400' : 'text-gray-300 hover:bg-gray-800'}`}
          aria-label="Past chats"
        >
          <History className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={startNewChat}
          className="p-2 rounded-lg text-gray-300 hover:bg-gray-800"
          aria-label="New chat"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {showHistory ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 lg:p-4 space-y-2">
          <button
            type="button"
            onClick={startNewChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-600/10 text-emerald-200 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            New chat
          </button>
          {chats.length === 0 ? (
            <p className="text-sm text-gray-500 px-1 pt-2">No earlier chats yet. Start one and it will show up here.</p>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.id}
                type="button"
                onClick={() => void openChat(chat.id)}
                className={`w-full text-left p-3 rounded-xl border transition ${
                  conversationId === chat.id
                    ? 'bg-emerald-600/15 border-emerald-500/40'
                    : 'bg-gray-800/70 border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white truncate">{chat.title}</p>
                  <p className="text-[10px] text-gray-500 shrink-0">{formatChatWhen(chat.lastMessageAt)}</p>
                </div>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{chat.lastMessage || 'Conversation started'}</p>
              </button>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 lg:p-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                    message.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-gray-800 text-gray-100 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.body}</p>
                  {message.listings ? <ListingCards listings={message.listings} /> : null}
                </div>
              </div>
            ))}
            {sending ? <p className="text-xs text-gray-500">VibeBot is thinking…</p> : null}
            <div ref={bottomRef} />
          </div>
          <div className="shrink-0 border-t border-gray-800 p-2 lg:p-3">
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="e.g. North Miami, 25th–28th, 4 guests, $250/night"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm resize-none"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={sending || !input.trim()}
                className="shrink-0 px-4 bg-emerald-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
