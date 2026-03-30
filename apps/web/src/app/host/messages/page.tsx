'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ChatWindow from '@/components/chat/ChatWindow';
import toast from 'react-hot-toast';
import { MessageSquare, Calendar, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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

export default function HostMessagesPage() {
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
      // Fetch only where user is host
      const response = await fetch('/api/chat/conversations');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load conversations');
      }
      
      // Filter for host conversations specifically if needed, 
      // but usually the main API covers both. This page is for the host panel.
      const hostConvs = (data.conversations || []).filter(
        (c: Conversation) => c.host_id === user.id
      );
      
      setConversations(hostConvs);
      
      if (preselectedId) {
        setSelectedConversation(preselectedId);
      } else if (!selectedConversation && hostConvs.length > 0) {
        setSelectedConversation(hostConvs[0].id);
      }
    } catch (error: any) {
      console.error('[HostMessagesPage] load error', error);
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
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/host/properties" 
            className="p-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:text-white transition"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">Host Messages</h1>
            <p className="text-gray-400">Communication with your guests</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[75vh]">
          {/* Conversation List */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <MessageSquare size={18} className="text-emerald-500" />
                Conversations
              </h2>
              {conversations.length > 0 && (
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">
                  {conversations.length} total
                </span>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingList ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                  <p className="text-gray-500 text-sm">Loading chats...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12">
                   <MessageSquare size={48} className="mx-auto text-gray-800 mb-4" />
                   <p className="text-gray-500 text-sm">No messages yet.</p>
                   <p className="text-gray-600 text-xs mt-1 px-4">Messages from guests will appear here.</p>
                </div>
              ) : (
                conversations.map((conversation) => {
                  const unreadCount = getUnreadCount(conversation);
                  const isSelected = selectedConversation === conversation.id;
                  
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation.id)}
                      className={`w-full text-left p-4 rounded-xl transition-all duration-200 border ${
                        isSelected
                          ? 'bg-emerald-600/10 border-emerald-500/50 shadow-lg shadow-emerald-900/20'
                          : 'bg-gray-800/50 border-transparent hover:bg-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <img 
                             src={getCounterpartAvatar(conversation)} 
                             alt={getCounterpartName(conversation)} 
                             className="w-12 h-12 rounded-full object-cover border border-gray-700"
                          />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-emerald-500 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-gray-900">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className={`font-semibold truncate ${isSelected ? 'text-emerald-400' : 'text-white'}`}>
                              {getCounterpartName(conversation)}
                            </h3>
                            <span className="text-[10px] text-gray-500 whitespace-nowrap pt-1">
                               {conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleDateString() : ''}
                            </span>
                          </div>
                          
                          <p className="text-xs text-gray-400 truncate mb-1 flex items-center gap-1">
                            <Home size={10} className="shrink-0" />
                            {conversation.properties?.name || 'Property'}
                          </p>
                          
                          {conversation.last_message && (
                            <p className="text-xs text-gray-500 line-clamp-1 italic">
                              "{conversation.last_message}"
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className="lg:col-span-2 h-full bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
            {selectedConversationObj ? (
              <ChatWindow
                conversationId={selectedConversationObj.id}
                title={selectedConversationObj.properties?.name || 'Chat'}
                counterpartName={getCounterpartName(selectedConversationObj)}
                counterpartAvatar={getCounterpartAvatar(selectedConversationObj)}
                onMessagesRead={loadConversations}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-900/50">
                <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                  <MessageSquare size={32} className="text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Your Inbox</h3>
                <p className="text-gray-500 max-w-xs">
                  Select a guest conversation from the list to start messaging. 
                  Keep all communication on VibesBNB to stay protected.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
