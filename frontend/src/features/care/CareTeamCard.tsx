import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';
import { Card, PillButton, Text } from '@/components';
import { AuthField } from '@/features/auth/AuthField';
import { useAuth } from '@/features/auth/AuthProvider';
import { friendlyError } from '@/features/auth/errors';
import { colors, space } from '@/lib/theme';
import { claimCareCode } from './api';

/** Home's dark tile: who the patient shares results with, or a field to link a clinician by care code. */
export function CareTeamCard() {
  const { patient, refresh } = useAuth();
  const [code, setCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linked = patient?.clinicianId != null;

  const link = async () => {
    if (!code.trim()) {
      setError('Enter the care code from your clinician.');
      return;
    }
    setLinking(true);
    setError(null);
    try {
      await claimCareCode(code);
      setCode('');
      await refresh();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLinking(false);
    }
  };

  return (
    <Card tone="dark" style={{ flex: 1, gap: space.md, minHeight: 160 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.whiteTint, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={linked ? 'medkit' : 'link'} size={19} color={colors.onDark} />
        </View>
        <Text variant="callout" weight={700} muted>
          Care team
        </Text>
      </View>

      {linked ? (
        <View style={{ gap: space.xs }}>
          <Text variant="headline">{patient?.clinicianName ?? 'Your clinician'}</Text>
          <Text variant="callout" muted>
            Sees your session scores and can leave notes.
          </Text>
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          <View style={{ gap: space.xs }}>
            <Text variant="headline">Connect your clinician</Text>
            <Text variant="callout" muted>
              Enter the care code they gave you to share your session scores.
            </Text>
          </View>
          <AuthField
            label="Care code"
            placeholder="Care code, e.g. K7QM-4XPR"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={9}
            returnKeyType="done"
            onSubmitEditing={link}
          />
          {error ? (
            <Text variant="callout" weight={700} color={colors.cherry}>
              {error}
            </Text>
          ) : null}
          <PillButton
            label={linking ? 'Linking…' : 'Link clinician'}
            icon="link"
            variant="secondary"
            fullWidth
            disabled={linking}
            onPress={link}
          />
        </View>
      )}
    </Card>
  );
}
