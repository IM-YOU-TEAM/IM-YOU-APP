import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components';
import { colors, continuous, radii, space } from '@/lib/theme';
import type { IconName } from '@/types';
import type { Role } from './AuthProvider';

const OPTIONS = [
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
] as const satisfies readonly { value: Role; label: string; description: string; icon: IconName }[];

type OptionProps = {
  value: Role;
  label: string;
  description: string;
  icon: IconName;
  selected: boolean;
  onPress: (value: Role) => void;
};

function RoleOption({ value, label, description, icon, selected, onPress }: OptionProps) {
  return (
    <Pressable
      onPress={() => onPress(value)}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label}. ${description}`}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color={colors.seagrass} />
      <View style={styles.copy}>
        <Text variant="headline">{label}</Text>
        <Text variant="callout" muted>
          {description}
        </Text>
      </View>
      <View style={styles.checkSlot}>
        <View style={[styles.ring, selected ? styles.ringOn : styles.ringOff]}>
          {selected ? <View style={styles.dot} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

/** The one place the two account types are offered, so they read the same everywhere. */
export function RolePicker({ role, onChange }: { role: Role; onChange: (role: Role) => void }) {
  return (
    <View accessibilityRole="radiogroup" style={styles.group}>
      {OPTIONS.map((option, index) => (
        <View key={option.value}>
          {index > 0 ? <View style={styles.separator} /> : null}
          <RoleOption {...option} selected={role === option.value} onPress={onChange} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    ...continuous,
  },
  option: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  optionSelected: {
    backgroundColor: colors.seagrassTint,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  checkSlot: {
    width: 22,
    alignItems: 'center',
  },
  ring: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOn: {
    borderColor: colors.seagrass,
  },
  ringOff: {
    borderColor: colors.border,
  },
  dot: {
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
  pressed: {
    opacity: 0.65,
  },
});
