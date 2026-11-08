import { router, type Href } from 'expo-router';
import { View } from 'react-native';
import { PillButton } from '@/components';
import { colors, MIN_HIT, radii, space } from '@/lib/theme';

const STEPS = 4;

type Props = {
  /** 1 = motion type, 2 = method, 3 = placement guide, 4 = session. */
  step: number;
  /** Where Back goes when there is no history (e.g. a deep link). Omit to hide Back. */
  backTo?: Href;
};

/** Top row of every track step: a Back pill on the left, step progress dots on the right. */
export function FlowHeader({ step, backTo }: Props) {
  const goBack = () => {
    if (!backTo) return;
    if (router.canGoBack()) router.back();
    else router.replace(backTo);
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: MIN_HIT }}>
      {backTo ? <PillButton label="Back" icon="chevron-back" variant="ghost" onPress={goBack} style={{ marginLeft: -space.md }} /> : <View />}
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Step ${step} of ${STEPS}`}
        style={{ flexDirection: 'row', gap: space.xs + 2 }}
      >
        {Array.from({ length: STEPS }, (_, i) => (
          <View
            key={i}
            style={{
              width: i + 1 === step ? 24 : 8,
              height: 8,
              borderRadius: radii.pill,
              backgroundColor: i + 1 <= step ? colors.seagrass : colors.border,
            }}
          />
        ))}
      </View>
    </View>
  );
}
