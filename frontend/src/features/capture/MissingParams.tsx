import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Card, PillButton, ScreenContainer, Text } from '@/components';
import { colors, space } from '@/lib/theme';

/** Shown when a later track step is opened without a valid motion / method (e.g. a deep link). */
export function MissingParams() {
  return (
    <ScreenContainer maxWidth={560} contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <Card style={{ alignItems: 'center', gap: space.lg, paddingVertical: space.xxl }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.burntOrangeTint, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="compass" size={30} color={colors.burntOrange} />
        </View>
        <View style={{ gap: space.xs }}>
          <Text variant="title" align="center">
            Let's start from the top
          </Text>
          <Text muted align="center">
            Pick what you're tracking and how, then we'll set up your phone.
          </Text>
        </View>
        <PillButton label="Choose a motion" icon="chevron-forward" iconRight size="lg" style={{ alignSelf: 'center' }} onPress={() => router.replace('/track/motion-type')} />
      </Card>
    </ScreenContainer>
  );
}
