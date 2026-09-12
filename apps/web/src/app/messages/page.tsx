'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import ChatWindow from '@/components/chat/ChatWindow';
import { ConversationBookingPanel } from '@/components/chat/ConversationBookingPanel';
import toast from 'react-hot-toast';

interface Conversation {
  id: string;
  property_id: string;
  host_id: string;
  traveller_id: string;
  booking_id?: string | null;
  last_message: string | null;
  last_message_at: string | null;
  inquiry_check_in?: string | null;
  inquiry_check_out?: string | null;
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
  const justSubmitted = searchParams.get('submitted') === '1';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    null
  );
  const [loadingList, setLoadingList] = useState(true);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  const loadConversations = useCallback(async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoadingList(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/chat/conversations', {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load conversations');
      }
      setConversations(data.conversations || []);
      
      // Only auto-select on initial load
      if (!initialLoadDone.current) {
        const desktop =
          typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
        if (preselectedId) {
          setSelectedConversation(preselectedId);
        } else if (desktop && data.conversations?.length) {
          setSelectedConversation(data.conversations[0].id);
        }
        initialLoadDone.current = true;
      }
    } catch (error: any) {
      console.error('[MessagesPage] load error', error);
      if (showLoading) {
        toast.error(error.message || 'Failed to load conversations');
      }
    } finally {
      if (showLoading) setLoadingList(false);
    }
  }, [user, preselectedId]);

  // Initial load + infrequent refresh while visible (conversation list is not on Realtime by default)
  useEffect(() => {
    if (!user) return;

    void loadConversations(true);

    const intervalMs = 120000;
    let interval: ReturnType<typeof setInterval> | null = null;

    const arm = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          void loadConversations(false);
        }
      }, intervalMs);
    };

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        void loadConversations(false);
        arm();
      }
    };

    arm();
    document.addEventListener('visibilitychange', onVis);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user, loadConversations]);

  // Memoized callback for ChatWindow
  const handleMessagesRead = useCallback(() => {
    loadConversations(false);
  }, [loadConversations]);

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

  const threadOpen = Boolean(selectedConversation);

  return (
    <div className="bg-gray-950 max-lg:h-full max-lg:min-h-0 lg:min-h-screen lg:py-8">
      <div className="h-full lg:container lg:mx-auto lg:px-4 lg:max-w-6xl flex flex-col">
        <h1 className={`text-2xl lg:text-4xl font-bold text-white max-lg:px-4 max-lg:pt-3 ${threadOpen ? 'hidden lg:block lg:mb-8' : 'mb-3 lg:mb-8'}`}>
          Messages
        </h1>
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 lg:gap-6 max-lg:h-full">
          <div
            className={`${
              threadOpen ? 'hidden lg:block' : 'block'
            } bg-gray-900 border border-gray-800 max-lg:border-x-0 max-lg:rounded-none rounded-xl p-4 h-full overflow-y-auto custom-scrollbar`}
          >
            <h2 className="text-lg font-semibold text-white mb-4">Conversations</h2>
            {loadingList ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-gray-800 rounded-lg p-4 h-20" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-gray-500 text-sm">
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
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">
                            {conversation.properties?.name || 'Property'}
                          </p>
                          <p className="text-sm text-gray-300">
                            {getCounterpartName(conversation)}
                          </p>
                        </div>
                        {unreadCount > 0 && (
                          <span className="bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {conversation.properties?.location || 'Location unavailable'}
                      </p>
                      {conversation.last_message && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {conversation.last_message}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div
            className={`${
              threadOpen ? 'flex' : 'hidden lg:flex'
            } lg:col-span-2 h-full flex-col min-h-0 border border-gray-800 max-lg:border-x-0 max-lg:rounded-none rounded-xl bg-gray-900 overflow-hidden`}
          >
            {selectedConversationObj ? (
              <>
                <ConversationBookingPanel
                  bookingId={selectedConversationObj.booking_id}
                  isHost={getViewerRole(selectedConversationObj) === 'host'}
                  showSubmittedBanner={justSubmitted}
                  propertyId={selectedConversationObj.property_id}
                  travellerId={selectedConversationObj.traveller_id}
                  onBookingUpdated={() => loadConversations(false)}
                />
                <div className="flex-1 min-h-0">
                  <ChatWindow
                    conversationId={selectedConversationObj.id}
                    title={selectedConversationObj.properties?.name || 'Chat'}
                    counterpartName={getCounterpartName(selectedConversationObj)}
                    counterpartAvatar={getCounterpartAvatar(selectedConversationObj)}
                    inquiryCheckIn={selectedConversationObj.inquiry_check_in}
                    inquiryCheckOut={selectedConversationObj.inquiry_check_out}
                    onMessagesRead={handleMessagesRead}
                    onBack={() => setSelectedConversation(null)}
                  />
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Select a conversation to start messaging.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

