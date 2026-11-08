import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Animated, Pressable, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { OnDark, Text } from '@/components';
import { colors, radii, shadows, space, WIDE } from '@/lib/theme';
import { usePressScale } from '@/lib/usePressScale';
import type { IconName } from '@/types';

type Props = {
  title: string;
  description: string;
  icon: IconName;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Big selectable card for the track flow (motion type, method). Acts as a radio button.
 * Selected = solid Seagrass with white bold text. Tall tile on wide screens, a row on phones.
 */
export function ChoiceCard({ title, description, icon, selected, onPress, style }: Props) {
  const wide = useWindowDimensions().width >= WIDE;
  const { scale, onPressIn, onPressOut } = usePressScale(0.98);
  const [hovered, setHovered] = useState(false);

  const bg = selected ? colors.seagrass : hovered ? colors.honeydewLight : colors.white;

  const body = (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      accessibilityLabel={`${title}. ${description}`}
      style={[styles.card, wide ? styles.tile : styles.row, { backgroundColor: bg }]}
    >
      <View style={[styles.bubble, wide && styles.bubbleLarge, { backgroundColor: selected ? colors.whiteTint : colors.seagrassTint }]}>
        <Ionicons name={icon} size={wide ? 30 : 26} color={selected ? colors.onSeagrass : colors.seagrass} />
      </View>
      <View style={{ flex: wide ? undefined : 1, gap: space.xs }}>
        <Text variant="headline">{title}</Text>
        {/* On Seagrass, secondary text stays bold so white passes contrast. */}
        <Text variant="callout" weight={selected ? 700 : 500} color={selected ? colors.onSeagrassMuted : undefined} muted>
          {description}
        </Text>
      </View>
      <View style={[styles.selectionRing, wide && styles.selectionCorner, selected ? styles.selectionRingOn : styles.selectionRingOff]}>
        {selected ? <View style={styles.selectionDot} /> : null}
      </View>
    </Pressable>
  );

  return (
    <Animated.View style={[{ transform: [{ scale }], borderRadius: radii.card }, shadows.card, style]}>
      {selected ? <OnDark>{body}</OnDark> : body}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.card, padding: space.xl - 4, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg, minHeight: 96 },
  tile: { gap: space.lg, minHeight: 168, justifyContent: 'flex-end' },
  bubble: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  bubbleLarge: { width: 64, height: 64, borderRadius: 32, marginBottom: 'auto' },
  selectionRing: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  selectionCorner: { position: 'absolute', top: space.xl - 4, right: space.xl - 4 },
  selectionRingOn: { borderColor: colors.white },
  selectionRingOff: { borderColor: colors.border },
  selectionDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.white },
});
