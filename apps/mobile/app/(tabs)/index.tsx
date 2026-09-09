import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '@/src/lib/supabase';
import { config } from '@/src/lib/config';
import { theme } from '@/src/constants/theme';

/** Home tab = vibesbnb.com landing (in-app web). */
export default function HomeScreen() {
  const [source, setSource] = useState<{ uri: string; headers?: Record<string, string> } | null>(
    null
  );

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const refresh = data.session?.refresh_token;

      if (token) {
        const bridge = new URL(`${config.apiUrl}/auth/mobile-bridge`);
        bridge.searchParams.set('redirect', '/');
        if (refresh) bridge.searchParams.set('refresh_token', refresh);
        setSource({ uri: bridge.toString(), headers: { Authorization: `Bearer ${token}` } });
      } else {
        setSource({ uri: `${config.apiUrl}/` });
      }
    })();
  }, []);

  if (!source) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
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
