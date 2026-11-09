import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import {
  Card,
  ListCard,
  LoadState,
  MetricRow,
  PillButton,
  ScreenContainer,
  Text,
  type Metric,
} from '@/components';
import { SessionJointCurves } from '@/features/capture/imu/SessionJointCurves';
import { fetchRosterPatient, patientName } from '@/features/care/api';
import { TasksEditor } from '@/features/care/TasksEditor';
import { deleteSession, fetchSessions } from '@/features/results/api';
import { EmptyState } from '@/features/results/EmptyState';
import { PATIENT_STATUS_LABELS, sessionRow, sessionWhen } from '@/features/results/derive';
import { fetchTaskChecks } from '@/features/tasks/api';
import { taskStatuses, weekStart } from '@/features/tasks/progress';
import { MOTION_ICONS, MOTION_LABELS, today } from '@/lib/data';
import { formatDate } from '@/lib/format';
import { colors, continuous, radii, space, WIDE } from '@/lib/theme';
import { useLoader } from '@/lib/useLoader';

export default function PatientDetailScreen() {
  const params = useLocalSearchParams<{ patientId?: string | string[] }>();
  const patientId = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId;
  const wide = useWindowDimensions().width >= WIDE;
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loaded = useLoader(async () => {
    if (!patientId) return { patient: null, sessions: [], checks: [] };
    const [patient, sessions, checks] = await Promise.all([
      fetchRosterPatient(patientId),
      fetchSessions(patientId),
      fetchTaskChecks(patientId, weekStart(today())),
    ]);
    return { patient, sessions, checks };
  }, [patientId]);

  const back = (
    <PillButton label="Patients" icon="arrow-back" variant="ghost" onPress={() => router.replace('/dashboard')} />
  );

  if (!loaded.data) {
    return (
      <ScreenContainer gap={wide ? space.xl : space.lg}>
        {back}
        <Card>
          <LoadState error={loaded.error} onRetry={loaded.reload} minHeight={240} />
        </Card>
      </ScreenContainer>
    );
  }

  const { patient, sessions, checks } = loaded.data;

  if (!patient) {
    return (
      <ScreenContainer gap={space.xl}>
        <View style={{ gap: space.xs }}>
          <Text variant="display" accessibilityRole="header">
            Patient not found
          </Text>
          <Text variant="body" muted>
            This patient may no longer be on your care roster.
          </Text>
        </View>
        <Card style={{ gap: space.lg }}>
          <EmptyState
            icon="person-circle"
            title="We couldn't open this patient"
            line="Return to your patient list and choose another profile."
            action={false}
          />
          <PillButton
            label="Back to patients"
            icon="arrow-back"
            variant="secondary"
            fullWidth
            onPress={() => router.replace('/dashboard')}
          />
        </Card>
      </ScreenContainer>
    );
  }

  const latest = sessions.at(-1);
  const listed = [...sessions].reverse();
  // The picked session's predicted angles, or the latest sensor session that has them.
  const angled = sessions.filter((s) => s.jointAngles != null);
  const shown = angled.find((s) => s.id === pickedId) ?? angled.at(-1);

  const removeSession = async (sessionId: string) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteSession(sessionId);
      if (pickedId === sessionId) setPickedId(null);
      setConfirmId(null);
      loaded.reload();
    } catch {
      setDeleteError("That session didn't delete. Check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  };
  const metrics: Metric[] = [
    { label: 'Sessions', value: String(sessions.length) },
    { label: 'Last session', value: latest ? formatDate(latest.date) : 'None yet' },
  ];

  return (
    <ScreenContainer gap={wide ? space.xl : space.lg}>
      {back}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, flexWrap: 'wrap' }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={patient.status === 'waiting' ? 'hourglass' : 'person'} size={28} color={colors.seagrass} />
        </View>
        <View style={{ flex: 1, minWidth: 220, gap: space.xs }}>
          <Text variant="display" accessibilityRole="header" selectable>
            {patientName(patient)}
          </Text>
          <Text variant="body" muted>
            {PATIENT_STATUS_LABELS[patient.status]}
            {patient.linkedAt ? ` · since ${formatDate(patient.linkedAt)}` : ` · created ${formatDate(patient.createdAt)}`}
          </Text>
        </View>
      </View>

      <Card>
        <MetricRow items={metrics} />
      </Card>

      <TasksEditor
        key={patient.id}
        patientId={patient.id}
        tasks={patient.tasks}
        progress={taskStatuses(patient.tasks, sessions, checks, today())}
      />

      <View style={{ gap: space.md }}>
        <View style={{ gap: space.xs }}>
          <Text variant="headline">Joint angles</Text>
          <Text variant="callout" muted>
            {shown
              ? `${MOTION_LABELS[shown.motion]} · ${sessionWhen(shown)}`
              : 'Predicted hip, knee and ankle angles appear here after a phone-sensor session.'}
          </Text>
        </View>
        <SessionJointCurves session={shown} caption="No phone-sensor sessions with joint angles yet." />
      </View>

      <Card style={{ gap: space.md }}>
        <View style={{ gap: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm }}>
            <Text variant="headline">Sessions</Text>
            <Text variant="callout" weight={700} muted>
              {sessions.length === 0 ? 'None yet' : `${sessions.length} total`}
            </Text>
          </View>
          <Text variant="callout" muted>
            Delete a session to remove its scores and joint angles from this patient.
          </Text>
        </View>

        {listed.length > 0 ? (
          <View style={{ gap: space.sm }}>
            {listed.map((session) => {
              const row = sessionRow(session);
              return (
                <View key={session.id} style={{ gap: space.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <ListCard
                      title={row.title}
                      subtitle={row.subtitle}
                      icon={MOTION_ICONS[session.motion]}
                      chevron={false}
                      selected={session.jointAngles != null && session.id === shown?.id}
                      onPress={session.jointAngles != null ? () => setPickedId(session.id) : undefined}
                      accessibilityLabel={`${row.title}, ${row.subtitle}`}
                      style={{ flex: 1 }}
                    />
                    <PillButton
                      label="Delete"
                      icon="trash-outline"
                      variant="ghost"
                      onPress={() => {
                        setConfirmId(session.id);
                        setDeleteError(null);
                      }}
                      accessibilityLabel={`Delete ${row.title}`}
                    />
                  </View>
                  {confirmId === session.id ? (
                    <View
                      style={{
                        backgroundColor: colors.burntOrangeTint,
                        borderRadius: radii.md,
                        padding: space.lg,
                        gap: space.md,
                        ...continuous,
                      }}
                    >
                      <Text variant="callout">
                        Delete this session and its joint angles from this patient? This cannot be undone.
                      </Text>
                      {deleteError ? (
                        <Text variant="callout" color={colors.burntOrange} accessibilityRole="alert">
                          {deleteError}
                        </Text>
                      ) : null}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                        <PillButton
                          label="Keep session"
                          variant="secondary"
                          onPress={() => setConfirmId(null)}
                          disabled={deleting}
                        />
                        <PillButton
                          label={deleting ? 'Deleting…' : 'Delete session'}
                          icon="trash-outline"
                          onPress={() => void removeSession(session.id)}
                          disabled={deleting}
                        />
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon="analytics"
            title="No sessions yet"
            line={
              patient.status === 'waiting'
                ? 'Sessions appear here once your patient signs in and records one.'
                : "This patient's completed sessions will appear here."
            }
            action={false}
          />
        )}
      </Card>
    </ScreenContainer>
  );
}
