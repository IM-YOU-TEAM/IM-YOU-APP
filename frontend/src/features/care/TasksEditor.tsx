import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Card, Text } from '@/components';
import { friendlyError } from '@/features/auth/errors';
import { progressLabel, type TaskStatus } from '@/features/tasks/progress';
import { ALL_MOTIONS, MOTION_ICONS, MOTION_LABELS, TASK_FREQUENCIES } from '@/lib/data';
import { colors, continuous, radii, space } from '@/lib/theme';
import type { CareTask, MotionType } from '@/types';
import { setTasks } from './api';

type Props = {
  patientId: string;
  tasks: CareTask[];
  /** This week's progress per assigned task, by movement. */
  progress: TaskStatus[];
};

const DEFAULT_TIMES = 3;

function shortFrequency(n: number): string {
  return n >= 7 ? 'Daily' : `${n}× a week`;
}

/** Choose which recordings this patient must do and how often. Each change saves. */
export function TasksEditor({ patientId, tasks, progress }: Props) {
  const [current, setCurrent] = useState<CareTask[]>(tasks);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (next: CareTask[]) => {
    const previous = current;
    setCurrent(next);
    setBusy(true);
    setError(null);
    try {
      await setTasks(patientId, next);
    } catch (e) {
      setCurrent(previous);
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (motion: MotionType, on: boolean) => {
    const others = current.filter((task) => task.motion !== motion);
    const next = on ? [...others, { motion, timesPerWeek: DEFAULT_TIMES }] : others;
    save(ALL_MOTIONS.flatMap((m) => next.filter((task) => task.motion === m)));
  };

  const setTimes = (motion: MotionType, timesPerWeek: number) =>
    save(current.map((task) => (task.motion === motion ? { motion, timesPerWeek } : task)));

  return (
    <Card style={{ gap: space.lg }}>
      <View style={{ gap: space.xs }}>
        <Text variant="headline">Tasks</Text>
        <Text variant="callout" muted>
          The recordings this patient must do and how often. They see them as a checklist on their home screen.
        </Text>
      </View>

      <View style={{ gap: space.sm }}>
        {ALL_MOTIONS.map((motion) => {
          const task = current.find((t) => t.motion === motion);
          const status = progress.find((s) => s.task.motion === motion);
          const label = MOTION_LABELS[motion];
          return (
            <View
              key={motion}
              style={{
                gap: space.md,
                padding: space.md,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: task ? colors.white : colors.honeydewLight,
                ...continuous,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: task ? colors.seagrassTint : colors.fill,
                  }}
                >
                  <Ionicons name={MOTION_ICONS[motion]} size={18} color={task ? colors.seagrass : colors.textMuted} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="body" weight={700}>
                    {label}
                  </Text>
                  <Text variant="caption" muted>
                    {task ? (status && status.task.timesPerWeek === task.timesPerWeek ? progressLabel(status) : 'Assigned') : 'Not assigned'}
                  </Text>
                </View>
                <Switch
                  value={task != null}
                  onValueChange={(on) => toggle(motion, on)}
                  disabled={busy}
                  trackColor={{ false: colors.separator, true: colors.seagrass }}
                  thumbColor={colors.white}
                  accessibilityLabel={`Assign ${label.toLowerCase()}`}
                />
              </View>

              {task ? (
                <View accessibilityRole="radiogroup" accessibilityLabel={`How often to record ${label.toLowerCase()}`} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
                  {TASK_FREQUENCIES.map((n) => {
                    const on = task.timesPerWeek === n;
                    return (
                      <Pressable
                        key={n}
                        onPress={() => setTimes(motion, n)}
                        disabled={busy || on}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on, disabled: busy }}
                        style={({ pressed }) => ({
                          minHeight: 36,
                          paddingHorizontal: space.md,
                          justifyContent: 'center',
                          borderRadius: radii.pill,
                          backgroundColor: on ? colors.seagrass : colors.fill,
                          opacity: pressed || (busy && !on) ? 0.7 : 1,
                          ...continuous,
                        })}
                      >
                        <Text variant="caption" weight={700} color={on ? colors.onSeagrass : colors.graphite}>
                          {shortFrequency(n)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {error ? (
        <Text variant="callout" weight={700} color={colors.cherry}>
          {error}
        </Text>
      ) : (
        <Text variant="caption" muted>
          {current.length === 0
            ? 'Nothing assigned. This patient cannot start a recording until you turn one on.'
            : `${current.length} ${current.length === 1 ? 'task' : 'tasks'} assigned`}
        </Text>
      )}
    </Card>
  );
}
