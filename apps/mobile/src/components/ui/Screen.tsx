import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/src/constants/theme';

export function Screen({ title, subtitle, children }: { title?: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={styles.screen}>
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 4 },
  title: { color: theme.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: theme.muted, fontSize: 14 },
});
