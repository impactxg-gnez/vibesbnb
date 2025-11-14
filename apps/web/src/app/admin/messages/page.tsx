'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { MessageSquare, Send, Search, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  from_user_id: string;
  from_user_name: string;
  from_user_email: string;
  to_user_id: string;
  to_user_name: string;
  to_user_email: string;
  message: string;
  created_at: string;
  read: boolean;
}

interface Conversation {
  id: string;
  user1_id: string;
  user1_name: string;
  user1_email: string;
  user2_id: string;
  user2_name: string;
  user2_email: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  messages: Message[];
}

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
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
    // In a real app, you'd fetch from a messages table
    const mockConversations: Conversation[] = [
      {
        id: 'conv1',
        user1_id: 'user1',
        user1_name: 'John Traveller',
        user1_email: 'john@example.com',
        user2_id: 'host1',
        user2_name: 'Jane Host',
        user2_email: 'jane@example.com',
        last_message: 'Thanks for the quick response!',
        last_message_at: new Date().toISOString(),
        unread_count: 2,
        messages: [
          {
            id: 'msg1',
            from_user_id: 'user1',
            from_user_name: 'John Traveller',
            from_user_email: 'john@example.com',
            to_user_id: 'host1',
            to_user_name: 'Jane Host',
            to_user_email: 'jane@example.com',
            message: 'Hello, is the property available this weekend?',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            read: true,
          },
          {
            id: 'msg2',
            from_user_id: 'host1',
            from_user_name: 'Jane Host',
            from_user_email: 'jane@example.com',
            to_user_id: 'user1',
            to_user_name: 'John Traveller',
            to_user_email: 'john@example.com',
            message: 'Yes, it is available! Would you like to book?',
            created_at: new Date(Date.now() - 1800000).toISOString(),
            read: true,
          },
          {
            id: 'msg3',
            from_user_id: 'user1',
            from_user_name: 'John Traveller',
            from_user_email: 'john@example.com',
            to_user_id: 'host1',
            to_user_name: 'Jane Host',
            to_user_email: 'jane@example.com',
            message: 'Thanks for the quick response!',
            created_at: new Date().toISOString(),
            read: false,
          },
        ],
      },
    ];
    setConversations(mockConversations);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      from_user_id: user?.id || 'admin',
      from_user_name: 'Admin',
      from_user_email: 'admin@vibesbnb.com',
      to_user_id: selectedConversation.user1_id,
      to_user_name: selectedConversation.user1_name,
      to_user_email: selectedConversation.user1_email,
      message: newMessage,
      created_at: new Date().toISOString(),
      read: false,
    };

    setSelectedConversation({
      ...selectedConversation,
      messages: [...selectedConversation.messages, message],
      last_message: newMessage,
      last_message_at: new Date().toISOString(),
    });

    setNewMessage('');
    toast.success('Message sent');
  };

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.user1_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.user2_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        {/* Conversations List */}
        <div className="w-1/3 border-r border-gray-200 bg-white rounded-l-lg shadow-sm">
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
          <div className="overflow-y-auto">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full p-4 text-left border-b border-gray-200 hover:bg-gray-50 transition ${
                  selectedConversation?.id === conv.id ? 'bg-purple-50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="font-semibold text-gray-900">
                      {conv.user1_name} ↔ {conv.user2_name}
                    </span>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="bg-purple-600 text-white text-xs rounded-full px-2 py-1">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">{conv.last_message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(conv.last_message_at).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white rounded-r-lg shadow-sm">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">
                  {selectedConversation.user1_name} ↔ {selectedConversation.user2_name}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedConversation.user1_email} ↔ {selectedConversation.user2_email}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversation.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.from_user_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.from_user_id === user?.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm font-medium mb-1">
                        {msg.from_user_name === 'Admin' ? 'You' : msg.from_user_name}
                      </p>
                      <p className="text-sm">{msg.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.from_user_id === user?.id ? 'text-purple-200' : 'text-gray-500'
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

