import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { theme } from '@/src/constants/theme';

type Props = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

export function Button({ label, variant = 'primary', style, disabled, ...rest }: Props) {
  return (
    <Pressable
      style={(state) => [
        styles.base,
        styles[variant],
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      disabled={disabled}
      {...rest}
    >
      <Text style={[styles.text, variant === 'primary' && styles.textPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: theme.primary },
  secondary: {
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.border,
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: theme.danger },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
  text: { color: theme.text, fontWeight: '700', fontSize: 16 },
  textPrimary: { color: '#000' },
});
