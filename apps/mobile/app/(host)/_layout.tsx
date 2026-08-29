import { Redirect, Tabs } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useRole } from '@/src/contexts/RoleContext';
import { theme } from '@/src/constants/theme';

export default function HostLayout() {
  const { mode, setMode } = useRole();
  const router = useRouter();

  if (mode !== 'hosting') {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: theme.bg, borderTopColor: theme.border },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.text,
        headerRight: () => (
          <Pressable
            onPress={() => {
              void setMode('traveling');
              router.replace('/(tabs)');
            }}
            style={{ marginRight: 12 }}
          >
            <Text style={{ color: theme.primary, fontWeight: '600' }}>Travel</Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="properties" options={{ title: 'Properties' }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings' }} />
      <Tabs.Screen name="payouts" options={{ title: 'Payouts' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
    </Tabs>
  );
}
