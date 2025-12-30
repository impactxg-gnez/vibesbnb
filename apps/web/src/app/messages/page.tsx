'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ChatWindow from '@/components/chat/ChatWindow';
import toast from 'react-hot-toast';

interface Conversation {
  id: string;
  property_id: string;
  host_id: string;
  traveller_id: string;
  booking_id?: string | null;
  last_message: string | null;
  last_message_at: string | null;
  host_name?: string | null;
  host_avatar?: string | null;
  traveller_name?: string | null;
  traveller_avatar?: string | null;
  host_unread_count?: number | null;
  traveller_unread_count?: number | null;
  properties?: {
    name?: string;
    location?: string;
    images?: string[];
  } | null;
}

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get('conversationId');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    null
  );
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  const loadConversations = async () => {
    if (!user) return;
    setLoadingList(true);
    try {
      const response = await fetch('/api/chat/conversations');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load conversations');
      }
      setConversations(data.conversations || []);
      if (preselectedId) {
        setSelectedConversation(preselectedId);
      } else if (!selectedConversation && data.conversations?.length) {
        setSelectedConversation(data.conversations[0].id);
      }
    } catch (error: any) {
      console.error('[MessagesPage] load error', error);
      toast.error(error.message || 'Failed to load conversations');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, preselectedId]);

  const selectedConversationObj = conversations.find(
    (conv) => conv.id === selectedConversation
  );

  const getViewerRole = (conversation: Conversation) => {
    if (!user) return 'viewer';
    return conversation.host_id === user.id ? 'host' : 'traveller';
  };

  const getCounterpartName = (conversation: Conversation) => {
    const role = getViewerRole(conversation);
    if (role === 'host') {
      return conversation.traveller_name || 'Guest';
    }
    return conversation.host_name || 'Host';
  };

  const getCounterpartAvatar = (conversation: Conversation) => {
    const role = getViewerRole(conversation);
    if (role === 'host') {
      return (
        conversation.traveller_avatar ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${conversation.traveller_name || 'Guest'}`
      );
    }
    return (
      conversation.host_avatar ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${conversation.host_name || 'Host'}`
    );
  };

  const getUnreadCount = (conversation: Conversation) => {
    const role = getViewerRole(conversation);
    if (role === 'host') {
      return conversation.host_unread_count || 0;
    }
    return conversation.traveller_unread_count || 0;
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-charcoal-950 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-4xl font-bold text-white mb-8">Messages</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-4 h-[70vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">Conversations</h2>
            {loadingList ? (
              <p className="text-mist-400 text-sm">Loading conversations...</p>
            ) : conversations.length === 0 ? (
              <p className="text-mist-500 text-sm">
                No conversations yet. Start by messaging a host from a property
                page.
              </p>
            ) : (
              <div className="space-y-3">
                {conversations.map((conversation) => {
                  const unreadCount = getUnreadCount(conversation);
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation.id)}
                      className={`w-full text-left p-3 rounded-lg transition ${
                        selectedConversation === conversation.id
                          ? 'bg-earth-600 text-white'
                          : 'bg-charcoal-800 text-gray-200 hover:bg-charcoal-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">
                            {conversation.properties?.name || 'Property'}
                          </p>
                          <p className="text-sm text-mist-300">
                            {getCounterpartName(conversation)}
                          </p>
                        </div>
                        {unreadCount > 0 && (
                          <span className="bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-mist-400">
                        {conversation.properties?.location || 'Location unavailable'}
                      </p>
                      {conversation.last_message && (
                        <p className="text-xs text-mist-400 mt-1 line-clamp-2">
                          {conversation.last_message}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="lg:col-span-2 h-[70vh]">
            {selectedConversationObj ? (
              <ChatWindow
                conversationId={selectedConversationObj.id}
                title={selectedConversationObj.properties?.name || 'Chat'}
                counterpartName={getCounterpartName(selectedConversationObj)}
                counterpartAvatar={getCounterpartAvatar(selectedConversationObj)}
                onMessagesRead={loadConversations}
              />
            ) : (
              <div className="h-full border border-charcoal-800 rounded-xl bg-charcoal-900 flex items-center justify-center text-mist-500">
                Select a conversation to start messaging.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

