'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { MessageSquare, Search, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

interface Conversation {
  id: string;
  host_name?: string | null;
  traveller_name?: string | null;
  host_avatar?: string | null;
  traveller_avatar?: string | null;
  last_message: string | null;
  last_message_at: string | null;
  messages: Message[];
}

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && user.user_metadata?.role !== 'admin') {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/admin/conversations');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load conversations');
      }
      setConversations(data.conversations || []);
      if (data.conversations?.length) {
        setSelectedConversation(data.conversations[0]);
      }
    } catch (error: any) {
      console.error('Failed to load conversations', error);
      toast.error(error.message || 'Failed to load conversations');
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    const hostName = conv.host_name?.toLowerCase() || '';
    const travellerName = conv.traveller_name?.toLowerCase() || '';
    const lastMessage = conv.last_message?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return (
      hostName.includes(query) ||
      travellerName.includes(query) ||
      lastMessage.includes(query)
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

  if (!user || user.user_metadata?.role !== 'admin') {
    return null;
  }

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-200px)]">
        <div className="w-1/3 border-r border-gray-200 bg-white rounded-l-lg shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900 mb-4">Messages</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-mist-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="overflow-y-auto">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full p-4 text-left border-b border-gray-200 hover:bg-gray-50 transition ${
                  selectedConversation?.id === conv.id ? 'bg-purple-50' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-5 h-5 text-mist-400" />
                  <span className="font-semibold text-gray-900">
                    {conv.traveller_name || 'Traveller'} ↔ {conv.host_name || 'Host'}
                  </span>
                </div>
                <p className="text-sm text-mist-500 truncate">
                  {conv.last_message || 'No messages yet'}
                </p>
                {conv.last_message_at && (
                  <p className="text-xs text-mist-400 mt-1">
                    {new Date(conv.last_message_at).toLocaleString()}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-white rounded-r-lg shadow-sm">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">
                  {selectedConversation.traveller_name || 'Traveller'} ↔{' '}
                  {selectedConversation.host_name || 'Host'}
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversation.messages.length === 0 ? (
                  <p className="text-mist-500">No messages yet.</p>
                ) : (
                  selectedConversation.messages.map((msg) => (
                    <div key={msg.id} className="flex justify-start">
                      <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100 text-gray-900">
                        <p className="text-sm">{msg.body}</p>
                        <p className="text-xs text-mist-500 mt-1">
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-mist-400 mx-auto mb-4" />
                <p className="text-mist-500">Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

