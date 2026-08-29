import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchHostDashboard, type HostDashboard } from '@/src/lib/api';
import { theme, money } from '@/src/constants/theme';

export default function HostDashboardScreen() {
  const [data, setData] = useState<HostDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchHostDashboard());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.primary} />}
    >
      <View style={styles.grid}>
        <Stat label="Properties" value={String(data?.propertyCount ?? 0)} />
        <Stat label="Active listings" value={String(data?.activeListings ?? 0)} />
        <Stat label="Pending payout" value={money(data?.pendingPayoutTotal ?? 0)} />
        <Stat label="Paid YTD" value={money(data?.paidYtdTotal ?? 0)} />
      </View>

      <Text style={styles.section}>Pending approvals ({data?.pendingApprovals?.length ?? 0})</Text>
      {(data?.pendingApprovals || []).slice(0, 5).map((b) => (
        <Text key={String(b.id)} style={styles.row}>
          {String(b.property_name || 'Booking')} — {String(b.status)}
        </Text>
      ))}

      <Text style={styles.section}>Upcoming stays ({data?.upcomingStays?.length ?? 0})</Text>
      {(data?.upcomingStays || []).slice(0, 5).map((b) => (
        <Text key={String(b.id)} style={styles.row}>
          {String(b.property_name || 'Stay')}
        </Text>
      ))}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, backgroundColor: theme.bg, gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    width: '48%',
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  statLabel: { color: theme.muted, fontSize: 12 },
  statValue: { color: theme.text, fontSize: 20, fontWeight: '700', marginTop: 4 },
  section: { color: theme.text, fontWeight: '700', marginTop: 12 },
  row: { color: theme.muted, marginTop: 4 },
});
