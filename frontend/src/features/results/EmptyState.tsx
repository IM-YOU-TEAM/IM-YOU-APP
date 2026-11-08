import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { PillButton, Text } from '@/components';
import { colors, space } from '@/lib/theme';
import type { IconName } from '@/types';

type Props = {
  icon: IconName;
  title: string;
  line: string;
  /** Show a "Start tracking" button. Default true. */
  action?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Icon bubble + short title + one line + "Start tracking". Used when there is nothing to show yet. */
export function EmptyState({ icon, title, line, action = true, style }: Props) {
  return (
    <View style={[{ alignItems: 'center', gap: space.md, paddingVertical: space.xl }, style]}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.burntOrangeTint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={28} color={colors.burntOrange} />
      </View>
      <View style={{ gap: space.xs, alignItems: 'center', maxWidth: 320 }}>
        <Text variant="headline" align="center">
          {title}
        </Text>
        <Text variant="callout" muted align="center">
          {line}
        </Text>
      </View>
      {action && (
        <PillButton
          label="Start tracking"
          icon="add"
          onPress={() => router.push('/track/motion-type')}
          style={{ alignSelf: 'center', marginTop: space.xs }}
        />
      )}
    </View>
  );
}
