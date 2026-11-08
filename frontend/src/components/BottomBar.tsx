import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { outlineIcon } from '@/lib/icons';
import { colors, radii, space } from '@/lib/theme';
import { useReduceMotion } from '@/lib/useReduceMotion';
import type { IconName } from '@/types';
import { GlassCard } from './GlassCard';
import { logout, type NavItem } from './nav';
import { Text } from './Text';

const BAR_HEIGHT = 64;
const BAR_MARGIN = space.md;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/** Space the floating bar covers at the bottom of the screen (without the safe-area inset). */
export const BOTTOM_BAR_SPACE = BAR_HEIGHT + BAR_MARGIN;

// Layouts provide BOTTOM_BAR_SPACE while the bar is visible; ScreenContainer pads by it.
const BottomBarInset = createContext(0);
export const BottomBarInsetProvider = BottomBarInset.Provider;
export const useBottomBarInset = () => useContext(BottomBarInset);

type Props = {
  items: NavItem[];
  /** Default: sign out; the auth gate then shows /login. */
  onLogout?: () => void;
};

/**
 * Floating glass tab bar for phones (< WIDE), both sides, in the style of the iOS tab bar:
 * filled glyph + tint for the selected tab, outline glyphs for the rest. Ends with Log out.
 */
export function BottomBar({ items, onLogout = logout }: Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const selectedIndex = Math.max(
    items.findIndex((item) => item.active),
    0,
  );
  const [rowWidth, setRowWidth] = useState(0);
  const offset = useRef(new Animated.Value(0)).current;
  const stretch = useRef(new Animated.Value(1)).current;
  const previousIndex = useRef(selectedIndex);
  const measured = useRef(false);
  const slotWidth = rowWidth > 0 ? (rowWidth - space.sm) / (items.length + 1) : 0;

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
          toValue: 1 + Math.min(distance, 2) * 0.07,
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
    setRowWidth(event.nativeEvent.layout.width);
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom - 8, 0) + BAR_MARGIN }]}>
      <GlassCard padding={0} radius={radii.pill} intensity={70} style={styles.glass}>
        <View accessibilityRole="tablist" style={styles.row} onLayout={handleLayout}>
          {slotWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.indicator,
                {
                  width: slotWidth,
                  transform: [{ translateX: offset }, { scaleX: stretch }],
                },
              ]}
            />
          ) : null}
          {items.map((item) => (
            <Link key={item.label} href={item.href} asChild>
              <BarButton label={item.label} icon={item.icon} active={item.active} />
            </Link>
          ))}
          <BarButton label="Log out" icon="log-out-outline" onPress={onLogout} />
        </View>
      </GlassCard>
    </View>
  );
}

type ButtonProps = { label: string; icon: IconName; active?: boolean; onPress?: () => void };

// Link (asChild) injects onPress/href, so this accepts and forwards extra props.
function BarButton({ label, icon, active = false, onPress, ...linkProps }: ButtonProps & Record<string, unknown>) {
  return (
    <Pressable
      {...linkProps}
      onPress={onPress}
      accessibilityRole={linkProps.href ? 'tab' : 'button'}
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={active ? icon : outlineIcon(icon)} size={23} color={active ? colors.seagrass : colors.textMuted} />
      <Text variant="caption" weight={active ? 700 : 500} muted={!active} numberOfLines={1} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center' },
  glass: { width: '100%', maxWidth: 440 },
  row: { flexDirection: 'row', height: BAR_HEIGHT, padding: space.xs },
  indicator: {
    position: 'absolute',
    top: space.xs,
    bottom: space.xs,
    left: space.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.seagrassTint,
  },
  button: { flex: 1, zIndex: 1, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', gap: 1 },
  label: { fontSize: 11, lineHeight: 13 },
});
