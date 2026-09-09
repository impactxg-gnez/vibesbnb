import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { config } from '@/src/lib/config';
import { theme } from '@/src/constants/theme';

/** App shell: full-screen vibesbnb.com (no native tab bar). */
export default function Index() {
  const { loading: authLoading } = useAuth();
  const [source, setSource] = useState<{ uri: string; headers?: Record<string, string> } | null>(
    null
  );

  useEffect(() => {
    if (authLoading) return;
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
  }, [authLoading]);

  if (authLoading || !source) {
    return (
      <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel="Loading VibesBNB">
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
      accessibilityLabel="VibesBNB website"
      renderLoading={() => (
        <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel="Loading page">
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
