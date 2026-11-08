import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Logo, PillButton, ScreenContainer, Text } from '@/components';
import { colors, continuous, MIN_HIT, radii, space } from '@/lib/theme';
import type { IconName } from '@/types';

type Role = 'patient' | 'clinician';

const ROLE_OPTIONS = [
  {
    value: 'patient',
    label: 'Patient',
    description: 'Track sessions and view progress',
    icon: 'walk',
  },
  {
    value: 'clinician',
    label: 'Professional',
    description: 'Clinicians, researchers, and organizations',
    icon: 'people',
  },
] as const;

type RoleOptionProps = {
  value: Role;
  label: string;
  description: string;
  icon: IconName;
  selected: boolean;
  onPress: (value: Role) => void;
};

function RoleOption({ value, label, description, icon, selected, onPress }: RoleOptionProps) {
  return (
    <Pressable
      onPress={() => onPress(value)}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label}. ${description}`}
      style={({ pressed }) => [
        styles.roleOption,
        selected && styles.roleOptionSelected,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.seagrass} />
      <View style={styles.roleCopy}>
        <Text variant="headline">{label}</Text>
        <Text variant="callout" muted>
          {description}
        </Text>
      </View>
      <View style={styles.checkSlot}>
        <View style={[styles.selectionRing, selected ? styles.selectionRingOn : styles.selectionRingOff]}>
          {selected ? <View style={styles.selectionDot} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function SignupScreen() {
  const [role, setRole] = useState<Role>('patient');

  const continueToWorkspace = () => {
    router.replace(role === 'patient' ? '/home' : '/dashboard');
  };

  return (
    <ScreenContainer
      maxWidth={400}
      gap={0}
      contentStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      <View style={styles.content}>
        <Logo size={46} />

        <View style={styles.heading}>
          <Text variant="title" align="center" accessibilityRole="header">
            Choose your role
          </Text>
          <Text variant="callout" muted align="center">
            Select how you'll use I'M U.
          </Text>
        </View>

        <View accessibilityRole="radiogroup" style={styles.roleGroup}>
          {ROLE_OPTIONS.map((option, index) => (
            <View key={option.value}>
              {index > 0 ? <View style={styles.separator} /> : null}
              <RoleOption
                {...option}
                selected={role === option.value}
                onPress={setRole}
              />
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <PillButton
            label="Continue"
            icon="arrow-forward"
            iconRight
            fullWidth
            onPress={continueToWorkspace}
          />

          <Pressable
            onPress={() => router.replace('/login')}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Text variant="callout" weight={600} color={colors.seagrass}>
              Back
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: space.xxl,
  },
  heading: {
    alignItems: 'center',
    gap: space.xs,
  },
  roleGroup: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    ...continuous,
  },
  roleOption: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  roleOptionSelected: {
    backgroundColor: colors.seagrassTint,
  },
  roleCopy: {
    flex: 1,
    gap: 2,
  },
  checkSlot: {
    width: 22,
    alignItems: 'center',
  },
  selectionRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionRingOn: {
    borderColor: colors.seagrass,
  },
  selectionRingOff: {
    borderColor: colors.border,
  },
  selectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.seagrass,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 54,
    backgroundColor: colors.separator,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    gap: space.sm,
  },
  backButton: {
    minHeight: MIN_HIT,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  pressed: {
    opacity: 0.65,
  },
});
