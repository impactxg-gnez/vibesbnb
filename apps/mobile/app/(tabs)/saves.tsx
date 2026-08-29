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
import { PropertyCard } from '@/src/components/PropertyCard';
import type { BrowseProperty } from '@/src/lib/api';
import { theme } from '@/src/constants/theme';

export default function SavesScreen() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<BrowseProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: favs } = await supabase
      .from('favorites')
      .select('property_id')
      .eq('user_id', user.id);

    const ids = (favs || []).map((f) => f.property_id as string).filter(Boolean);
    if (ids.length === 0) {
      setProperties([]);
      setLoading(false);
      return;
    }

    const { data: props } = await supabase
      .from('properties')
      .select('id, name, title, location, price, images, rating, reviews_count, type, guests, bedrooms')
      .in('id', ids)
      .eq('status', 'active');

    setProperties((props as BrowseProperty[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={properties}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.primary} />}
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        ) : (
          <Text style={styles.empty}>No saved listings</Text>
        )
      }
      renderItem={({ item }) => <PropertyCard property={item} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, backgroundColor: theme.bg, flexGrow: 1 },
  empty: { color: theme.muted, textAlign: 'center', marginTop: 40 },
});
