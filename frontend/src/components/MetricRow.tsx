import { Fragment } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, space } from '@/lib/theme';
import { Text } from './Text';

export type Metric = { label: string; value: string };

type Props = {
  items: Metric[];
  style?: StyleProp<ViewStyle>;
};

/** A row of label/value pairs split by thin dividers, e.g. Age | Sessions | Adherence. */
export function MetricRow({ items, style }: Props) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'stretch' }, style]}>
      {items.map((m, i) => (
        <Fragment key={m.label}>
          {i > 0 && <View style={{ width: 1, backgroundColor: colors.border, marginHorizontal: space.md }} />}
          <View
            style={{ flex: 1, gap: 2 }}
            accessible
            accessibilityLabel={`${m.label}: ${m.value}`}
          >
            <Text variant="headline" numberOfLines={1}>
              {m.value}
            </Text>
            <Text variant="caption" muted numberOfLines={1}>
              {m.label}
            </Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}
