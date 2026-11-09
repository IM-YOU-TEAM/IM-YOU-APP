import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Card, Text } from '@/components';
import { friendlyError } from '@/features/auth/errors';
import { frequencyLabel, MOTION_LABELS } from '@/lib/data';
import { colors, continuous, radii, space } from '@/lib/theme';
import { useLoader } from '@/lib/useLoader';
import type { CareTask, Session } from '@/types';
import { fetchTaskChecks, tickTask, untickTask } from './api';
import { progressLabel, taskStatuses, weekStart, type TaskCheck, type TaskStatus } from './progress';

type Props = {
  patientId: string;
  tasks: CareTask[];
  sessions: Session[];
  /** Today, "YYYY-MM-DD". */
  day: string;
};

const CIRCLE = 26;

/** Home tile: the recordings the doctor assigned. Tick one off, or tap it to start recording. */
export function TaskList({ patientId, tasks, sessions, day }: Props) {
  const loaded = useLoader(() => fetchTaskChecks(patientId, weekStart(day)), [patientId, day]);
  const [local, setLocal] = useState<TaskCheck[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setLocal(null), [loaded.data]);

  const checks = local ?? loaded.data ?? [];
  const statuses = taskStatuses(tasks, sessions, checks, day);
  const done = statuses.filter((s) => s.complete).length;

  const toggle = async (status: TaskStatus) => {
    const { motion } = status.task;
    const untick = status.tickedToday;
    const previous = checks;
    setLocal(untick ? checks.filter((c) => !(c.motion === motion && c.day === day)) : [...checks, { motion, day }]);
    setBusy(true);
    setError(null);
    try {
      if (untick) await untickTask(patientId, motion, day);
      else await tickTask(patientId, motion, day);
    } catch (e) {
      setLocal(previous);
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ flex: 1, gap: space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm }}>
        <Text variant="title" accessibilityRole="header">
          My tasks
        </Text>
        {tasks.length > 0 ? (
          <Text variant="callout" weight={700} muted>
            {done} of {tasks.length} done
          </Text>
        ) : null}
      </View>

      {tasks.length === 0 ? (
        <Text variant="callout" muted>
          Your doctor has not assigned any recordings yet.
        </Text>
      ) : (
        <View accessibilityRole="list" style={{ gap: space.sm }}>
          {statuses.map((status) => (
            <TaskRow key={status.task.motion} status={status} busy={busy} onToggle={() => toggle(status)} />
          ))}
        </View>
      )}

      {error ? (
        <Text variant="callout" weight={700} color={colors.cherry}>
          {error}
        </Text>
      ) : null}
    </Card>
  );
}

function TaskRow({ status, busy, onToggle }: { status: TaskStatus; busy: boolean; onToggle: () => void }) {
  const { motion, timesPerWeek } = status.task;
  const label = MOTION_LABELS[motion];
  // Done by a recording or by an earlier day's tick: nothing to undo here.
  const locked = status.complete && !status.tickedToday;
  const progress = progressLabel(status);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingLeft: space.md,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: status.complete ? colors.honeydewLight : colors.white,
        ...continuous,
      }}
    >
      <Pressable
        onPress={onToggle}
        disabled={busy || locked}
        hitSlop={9}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: status.complete, disabled: busy || locked }}
        accessibilityLabel={`${label}, ${frequencyLabel(timesPerWeek)}, ${progress}`}
        accessibilityHint={locked ? undefined : status.complete ? 'Untick for today' : 'Tick off for today'}
        style={({ pressed }) => ({
          width: CIRCLE,
          height: CIRCLE,
          borderRadius: CIRCLE / 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: status.complete ? colors.seagrass : colors.separator,
          backgroundColor: status.complete ? colors.seagrass : colors.white,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        {status.complete ? <Ionicons name="checkmark" size={16} color={colors.onSeagrass} /> : null}
      </Pressable>

      <Pressable
        onPress={() => router.push({ pathname: '/track/method', params: { motion } })}
        accessibilityRole="button"
        accessibilityLabel={`Record ${label.toLowerCase()}`}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          paddingVertical: space.md,
          paddingRight: space.md,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text
            variant="body"
            weight={700}
            muted={status.complete}
            numberOfLines={1}
            style={status.complete ? { textDecorationLine: 'line-through' } : undefined}
          >
            {label}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: space.md, rowGap: 2 }}>
            <Meta icon="calendar-clear-outline" text={frequencyLabel(timesPerWeek)} />
            <Meta icon="checkmark-done-outline" text={progress} />
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function Meta({ icon, text }: { icon: 'calendar-clear-outline' | 'checkmark-done-outline'; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon} size={13} color={colors.textMuted} />
      <Text variant="caption" muted>
        {text}
      </Text>
    </View>
  );
}
