import { router } from 'expo-router';
import { View } from 'react-native';
import { Card, Logo, PillButton, ScreenContainer, Text } from '@/components';
import { space } from '@/lib/theme';

export default function LoginScreen() {
  return (
    <ScreenContainer maxWidth={480} contentStyle={{ flex: 1, justifyContent: 'center' }}>
      <Card style={{ gap: space.xxl, padding: space.xxl }}>
        <View style={{ gap: space.lg }}>
          <Logo size={52} />
          <View style={{ gap: space.sm }}>
            <Text variant="display" accessibilityRole="header">
              Welcome to I'M U
            </Text>
            <Text variant="body" muted>
              Choose the workspace that matches how you use the app.
            </Text>
          </View>
        </View>

        <View style={{ gap: space.md }}>
          <PillButton
            label="Continue as patient"
            icon="walk"
            size="lg"
            fullWidth
            onPress={() => router.replace('/home')}
          />
          <PillButton
            label="Continue as clinician"
            icon="medkit"
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => router.replace('/dashboard')}
          />
        </View>

        <View style={{ gap: space.sm, alignItems: 'center' }}>
          <Text variant="caption" muted align="center">
            This preview does not save personal or health information.
          </Text>
          <PillButton
            label="View access options"
            icon="arrow-forward"
            iconRight
            variant="ghost"
            onPress={() => router.replace('/signup')}
          />
        </View>
      </Card>
    </ScreenContainer>
  );
}
