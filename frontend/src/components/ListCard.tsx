import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, shadows, space } from '@/lib/theme';
import { usePressScale } from '@/lib/usePressScale';
import type { IconName } from '@/types';
import { OnDark, Text } from './Text';

type Props = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  /** Short text on the right, e.g. "78" or "Nov 7". */
  trailing?: string;
  /** Show a chevron on the right. Default: true when onPress is set. */
  chevron?: boolean;
  /** Solid Seagrass with white text. Otherwise a pale card. */
  selected?: boolean;
  onPress?: () => void;
  /** Defaults to "title, subtitle". */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Row card: icon bubble, title + subtitle, trailing text / chevron. Use for session lists, patients, exercises. */
export function ListCard({ title, subtitle, icon, trailing, chevron, selected = false, onPress, accessibilityLabel, style }: Props) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.98);
  const [hovered, setHovered] = useState(false);
  const showChevron = chevron ?? !!onPress;
  const bg = selected ? colors.seagrass : hovered && onPress ? colors.white : colors.honeydewLight;
  const ink = selected ? colors.onSeagrass : colors.seagrass;

  const row = (
    <Pressable
      onPress={onPress}
      onPressIn={onPress ? onPressIn : undefined}
      onPressOut={onPress ? onPressOut : undefined}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { selected } : undefined}
      accessibilityLabel={accessibilityLabel ?? [title, subtitle, trailing].filter(Boolean).join(', ')}
      style={[styles.row, { backgroundColor: bg }, selected && shadows.card]}
    >
      {icon && (
        <View style={[styles.bubble, { backgroundColor: selected ? colors.whiteTint : colors.white }]}>
          <Ionicons name={icon} size={20} color={ink} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" weight={700} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          // On Seagrass, secondary text stays bold and white for contrast.
          <Text variant="callout" weight={selected ? 700 : 500} muted={!selected} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? (
        <Text variant="callout" weight={700}>
          {trailing}
        </Text>
      ) : null}
      {showChevron && <Ionicons name="chevron-forward" size={18} color={selected ? colors.onSeagrass : colors.textMuted} />}
    </Pressable>
  );

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      {selected ? <OnDark>{row}</OnDark> : row}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 64,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radii.md + 4,
  },
  bubble: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
