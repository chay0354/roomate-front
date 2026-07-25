import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';

import type { StoryItem } from '@/lib/feed';
import { colors } from '@/lib/theme';

const { width, height } = Dimensions.get('window');
const IMAGE_STORY_MS = 4000;
const VIDEO_STORY_MS = 15000;

interface StoryViewerProps {
  visible: boolean;
  stories: StoryItem[];
  startIndex?: number;
  onClose: () => void;
}

function StoryVideo({ uri, active }: { uri: string; active: boolean }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  return (
    <VideoView
      style={StyleSheet.absoluteFill}
      player={player}
      contentFit="contain"
      nativeControls={false}
      fullscreenOptions={{ enable: false }}
    />
  );
}

export default function StoryViewer({
  visible,
  stories,
  startIndex = 0,
  onClose,
}: StoryViewerProps) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setIndex(startIndex);
      setProgress(0);
    }
  }, [visible, startIndex]);

  useEffect(() => {
    if (!visible || !stories.length) return;
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
    const story = stories[index];
    const duration = story?.isVideo ? VIDEO_STORY_MS : IMAGE_STORY_MS;
    const started = Date.now();
    timerRef.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / duration);
      setProgress(p);
      if (p >= 1) {
        if (timerRef.current) clearInterval(timerRef.current);
        if (index < stories.length - 1) {
          setIndex((i) => i + 1);
        } else {
          onClose();
        }
      }
    }, 50);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, index, stories, onClose]);

  if (!stories.length) return null;
  const story = stories[index];
  const mediaUri = story.mediaUrl || story.image;

  const goNext = () => {
    if (index < stories.length - 1) setIndex((i) => i + 1);
    else onClose();
  };

  const goPrev = () => {
    if (index > 0) setIndex((i) => i - 1);
  };

  const openApartment = () => {
    onClose();
    if (story.apartmentId) {
      router.push(`/apartment/${story.apartmentId}`);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        {story.isVideo ? (
          <View style={styles.bg}>
            {story.image ? (
              <Image
                source={{ uri: story.image }}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
              />
            ) : null}
            <StoryVideo key={mediaUri} uri={mediaUri} active={visible} />
          </View>
        ) : (
          <ImageBackground source={{ uri: mediaUri }} style={styles.bg} resizeMode="contain" />
        )}
        <View style={[styles.overlay, StyleSheet.absoluteFill, { paddingTop: insets.top + 8 }]}>
          <View style={styles.bars}>
            {stories.map((_, i) => (
              <View key={stories[i].id} style={styles.barSeg}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width:
                        i < index ? '100%' : i === index ? `${Math.round(progress * 100)}%` : '0%',
                    },
                  ]}
                />
              </View>
            ))}
          </View>

          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
            <Text style={styles.time}>{story.time}</Text>
            <Text style={styles.name}>{story.name}</Text>
            <View style={[styles.avatar, { backgroundColor: story.avatarColor }]}>
              <Text style={styles.avatarText}>{story.avatarLetter}</Text>
            </View>
          </View>

          <View style={styles.tapRow}>
            <Pressable style={styles.tapHalf} onPress={goNext} />
            <Pressable style={styles.tapHalf} onPress={goPrev} />
          </View>

          <View style={[styles.info, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>
            <View style={styles.tourChip}>
              <Text style={styles.tourChipT}>🏠 סיור בדירה</Text>
            </View>
            {story.price ? <Text style={styles.price}>{story.price}</Text> : null}
            <Text style={styles.addr}>{story.address}</Text>
            <Pressable style={styles.cta} onPress={openApartment}>
              <Text style={styles.ctaText}>צפה בדירה ←</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  bg: { width, height },
  overlay: { backgroundColor: 'rgba(0,0,0,0.15)' },
  bars: {
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  barSeg: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  close: { color: '#fff', fontSize: 20, marginStart: 'auto' },
  time: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  name: { color: '#fff', fontSize: 14, fontWeight: '600' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  tapRow: {
    flex: 1,
    flexDirection: 'row',
  },
  tapHalf: { flex: 1 },
  info: {
    padding: 20,
    backgroundColor: 'transparent',
  },
  tourChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.or,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  tourChipT: { color: '#fff', fontSize: 11, fontWeight: '700' },
  price: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'left' },
  addr: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'left',
  },
  cta: {
    alignSelf: 'flex-end',
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.or,
    borderRadius: 24,
  },
  ctaText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
