<<<<<<< HEAD
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
=======
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { outlineIcon } from '@/lib/icons';
import { colors, MAX_CONTENT_WIDTH, radii, shadows, space, WIDE } from '@/lib/theme';
import { useReduceMotion } from '@/lib/useReduceMotion';
import type { IconName } from '@/types';
import { GlassCard } from './GlassCard';
import { Logo } from './Logo';
import { logout, type NavItem } from './nav';
import { Text } from './Text';
>>>>>>> origin/main

const TAB_WIDTH = 108;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

type Props = {
  items: NavItem[];
  /** Default: sign out; the auth gate then shows /login. */
  onLogout?: () => void;
};

/**
 * Top navigation for signed-in workspaces: logo on the left, a centered glass capsule of tabs
 * (selected tab on a white thumb), and Log out on the right. Tightens on phone-width screens.
 */
export function TopBar({ items, onLogout = logout }: Props) {
  const insets = useSafeAreaInsets();
  const compact = useWindowDimensions().width < WIDE;
  const reduceMotion = useReduceMotion();
  const selectedIndex = Math.max(
    items.findIndex((item) => item.active),
    0,
  );
  const [tabsWidth, setTabsWidth] = useState(0);
  const offset = useRef(new Animated.Value(0)).current;
  const stretch = useRef(new Animated.Value(1)).current;
  const previousIndex = useRef(selectedIndex);
  const measured = useRef(false);
  const slotWidth = tabsWidth > 0 ? tabsWidth / items.length : 0;

  useEffect(() => {
    if (slotWidth === 0) return;

    const target = selectedIndex * slotWidth;
    if (!measured.current || reduceMotion) {
      offset.setValue(target);
      stretch.setValue(1);
      previousIndex.current = selectedIndex;
      measured.current = true;
      return;
    }

    const distance = Math.max(Math.abs(selectedIndex - previousIndex.current), 1);
    previousIndex.current = selectedIndex;
    offset.stopAnimation();
    stretch.stopAnimation();

    Animated.parallel([
      Animated.spring(offset, {
        toValue: target,
        stiffness: distance > 1 ? 540 : 430,
        damping: distance > 1 ? 40 : 34,
        mass: 0.72,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.sequence([
        Animated.timing(stretch, {
          toValue: 1 + Math.min(distance, 2) * 0.06,
          duration: 90,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.spring(stretch, {
          toValue: 1,
          stiffness: 420,
          damping: 30,
          mass: 0.68,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    ]).start();
  }, [offset, reduceMotion, selectedIndex, slotWidth, stretch]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setTabsWidth(event.nativeEvent.layout.width);
  };

  return (
<<<<<<< HEAD
    <View style={[styles.wrap, { paddingTop: insets.top + space.lg }]}>
      <View accessibilityRole="summary" style={styles.inner}>
=======
    <View style={[styles.wrap, { paddingTop: insets.top + space.lg, paddingHorizontal: compact ? space.md : space.xxl }]}>
      <View accessibilityRole="navigation" style={styles.inner}>
>>>>>>> origin/main
        <View style={styles.side}>
          <Logo size={32} variant={compact ? 'mark' : 'full'} />
        </View>
        <GlassCard padding={4} radius={radii.pill} intensity={60}>
          <View style={[styles.tabs, { width: items.length * (compact ? 96 : TAB_WIDTH) }]} onLayout={handleLayout}>
            {slotWidth > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.indicator,
                  shadows.card,
                  {
                    width: slotWidth,
                    transform: [{ translateX: offset }, { scaleX: stretch }],
                  },
                ]}
              />
            ) : null}
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
<<<<<<< HEAD
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
=======
        !active && hovered && { backgroundColor: colors.fill },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={active ? icon : outlineIcon(icon)} size={18} color={active ? colors.burntOrange : colors.textMuted} />
>>>>>>> origin/main
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
<<<<<<< HEAD
  tabs: { flexDirection: "row", gap: 2 },
  button: {
    flexDirection: "row",
    alignItems: "center",
=======
  tabs: { position: 'relative', flexDirection: 'row' },
  indicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
  },
  button: {
    flex: 1,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
>>>>>>> origin/main
    gap: space.sm,
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: radii.pill,
  },
});
