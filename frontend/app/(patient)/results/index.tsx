import { router } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import { Card, ListCard, LoadState, ScreenContainer, Text } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { EmptyState } from '@/features/results/EmptyState';
import { fetchSessions } from '@/features/results/api';
import { sessionRow } from '@/features/results/derive';
import { MOTION_ICONS } from '@/lib/data';
import { space, WIDE } from '@/lib/theme';
import { useLoader } from '@/lib/useLoader';

export default function ResultsListScreen() {
  const wide = useWindowDimensions().width >= WIDE;
  const { patient } = useAuth();
  const patientId = patient?.id;
  const loaded = useLoader(() => (patientId ? fetchSessions(patientId) : Promise.resolve([])), [patientId]);
  const recent = [...(loaded.data ?? [])].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <ScreenContainer gap={wide ? 24 : 16}>
      <View style={{ gap: space.xs }}>
        <Text variant="display" accessibilityRole="header">
          Results
        </Text>
        <Text variant="body" muted>
          Open a session to see what was measured.
        </Text>
      </View>

      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm }}>
          <Text variant="headline">Recent sessions</Text>
          <Text variant="callout" weight={700} muted>
            {loaded.data === undefined ? ' ' : recent.length === 0 ? 'None yet' : `${recent.length} total`}
          </Text>
        </View>
        {loaded.data === undefined ? (
          <LoadState error={loaded.error} onRetry={loaded.reload} minHeight={240} />
        ) : recent.length > 0 ? (
          <View style={{ gap: space.sm }}>
            {recent.map((session) => {
              const row = sessionRow(session);
              return (
                <ListCard
                  key={session.id}
                  title={row.title}
                  subtitle={row.subtitle}
                  icon={MOTION_ICONS[session.motion]}
                  accessibilityLabel={`${row.title}, ${row.subtitle}`}
                  onPress={() => router.push(`/results/${session.id}`)}
                />
              );
            })}
          </View>
        ) : (
          <EmptyState icon="stats-chart" title="No sessions yet" line="Track a session and it will show up here." />
        )}
      </Card>
    </ScreenContainer>
  );
}
