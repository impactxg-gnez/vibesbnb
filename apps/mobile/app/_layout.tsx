import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { RoleProvider } from '@/src/contexts/RoleContext';
import { addNotificationResponseListener } from '@/src/lib/pushNotifications';
import { theme } from '@/src/constants/theme';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync();
  }, [loading]);

  useEffect(() => {
    const sub = addNotificationResponseListener((payload) => {
      if (payload.conversationId) {
        router.push(`/chat/${payload.conversationId}`);
      } else if (payload.bookingId) {
        router.push('/(tabs)/bookings');
      }
    });
    return () => sub.remove();
  }, [router]);

  if (loading) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: theme.bg }, headerTintColor: theme.text }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(host)" options={{ headerShown: false }} />
        <Stack.Screen name="listing/[id]" options={{ title: 'Listing' }} />
        <Stack.Screen name="listings/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="bookings" options={{ headerShown: false }} />
        <Stack.Screen name="messages" options={{ headerShown: false }} />
        <Stack.Screen name="host/bookings" options={{ headerShown: false }} />
        <Stack.Screen name="web" options={{ title: 'VibesBNB' }} />
        <Stack.Screen name="chat/[conversationId]" options={{ title: 'Chat' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <RoleProvider>
        <RootNavigator />
      </RoleProvider>
    </AuthProvider>
  );
}
