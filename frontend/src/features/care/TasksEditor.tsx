import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Card, Text } from '@/components';
import { friendlyError } from '@/features/auth/errors';
import { progressLabel, type TaskStatus } from '@/features/tasks/progress';
import { ALL_MOTIONS, frequencyLabel, MOTION_ICONS, MOTION_LABELS, TASK_FREQUENCIES } from '@/lib/data';
import { colors, continuous, radii, shadows, space } from '@/lib/theme';
import type { CareTask, MotionType } from '@/types';
import { setTasks } from './api';

type Props = {
  patientId: string;
  tasks: CareTask[];
  /** This week's progress per assigned task, by movement. */
  progress: TaskStatus[];
};

type SaveState = 'idle' | 'saving' | 'saved';

const DEFAULT_TIMES = 3;
const TRACK_W = 51;
const TRACK_H = 31;
const KNOB = 27;

function shortFrequency(n: number): string {
  return n >= 7 ? 'Daily' : `${n}×`;
}

/** Choose which recordings this patient must do and how often. Changes save in order, latest wins. */
export function TasksEditor({ patientId, tasks, progress }: Props) {
  const [current, setCurrent] = useState<CareTask[]>(tasks);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  // Refs, not state: quick taps must build on the newest plan, not the one from the last render.
  const latest = useRef<CareTask[]>(tasks);
  const saved = useRef<CareTask[]>(tasks);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const apply = (next: CareTask[]) => {
    latest.current = next;
    setCurrent(next);
    setError(null);
    setSaveState('saving');
    queue.current = queue.current.then(async () => {
      // A newer change is queued behind this one and will save the newest plan.
      if (latest.current !== next) return;
      try {
        await setTasks(patientId, next);
        saved.current = next;
        if (latest.current === next) setSaveState('saved');
      } catch (e) {
        latest.current = saved.current;
        setCurrent(saved.current);
        setSaveState('idle');
        setError(friendlyError(e));
      }
    });
  };

  const toggle = (motion: MotionType) => {
    const plan = latest.current;
    const on = plan.some((task) => task.motion === motion);
    const next = on ? plan.filter((task) => task.motion !== motion) : [...plan, { motion, timesPerWeek: DEFAULT_TIMES }];
    apply(ALL_MOTIONS.flatMap((m) => next.filter((task) => task.motion === m)));
  };

  const setTimes = (motion: MotionType, timesPerWeek: number) => {
    const plan = latest.current;
    if (plan.some((task) => task.motion === motion && task.timesPerWeek === timesPerWeek)) return;
    apply(plan.map((task) => (task.motion === motion ? { motion, timesPerWeek } : task)));
  };

  return (
    <Card style={{ gap: space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md }}>
        <View style={{ flex: 1, gap: space.xs }}>
          <Text variant="headline">Tasks</Text>
          <Text variant="callout" muted>
            Turn on the recordings this patient must do, then choose how often.
          </Text>
        </View>
        <Text variant="caption" weight={700} muted accessibilityLiveRegion="polite">
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : ''}
        </Text>
      </View>

      <View style={{ gap: space.sm }}>
        {ALL_MOTIONS.map((motion) => {
          const task = current.find((t) => t.motion === motion);
          const status = progress.find((s) => s.task.motion === motion);
          const label = MOTION_LABELS[motion];
          const detail = task
            ? status && status.task.timesPerWeek === task.timesPerWeek
              ? `${frequencyLabel(task.timesPerWeek)} · ${progressLabel(status)}`
              : frequencyLabel(task.timesPerWeek)
            : 'Not assigned';
          return (
            <View
              key={motion}
              style={{
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: task ? colors.seagrassTint : colors.border,
                backgroundColor: task ? colors.white : colors.honeydewLight,
                overflow: 'hidden',
                ...continuous,
              }}
            >
              <Pressable
                onPress={() => toggle(motion)}
                accessibilityRole="switch"
                accessibilityState={{ checked: task != null }}
                accessibilityLabel={`${label}, ${detail}`}
                accessibilityHint={task ? 'Removes this task' : 'Assigns this task'}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  minHeight: 64,
                  paddingHorizontal: space.md,
                  backgroundColor: pressed ? colors.fill : 'transparent',
                })}
              >
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
                    {detail}
                  </Text>
                </View>
                <Toggle on={task != null} />
              </Pressable>

              {task ? (
                <View style={{ paddingHorizontal: space.md, paddingBottom: space.md }}>
                  <View
                    accessibilityRole="radiogroup"
                    accessibilityLabel={`How often to record ${label.toLowerCase()}`}
                    style={{ flexDirection: 'row', padding: 3, gap: 3, borderRadius: radii.pill, backgroundColor: colors.fill }}
                  >
                    {TASK_FREQUENCIES.map((n) => {
                      const on = task.timesPerWeek === n;
                      return (
                        <Pressable
                          key={n}
                          onPress={() => setTimes(motion, n)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: on }}
                          accessibilityLabel={frequencyLabel(n)}
                          style={({ pressed }) => [
                            {
                              flex: 1,
                              minHeight: 40,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: radii.pill,
                              backgroundColor: on ? colors.seagrass : pressed ? colors.white : 'transparent',
                            },
                            on ? shadows.card : null,
                          ]}
                        >
                          <Text variant="callout" weight={700} color={on ? colors.onSeagrass : colors.graphite}>
                            {shortFrequency(n)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {error ? (
        <Text variant="callout" weight={700} color={colors.cherry} accessibilityRole="alert">
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

/** iOS-style switch drawn in place so the whole row is one big tap target. */
function Toggle({ on }: { on: boolean }) {
  return (
    <View
      style={{
        width: TRACK_W,
        height: TRACK_H,
        borderRadius: TRACK_H / 2,
        padding: (TRACK_H - KNOB) / 2,
        backgroundColor: on ? colors.seagrass : colors.separator,
        alignItems: on ? 'flex-end' : 'flex-start',
      }}
    >
      <View style={[{ width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: colors.white }, shadows.card]} />
    </View>
  );
}
