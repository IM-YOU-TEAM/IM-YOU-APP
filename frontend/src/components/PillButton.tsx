import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Animated, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, MIN_HIT, radii, shadows, space } from '@/lib/theme';
import { usePressScale } from '@/lib/usePressScale';
import type { IconName } from '@/types';
import { Gloss } from './Gloss';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  label: string;
  onPress?: () => void;
  /** primary = Seagrass fill, secondary = white fill, ghost = no fill. Default 'primary'. */
  variant?: Variant;
  /** Optional Ionicons name shown before the label (or after, see iconRight). */
  icon?: IconName;
  iconRight?: boolean;
  disabled?: boolean;
  /** Stretch to the parent's width. */
  fullWidth?: boolean;
  /** 'md' = 48px tall (default), 'lg' = 56px tall. */
  size?: 'md' | 'lg';
  /** Defaults to `label`. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const FILL: Record<Variant, { rest: string; hover: string; ink: string }> = {
  primary: { rest: colors.seagrass, hover: colors.seagrassDark, ink: colors.onSeagrass },
  secondary: { rest: colors.white, hover: colors.honeydewLight, ink: colors.graphite },
  ghost: { rest: 'transparent', hover: colors.seagrassTint, ink: colors.graphite },
};

export function PillButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconRight = false,
  disabled = false,
  fullWidth = false,
  size = 'md',
  accessibilityLabel,
  style,
}: Props) {
  const { scale, onPressIn, onPressOut } = usePressScale();
  const [hovered, setHovered] = useState(false);
  const fill = FILL[variant];
  const iconColor = variant === 'primary' ? colors.onSeagrass : colors.seagrass;

  const iconEl = icon ? <Ionicons name={icon} size={20} color={iconColor} /> : null;

  return (
    <Animated.View
      style={[
        { transform: [{ scale }], alignSelf: fullWidth ? 'stretch' : 'flex-start', opacity: disabled ? 0.45 : 1 },
        { borderRadius: radii.pill },
        variant !== 'ghost' && shadows.card,
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled }}
        style={[
          styles.base,
          {
            minHeight: size === 'lg' ? 56 : 48,
            paddingHorizontal: size === 'lg' ? space.xxl : space.xl,
            backgroundColor: hovered && !disabled ? fill.hover : fill.rest,
          },
        ]}
      >
        {variant === 'primary' && <Gloss />}
        {!iconRight && iconEl}
        <Text variant="body" weight={700} color={fill.ink} numberOfLines={1}>
          {label}
        </Text>
        {iconRight && iconEl}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: MIN_HIT,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    overflow: 'hidden',
  },
});
