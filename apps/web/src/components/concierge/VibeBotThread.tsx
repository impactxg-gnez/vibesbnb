'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { writeStaySearch } from '@/lib/staySearchParams';
import type { ConciergeChatMessage, StayCard } from '@/lib/concierge/types';

const WELCOME: ConciergeChatMessage = {
  id: 'welcome',
  role: 'assistant',
  body: 'Hi, I am VibeBot. Tell me where you want to stay, your dates, how many people, and a nightly budget. I will send matching VibesBNB listing links — I only suggest live stays in our catalog.',
  createdAt: new Date(0).toISOString(),
};

const LOCAL_KEY = 'vibebot-messages';

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
          className="flex gap-3 rounded-xl overflow-hidden border border-emerald-500/30 bg-gray-950/80 hover:border-emerald-400 transition"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={listing.cover} alt="" className="w-20 h-20 object-cover shrink-0 bg-gray-800" />
          <div className="py-2 pr-3 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{listing.name}</p>
            <p className="text-xs text-gray-400 truncate">{listing.location}</p>
            <p className="text-xs text-emerald-300 mt-0.5">
              From ${listing.guestNightly}/night · sleeps {listing.guests}
            </p>
            {listing.matchNotes.length > 0 ? (
              <p className="text-[10px] text-amber-200/80 mt-0.5">{listing.matchNotes[0]}</p>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
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
  const [input, setInput] = useState(prefill || '');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const persistLocal = (next: ConciergeChatMessage[]) => {
    try {
      sessionStorage.setItem(LOCAL_KEY, JSON.stringify(next.filter((m) => m.id !== 'welcome')));
    } catch {
      /* ignore */
    }
  };

  const load = useCallback(async () => {
    if (user) {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch('/api/concierge/messages', {
        headers: { Authorization: `Bearer ${sessionData.session?.access_token || ''}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages(data.messages);
        return;
      }
    }
    try {
      const raw = sessionStorage.getItem(LOCAL_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ConciergeChatMessage[];
      if (Array.isArray(parsed) && parsed.length) {
        setMessages([WELCOME, ...parsed.filter((m) => m.id !== 'welcome')]);
      }
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

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
    persistLocal(history);
    setSending(true);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch('/api/concierge/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token || ''}`,
        },
        body: JSON.stringify({
          message: text,
          history: history
            .filter((m) => m.id !== 'welcome')
            .map((m) => ({ role: m.role, body: m.body })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'VibeBot could not reply');
      const assistant = data.message as ConciergeChatMessage;
      setMessages((prev) => {
        const next = [...prev, assistant];
        persistLocal(next);
        return next;
      });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'VibeBot could not reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`flex flex-col min-h-0 h-full ${embedded ? '' : 'bg-gray-900'}`}>
      <div className="shrink-0 px-3 py-2 lg:px-4 lg:py-3 border-b border-gray-800 flex items-center gap-2">
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
        <div className="min-w-0">
          <p className="text-sm lg:text-base font-semibold text-white">VibeBot</p>
          <p className="text-xs text-gray-400 truncate">Ask for dates, guests, and budget — get listing links</p>
        </div>
      </div>
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
        {sending ? <p className="text-xs text-gray-500">VibeBot is looking through live listings…</p> : null}
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
    </div>
  );
}
