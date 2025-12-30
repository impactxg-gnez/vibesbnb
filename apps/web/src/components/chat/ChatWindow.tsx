'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender_profile?: {
    name: string;
    avatar: string;
  } | null;
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
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/chat/conversations/${conversationId}/messages`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load messages');
      }
      setMessages(data.messages || []);
    } catch (error: any) {
      console.error('[ChatWindow] load error', error);
      toast.error(error.message || 'Failed to load messages');
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    const markRead = async () => {
      await fetch(`/api/chat/conversations/${conversationId}/read`, {
        method: 'POST',
      });
      onMessagesRead?.();
    };
    markRead();
  }, [conversationId, onMessagesRead]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const blockContactInfo = (text: string) => {
    const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
    const phoneRegex = /(\+?\d[\d\s().-]{7,})/;
    const urlRegex = /(https?:\/\/|www\.)/i;
    return (
      emailRegex.test(text) || phoneRegex.test(text) || urlRegex.test(text)
    );
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    if (blockContactInfo(input)) {
      toast.error(
        'Please keep communication on VibesBNB. Contact details are not allowed.'
      );
      return;
    }
    setSending(true);
    try {
      const response = await fetch(
        `/api/chat/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: input.trim() }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }
      setInput('');
      setMessages((prev) => [...prev, data.message]);
    } catch (error: any) {
      console.error('[ChatWindow] send error', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-charcoal-900 border border-charcoal-800 rounded-xl">
      <div className="px-4 py-3 border-b border-charcoal-800">
        <div className="flex items-center gap-3">
          {counterpartAvatar && (
            <img
              src={counterpartAvatar}
              alt={counterpartName || 'Participant'}
              className="w-10 h-10 rounded-full object-cover"
            />
          )}
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {counterpartName && (
              <p className="text-sm text-mist-400">{counterpartName}</p>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-mist-400 text-center">Loading messages...</div>
        ) : messages.length === 0 ? (
          <p className="text-mist-400 text-center text-sm">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${
                  isOwn ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl text-sm ${
                    isOwn
                      ? 'bg-earth-600 text-white rounded-br-none'
                      : 'bg-charcoal-800 text-mist-100 rounded-bl-none'
                  }`}
                >
                  {!isOwn && message.sender_profile && (
                    <p className="text-xs font-semibold text-gray-200 mb-1">
                      {message.sender_profile.name}
                    </p>
                  )}
                  <p className="whitespace-pre-line break-words">
                    {message.body}
                  </p>
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
      <div className="border-t border-charcoal-800 p-4">
        <textarea
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about availability, amenities, or anything else..."
          className="w-full px-4 py-3 bg-charcoal-800 border border-charcoal-700 rounded-lg focus:ring-2 focus:ring-earth-500 focus:border-transparent text-white placeholder-gray-500"
        />
        <div className="flex justify-end mt-3">
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="px-5 py-2 bg-earth-600 text-white rounded-lg hover:bg-earth-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
        <p className="text-xs text-mist-500 mt-2">
          For safety, please keep all communication on VibesBNB. Sharing phone
          numbers, emails, or external links is not permitted.
        </p>
      </div>
    </div>
  );
}

