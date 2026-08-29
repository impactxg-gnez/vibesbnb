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
import { acceptBooking, rejectBooking } from '@/src/lib/api';
import { theme, money } from '@/src/constants/theme';

type BookingRow = {
  id: string;
  property_name: string | null;
  guest_name: string | null;
  check_in: string;
  check_out: string;
  total_price: number | null;
  status: string | null;
};

export default function HostBookingsScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select('id, property_name, guest_name, check_in, check_out, total_price, status')
      .eq('host_id', user.id)
      .order('created_at', { ascending: false });
    setRows((data as BookingRow[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const onAccept = (id: string) => {
    Alert.alert('Accept booking?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: () => {
          void acceptBooking(id).then(load).catch((e) => Alert.alert('Error', e.message));
        },
      },
    ]);
  };

  const onReject = (id: string) => {
    Alert.alert('Reject booking?', 'The guest will be notified.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => {
          void rejectBooking(id, 'Declined by host')
            .then(load)
            .catch((e) => Alert.alert('Error', e.message));
        },
      },
    ]);
  };

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
          <Text style={styles.empty}>No host bookings</Text>
        )
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.property_name}</Text>
          <Text style={styles.meta}>Guest: {item.guest_name}</Text>
          <Text style={styles.meta}>
            {String(item.check_in).slice(0, 10)} → {String(item.check_out).slice(0, 10)}
          </Text>
          <Text style={styles.meta}>Status: {item.status}</Text>
          {item.total_price != null ? (
            <Text style={styles.price}>{money(Number(item.total_price))}</Text>
          ) : null}
          {item.status === 'pending_approval' || item.status === 'pending' ? (
            <View style={styles.actions}>
              <Pressable style={styles.accept} onPress={() => onAccept(item.id)}>
                <Text style={styles.actionText}>Accept</Text>
              </Pressable>
              <Pressable style={styles.reject} onPress={() => onReject(item.id)}>
                <Text style={styles.actionText}>Reject</Text>
              </Pressable>
            </View>
          ) : null}
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
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  accept: {
    flex: 1,
    backgroundColor: theme.primary,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  reject: {
    flex: 1,
    backgroundColor: theme.danger,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: { color: '#000', fontWeight: '700' },
});
