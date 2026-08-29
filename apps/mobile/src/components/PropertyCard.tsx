import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import type { BrowseProperty } from '@/src/lib/api';
import { theme, money } from '@/src/constants/theme';

export function PropertyCard({
  property,
  compact,
}: {
  property: BrowseProperty;
  compact?: boolean;
}) {
  const name = property.name || property.title || 'Listing';
  const image = property.images?.[0];
  const price = Number(property.price) || 0;
  const rating = property.rating;
  const reviews = property.reviews_count;

  return (
    <Link href={`/listing/${property.id}`} asChild>
      <Pressable style={[styles.card, compact && styles.cardCompact]}>
        {image ? (
          <Image source={{ uri: image }} style={[styles.image, compact && styles.imageCompact]} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder, compact && styles.imageCompact]}>
            <Text style={styles.placeholderText}>No photo</Text>
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          <Text style={styles.location} numberOfLines={1}>
            {property.location || 'Location TBD'}
          </Text>
          <View style={styles.metaRow}>
            {rating != null && rating > 0 ? (
              <Text style={styles.rating}>
                ★ {rating.toFixed(1)}
                {reviews ? ` (${reviews})` : ''}
              </Text>
            ) : null}
            {property.bedrooms != null ? (
              <Text style={styles.meta}>{property.bedrooms} bd</Text>
            ) : null}
          </View>
          <Text style={styles.price}>
            {money(price)}
            <Text style={styles.perNight}> / night</Text>
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
  },
  cardCompact: { marginBottom: 12 },
  image: { width: '100%', height: 220 },
  imageCompact: { height: 160 },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceLight,
  },
  placeholderText: { color: theme.muted },
  body: { padding: 14, gap: 6 },
  name: { color: theme.text, fontSize: 17, fontWeight: '700' },
  location: { color: theme.primary, fontSize: 14, fontWeight: '500' },
  metaRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  rating: { color: theme.text, fontSize: 13, fontWeight: '600' },
  meta: { color: theme.muted, fontSize: 13 },
  price: { color: theme.text, fontSize: 16, fontWeight: '800', marginTop: 2 },
  perNight: { color: theme.muted, fontWeight: '500', fontSize: 13 },
});
