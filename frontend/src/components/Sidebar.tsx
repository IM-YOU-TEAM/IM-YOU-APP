import { Ionicons } from '@expo/vector-icons';
import { Link, router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { outlineIcon } from '@/lib/icons';
import { colors, continuous, MIN_HIT, radii, SIDEBAR_WIDTH, space } from '@/lib/theme';
import type { IconName } from '@/types';
import { GlassCard } from './GlassCard';
import { Logo } from './Logo';
import { Text } from './Text';

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

/** iPadOS-style sidebar for the clinician side on wide screens (>= WIDE): glass panel, Seagrass selection. */
export function Sidebar({ items, onLogout = logout }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <GlassCard
      padding={0}
      radius={radii.lg}
      intensity={50}
      style={[styles.panel, { marginTop: insets.top + space.lg, marginBottom: insets.bottom + space.lg }]}
    >
      <View accessibilityRole="navigation" style={styles.inner}>
        <View style={styles.logo}>
          <Logo size={32} />
        </View>
        <View style={{ gap: 2 }}>
          {items.map((item) => (
            <Link key={item.label} href={item.href} asChild>
              <SidebarRow label={item.label} icon={item.icon} active={item.active} />
            </Link>
          ))}
        </View>
        <View style={{ flex: 1 }} />
        <SidebarRow label="Log out" icon="log-out-outline" onPress={onLogout} />
      </View>
    </GlassCard>
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
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: active ? colors.seagrass : hovered ? colors.fill : 'transparent', opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Ionicons name={active ? icon : outlineIcon(icon)} size={21} color={active ? colors.onSeagrass : colors.burntOrange} />
      {/* White on Seagrass stays bold (brand contrast rule). */}
      <Text variant="body" weight={active ? 700 : 500} color={active ? colors.onSeagrass : colors.text}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { width: SIDEBAR_WIDTH, marginLeft: space.lg },
  inner: { flex: 1, padding: space.md, paddingTop: space.xl },
  logo: { paddingHorizontal: space.md, paddingBottom: space.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: MIN_HIT,
    paddingHorizontal: space.md,
    borderRadius: radii.sm + 2,
    ...continuous,
  },
});
