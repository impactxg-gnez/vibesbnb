import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { openWebPath } from '@/src/lib/openWeb';
import { Button } from '@/src/components/ui/Button';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { computeBookingQuote } from '@/src/lib/bookingQuote';
import { theme, money } from '@/src/constants/theme';

type PropertyRow = {
  id: string;
  name: string | null;
  title: string | null;
  location: string | null;
  price: number | null;
  images: string[] | null;
  guests: number | null;
  cleaning_fee: number | null;
  allow_extra_guests: boolean | null;
  extra_guest_price: number | null;
  description: string | null;
};

function defaultDates() {
  const start = new Date();
  start.setDate(start.getDate() + 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 3);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { checkIn: fmt(start), checkOut: fmt(end) };
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const defaults = useMemo(() => defaultDates(), []);
  const [property, setProperty] = useState<PropertyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState(defaults.checkIn);
  const [checkOut, setCheckOut] = useState(defaults.checkOut);
  const [guests, setGuests] = useState('2');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase
      .from('properties')
      .select(
        'id, name, title, location, price, images, guests, cleaning_fee, allow_extra_guests, extra_guest_price, description'
      )
      .eq('id', id)
      .eq('status', 'active')
      .maybeSingle();
    setProperty(data as PropertyRow | null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const quote = useMemo(() => {
    if (!property?.price) return null;
    return computeBookingQuote({
      checkInYmd: checkIn,
      checkOutYmd: checkOut,
      nightlyRate: Number(property.price),
      cleaningFee: Number(property.cleaning_fee) || 0,
      adults: Math.max(1, parseInt(guests, 10) || 1),
      includedGuests: Number(property.guests) || 1,
      allowExtraGuests: property.allow_extra_guests === true,
      extraGuestPrice: Number(property.extra_guest_price) || 0,
      applyCardFee: true,
    });
  }, [property, checkIn, checkOut, guests]);

  const openCheckout = () => {
    if (!property || !user) {
      Alert.alert('Sign in required', 'Log in to book this stay.');
      return;
    }
    if (!quote) {
      Alert.alert('Invalid dates', 'Check-out must be after check-in.');
      return;
    }
    const params = new URLSearchParams({
      propertyId: property.id,
      checkIn,
      checkOut,
      guests: String(Math.max(1, parseInt(guests, 10) || 1)),
    });
    openWebPath(`/bookings/new?${params.toString()}`, 'Book stay');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Listing not found</Text>
      </View>
    );
  }

  const name = property.name || property.title || 'Listing';
  const image = property.images?.[0];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {image ? (
        <Image source={{ uri: image }} style={styles.hero} />
      ) : (
        <View style={[styles.hero, styles.heroPlaceholder]}>
          <Text style={styles.muted}>No photo</Text>
        </View>
      )}

      <Text style={styles.title}>{name}</Text>
      <Text style={styles.location}>{property.location}</Text>
      <Text style={styles.price}>
        {money(Number(property.price) || 0)}
        <Text style={styles.perNight}> / night</Text>
      </Text>

      {property.description ? (
        <Text style={styles.description}>{property.description}</Text>
      ) : null}

      <View style={styles.form}>
        <Text style={styles.label}>Check-in (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={checkIn} onChangeText={setCheckIn} />
        <Text style={styles.label}>Check-out (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={checkOut} onChangeText={setCheckOut} />
        <Text style={styles.label}>Guests</Text>
        <TextInput
          style={styles.input}
          value={guests}
          onChangeText={setGuests}
          keyboardType="number-pad"
        />
      </View>

      {quote ? (
        <View style={styles.quoteBox}>
          <Text style={styles.quoteLine}>
            {quote.nights} nights · {money(quote.grandTotal)} estimated total
          </Text>
          <Text style={styles.quoteHint}>Taxes and fees included in web checkout</Text>
        </View>
      ) : null}

      <Button label="Continue to secure checkout" onPress={openCheckout} />
      <Text style={styles.checkoutNote}>
        Payment completes on vibesbnb.com via PayPal in your browser.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.bg },
  container: { paddingBottom: 32 },
  center: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  hero: { width: '100%', height: 240 },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  title: { color: theme.text, fontSize: 22, fontWeight: '700', paddingHorizontal: 16, marginTop: 12 },
  location: { color: theme.primary, paddingHorizontal: 16, marginTop: 4 },
  price: { color: theme.text, fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginTop: 8 },
  perNight: { color: theme.muted, fontWeight: '400', fontSize: 14 },
  description: { color: theme.muted, paddingHorizontal: 16, marginTop: 12, lineHeight: 20 },
  form: { padding: 16, gap: 8 },
  label: { color: theme.muted, fontSize: 13 },
  input: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 12,
    color: theme.text,
    marginBottom: 8,
  },
  quoteBox: {
    marginHorizontal: 16,
    padding: 14,
    backgroundColor: theme.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  quoteLine: { color: theme.text, fontWeight: '600' },
  quoteHint: { color: theme.muted, fontSize: 12, marginTop: 4 },
  bookBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: theme.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  bookText: { color: '#000', fontWeight: '700', fontSize: 16 },
  checkoutNote: { color: theme.muted, fontSize: 12, textAlign: 'center', marginTop: 10, paddingHorizontal: 24 },
  muted: { color: theme.muted },
});
