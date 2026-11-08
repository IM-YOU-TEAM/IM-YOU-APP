import { createContext, useContext, type ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, GAP, MAX_CONTENT_WIDTH, space, WIDE } from '@/lib/theme';
import { useBottomBarInset } from './BottomBar';
import { TopographicBackground } from './TopographicBackground';

const TopChrome = createContext(false);
/** True when a TopBar already covers the status-bar inset. */
export const TopChromeProvider = TopChrome.Provider;
const useTopChrome = () => useContext(TopChrome);

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
  /** Show the quiet contour-map texture used in signed-in workspaces. */
  showTopography?: boolean;
};

/**
 * Page wrapper: Honeydew background, safe areas, consistent padding, centered max width,
 * and room for the floating bottom bar on phones. Every screen starts with this.
 */
export function ScreenContainer({
  children,
  scroll = true,
  maxWidth = MAX_CONTENT_WIDTH,
  gap = GAP,
  contentStyle,
  showTopography = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const barInset = useBottomBarInset();
  const topChrome = useTopChrome();
  const wide = useWindowDimensions().width >= WIDE;

  const padding: ViewStyle = {
    paddingTop: (topChrome ? 0 : insets.top) + (wide ? space.xl : space.md),
    paddingBottom: insets.bottom + barInset + (wide ? space.xxl : space.xl),
    paddingHorizontal: wide ? space.xxl : space.lg + 4, // 20pt phone margins, like iOS
  };
  const column: StyleProp<ViewStyle> = [{ width: '100%', maxWidth, alignSelf: 'center', gap }, contentStyle];

  if (!scroll) {
    return (
      <View style={styles.background}>
        {showTopography ? <TopographicBackground /> : null}
        <View style={[styles.fill, padding]}>
          <View style={[styles.fill, column]}>{children}</View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.background}>
      {showTopography ? <TopographicBackground /> : null}
      <ScrollView
        style={styles.fill}
        contentContainerStyle={[styles.scrollContent, padding]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={column}>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.honeydew,
  },
  fill: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
