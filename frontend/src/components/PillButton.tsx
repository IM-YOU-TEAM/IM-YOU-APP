import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, MIN_HIT, radii, shadows, space } from "@/lib/theme";
import { usePressScale } from "@/lib/usePressScale";
import type { IconName } from "@/types";
import { Gloss } from "./Gloss";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "ghost" | "cherry";

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
  /** 'md' = 50px tall (default), 'lg' = 56px tall. */
  size?: "md" | "lg";
  /** Defaults to `label`. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const FILL: Record<
  Variant,
  { rest: string; hover: string; ink: string; icon: string; edge: string }
> = {
  primary: {
    rest: colors.seagrass,
    hover: colors.seagrassDark,
    ink: colors.onSeagrass,
    icon: colors.onSeagrass,
    edge: colors.glassBorder,
  },
  secondary: {
    rest: colors.white,
    hover: colors.honeydewLight,
    ink: colors.graphite,
    icon: colors.seagrass,
    edge: colors.border,
  },
  ghost: {
    rest: "transparent",
    hover: colors.fill,
    ink: colors.graphite,
    icon: colors.seagrass,
    edge: "transparent",
  },
  cherry: {
    rest: colors.cherry,
    hover: colors.cherryDark,
    ink: colors.onBurntorange,
    icon: colors.onBurntorange,
    edge: colors.glassBorder,
  },
};

/** iOS-style capsule button: flat fill, semibold label, gentle press squish. */
export function PillButton({
  label,
  onPress,
  variant = "primary",
  icon,
  iconRight = false,
  disabled = false,
  fullWidth = false,
  size = "md",
  accessibilityLabel,
  style,
}: Props) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);
  const [hovered, setHovered] = useState(false);
  const fill = FILL[variant];
  const iconEl = icon ? (
    <Ionicons name={icon} size={19} color={fill.icon} />
  ) : null;

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale }],
          alignSelf: fullWidth ? "stretch" : "flex-start",
          opacity: disabled ? 0.4 : 1,
        },
        { borderRadius: radii.pill },
        variant !== "ghost" && shadows.card,
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
        style={({ pressed }) => [
          styles.base,
          {
<<<<<<< HEAD
            minHeight: size === "lg" ? 56 : 50,
            paddingHorizontal: size === "lg" ? space.xxl : space.xl,
            backgroundColor: hovered && !disabled ? fill.hover : fill.rest,
            borderWidth: variant === "ghost" ? 0 : StyleSheet.hairlineWidth,
=======
            minHeight: size === 'lg' ? 56 : 50,
            paddingHorizontal: size === 'lg' ? space.xxl : space.xl,
            backgroundColor: (hovered || pressed) && !disabled ? fill.hover : fill.rest,
            borderWidth: variant === 'ghost' ? 0 : StyleSheet.hairlineWidth,
>>>>>>> origin/main
            borderColor: fill.edge,
            opacity: pressed ? 0.94 : 1,
          },
        ]}
      >
        {variant === "primary" ? <Gloss strength={0.14} /> : null}
        {!iconRight && iconEl}
        <Text variant="body" weight={600} color={fill.ink} numberOfLines={1}>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    overflow: "hidden",
  },
});
