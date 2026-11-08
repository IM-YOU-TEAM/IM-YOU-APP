import { Ionicons } from '@expo/vector-icons';
import { Link, router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, MIN_HIT, radii, shadows, SIDEBAR_WIDTH, space } from '@/lib/theme';
import type { IconName } from '@/types';
import { Gloss } from './Gloss';
import { Logo } from './Logo';
import { OnDark, Text } from './Text';

export type NavItem = {
  label: string;
  icon: IconName;
  href: Href;
  active?: boolean;
};

type Props = {
  items: NavItem[];
  /** Default: go to /login. */
  onLogout?: () => void;
};

export const logout = () => router.replace('/login');

/** Glossy Seagrass navigation column for the clinician side on wide screens (>= WIDE). */
export function Sidebar({ items, onLogout = logout }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <OnDark>
      <View
        accessibilityRole="navigation"
        style={[styles.bar, { marginTop: insets.top + space.lg, marginBottom: insets.bottom + space.lg }, shadows.raised]}
      >
        {/* Fill + gloss in a clipped layer so the shadow is not clipped */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.fill]}>
          <Gloss />
        </View>
        <View style={{ paddingHorizontal: space.sm, paddingBottom: space.xxl }}>
          <Logo onDark size={36} />
        </View>
        <View style={{ gap: space.xs }}>
          {items.map((item) => (
            <Link key={item.label} href={item.href} asChild>
              <SidebarRow label={item.label} icon={item.icon} active={item.active} />
            </Link>
          ))}
        </View>
        <View style={{ flex: 1 }} />
        <SidebarRow label="Log out" icon="log-out-outline" onPress={onLogout} />
      </View>
    </OnDark>
  );
}

type RowProps = { label: string; icon: IconName; active?: boolean; onPress?: () => void };

// Link (asChild) injects onPress/href, so this accepts and forwards extra props.
function SidebarRow({ label, icon, active = false, onPress, ...linkProps }: RowProps & Record<string, unknown>) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      {...linkProps}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole={linkProps.href ? 'link' : 'button'}
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[styles.row, { backgroundColor: active ? colors.white : hovered ? colors.whiteTint : 'transparent' }]}
    >
      <Ionicons name={icon} size={22} color={active ? colors.seagrass : colors.onSeagrass} />
      <Text weight={700} color={active ? colors.graphite : colors.onSeagrass}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: SIDEBAR_WIDTH,
    marginLeft: space.lg,
    padding: space.lg,
    paddingTop: space.xl,
    borderRadius: radii.lg,
  },
  fill: { borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.seagrass },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: MIN_HIT + 4,
    paddingHorizontal: space.md,
    borderRadius: radii.pill,
  },
});
