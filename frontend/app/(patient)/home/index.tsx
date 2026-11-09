import { useWindowDimensions, View } from 'react-native';
import { BentoGrid, ScreenContainer, Text } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { CareTeamCard } from '@/features/care/CareTeamCard';
import { fetchSessions } from '@/features/results/api';
import { greetingFor } from '@/features/results/derive';
import { TaskList } from '@/features/tasks/TaskList';
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
        {patient ? (
          <TaskList patientId={patient.id} tasks={patient.tasks} sessions={sessions.data ?? []} day={day} />
        ) : null}
        <CareTeamCard />
      </BentoGrid>
    </ScreenContainer>
  );
}
