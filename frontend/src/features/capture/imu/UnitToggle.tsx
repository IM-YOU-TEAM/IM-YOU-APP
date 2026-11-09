import { Pressable, View } from 'react-native';
import { Text } from '@/components';
import { colors, MIN_HIT, radii, space } from '@/lib/theme';

export type UnitOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly UnitOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

/** Compact unit chips for the dark graph cards. Selected chip is Seagrass. */
export function UnitToggle<T extends string>({ options, value, onChange, accessibilityLabel }: Props<T>) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={{
              minHeight: MIN_HIT,
              paddingHorizontal: space.md,
              borderRadius: radii.pill,
              backgroundColor: selected ? colors.seagrass : colors.whiteTint,
              justifyContent: 'center',
            }}
          >
            <Text variant="callout" weight={600} color={selected ? colors.onSeagrass : colors.onDark} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
