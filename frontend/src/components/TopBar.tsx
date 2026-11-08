import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { outlineIcon } from "@/lib/icons";
import { colors, MAX_CONTENT_WIDTH, radii, shadows, space } from "@/lib/theme";
import type { IconName } from "@/types";
import { GlassCard } from "./GlassCard";
import { Logo } from "./Logo";
import { logout, type NavItem } from "./Sidebar";
import { Text } from "./Text";

type Props = {
  items: NavItem[];
  /** Default: go to /login. */
  onLogout?: () => void;
};

/**
 * Top navigation for the patient side on wide screens (>= WIDE): logo on the left,
 * a centered glass capsule of tabs (selected tab on a white thumb), and Log out on the right.
 */
export function TopBar({ items, onLogout = logout }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + space.lg }]}>
      <View accessibilityRole="summary" style={styles.inner}>
        <View style={styles.side}>
          <Logo size={32} />
        </View>
        <GlassCard padding={4} radius={radii.pill} intensity={60}>
          <View style={styles.tabs}>
            {items.map((item) => (
              <Link key={item.label} href={item.href} asChild>
                <TabButton
                  label={item.label}
                  icon={item.icon}
                  active={item.active}
                />
              </Link>
            ))}
          </View>
        </GlassCard>
        <View style={[styles.side, { alignItems: "flex-end" }]}>
          <TabButton
            label="Log out"
            icon="log-out-outline"
            onPress={onLogout}
          />
        </View>
      </View>
    </View>
  );
}

type ButtonProps = {
  label: string;
  icon: IconName;
  active?: boolean;
  onPress?: () => void;
};

// Link (asChild) injects onPress/href, so this accepts and forwards extra props.
function TabButton({
  label,
  icon,
  active = false,
  onPress,
  ...linkProps
}: ButtonProps & Record<string, unknown>) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      {...linkProps}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole={linkProps.href ? "link" : "button"}
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.button,
        active
          ? [styles.active, shadows.card]
          : hovered && { backgroundColor: colors.fill },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons
        name={active ? icon : outlineIcon(icon)}
        size={18}
        color={active ? colors.burntorange : colors.textMuted}
      />
      <Text variant="callout" weight={active ? 600 : 500} muted={!active}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // zIndex keeps the glass shadow above the page content below it.
  wrap: { paddingHorizontal: space.xxl, paddingBottom: space.xs, zIndex: 1 },
  inner: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
  },
  side: { flex: 1 },
  tabs: { flexDirection: "row", gap: 2 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 40,
    paddingHorizontal: space.lg,
    borderRadius: radii.pill,
  },
  active: { backgroundColor: colors.white },
});
