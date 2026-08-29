import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { fetchMessages, sendMessage, type ChatMessage } from '@/src/lib/api';
import { useAuth } from '@/src/contexts/AuthContext';
import { theme } from '@/src/constants/theme';

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const data = await fetchMessages(conversationId);
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const onSend = async () => {
    const content = draft.trim();
    if (!content || !conversationId || sending) return;
    setSending(true);
    setDraft('');
    try {
      const data = await sendMessage(conversationId, content);
      setMessages((prev) => [...prev, data.message]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setDraft(content);
    } finally {
      setSending(false);
    }
  };

  if (loading && messages.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <FlatList
        ref={listRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const mine = item.sender_id === user?.id;
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={styles.bubbleText}>{item.content}</Text>
            </View>
          );
        }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Message…"
          placeholderTextColor={theme.muted}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Pressable style={styles.sendBtn} onPress={onSend} disabled={sending}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 8 },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  mine: { alignSelf: 'flex-end', backgroundColor: theme.primary },
  theirs: { alignSelf: 'flex-start', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  bubbleText: { color: theme.text },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  input: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: 10,
    padding: 12,
    color: theme.text,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  sendText: { color: '#000', fontWeight: '700' },
});
