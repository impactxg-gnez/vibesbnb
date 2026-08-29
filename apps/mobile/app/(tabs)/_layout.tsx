import { Redirect, Tabs } from 'expo-router';
import { useRole } from '@/src/contexts/RoleContext';
import { theme } from '@/src/constants/theme';

export default function TabsLayout() {
  const { mode } = useRole();

  if (mode === 'hosting') {
    return <Redirect href="/(host)/dashboard" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: theme.bg, borderTopColor: theme.border },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.text,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="bookings" options={{ title: 'Trips', href: null }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', href: null }} />
      <Tabs.Screen name="saves" options={{ title: 'Saved' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
