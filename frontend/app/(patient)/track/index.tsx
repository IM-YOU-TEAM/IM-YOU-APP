import { Redirect } from 'expo-router';

// /track has no screen of its own; start the flow.
export default function TrackIndex() {
  return <Redirect href="/track/motion-type" />;
}
