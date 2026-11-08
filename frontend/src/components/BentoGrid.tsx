import { Children, type ReactNode } from 'react';
import { useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { GAP, WIDE } from '@/lib/theme';

type Props = {
  children: ReactNode;
  /** 'row' lays children side by side on wide screens and stacks them under WIDE. 'column' always stacks. */
  direction?: 'row' | 'column';
  /** Relative widths of the children in a wide row, e.g. [2, 1]. Default: equal. */
  weights?: number[];
  gap?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Bento layout helper: one consistent gutter, rows that collapse to a single column on phones.
 * Nest a direction="column" grid inside a row cell for stacked blocks.
 * Give a Card style={{ flex: 1 }} if it should fill its cell's height.
 */
export function BentoGrid({ children, direction = 'row', weights, gap = GAP, style }: Props) {
  const { width } = useWindowDimensions();
  const row = direction === 'row' && width >= WIDE;
  return (
    <View style={[{ flexDirection: row ? 'row' : 'column', gap, flexGrow: 1 }, style]}>
      {Children.toArray(children).map((child, i) => (
        <View key={i} style={row ? { flex: weights?.[i] ?? 1 } : { flexGrow: 1 }}>
          {child}
        </View>
      ))}
    </View>
  );
}
