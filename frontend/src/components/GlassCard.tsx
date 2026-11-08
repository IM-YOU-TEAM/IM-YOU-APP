import { BlurView } from 'expo-blur';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { colors, continuous, radii, shadows, space } from '@/lib/theme';

type Props = {
  children?: ReactNode;
  /** Inner padding. Default 20. */
  padding?: number;
  /** Corner radius. Default radii.card (22). */
  radius?: number;
  /** Blur strength 0-100. Default 40. */
  intensity?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Frosted glass material: blur + translucent white + a hairline light edge.
 * Use ONLY for bars, sheets and overlays (per the brief), not for regular cards.
 * Web renders a real backdrop-filter; Android falls back to the translucent fill.
 */
export function GlassCard({ children, padding = space.xl - 4, radius = radii.card, intensity = 40, style }: Props) {
  return (
    <View style={[{ borderRadius: radius, ...continuous }, shadows.raised, style]}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden', ...continuous }]}>
        <BlurView tint="light" intensity={intensity} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass }]} />
        <View
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: radius, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors.glassBorder, ...continuous },
          ]}
        />
      </View>
      <View style={{ padding, flexGrow: 1 }}>{children}</View>
    </View>
  );
}
