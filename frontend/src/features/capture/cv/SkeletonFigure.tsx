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

/** Stick figure (bones + joint dots) inside a 200 x 260 svg box. Use inside an <Svg viewBox="0 0 200 260">. */
export function SkeletonFigure({ motion, t, bone, joint, scenery }: Props) {
  const p = poseAt(motion, t);
  const seg = (a: Point, b: Point, key: string, opacity = 1) => (
    <Line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={bone} strokeOpacity={opacity} strokeWidth={6} strokeLinecap="round" />
  );
  const dot = (a: Point, key: string, opacity = 1) => (
    <Circle key={key} cx={a.x} cy={a.y} r={4.5} fill={joint} fillOpacity={opacity} />
  );

  return (
    <G>
      <Line x1={10} x2={190} y1={GROUND_Y + 3} y2={GROUND_Y + 3} stroke={scenery} strokeWidth={2} strokeLinecap="round" />
      {(motion === 'chairStand') && (
        <G>
          <Rect x={SEAT.x - 34} y={SEAT.y + 6} width={46} height={6} rx={3} fill={scenery} />
          <Rect x={SEAT.x - 34} y={SEAT.y - 56} width={6} height={GROUND_Y - SEAT.y + 56} rx={3} fill={scenery} />
          <Rect x={SEAT.x + 6} y={SEAT.y + 6} width={6} height={GROUND_Y - SEAT.y - 6} rx={3} fill={scenery} />
        </G>
      )}

      {/* Far side first, fainter, so the near limbs sit on top. */}
      {seg(p.neck, p.far.elbow, 'fa1', 0.45)}
      {seg(p.far.elbow, p.far.hand, 'fa2', 0.45)}
      {seg(p.hip, p.far.knee, 'fl1', 0.45)}
      {seg(p.far.knee, p.far.foot, 'fl2', 0.45)}
      {[p.far.elbow, p.far.hand, p.far.knee, p.far.foot].map((j, i) => dot(j, `fd${i}`, 0.45))}

      {seg(p.hip, p.neck, 'torso')}
      {seg(p.hip, p.near.knee, 'nl1')}
      {seg(p.near.knee, p.near.foot, 'nl2')}
      {seg(p.neck, p.near.elbow, 'na1')}
      {seg(p.near.elbow, p.near.hand, 'na2')}
      <Circle cx={p.head.x} cy={p.head.y} r={HEAD_R} fill="none" stroke={bone} strokeWidth={5} />
      {[p.neck, p.hip, p.near.knee, p.near.foot, p.near.elbow, p.near.hand].map((j, i) => dot(j, `nd${i}`))}
    </G>
  );
}
