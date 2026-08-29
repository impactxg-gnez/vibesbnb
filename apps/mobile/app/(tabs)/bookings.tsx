import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { cancelBooking } from '@/src/lib/api';
import { openWebPath } from '@/src/lib/openWeb';
import { theme, money } from '@/src/constants/theme';

type BookingRow = {
  id: string;
  property_name: string | null;
  check_in: string;
  check_out: string;
  total_price: number | null;
  status: string | null;
};

export default function BookingsScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select('id, property_name, check_in, check_out, total_price, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setRows((data as BookingRow[]) || []);
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
          <Text style={styles.empty}>No bookings yet</Text>
        )
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.property_name || 'Stay'}</Text>
          <Text style={styles.meta}>
            {String(item.check_in).slice(0, 10)} → {String(item.check_out).slice(0, 10)}
          </Text>
          <Text style={styles.meta}>Status: {item.status}</Text>
          {item.total_price != null ? (
            <Text style={styles.price}>{money(Number(item.total_price))}</Text>
          ) : null}
          <View style={styles.actions}>
            <Pressable
              style={styles.linkBtn}
              onPress={() => openWebPath('/bookings', 'My trips')}
            >
              <Text style={styles.linkText}>Pay / details on web</Text>
            </Pressable>
            {item.status !== 'cancelled' ? (
              <Pressable
                style={styles.cancelBtn}
                onPress={() => {
                  Alert.alert('Cancel booking?', undefined, [
                    { text: 'No', style: 'cancel' },
                    {
                      text: 'Cancel booking',
                      style: 'destructive',
                      onPress: () => {
                        void cancelBooking(item.id)
                          .then(load)
                          .catch((e) => Alert.alert('Error', e.message));
                      },
                    },
                  ]);
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, backgroundColor: theme.bg, flexGrow: 1 },
  empty: { color: theme.muted, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  name: { color: theme.text, fontWeight: '600', fontSize: 16 },
  meta: { color: theme.muted, marginTop: 4 },
  price: { color: theme.primary, marginTop: 8, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12, flexWrap: 'wrap' },
  linkBtn: { paddingVertical: 6 },
  linkText: { color: theme.primary, fontWeight: '600' },
  cancelBtn: { paddingVertical: 6 },
  cancelText: { color: theme.danger, fontWeight: '600' },
});
