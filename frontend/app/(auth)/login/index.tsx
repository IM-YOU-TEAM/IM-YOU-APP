import { router } from 'expo-router';
import { View } from 'react-native';
import { GlassCard, Logo, PillButton, ScreenContainer, Text } from '@/components';
import { radii, space } from '@/lib/theme';

export default function LoginScreen() {
  return (
    <ScreenContainer
      maxWidth={560}
      gap={0}
      contentStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      <GlassCard
        padding={space.xxl}
        radius={radii.lg}
        intensity={55}
        style={{ width: '100%', maxWidth: 480 }}
      >
        <View style={{ width: '100%', alignItems: 'center', gap: space.xxl }}>
          <Logo size={56} />

          <Text variant="display" align="center" accessibilityRole="header">
            Welcome to I'M U
          </Text>

          <View style={{ width: '100%', gap: space.md }}>
            <PillButton
              label="Continue as patient"
              icon="walk"
              size="lg"
              fullWidth
              onPress={() => router.replace('/home')}
            />
            <PillButton
              label="Professional portal"
              icon="people"
              variant="secondary"
              size="lg"
              fullWidth
              onPress={() => router.replace('/dashboard')}
              accessibilityLabel="Professional portal for clinicians, researchers, and organizations"
            />
          </View>

          <View style={{ gap: space.xs, alignItems: 'center' }}>
            <Text variant="caption" muted align="center">
              For clinicians, researchers, and organization teams
            </Text>
          </View>
        </View>
      </GlassCard>
    </ScreenContainer>
  );
}
