import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { createContext, useContext, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, space } from '@/lib/theme';
import type { IconName } from '@/types';
import { GlassCard } from './GlassCard';
import { logout, type NavItem } from './Sidebar';
import { Text } from './Text';

const BAR_HEIGHT = 68;
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

/** Floating glass tab bar for phones (< WIDE), both sides. Ends with a Log out button. */
export function BottomBar({ items, onLogout = logout }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + BAR_MARGIN }]}
    >
      <GlassCard padding={0} radius={radii.pill} intensity={60} style={{ width: '100%', maxWidth: 480 }}>
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
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      {...linkProps}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole={linkProps.href ? 'tab' : 'button'}
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={styles.button}
    >
      <View
        style={[
          styles.iconPill,
          { backgroundColor: active ? colors.seagrass : hovered ? colors.seagrassTint : 'transparent' },
        ]}
      >
        <Ionicons name={icon} size={20} color={active ? colors.onSeagrass : colors.graphite} />
      </View>
      <Text variant="caption" weight={active ? 800 : 600} muted={!active} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center' },
  row: { flexDirection: 'row', height: BAR_HEIGHT, paddingHorizontal: space.sm },
  button: { flex: 1, minWidth: 64, alignItems: 'center', justifyContent: 'center', gap: 2 },
  iconPill: { width: 48, height: 30, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
});
