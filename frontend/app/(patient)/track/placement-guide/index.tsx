import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import { Card, PillButton, ScreenContainer, Text } from '@/components';
import { CameraSetup } from '@/features/capture/cv/CameraSetup';
import { FlowHeader } from '@/features/capture/FlowHeader';
import { BodyPlacement } from '@/features/capture/imu/BodyPlacement';
import { TwoPhonePlacement } from '@/features/capture/imu/TwoPhonePlacement';
import { MissingParams } from '@/features/capture/MissingParams';
import { parseMethod, parseMotion } from '@/features/capture/params';
import { BODY_SPOT_LABELS, CV_DISTANCE_M, IMU_SPOT, placementSteps, type PlacementStep } from '@/features/capture/placementSteps';
import { METHOD_LABELS, MOTION_LABELS } from '@/lib/data';
import { colors, GAP, space, WIDE } from '@/lib/theme';

// Step 3: where to put the phone, for the chosen motion + method.
export default function PlacementGuideScreen() {
  const wide = useWindowDimensions().width >= WIDE;
  const params = useLocalSearchParams();
  const motion = parseMotion(params.motion);
  const method = parseMethod(params.method);

  if (!motion || !method) return <MissingParams />;

  const steps = placementSteps(motion, method);
  const caption =
    method === 'cv'
      ? `Phone on the floor, ${CV_DISTANCE_M[motion]} m away, side view`
      : motion === 'walking' || motion === 'stairs'
        ? 'Phone 1 on the right thigh, phone 2 on the right shin'
        : `${BODY_SPOT_LABELS[IMU_SPOT[motion]]}${IMU_SPOT[motion] === 'lowerBack' ? ' (back view)' : ''}`;

  const drawing = (
    <Card style={{ gap: space.md, flex: wide ? 1 : undefined }}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Drawing: ${caption}`}
        style={{ height: method === 'cv' ? 220 : 280, flexGrow: wide ? 1 : 0 }}
      >
        {method === 'cv' ? (
          <CameraSetup motion={motion} />
        ) : motion === 'walking' || motion === 'stairs' ? (
          <TwoPhonePlacement />
        ) : (
          <BodyPlacement spot={IMU_SPOT[motion]} />
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm }}>
        <Ionicons name="location" size={18} color={colors.seagrass} />
        <Text variant="callout" weight={700}>
          {caption}
        </Text>
      </View>
    </Card>
  );

  return (
    <ScreenContainer maxWidth={1000} gap={space.xl}>
      <FlowHeader step={3} backTo={{ pathname: '/track/method', params: { motion, method } }} />
      <View style={{ gap: space.sm }}>
        <Text variant="display">Set up your phone</Text>
        <Text muted>
          {MOTION_LABELS[motion]}, tracked with your {METHOD_LABELS[method].toLowerCase()}. About a minute to get ready.
        </Text>
      </View>

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: GAP, alignItems: 'stretch' }}>
        {drawing}
        <View style={{ flex: wide ? 1 : undefined, gap: space.md }} accessibilityRole="list">
          {steps.map((s, i) => (
            <StepCard key={s.title} step={s} n={i + 1} />
          ))}
        </View>
      </View>

      <PillButton
        label="I'm ready"
        icon="arrow-forward"
        iconRight
        size="lg"
        onPress={() => router.push({ pathname: '/track/session', params: { motion, method } })}
        fullWidth={!wide}
        style={wide ? { alignSelf: 'flex-end' } : undefined}
      />
    </ScreenContainer>
  );
}

function StepCard({ step, n }: { step: PlacementStep; n: number }) {
  return (
    <Card padding={space.lg} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }} accessible accessibilityLabel={`Step ${n}: ${step.title}. ${step.detail}`}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.seagrass, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="callout" weight={800} color={colors.onSeagrass}>
          {n}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2, paddingTop: 4 }}>
        <Text variant="body" weight={700}>
          {step.title}
        </Text>
        <Text variant="callout" muted>
          {step.detail}
        </Text>
      </View>
      <Ionicons name={step.icon} size={22} color={colors.seagrass} style={{ paddingTop: 4 }} />
    </Card>
  );
}
