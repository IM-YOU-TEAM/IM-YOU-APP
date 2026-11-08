import { BlurView } from 'expo-blur';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { colors, radii, shadows, space } from '@/lib/theme';

type Props = {
  children?: ReactNode;
  /** Inner padding. Default 20. */
  padding?: number;
  /** Corner radius. Default radii.card (26). */
  radius?: number;
  /** Blur strength 0-100. Default 40. */
  intensity?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Frosted glass surface: blur + translucent white + a 1px top highlight.
 * Use ONLY for bars, sheets and overlays (per the brief), not for regular cards.
 * Web renders a real backdrop-filter; Android falls back to the translucent fill.
 */
export function GlassCard({ children, padding = space.xl - 4, radius = radii.card, intensity = 40, style }: Props) {
  return (
    <View style={[{ borderRadius: radius }, shadows.raised, style]}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
        <BlurView tint="light" intensity={intensity} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass }]} />
        <View
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: radius, borderWidth: 1, borderColor: colors.glassBorder, borderBottomColor: 'transparent' },
          ]}
        />
      </View>
      <View style={{ padding }}>{children}</View>
    </View>
  );
}
