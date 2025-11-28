'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import ChatWindow from './ChatWindow';

interface PropertyChatButtonProps {
  propertyId: string;
  propertyName: string;
}

export default function PropertyChatButton({
  propertyId,
  propertyName,
}: PropertyChatButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationDetails, setConversationDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const openChat = async () => {
    if (!user) {
      toast.error('Please log in to message the host.');
      router.push('/login');
      return;
    }

    setIsOpen(true);
    if (conversationId || loading) return;

    setLoading(true);
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start conversation');
      }
      setConversationId(data.conversation.id);
    } catch (error: any) {
      console.error('[PropertyChatButton] open error', error);
      toast.error(error.message || 'Unable to start chat');
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/chat/conversations?conversationId=${id}`);
      const data = await response.json();
      if (response.ok && data.conversations?.length) {
        setConversationDetails(data.conversations[0]);
      }
    } catch (error) {
      console.error('Failed to load conversation details', error);
    }
  };

  useEffect(() => {
    if (conversationId) {
      loadConversationDetails(conversationId);
    }
  }, [conversationId]);

  return (
    <>
      <button
        onClick={openChat}
        className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition font-semibold text-lg flex items-center justify-center gap-2"
      >
        <MessageCircle size={20} />
        Message Host
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Chat about {propertyName}
                </h3>
                <p className="text-sm text-gray-400">
                  Ask the host anything before booking.
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="flex-1 p-4">
              {conversationId && conversationDetails ? (
                <ChatWindow
                  conversationId={conversationId}
                  title={conversationDetails.properties?.name || 'Direct Messages'}
                  counterpartName={
                    conversationDetails.host_id === user?.id
                      ? conversationDetails.traveller_name || 'Guest'
                      : conversationDetails.host_name || 'Host'
                  }
                  counterpartAvatar={
                    conversationDetails.host_id === user?.id
                      ? conversationDetails.traveller_avatar
                      : conversationDetails.host_avatar
                  }
                  onMessagesRead={() => loadConversationDetails(conversationId)}
                />
              ) : (
                <div className="text-gray-400 h-full flex items-center justify-center">
                  {loading ? 'Starting chat...' : 'Unable to load conversation'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

