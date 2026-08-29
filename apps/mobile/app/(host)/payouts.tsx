import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchHostPayouts, type PayoutRow } from '@/src/lib/api';
import { theme, money } from '@/src/constants/theme';

export default function HostPayoutsScreen() {
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [summary, setSummary] = useState({ pendingTotal: 0, paidTotal: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchHostPayouts();
      setRows(data.pending || []);
      setSummary({
        pendingTotal: data.summary.pendingTotal,
        paidTotal: data.summary.paidTotal,
      });
    } catch {
      setRows([]);
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
      data={rows}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.primary} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.summary}>Pending: {money(summary.pendingTotal)}</Text>
          <Text style={styles.summary}>Paid total: {money(summary.paidTotal)}</Text>
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        ) : (
          <Text style={styles.empty}>No pending payouts</Text>
        )
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.property_name || 'Stay'}</Text>
          <Text style={styles.meta}>Guest paid: {money(item.guest_total)}</Text>
          <Text style={styles.meta}>Host fee: {money(item.host_fee ?? 0)}</Text>
          <Text style={styles.payout}>Your payout: {money(item.host_amount)}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, backgroundColor: theme.bg, flexGrow: 1 },
  header: { marginBottom: 12, gap: 4 },
  summary: { color: theme.text, fontWeight: '600' },
  empty: { color: theme.muted, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  name: { color: theme.text, fontWeight: '600' },
  meta: { color: theme.muted, marginTop: 4 },
  payout: { color: theme.primary, marginTop: 8, fontWeight: '700' },
});
