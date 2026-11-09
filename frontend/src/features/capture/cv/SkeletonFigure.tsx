import { Circle, G, Line, Rect } from 'react-native-svg';
import type { MotionType } from '@/types';
import { GROUND_Y, HEAD_R, poseAt, SEAT, type Point } from './pose';

type Props = {
  motion: MotionType;
  /** Animation time in seconds (see usePhase). */
  t: number;
  bone: string;
  joint: string;
  /** Chair, ground line: drawn in this color. */
  scenery: string;
};

/** Side-view person with a solid head and body, inside a 200 x 260 svg box. */
export function SkeletonFigure({ motion, t, bone, joint, scenery }: Props) {
  const p = poseAt(motion, t);
  const limb = (a: Point, b: Point, key: string, opacity = 1) => (
    <Line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={bone} strokeOpacity={opacity} strokeWidth={12} strokeLinecap="round" />
  );
  const jointDot = (a: Point, key: string, opacity = 1) => (
    <Circle key={key} cx={a.x} cy={a.y} r={5} fill={joint} fillOpacity={opacity} />
  );

  return (
    <G>
      <Line x1={10} x2={190} y1={GROUND_Y + 3} y2={GROUND_Y + 3} stroke={scenery} strokeWidth={2} strokeLinecap="round" />
      {motion === 'sitToStand' && (
        <G>
          <Rect x={SEAT.x - 34} y={SEAT.y + 6} width={46} height={6} rx={3} fill={scenery} />
          <Rect x={SEAT.x - 34} y={SEAT.y - 56} width={6} height={GROUND_Y - SEAT.y + 56} rx={3} fill={scenery} />
          <Rect x={SEAT.x + 6} y={SEAT.y + 6} width={6} height={GROUND_Y - SEAT.y - 6} rx={3} fill={scenery} />
        </G>
      )}

      {limb(p.neck, p.far.elbow, 'fa1', 0.4)}
      {limb(p.far.elbow, p.far.hand, 'fa2', 0.4)}
      {limb(p.hip, p.far.knee, 'fl1', 0.4)}
      {limb(p.far.knee, p.far.foot, 'fl2', 0.4)}
      {[p.far.elbow, p.far.hand, p.far.knee, p.far.foot].map((j, i) => jointDot(j, `fd${i}`, 0.4))}

      <Line x1={p.hip.x} y1={p.hip.y} x2={p.neck.x} y2={p.neck.y} stroke={bone} strokeWidth={22} strokeLinecap="round" />
      {limb(p.hip, p.near.knee, 'nl1')}
      {limb(p.near.knee, p.near.foot, 'nl2')}
      {limb(p.neck, p.near.elbow, 'na1')}
      {limb(p.near.elbow, p.near.hand, 'na2')}
      <Circle cx={p.head.x} cy={p.head.y} r={HEAD_R + 2} fill={bone} />
      <Circle cx={p.head.x - 5} cy={p.head.y - 1} r={1.6} fill={scenery} fillOpacity={0.55} />
      {[p.near.knee, p.near.foot, p.near.elbow, p.near.hand].map((j, i) => jointDot(j, `nd${i}`))}
    </G>
  );
}
