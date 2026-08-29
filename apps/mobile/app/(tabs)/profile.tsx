import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRole } from '@/src/contexts/RoleContext';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { openWebPath } from '@/src/lib/openWeb';
import { theme } from '@/src/constants/theme';

type MenuItem = {
  label: string;
  onPress: () => void;
  subtitle?: string;
};

export default function ProfileScreen() {
  const { user, signOut, isHost } = useAuth();
  const { mode, setMode, canSwitchToHost } = useRole();
  const router = useRouter();

  const travelerItems: MenuItem[] = [
    { label: 'My trips', onPress: () => router.push('/(tabs)/bookings') },
    { label: 'Messages', onPress: () => router.push('/(tabs)/messages') },
    { label: 'Edit profile', onPress: () => openWebPath('/profile', 'Profile') },
    { label: 'Verify phone', onPress: () => openWebPath('/verify-phone', 'Verify phone') },
    { label: 'Privacy policy', onPress: () => openWebPath('/privacy', 'Privacy') },
    { label: 'Terms of service', onPress: () => openWebPath('/terms', 'Terms') },
  ];

  const hostItems: MenuItem[] = [
    { label: 'Host dashboard', onPress: () => router.replace('/(host)/dashboard') },
    { label: 'Manage properties', onPress: () => openWebPath('/host/properties', 'Properties') },
    { label: 'Create listing', onPress: () => openWebPath('/host/properties/new', 'New listing') },
    { label: 'Calendar & iCal', subtitle: 'Per property on web', onPress: () => openWebPath('/host/properties', 'Host properties') },
    { label: 'Payout settings', onPress: () => openWebPath('/profile#host-payout-settings', 'Payouts') },
    { label: 'Bulk import', onPress: () => openWebPath('/host/properties/bulk-import', 'Bulk import') },
  ];

  const items = mode === 'hosting' ? hostItems : travelerItems;

  return (
    <Screen title="Profile" subtitle={user?.email || ''}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.modeBadge}>
          <Text style={styles.modeText}>
            {mode === 'hosting' ? 'Hosting mode' : 'Traveling mode'}
          </Text>
        </View>

        {canSwitchToHost ? (
          <Button
            label={mode === 'hosting' ? 'Switch to traveling' : 'Switch to hosting'}
            variant="secondary"
            onPress={() => {
              if (mode === 'hosting') {
                void setMode('traveling');
                router.replace('/(tabs)');
              } else {
                void setMode('hosting');
                router.replace('/(host)/dashboard');
              }
            }}
          />
        ) : (
          <Pressable style={styles.becomeHost} onPress={() => openWebPath('/host', 'Become a host')}>
            <Text style={styles.becomeHostText}>Become a host on VibesBNB →</Text>
          </Pressable>
        )}

        <Text style={styles.section}>Account</Text>
        {items.map((item) => (
          <Pressable key={item.label} style={styles.row} onPress={item.onPress}>
            <Text style={styles.rowLabel}>{item.label}</Text>
            {item.subtitle ? <Text style={styles.rowSub}>{item.subtitle}</Text> : null}
          </Pressable>
        ))}

        {!isHost && mode !== 'hosting' ? null : (
          <>
            <Text style={styles.section}>Quick native host tools</Text>
            <Pressable style={styles.row} onPress={() => router.push('/(host)/bookings')}>
              <Text style={styles.rowLabel}>Pending bookings (native)</Text>
            </Pressable>
          </>
        )}

        <Button label="Log out" variant="ghost" onPress={() => void signOut()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  modeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  modeText: { color: theme.primary, fontWeight: '700', fontSize: 13 },
  becomeHost: { paddingVertical: 8 },
  becomeHostText: { color: theme.primary, fontWeight: '600' },
  section: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  row: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  rowLabel: { color: theme.text, fontWeight: '600', fontSize: 16 },
  rowSub: { color: theme.muted, fontSize: 12, marginTop: 4 },
});
