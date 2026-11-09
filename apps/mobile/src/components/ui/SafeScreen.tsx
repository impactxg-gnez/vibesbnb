import { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/src/constants/theme';

/** Keeps content inside the status bar, notch, and home-indicator insets on every phone size. */
export function SafeScreen({
  children,
  style,
  edges = ['top', 'bottom', 'left', 'right'],
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: theme.bg }, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}
