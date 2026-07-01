'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ConversationBookingPanel } from '@/components/chat/ConversationBookingPanel';
import { MessageSquare, Search, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { getHeadersForAdminFetch } from '@/lib/supabase/adminSession';

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

interface Conversation {
  id: string;
  host_id: string;
  traveller_id: string;
  property_id?: string | null;
  booking_id?: string | null;
  host_name?: string | null;
  traveller_name?: string | null;
  host_avatar?: string | null;
  traveller_avatar?: string | null;
  last_message: string | null;
  last_message_at: string | null;
  messages: Message[];
  properties?: {
    name?: string;
    location?: string;
  } | null;
}

function getSenderLabel(
  msg: Message,
  conv: Conversation
): { name: string; role: 'host' | 'traveller' } {
  if (msg.sender_id === conv.host_id) {
    return { name: conv.host_name || 'Host', role: 'host' };
  }
  if (msg.sender_id === conv.traveller_id) {
    return { name: conv.traveller_name || 'Traveller', role: 'traveller' };
  }
  return { name: 'Unknown', role: 'traveller' };
}

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);

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
      loadConversations();
    }
  }, [user?.id]);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const headers = await getHeadersForAdminFetch();
      if (!headers.Authorization) {
        throw new Error('No valid session — please sign in again.');
      }

      const response = await fetch('/api/admin/conversations', {
        headers: { ...headers },
      });
      const data = await response.json();

      if (!response.ok) {
        console.error('[Admin Messages] API error:', data);
        throw new Error(data.error || 'Failed to load conversations');
      }

      const list: Conversation[] = data.conversations || [];
      setConversations(list);
      setSelectedConversation((prev) => {
        if (prev) {
          return list.find((c) => c.id === prev.id) ?? list[0] ?? null;
        }
        return list[0] ?? null;
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load conversations';
      console.error('[Admin Messages] Failed to load conversations', error);
      toast.error(message);
    } finally {
      setLoadingConversations(false);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    const hostName = conv.host_name?.toLowerCase() || '';
    const travellerName = conv.traveller_name?.toLowerCase() || '';
    const lastMessage = conv.last_message?.toLowerCase() || '';
    const propertyName = conv.properties?.name?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return (
      hostName.includes(query) ||
      travellerName.includes(query) ||
      lastMessage.includes(query) ||
      propertyName.includes(query)
    );
  });

  if (loading) {
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
      <div className="flex h-[calc(100vh-200px)]">
        <div className="w-1/3 border-r border-gray-200 bg-white rounded-l-lg shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900 mb-4">Messages</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="p-4 text-gray-500 text-sm">Loading conversations...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-gray-500 text-sm">
                {conversations.length === 0
                  ? 'No host–traveller conversations yet.'
                  : 'No conversations match your search.'}
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 text-left border-b border-gray-200 hover:bg-gray-50 transition ${
                    selectedConversation?.id === conv.id ? 'bg-purple-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-5 h-5 text-gray-400 shrink-0" />
                    <span className="font-semibold text-gray-900 truncate">
                      {conv.traveller_name || 'Traveller'} ↔ {conv.host_name || 'Host'}
                    </span>
                  </div>
                  {conv.properties?.name && (
                    <p className="text-xs text-purple-600 mb-1 truncate">{conv.properties.name}</p>
                  )}
                  <p className="text-sm text-gray-500 truncate">
                    {conv.last_message || 'No messages yet'}
                  </p>
                  {conv.last_message_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(conv.last_message_at).toLocaleString()}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-white rounded-r-lg shadow-sm min-w-0">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">
                  {selectedConversation.traveller_name || 'Traveller'} ↔{' '}
                  {selectedConversation.host_name || 'Host'}
                </h2>
                {selectedConversation.properties?.name && (
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedConversation.properties.name}
                    {selectedConversation.properties.location
                      ? ` · ${selectedConversation.properties.location}`
                      : ''}
                  </p>
                )}
              </div>
              <ConversationBookingPanel
                bookingId={selectedConversation.booking_id}
                propertyId={selectedConversation.property_id}
                travellerId={selectedConversation.traveller_id}
                isHost={false}
                isAdmin
                theme="light"
                onBookingUpdated={loadConversations}
              />
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {selectedConversation.messages.length === 0 ? (
                  <p className="text-gray-500">No messages in this conversation yet.</p>
                ) : (
                  selectedConversation.messages.map((msg) => {
                    const sender = getSenderLabel(msg, selectedConversation);
                    const isHost = sender.role === 'host';
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isHost ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            isHost
                              ? 'bg-purple-100 text-purple-900'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-xs font-medium mb-1 opacity-75">
                            {sender.name} ({isHost ? 'Host' : 'Traveller'})
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                          <p className="text-xs opacity-60 mt-1">
                            {new Date(msg.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {loadingConversations
                    ? 'Loading conversations...'
                    : 'Select a conversation to view messages'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
