import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, MAX_CONTENT_WIDTH, MIN_HIT, radii, shadows, space } from '@/lib/theme';
import type { IconName } from '@/types';
import { Gloss } from './Gloss';
import { Logo } from './Logo';
import { logout, type NavItem } from './Sidebar';
import { OnDark, Text } from './Text';

type Props = {
  items: NavItem[];
  /** Default: go to /login. */
  onLogout?: () => void;
};

/** Glossy Seagrass navigation bar across the top, for the patient side on wide screens (>= WIDE). */
export function TopBar({ items, onLogout = logout }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <OnDark>
      <View style={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.xxl, zIndex: 1 }}>
        <View accessibilityRole="navigation" style={[styles.bar, shadows.raised]}>
          {/* Fill + gloss in a clipped layer so the shadow is not clipped */}
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.fill]}>
            <Gloss />
          </View>
          <Logo onDark size={32} />
          <View style={styles.items}>
            {items.map((item) => (
              <Link key={item.label} href={item.href} asChild>
                <TopBarButton label={item.label} icon={item.icon} active={item.active} />
              </Link>
            ))}
          </View>
          <TopBarButton label="Log out" icon="log-out-outline" onPress={onLogout} />
        </View>
      </View>
    </OnDark>
  );
}

type ButtonProps = { label: string; icon: IconName; active?: boolean; onPress?: () => void };

// Link (asChild) injects onPress/href, so this accepts and forwards extra props.
function TopBarButton({ label, icon, active = false, onPress, ...linkProps }: ButtonProps & Record<string, unknown>) {
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
      style={[styles.button, { backgroundColor: active ? colors.white : hovered ? colors.whiteTint : 'transparent' }]}
    >
      <Ionicons name={icon} size={20} color={active ? colors.seagrass : colors.onSeagrass} />
      <Text weight={700} color={active ? colors.graphite : colors.onSeagrass}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xl,
    paddingVertical: space.sm,
    paddingLeft: space.xl,
    paddingRight: space.sm,
    borderRadius: radii.pill,
  },
  fill: { borderRadius: radii.pill, overflow: 'hidden', backgroundColor: colors.seagrass },
  items: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: space.xs },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: MIN_HIT + 4,
    paddingHorizontal: space.lg,
    borderRadius: radii.pill,
  },
});
