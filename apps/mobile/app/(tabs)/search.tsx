import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchBrowseProperties, type BrowseProperty } from '@/src/lib/api';
import { PropertyCard } from '@/src/components/PropertyCard';
import { Input } from '@/src/components/ui/Input';
import { Screen } from '@/src/components/ui/Screen';
import { CATEGORY_CHIPS, filterProperties, type SearchFilters } from '@/src/lib/searchFilters';
import { openWebPath } from '@/src/lib/openWeb';
import { theme } from '@/src/constants/theme';

export default function SearchScreen() {
  const [catalog, setCatalog] = useState<BrowseProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('');
  const [guests, setGuests] = useState('2');
  const [category, setCategory] = useState('');
  const [wellnessOnly, setWellnessOnly] = useState(false);
  const [sort, setSort] = useState<SearchFilters['sort']>('high-low');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBrowseProperties();
      setCatalog(data.properties || []);
    } catch {
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filters: SearchFilters = useMemo(
    () => ({
      location,
      guests: Math.max(1, parseInt(guests, 10) || 1),
      category,
      sort,
      wellnessOnly,
    }),
    [location, guests, category, sort, wellnessOnly]
  );

  const results = useMemo(() => filterProperties(catalog, filters), [catalog, filters]);

  return (
    <Screen title="Search" subtitle="Find wellness-friendly stays">
      <View style={styles.filters}>
        <Input
          label="Where"
          placeholder="City, neighborhood, or property name"
          value={location}
          onChangeText={setLocation}
        />
        <Input
          label="Guests"
          placeholder="2"
          value={guests}
          onChangeText={setGuests}
          keyboardType="number-pad"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {CATEGORY_CHIPS.map((chip) => (
            <Pressable
              key={chip.id || 'all'}
              style={[styles.chip, category === chip.id && styles.chipActive]}
              onPress={() => setCategory(chip.id)}
            >
              <Text style={[styles.chipText, category === chip.id && styles.chipTextActive]}>
                {chip.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.chip, wellnessOnly && styles.chipActive]}
            onPress={() => setWellnessOnly((v) => !v)}
          >
            <Text style={[styles.chipText, wellnessOnly && styles.chipTextActive]}>
              Wellness-friendly
            </Text>
          </Pressable>
        </ScrollView>
        <Pressable style={styles.mapLink} onPress={() => openWebPath('/map', 'Map')}>
          <Text style={styles.mapLinkText}>Open map view →</Text>
        </Pressable>
      </View>

      <Text style={styles.count}>{results.length} stays</Text>

      <FlatList
        contentContainerStyle={styles.list}
        data={results}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.primary} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
          ) : (
            <Text style={styles.empty}>No listings match your search</Text>
          )
        }
        renderItem={({ item }) => <PropertyCard property={item} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { paddingHorizontal: 16, gap: 12, paddingBottom: 8 },
  chips: { flexGrow: 0 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.border,
    marginRight: 8,
    backgroundColor: theme.surface,
  },
  chipActive: { backgroundColor: theme.primaryMuted, borderColor: theme.primary },
  chipText: { color: theme.muted, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: theme.primary },
  mapLink: { alignSelf: 'flex-start' },
  mapLinkText: { color: theme.primary, fontWeight: '600' },
  count: { color: theme.muted, paddingHorizontal: 16, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { color: theme.muted, textAlign: 'center', marginTop: 40 },
});
