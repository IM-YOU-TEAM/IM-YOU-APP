import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { createContext, useContext } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { outlineIcon } from '@/lib/icons';
import { colors, radii, space } from '@/lib/theme';
import type { IconName } from '@/types';
import { GlassCard } from './GlassCard';
import { logout, type NavItem } from './Sidebar';
import { Text } from './Text';

const BAR_HEIGHT = 64;
const BAR_MARGIN = space.md;

/** Space the floating bar covers at the bottom of the screen (without the safe-area inset). */
export const BOTTOM_BAR_SPACE = BAR_HEIGHT + BAR_MARGIN;

// Layouts provide BOTTOM_BAR_SPACE while the bar is visible; ScreenContainer pads by it.
const BottomBarInset = createContext(0);
export const BottomBarInsetProvider = BottomBarInset.Provider;
export const useBottomBarInset = () => useContext(BottomBarInset);

type Props = {
  items: NavItem[];
  /** Default: go to /login. */
  onLogout?: () => void;
};

/**
 * Floating glass tab bar for phones (< WIDE), both sides, in the style of the iOS tab bar:
 * filled glyph + tint for the selected tab, outline glyphs for the rest. Ends with Log out.
 */
export function BottomBar({ items, onLogout = logout }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom - 8, 0) + BAR_MARGIN }]}>
      <GlassCard padding={0} radius={radii.pill} intensity={70} style={styles.glass}>
        <View accessibilityRole="tablist" style={styles.row}>
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
      style={({ pressed }) => [styles.button, active && styles.active, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={active ? icon : outlineIcon(icon)} size={23} color={active ? colors.burntOrange : colors.textMuted} />
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
  button: { flex: 1, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', gap: 1 },
  active: { backgroundColor: colors.seagrassTint },
  label: { fontSize: 11, lineHeight: 13 },
});
