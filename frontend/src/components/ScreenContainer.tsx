import type { ReactNode } from 'react';
import { ScrollView, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, GAP, MAX_CONTENT_WIDTH, space, WIDE } from '@/lib/theme';
import { useBottomBarInset } from './BottomBar';

type Props = {
  children: ReactNode;
  /** Scrollable page (default). Pass false for full-screen layouts like the live session. */
  scroll?: boolean;
  /** Max content width on wide screens. Default MAX_CONTENT_WIDTH (1120). */
  maxWidth?: number;
  /** Vertical gap between direct children. Default GAP (16). */
  gap?: number;
  /** Extra styles for the centered content column. */
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Page wrapper: Honeydew background, safe areas, consistent padding, centered max width,
 * and room for the floating bottom bar on phones. Every screen starts with this.
 */
export function ScreenContainer({ children, scroll = true, maxWidth = MAX_CONTENT_WIDTH, gap = GAP, contentStyle }: Props) {
  const insets = useSafeAreaInsets();
  const barInset = useBottomBarInset();
  const wide = useWindowDimensions().width >= WIDE;

  const padding: ViewStyle = {
    paddingTop: insets.top + (wide ? space.xxl : space.lg),
    paddingBottom: insets.bottom + barInset + (wide ? space.xxl : space.xl),
    paddingHorizontal: wide ? space.xxl : space.lg + 4,
  };
  const column: StyleProp<ViewStyle> = [{ width: '100%', maxWidth, alignSelf: 'center', gap }, contentStyle];

  if (!scroll) {
    return (
      <View style={[{ flex: 1, backgroundColor: colors.honeydew }, padding]}>
        <View style={[{ flex: 1 }, column]}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.honeydew }}
      contentContainerStyle={[{ flexGrow: 1 }, padding]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={column}>{children}</View>
    </ScrollView>
  );
}
