import { router } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import { BarChart, BentoGrid, Card, ListCard, LoadState, PillButton, ScreenContainer, Text } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { CareTeamCard } from '@/features/care/CareTeamCard';
import { fetchSessions } from '@/features/results/api';
import { MOTION_ICONS, today } from '@/lib/data';
import { formatLongDate } from '@/lib/format';
import { space, WIDE } from '@/lib/theme';
import { useLoader } from '@/lib/useLoader';
import { EmptyState } from '@/features/results/EmptyState';
import { greetingFor, recentSessions, sessionRow, sessionScoreLabel, weekCounts } from '@/features/results/derive';

export default function HomeScreen() {
  const wide = useWindowDimensions().width >= WIDE;
  const { patient } = useAuth();
  const patientId = patient?.id;
  const sessions = useLoader(() => (patientId ? fetchSessions(patientId) : Promise.resolve([])), [patientId]);
  const day = today();
  const list = sessions.data ?? [];
  const week = weekCounts(list, day);
  const weekTotal = week.reduce((sum, d) => sum + d.value, 0);
  const recent = recentSessions(list);
  const startTracking = () => router.push('/track/motion-type');

  return (
    <ScreenContainer gap={wide ? 24 : 16}>
      {/* Greeting + main action */}
      <View
        style={{
          flexDirection: wide ? 'row' : 'column',
          alignItems: wide ? 'flex-end' : 'stretch',
          justifyContent: 'space-between',
          gap: space.lg,
        }}
      >
        <View style={{ gap: space.xs }}>
          <Text variant="display" accessibilityRole="header">
            {greetingFor(new Date().getHours())}
            {patient?.fullName ? `, ${patient.fullName.split(' ')[0]}` : ''}
          </Text>
          <Text variant="body" muted>
            {formatLongDate(day)}
          </Text>
        </View>
        <PillButton label="Start tracking" icon="play" size="lg" fullWidth={!wide} onPress={startTracking} />
      </View>

      {/* This week + doctor */}
      <BentoGrid weights={[2, 1]}>
        <Card style={{ flex: 1, gap: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm }}>
            <Text variant="headline">Sessions this week</Text>
            <Text variant="callout" weight={700} muted>
              {weekTotal === 0 ? 'None yet' : `${weekTotal} total`}
            </Text>
          </View>
          {/* Today (last bar) gets the Cherry Blossom highlight once it has a session. */}
          <BarChart
            data={week}
            highlightIndex={week[6].value > 0 ? 6 : undefined}
            accessibilityLabel="Sessions per day, last 7 days"
          />
          {weekTotal === 0 && (
            <Text variant="callout" muted>
              Each session you track fills in a bar for that day.
            </Text>
          )}
        </Card>

        <CareTeamCard />
      </BentoGrid>

      {/* Recent sessions */}
      <Card style={{ gap: space.md }}>
        <Text variant="headline">Recent sessions</Text>
        {sessions.data === undefined ? (
          <LoadState error={sessions.error} onRetry={sessions.reload} />
        ) : recent.length > 0 ? (
          <View style={{ gap: space.sm }}>
            {recent.map((s) => {
              const row = sessionRow(s);
              return (
                <ListCard
                  key={s.id}
                  title={row.title}
                  subtitle={row.subtitle}
                  icon={MOTION_ICONS[s.motion]}
                  trailing={sessionScoreLabel(s)}
                  accessibilityLabel={`${row.title}, ${row.subtitle}, movement score ${sessionScoreLabel(s)}`}
                  onPress={() => router.push(`/results?sessionId=${s.id}`)}
                />
              );
            })}
          </View>
        ) : (
          <EmptyState icon="walk" title="No sessions yet" line="Your sessions will show up here after you track one." />
        )}
      </Card>
    </ScreenContainer>
  );
}
