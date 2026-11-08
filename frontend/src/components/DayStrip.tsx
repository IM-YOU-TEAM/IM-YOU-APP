import { useState } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { addDays, formatLongDate, formatWeekday, parseLocal } from '@/lib/format';
import { today } from '@/lib/data';
import { colors, radii, space } from '@/lib/theme';
import { Text } from './Text';

type Props = {
  /** Selected day as "YYYY-MM-DD". */
  selected: string;
  onSelect: (day: string) => void;
  /** Last day shown ("YYYY-MM-DD"). The strip shows the 7 days ending here. Default today. */
  endDate?: string;
  /** Days ("YYYY-MM-DD") that get a small dot, e.g. days with sessions. */
  marked?: string[];
  style?: StyleProp<ViewStyle>;
};

/** One week of day pills. Selected day = Seagrass pill. */
export function DayStrip({ selected, onSelect, endDate = today(), marked = [], style }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(endDate, i - 6));
  return (
    <View style={[{ flexDirection: 'row', gap: space.xs + 2 }, style]}>
      {days.map((day) => (
        <DayPill
          key={day}
          day={day}
          selected={day === selected}
          marked={marked.includes(day)}
          onPress={() => onSelect(day)}
        />
      ))}
    </View>
  );
}

function DayPill({ day, selected, marked, onPress }: { day: string; selected: boolean; marked: boolean; onPress: () => void }) {
  const [hovered, setHovered] = useState(false);
  const bg = selected ? colors.seagrass : hovered ? colors.honeydewLight : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${formatLongDate(day)}${marked ? ', has sessions' : ''}`}
      style={{
        flex: 1,
        minHeight: 72,
        borderRadius: radii.pill,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        paddingVertical: space.sm,
      }}
    >
      <Text variant="caption" weight={700} color={selected ? colors.onSeagrass : colors.textMuted}>
        {formatWeekday(day)}
      </Text>
      <Text variant="headline" color={selected ? colors.onSeagrass : colors.text}>
        {parseLocal(day).getDate()}
      </Text>
      <View
        style={{
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: marked ? (selected ? colors.white : colors.seagrass) : 'transparent',
        }}
      />
    </Pressable>
  );
}
