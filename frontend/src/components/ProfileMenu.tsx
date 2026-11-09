import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '@/features/auth/AuthProvider';
import { outlineIcon } from '@/lib/icons';
import { colors, continuous, MIN_HIT, radii, shadows, space } from '@/lib/theme';
import { Avatar } from './Avatar';
import { GlassCard } from './GlassCard';
import { logout } from './nav';
import { Text } from './Text';

type Variant = 'top' | 'bar';

type Props = {
  /** 'top' = avatar in the desktop chrome. 'bar' = a tab-sized control in the phone bar. */
  variant: Variant;
};

/** Avatar / Profile control. Opens a small sheet with the signed-in name and Log out. */
export function ProfileMenu({ variant }: Props) {
  const { profile, patient } = useAuth();
  const [open, setOpen] = useState(false);
  const name = patient?.fullName ?? profile?.displayName ?? 'You';
  const roleLabel = profile?.role === 'clinician' ? 'Clinical portal' : 'Patient';

  return (
    <>
      {variant === 'top' ? (
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Profile"
          style={({ pressed }) => [styles.topHit, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Avatar name={name} size={36} />
        </Pressable>
      ) : (
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Profile"
          style={({ pressed }) => [styles.barHit, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name={outlineIcon('person')} size={23} color={colors.textMuted} />
          <Text variant="caption" weight={500} muted numberOfLines={1} style={styles.barLabel}>
            Profile
          </Text>
        </Pressable>
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close profile">
          <Pressable onPress={() => undefined} accessibilityRole="none">
            <GlassCard padding={space.xl} radius={radii.lg} intensity={70} style={styles.sheet}>
              <View style={styles.who}>
                <Avatar name={name} size="lg" />
                <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                  <Text variant="headline" numberOfLines={2}>
                    {name}
                  </Text>
                  <Text variant="callout" muted>
                    {roleLabel}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  setOpen(false);
                  logout();
                }}
                accessibilityRole="button"
                accessibilityLabel="Log out"
                style={({ pressed }) => [styles.logout, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="log-out-outline" size={20} color={colors.graphite} />
                <Text variant="body" weight={600}>
                  Log out
                </Text>
              </Pressable>
            </GlassCard>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  topHit: { minWidth: MIN_HIT, minHeight: MIN_HIT, alignItems: 'center', justifyContent: 'center' },
  barHit: { flex: 1, zIndex: 1, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', gap: 1 },
  barLabel: { fontSize: 11, lineHeight: 13 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(60, 55, 68, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  sheet: { width: 320, maxWidth: '100%', ...shadows.card },
  // GlassCard wraps children in an inner View, so a gap on the sheet never reaches them.
  who: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginBottom: space.xl },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: MIN_HIT,
    paddingHorizontal: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.honeydewLight,
    ...continuous,
  },
});
