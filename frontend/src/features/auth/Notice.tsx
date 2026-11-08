import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { Text } from '@/components';
import { colors, continuous, radii, space } from '@/lib/theme';

export type NoticeTone = 'error' | 'info';

export type NoticeMessage = { tone: NoticeTone; text: string };

/** Inline message under a form. Errors use the screen's Cherry Blossom highlight. */
export function Notice({ tone, text }: NoticeMessage) {
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space.sm,
        paddingVertical: space.md,
        paddingHorizontal: space.lg,
        borderRadius: radii.md,
        backgroundColor: tone === 'error' ? colors.cherry : colors.seagrassTint,
        ...continuous,
      }}
    >
      <Ionicons
        name={tone === 'error' ? 'alert-circle' : 'information-circle'}
        size={20}
        color={tone === 'error' ? colors.graphite : colors.seagrass}
        style={{ marginTop: -1 }}
      />
      <Text variant="callout" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}
