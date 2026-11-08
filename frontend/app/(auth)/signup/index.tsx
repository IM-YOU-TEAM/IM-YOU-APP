import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Logo, PillButton, ScreenContainer, Text } from '@/components';
import { completeOnboarding, preferredRole, signOut, type Role } from '@/features/auth/auth';
import { AuthField } from '@/features/auth/AuthField';
import { useAuth } from '@/features/auth/AuthProvider';
import { friendlyError } from '@/features/auth/errors';
import { Notice } from '@/features/auth/Notice';
import { colors, continuous, MIN_HIT, radii, space } from '@/lib/theme';
import type { IconName } from '@/types';

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

// Shown once, right after the first sign-in: the account exists, it just needs a role.
export default function SignupScreen() {
  const { refresh, session } = useAuth();
  const preset = preferredRole(session?.user);
  const [role, setRole] = useState<Role>(preset ?? 'patient');
  const [careCode, setCareCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseRole = (next: Role) => {
    setRole(next);
    setError(null);
  };

  // The auth gate moves the person to their workspace once the refreshed profile has a role.
  const continueToWorkspace = async () => {
    setSaving(true);
    setError(null);
    try {
      await completeOnboarding(role === 'patient' ? { role, careCode } : { role, displayName });
      await refresh();
    } catch (e) {
      setError(friendlyError(e));
      setSaving(false);
    }
  };

  const switchAccount = () => {
    signOut().catch(() => undefined);
  };

  return (
    <ScreenContainer
      maxWidth={400}
      gap={0}
      showTopography={false}
      contentStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      <View style={styles.content}>
        <Logo size={46} />

        <View style={styles.heading}>
          <Text variant="title" align="center" accessibilityRole="header">
            {preset ? 'Finish setting up' : 'Choose your role'}
          </Text>
          <Text variant="callout" muted align="center">
            {preset
              ? `One last step for your ${preset === 'patient' ? 'patient' : 'professional'} account.`
              : "Select how you'll use I'M U."}
          </Text>
        </View>

        {preset ? null : (
          <View accessibilityRole="radiogroup" style={styles.roleGroup}>
            {ROLE_OPTIONS.map((option, index) => (
              <View key={option.value}>
                {index > 0 ? <View style={styles.separator} /> : null}
                <RoleOption
                  {...option}
                  selected={role === option.value}
                  onPress={chooseRole}
                />
              </View>
            ))}
          </View>
        )}

        <View style={styles.field}>
          {role === 'patient' ? (
            <>
              <AuthField
                key="care-code"
                label="Care code"
                placeholder="Care code"
                value={careCode}
                onChangeText={setCareCode}
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                maxLength={9}
                returnKeyType="done"
                onSubmitEditing={continueToWorkspace}
              />
              <Text variant="caption" muted style={styles.hint}>
                From your doctor or researcher, like K7QM-4XPR. It links your sessions to them.
              </Text>
            </>
          ) : (
            <>
              <AuthField
                key="display-name"
                label="Name patients see"
                placeholder="Name patients see, e.g. Dr. Rivera"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                maxLength={80}
                returnKeyType="done"
                onSubmitEditing={continueToWorkspace}
              />
              <Text variant="caption" muted style={styles.hint}>
                Shown to your linked patients next to your notes.
              </Text>
            </>
          )}
        </View>

        {error ? (
          <View style={{ width: '100%' }}>
            <Notice tone="error" text={error} />
          </View>
        ) : null}

        <View style={styles.actions}>
          <PillButton
            label={saving ? 'Setting up…' : 'Continue'}
            icon="arrow-forward"
            iconRight
            fullWidth
            disabled={saving}
            onPress={continueToWorkspace}
          />

          <Pressable
            onPress={switchAccount}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Text variant="callout" weight={600} color={colors.seagrass}>
              Use a different account
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
  field: {
    width: '100%',
    gap: space.sm,
    marginTop: -space.sm,
  },
  hint: {
    paddingHorizontal: space.xs,
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
