import { createElement } from 'react';
import { View } from 'react-native';
import { colors, radii } from '@/lib/theme';

type Props = {
  webm: string;
  mov: string;
  label: string;
};

/** In-app player for the public-domain CDC clip. WebM first, QuickTime as a fallback. */
export function DemoClip({ webm, mov, label }: Props) {
  return (
    <View style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.graphite }}>
      {createElement(
        'video',
        {
          controls: true,
          playsInline: true,
          preload: 'metadata',
          'aria-label': label,
          style: { width: '100%', height: '100%', backgroundColor: colors.graphite },
        },
        createElement('source', { src: webm, type: 'video/webm' }),
        createElement('source', { src: mov, type: 'video/quicktime' }),
      )}
    </View>
  );
}
