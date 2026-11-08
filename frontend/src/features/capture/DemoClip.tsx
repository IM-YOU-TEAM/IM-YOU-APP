import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { colors, radii } from '@/lib/theme';
import { useReduceMotion } from '@/lib/useReduceMotion';

type Props = { uri: string; poster: string | null; label: string };

/** A few seconds of the movement, silent and looping. With Reduce Motion it waits on its controls. */
export function DemoClip({ uri, poster, label }: Props) {
  const reduce = useReduceMotion();
  const [drawn, setDrawn] = useState(false);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    if (reduce) player.pause();
    else player.play();
  }, [player, reduce]);

  return (
    <View style={styles.frame}>
      <VideoView
        player={player}
        nativeControls={reduce}
        contentFit="cover"
        accessibilityLabel={label}
        onFirstFrameRender={() => setDrawn(true)}
        style={StyleSheet.absoluteFill}
      />
      {poster && !drawn ? (
        <Image source={{ uri: poster }} resizeMode="cover" style={StyleSheet.absoluteFill} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 16 / 9, borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.fill },
});
