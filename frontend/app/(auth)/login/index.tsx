import { router } from 'expo-router';
import { View } from 'react-native';
import { Card, Logo, PillButton, ScreenContainer, Text } from '@/components';
import { space } from '@/lib/theme';

// Placeholder: replaced by the screen build. No real auth: login routes by role.
export default function LoginScreen() {
  return (
    <ScreenContainer maxWidth={440} contentStyle={{ flex: 1, justifyContent: 'center' }}>
      <Card style={{ gap: space.xl, padding: space.xxl }}>
        <Logo size={44} />
        <Text variant="title">Welcome back</Text>
        <View style={{ gap: space.md }}>
          <PillButton label="Continue as patient" icon="walk" fullWidth onPress={() => router.replace('/home')} />
          <PillButton
            label="Continue as clinician"
            icon="medkit"
            variant="secondary"
            fullWidth
            onPress={() => router.replace('/dashboard')}
          />
        </View>
      </Card>
    </ScreenContainer>
  );
}
