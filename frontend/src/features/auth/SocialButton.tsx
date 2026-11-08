import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { Text } from '@/components';
import { colors, radii, shadows, space } from '@/lib/theme';
import { usePressScale } from '@/lib/usePressScale';
import { PROVIDER_LABELS, type SocialProvider } from './auth';

// Provider brand rules: Apple's button is solid black; Google and Microsoft keep their full-color marks on white.
const APPLE_BLACK = '#000000';

const FILL: Record<SocialProvider, { rest: string; hover: string; ink: string; edge: string }> = {
  apple: { rest: APPLE_BLACK, hover: '#1C1C1E', ink: colors.white, edge: APPLE_BLACK },
  google: { rest: colors.white, hover: colors.honeydewLight, ink: colors.graphite, edge: colors.separator },
  azure: { rest: colors.white, hover: colors.honeydewLight, ink: colors.graphite, edge: colors.separator },
};

const MARK_SIZE = 20;

function ProviderMark({ provider }: { provider: SocialProvider }) {
  switch (provider) {
    case 'apple':
      return <Ionicons name="logo-apple" size={MARK_SIZE + 2} color={colors.white} style={{ marginTop: -2 }} />;
    case 'google':
      return (
        <Svg width={MARK_SIZE} height={MARK_SIZE} viewBox="0 0 48 48">
          <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </Svg>
      );
    case 'azure':
      return (
        <Svg width={MARK_SIZE - 2} height={MARK_SIZE - 2} viewBox="0 0 21 21">
          <Rect x={1} y={1} width={9} height={9} fill="#F25022" />
          <Rect x={11} y={1} width={9} height={9} fill="#7FBA00" />
          <Rect x={1} y={11} width={9} height={9} fill="#00A4EF" />
          <Rect x={11} y={11} width={9} height={9} fill="#FFB900" />
        </Svg>
      );
    default: {
      const unexpected: never = provider;
      return unexpected;
    }
  }
}

type Props = {
  provider: SocialProvider;
  onPress: (provider: SocialProvider) => void;
  busy?: boolean;
  disabled?: boolean;
};

/** "Continue with Apple / Google / Microsoft" capsule, sized and pressed like PillButton. */
export function SocialButton({ provider, onPress, busy = false, disabled = false }: Props) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);
  const [hovered, setHovered] = useState(false);
  const fill = FILL[provider];
  const label = `Continue with ${PROVIDER_LABELS[provider]}`;
  const inactive = disabled && !busy;

  return (
    <Animated.View style={[{ transform: [{ scale }], borderRadius: radii.pill, opacity: inactive ? 0.5 : 1 }, shadows.card]}>
      <Pressable
        onPress={() => onPress(provider)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        disabled={disabled || busy}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: disabled || busy, busy }}
        style={({ pressed }) => [
          styles.base,
          {
            backgroundColor: (hovered || pressed) && !disabled ? fill.hover : fill.rest,
            borderColor: fill.edge,
          },
        ]}
      >
        <View style={styles.mark}>
          {busy ? <ActivityIndicator size="small" color={fill.ink} /> : <ProviderMark provider={provider} />}
        </View>
        <Text variant="body" weight={600} color={fill.ink} numberOfLines={1}>
          {label}
        </Text>
        {/* Mirrors the mark's width so the label sits optically centered. */}
        <View style={styles.mark} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    overflow: 'hidden',
  },
  mark: { width: MARK_SIZE + 2, alignItems: 'center', justifyContent: 'center' },
});
