import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { theme, money } from '@/src/constants/theme';

type PropertyRow = {
  id: string;
  name: string | null;
  title: string | null;
  location: string | null;
  price: number | null;
  status: string | null;
};

export default function HostPropertiesScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('properties')
      .select('id, name, title, location, price, status')
      .eq('host_id', user.id)
      .order('updated_at', { ascending: false });
    setRows((data as PropertyRow[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={rows}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.primary} />}
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        ) : (
          <Text style={styles.empty}>No properties yet</Text>
        )
      }
      renderItem={({ item }) => (
        <Text style={styles.card}>
          {item.name || item.title} · {item.location} · {money(Number(item.price) || 0)}/night ·{' '}
          {item.status}
        </Text>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, backgroundColor: theme.bg, flexGrow: 1 },
  empty: { color: theme.muted, textAlign: 'center', marginTop: 40 },
  card: {
    color: theme.text,
    backgroundColor: theme.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
});
