import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Card, Text } from '@/components';
import { friendlyError } from '@/features/auth/errors';
import { ALL_MOTIONS, MOTION_ICONS, MOTION_LABELS } from '@/lib/data';
import { colors, continuous, radii, space } from '@/lib/theme';
import type { MotionType } from '@/types';
import { setAssignedMotions } from './api';

type Props = {
  patientId: string;
  assigned: MotionType[];
};

/** Toggle which movements this patient can see. Each tap saves. */
export function AssignedMotionsEditor({ patientId, assigned }: Props) {
  const [visible, setVisible] = useState<MotionType[]>(assigned);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (motion: MotionType) => {
    const next = visible.includes(motion) ? visible.filter((item) => item !== motion) : ALL_MOTIONS.filter((item) => item === motion || visible.includes(item));
    const previous = visible;
    setVisible(next);
    setBusy(true);
    setError(null);
    try {
      await setAssignedMotions(patientId, next);
    } catch (e) {
      setVisible(previous);
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: space.md }}>
      <View style={{ gap: space.xs }}>
        <Text variant="headline">Assigned movements</Text>
        <Text variant="callout" muted>
          Hidden movements do not appear when this patient starts tracking.
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {ALL_MOTIONS.map((motion) => {
          const on = visible.includes(motion);
          return (
            <Pressable
              key={motion}
              onPress={() => toggle(motion)}
              disabled={busy}
              accessibilityRole="switch"
              accessibilityState={{ checked: on, disabled: busy }}
              accessibilityLabel={`${MOTION_LABELS[motion]}, ${on ? 'visible' : 'hidden'}`}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.sm,
                  minHeight: 44,
                  paddingHorizontal: space.lg,
                  borderRadius: radii.pill,
                  backgroundColor: on ? colors.seagrass : colors.honeydewLight,
                  opacity: pressed || busy ? 0.7 : 1,
                  ...continuous,
                },
              ]}
            >
              <Ionicons name={MOTION_ICONS[motion]} size={16} color={on ? colors.onSeagrass : colors.graphite} />
              <Text variant="callout" weight={700} color={on ? colors.onSeagrass : colors.graphite}>
                {MOTION_LABELS[motion]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text variant="callout" weight={700} color={colors.cherry}>
          {error}
        </Text>
      ) : (
        <Text variant="caption" muted>
          {visible.length === 0
            ? 'Nothing assigned. This patient cannot start a session until you turn one on.'
            : `${visible.length} visible`}
        </Text>
      )}
    </Card>
  );
}
