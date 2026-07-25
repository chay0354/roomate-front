import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import type { ReelKind } from '@/lib/types';

interface ReelMediaProps {
  uri: string;
  kind: ReelKind;
  active: boolean;
  poster?: string | null;
}

function VideoReel({
  uri,
  active,
  poster,
}: {
  uri: string;
  active: boolean;
  poster?: string | null;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  return (
    <View style={styles.fill}>
      {poster ? (
        <Image source={{ uri: poster }} style={styles.poster} resizeMode="contain" />
      ) : null}
      <VideoView
        style={styles.fill}
        player={player}
        contentFit="contain"
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
      />
    </View>
  );
}

export default function ReelMedia({ uri, kind, active, poster }: ReelMediaProps) {
  if (kind === 'image') {
    return (
      <View style={styles.fill}>
        <Image source={{ uri }} style={styles.fill} resizeMode="contain" />
      </View>
    );
  }
  return <VideoReel uri={uri} active={active} poster={poster} />;
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  poster: { ...StyleSheet.absoluteFillObject },
});
