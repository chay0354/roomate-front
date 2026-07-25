import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

import Button from '@/components/Button';
import { uploadReel } from '@/lib/api';
import { useKeyboardOpen } from '@/lib/keyboard';
import {
  clearPendingReel,
  getPendingReel,
  updatePendingReel,
  type PendingReelDraft,
} from '@/lib/pending-reel';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import type { ReelKind } from '@/lib/types';

const KIND_LABEL: Record<ReelKind, string> = {
  image: 'תמונה',
  video: 'סרטון',
  apartment_tour: 'סיור בדירה',
};

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    player.play();
  }, [player, uri]);

  return (
    <VideoView
      style={styles.previewMedia}
      player={player}
      contentFit="contain"
      nativeControls={false}
      fullscreenOptions={{ enable: false }}
    />
  );
}

function Preview({ draft }: { draft: PendingReelDraft }) {
  if (draft.kind === 'image') {
    return <Image source={{ uri: draft.uri }} style={styles.previewMedia} resizeMode="contain" />;
  }
  return <VideoPreview key={draft.uri} uri={draft.uri} />;
}

export default function ReelComposeScreen() {
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardOpen();
  const [draft, setDraft] = useState<PendingReelDraft | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const pending = getPendingReel();
    if (!pending) {
      router.replace('/(tabs)/reels');
      return;
    }
    setDraft(pending);
    setCaption(pending.kind === 'apartment_tour' ? 'סיור בדירה' : '');
  }, []);

  const title = useMemo(() => {
    if (!draft) return 'רילס חדש';
    return draft.kind === 'apartment_tour' ? 'סיור בדירה' : 'רילס חדש';
  }, [draft]);

  const askReplace = () => {
    if (!draft) return;
    Alert.alert('החלף מדיה', 'מאיפה להעלות?', [
      { text: 'גלריה', onPress: () => replaceMedia('gallery') },
      { text: 'מצלמה', onPress: () => replaceMedia('camera') },
      { text: 'ביטול', style: 'cancel' },
    ]);
  };

  const replaceMedia = async (source: 'gallery' | 'camera') => {
    if (!draft) return;
    const mediaTypes =
      draft.kind === 'image'
        ? (['images'] as ImagePicker.MediaType[])
        : (['videos'] as ImagePicker.MediaType[]);
    const pickerOpts: ImagePicker.ImagePickerOptions = {
      mediaTypes,
      quality: 0.85,
      videoMaxDuration: 60,
      allowsEditing: false,
      cameraType: ImagePicker.CameraType.back,
    };

    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (!cam.granted) {
        Alert.alert('אין הרשאה', 'צריך גישה למצלמה');
        return;
      }
      result = await ImagePicker.launchCameraAsync(pickerOpts);
    } else {
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!lib.granted) {
        Alert.alert('אין הרשאה', 'צריך גישה לגלריה');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync(pickerOpts);
    }
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const next = updatePendingReel({
      uri: asset.uri,
      mimeType: asset.mimeType ?? draft.mimeType,
      fileName: asset.fileName ?? draft.fileName,
    });
    if (next) setDraft(next);
  };

  const publish = async () => {
    if (!draft) return;
    try {
      setUploading(true);
      Keyboard.dismiss();
      await uploadReel({
        uri: draft.uri,
        kind: draft.kind,
        mimeType: draft.mimeType,
        fileName: draft.fileName,
        apartmentId: draft.apartmentId,
        caption: caption.trim() || undefined,
      });
      clearPendingReel();
      Alert.alert('פורסם!', 'הרילס שלך באוויר', [
        { text: 'מעולה', onPress: () => router.replace('/(tabs)/reels') },
      ]);
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'ההעלאה נכשלה');
    } finally {
      setUploading(false);
    }
  };

  if (!draft) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.or} />
      </View>
    );
  }

  // Flex layout: preview shrinks with the window; caption + publish stay pinned above the keyboard.
  // Android uses softwareKeyboardLayoutMode=resize so the root already shortens.
  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <View style={styles.hdr}>
        <Pressable
          onPress={() => {
            clearPendingReel();
            router.back();
          }}
          hitSlop={12}
        >
          <Text style={styles.back}>→</Text>
        </Pressable>
        <Text style={styles.hdrTitle}>{title}</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={[styles.previewWrap, keyboardOpen && styles.previewWrapCompact]}>
        <Preview draft={draft} />
        <View style={styles.kindChip}>
          <Text style={styles.kindChipT}>{KIND_LABEL[draft.kind]}</Text>
        </View>
      </View>

      <View
        style={[
          styles.form,
          { paddingBottom: keyboardOpen ? spacing.md : Math.max(insets.bottom, spacing.md) },
        ]}
      >
        {draft.kind === 'apartment_tour' && draft.apartmentLabel ? (
          <View style={styles.aptBox}>
            <Text style={styles.aptLbl}>דירה מתויגת</Text>
            <Text style={styles.aptVal} numberOfLines={1}>
              {draft.apartmentLabel}
            </Text>
          </View>
        ) : null}

        <Text style={styles.label}>כיתוב</Text>
        <TextInput
          style={[styles.caption, keyboardOpen && styles.captionCompact]}
          value={caption}
          onChangeText={setCaption}
          placeholder={
            draft.kind === 'apartment_tour' ? 'תאר את הסיור...' : 'הוסף כיתוב לרילס...'
          }
          placeholderTextColor={colors.textFaint}
          multiline
          maxLength={220}
          textAlign="right"
          blurOnSubmit={false}
        />
        <Text style={styles.counter}>{caption.length}/220</Text>

        {!keyboardOpen ? (
          <Pressable style={styles.replaceBtn} onPress={askReplace}>
            <Text style={styles.replaceT}>החלף מדיה</Text>
          </Pressable>
        ) : null}

        <Button
          title="פרסם רילס"
          onPress={publish}
          loading={uploading}
          disabled={uploading}
          style={{ marginTop: spacing.md }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  center: { alignItems: 'center', justifyContent: 'center' },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  back: { fontSize: 22, color: colors.text },
  hdrTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  previewWrap: {
    flex: 1,
    minHeight: 120,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  previewWrapCompact: { flex: 0.55, minHeight: 100 },
  previewMedia: { width: '100%', height: '100%' },
  kindChip: {
    position: 'absolute',
    top: 12,
    start: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  kindChipT: { color: '#fff', fontSize: 12, fontWeight: '600' },
  form: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
  },
  aptBox: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aptLbl: { color: colors.textFaint, fontSize: fontSize.xs, textAlign: 'left' },
  aptVal: {
    color: colors.text,
    fontWeight: '700',
    marginTop: 2,
    fontSize: fontSize.sm,
    textAlign: 'left',
  },
  label: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'left',
  },
  caption: {
    minHeight: 88,
    maxHeight: 120,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    textAlignVertical: 'top',
  },
  captionCompact: { minHeight: 56, maxHeight: 80 },
  counter: {
    alignSelf: 'flex-start',
    marginTop: 4,
    color: colors.textFaint,
    fontSize: fontSize.xs,
  },
  replaceBtn: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  replaceT: { color: colors.text, fontWeight: '600' },
});
