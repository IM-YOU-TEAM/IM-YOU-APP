import { useWindowDimensions, View } from 'react-native';
import { BarChart, BentoGrid, Card, ScreenContainer, Text } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { CareTeamCard } from '@/features/care/CareTeamCard';
import { fetchSessions } from '@/features/results/api';
import { greetingFor, weekCounts } from '@/features/results/derive';
import { today } from '@/lib/data';
import { formatLongDate } from '@/lib/format';
import { space, WIDE } from '@/lib/theme';
import { useLoader } from '@/lib/useLoader';

export default function HomeScreen() {
  const wide = useWindowDimensions().width >= WIDE;
  const { patient } = useAuth();
  const patientId = patient?.id;
  const sessions = useLoader(() => (patientId ? fetchSessions(patientId) : Promise.resolve([])), [patientId]);
  const day = today();
  const list = sessions.data ?? [];
  const week = weekCounts(list, day);
  const weekTotal = week.reduce((sum, d) => sum + d.value, 0);

  return (
    <ScreenContainer gap={wide ? 24 : 16}>
      <View style={{ gap: space.xs }}>
        <Text variant="display" accessibilityRole="header">
          {greetingFor(new Date().getHours())}
          {patient?.fullName ? `, ${patient.fullName.split(' ')[0]}` : ''}
        </Text>
        <Text variant="body" muted>
          {formatLongDate(day)}
        </Text>
      </View>

      <BentoGrid weights={[2, 1]}>
        <Card style={{ flex: 1, gap: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm }}>
            <Text variant="headline">Sessions this week</Text>
            <Text variant="callout" weight={700} muted>
              {weekTotal === 0 ? 'None yet' : `${weekTotal} total`}
            </Text>
          </View>
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
    </ScreenContainer>
  );
}
