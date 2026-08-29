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
import { fetchBrowseProperties, type BrowseProperty } from '@/src/lib/api';
import { PropertyCard } from '@/src/components/PropertyCard';
import { openWebPath } from '@/src/lib/openWeb';
import { theme } from '@/src/constants/theme';

const QUICK_LINKS = [
  { label: 'Wellness retreats', path: '/search?categories=wellness' },
  { label: 'Beach stays', path: '/search?category=beach' },
  { label: 'Map explore', path: '/map' },
  { label: 'Become a host', path: '/host' },
];

export default function HomeScreen() {
  const [properties, setProperties] = useState<BrowseProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBrowseProperties(24);
      setProperties(data.properties || []);
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={properties}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.primary} />}
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>VibesBNB</Text>
          <Text style={styles.subtitle}>Wellness-friendly stays</Text>
          <View style={styles.links}>
            {QUICK_LINKS.map((link) => (
              <Pressable
                key={link.label}
                style={styles.linkChip}
                onPress={() => openWebPath(link.path, link.label)}
              >
                <Text style={styles.linkText}>{link.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.sectionTitle}>Featured stays</Text>
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        ) : (
          <Text style={styles.empty}>No listings yet</Text>
        )
      }
      renderItem={({ item }) => <PropertyCard property={item} />}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  title: { color: theme.text, fontSize: 28, fontWeight: '800', marginTop: 8 },
  subtitle: { color: theme.muted, marginBottom: 16 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  linkChip: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.full,
  },
  linkText: { color: theme.text, fontWeight: '600', fontSize: 13 },
  sectionTitle: { color: theme.text, fontSize: 20, fontWeight: '700', marginBottom: 12 },
  empty: { color: theme.muted, textAlign: 'center', marginTop: 40 },
});
