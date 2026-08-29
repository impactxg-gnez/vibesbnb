import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { supabase } from '@/src/lib/supabase';
import { config } from '@/src/lib/config';
import { theme } from '@/src/constants/theme';

/** In-app web for site features: host editor, checkout, map, admin-linked flows, etc. */
export default function WebAppScreen() {
  const { path, title } = useLocalSearchParams<{ path: string; title?: string }>();
  const [source, setSource] = useState<{ uri: string; headers?: Record<string, string> } | null>(
    null
  );

  useEffect(() => {
    void (async () => {
      const target = path?.startsWith('/') ? path : `/${path || ''}`;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const refresh = data.session?.refresh_token;

      if (token) {
        const bridge = new URL(`${config.apiUrl}/auth/mobile-bridge`);
        bridge.searchParams.set('redirect', target);
        if (refresh) bridge.searchParams.set('refresh_token', refresh);
        setSource({ uri: bridge.toString(), headers: { Authorization: `Bearer ${token}` } });
      } else {
        setSource({ uri: `${config.apiUrl}${target}` });
      }
    })();
  }, [path]);

  if (!source) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: title || 'VibesBNB', headerShown: true }} />
      <WebView
        source={source}
        style={styles.webview}
        startInLoadingState
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        renderLoading={() => (
          <View style={styles.center}>
            <ActivityIndicator color={theme.primary} />
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: theme.bg },
  center: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
