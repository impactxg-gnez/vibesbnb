import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { fetchConversations, type Conversation } from '@/src/lib/api';
import { theme } from '@/src/constants/theme';

export default function MessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchConversations();
      setConversations(data.conversations || []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={conversations}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.primary} />}
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        ) : (
          <Text style={styles.empty}>No conversations yet</Text>
        )
      }
      renderItem={({ item }) => (
        <Link href={`/chat/${item.id}`} asChild>
          <Pressable style={styles.row}>
            <Text style={styles.title}>{item.properties?.name || 'Conversation'}</Text>
            <Text style={styles.preview} numberOfLines={1}>
              {item.last_message || 'No messages yet'}
            </Text>
          </Pressable>
        </Link>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, backgroundColor: theme.bg, flexGrow: 1 },
  empty: { color: theme.muted, textAlign: 'center', marginTop: 40 },
  row: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  title: { color: theme.text, fontWeight: '600' },
  preview: { color: theme.muted, marginTop: 4 },
});
