import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  ViewToken,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import BottomSheet from '@/components/BottomSheet';
import ReelMedia from '@/components/ReelMedia';
import { useAuth } from '@/contexts/AuthContext';
import { useGuest } from '@/contexts/GuestContext';
import {
  fetchMyApartments,
  fetchMyLikedReelIds,
  fetchReelComments,
  fetchReels,
  likeReel,
  postReelComment,
} from '@/lib/api';
import { setPendingReel } from '@/lib/pending-reel';
import { useBottomInset } from '@/lib/safe-area';
import { colors, fontSize, spacing } from '@/lib/theme';
import type { Apartment, Reel, ReelComment, ReelKind } from '@/lib/types';

const KIND_META: Record<
  ReelKind,
  { icon: string; title: string; subtitle: string; mediaTypes: ImagePicker.MediaType[] }
> = {
  video: {
    icon: '🎬',
    title: 'סרטון',
    subtitle: 'עד 60 שניות',
    mediaTypes: ['videos'],
  },
  image: {
    icon: '📷',
    title: 'תמונה',
    subtitle: 'מהגלריה או מצלמה',
    mediaTypes: ['images'],
  },
  apartment_tour: {
    icon: '🏠',
    title: 'סיור בדירה',
    subtitle: 'וידאו סיור לדירה שלך',
    mediaTypes: ['videos'],
  },
};

export default function ReelsTab() {
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset(12);
  const [isFocused, setIsFocused] = useState(true);
  const { width: screenW } = useWindowDimensions();
  const screenH = Dimensions.get('screen').height;
  const params = useLocalSearchParams<{ uploadTour?: string }>();
  const { isGuest } = useGuest();
  const { session, profile } = useAuth();
  const canUploadTour = profile?.user_path === 'dira';
  // Dira: video + photo + apartment tour. Dayer: video + photo only.
  const uploadKinds = (['video', 'image', 'apartment_tour'] as ReelKind[]).filter(
    (kind) => kind !== 'apartment_tour' || canUploadTour
  );
  const uploadTourRequested = params.uploadTour === '1';
  const handledUploadTour = useRef(false);
  /** Exact viewport height above the tab bar — full window height causes peek of next reel */
  const [pageH, setPageH] = useState(0);
  const [reels, setReels] = useState<Reel[]>([]);
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pickAptOpen, setPickAptOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceCtx, setSourceCtx] = useState<{
    kind: ReelKind;
    apartmentId: string | null;
    apartmentLabel: string | null;
  } | null>(null);
  const [pendingKind, setPendingKind] = useState<ReelKind | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [commentText, setCommentText] = useState('');
  /** Fullscreen modal: pin sheet above keyboard using keyboard height */
  const [keyboardBottom, setKeyboardBottom] = useState(0);
  const lastTap = useRef(0);

  useEffect(() => {
    if (!commentsOpen) {
      setKeyboardBottom(0);
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, (e) => {
      // Distance from physical screen bottom → top of keyboard (most reliable on Android)
      const byScreenY = Math.round(Dimensions.get('screen').height - e.endCoordinates.screenY);
      const byHeight = Math.round(e.endCoordinates.height);
      // Take the larger lift so the composer never sits under the keyboard
      setKeyboardBottom(Math.max(0, byScreenY, byHeight));
    });
    const onHide = Keyboard.addListener(hideEvent, () => setKeyboardBottom(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [commentsOpen]);

  const closeComments = () => {
    Keyboard.dismiss();
    setCommentsOpen(false);
    setKeyboardBottom(0);
  };

  const load = useCallback(async () => {
    try {
      const data = await fetchReels();
      setReels(data);
      if (session?.user?.id) {
        const ids = await fetchMyLikedReelIds().catch(() => [] as string[]);
        setLiked(new Set(ids));
      }
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'טעינת רילס נכשלה');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setIndex(viewableItems[0].index);
        const item = viewableItems[0].item as Reel | undefined;
        if (item) setActiveReelId(item.id);
      }
    }
  ).current;

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 80 }), []);

  const requireAuth = (action: () => void) => {
    if (isGuest || !session) {
      Alert.alert('צריך חשבון', 'הירשם כדי להמשיך', [
        { text: 'ביטול', style: 'cancel' },
        { text: 'הירשם', onPress: () => router.push('/(auth)/path') },
      ]);
      return;
    }
    action();
  };

  const toggleLike = async (id: string) => {
    const wasLiked = liked.has(id);
    setLiked((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(id);
      else next.add(id);
      return next;
    });
    setReels((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, likes_count: Math.max(0, r.likes_count + (wasLiked ? -1 : 1)) }
          : r
      )
    );
    try {
      const res = await likeReel(id, !wasLiked);
      setReels((prev) =>
        prev.map((r) => (r.id === id ? { ...r, likes_count: res.likes_count } : r))
      );
    } catch {
      setLiked((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(id);
        else next.delete(id);
        return next;
      });
    }
  };

  const onDoubleTap = (id: string) => {
    const now = Date.now();
    if (now - lastTap.current < 300) requireAuth(() => toggleLike(id));
    lastTap.current = now;
  };

  const openComments = async (reel: Reel) => {
    setActiveReelId(reel.id);
    setCommentsOpen(true);
    try {
      setComments(await fetchReelComments(reel.id));
    } catch {
      setComments([]);
    }
  };

  const sendComment = async () => {
    if (!activeReelId || !commentText.trim()) return;
    if (isGuest || !session) {
      Alert.alert('צריך חשבון', 'הירשם כדי להגיב', [
        { text: 'ביטול', style: 'cancel' },
        { text: 'הירשם', onPress: () => router.push('/(auth)/path') },
      ]);
      return;
    }
    const text = commentText.trim();
    setCommentText('');
    try {
      const c = await postReelComment(activeReelId, text);
      setComments((prev) => [...prev, c]);
      setReels((prev) =>
        prev.map((r) =>
          r.id === activeReelId ? { ...r, comments_count: r.comments_count + 1 } : r
        )
      );
    } catch (e) {
      setCommentText(text);
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'שליחת תגובה נכשלה');
    }
  };

  const askSourceThenPick = (
    kind: ReelKind,
    apartmentId: string | null,
    apartmentLabel: string | null
  ) => {
    setSourceCtx({ kind, apartmentId, apartmentLabel });
    setSourceOpen(true);
  };

  const startUpload = (kind: ReelKind) => {
    setUploadOpen(false);
    setPendingKind(kind);
    if (kind === 'apartment_tour') {
      if (!canUploadTour) {
        Alert.alert('לא זמין', 'רק מי שיש לו דירה יכול להעלות סיור בדירה');
        setPendingKind(null);
        return;
      }
      fetchMyApartments()
        .then((apts) => {
          if (!apts.length) {
            Alert.alert(
              'אין דירות שלך',
              'סיור בדירה אפשר להעלות רק לדירה שהעלית. צור מודעה קודם.',
              [
                { text: 'ביטול', style: 'cancel' },
                { text: 'לפרופיל', onPress: () => router.push('/(tabs)/profile') },
              ]
            );
            setPendingKind(null);
            return;
          }
          setApartments(apts);
          setPickAptOpen(true);
        })
        .catch((e) => Alert.alert('שגיאה', e instanceof Error ? e.message : 'טעינת דירות נכשלה'));
      return;
    }
    askSourceThenPick(kind, null, null);
  };

  // Pause videos when leaving the Reels tab
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [])
  );

  // Home (+) for dira owners → jump here and open tour upload
  useFocusEffect(
    useCallback(() => {
      if (!uploadTourRequested || handledUploadTour.current) return;
      handledUploadTour.current = true;
      router.setParams({ uploadTour: undefined });
      requireAuth(() => startUpload('apartment_tour'));
      return () => {
        handledUploadTour.current = false;
      };
    }, [uploadTourRequested, canUploadTour, isGuest, session?.user?.id])
  );

  const pickThenCompose = async (
    kind: ReelKind,
    apartmentId: string | null,
    apartmentLabel: string | null,
    source: 'gallery' | 'camera'
  ) => {
    const meta = KIND_META[kind];
    const pickerOpts: ImagePicker.ImagePickerOptions = {
      mediaTypes: meta.mediaTypes,
      quality: 0.85,
      videoMaxDuration: 60,
      allowsEditing: false,
      cameraType: ImagePicker.CameraType.back,
    };

    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (!cam.granted) {
        Alert.alert('אין הרשאה', 'צריך גישה למצלמה כדי לצלם');
        setPendingKind(null);
        return;
      }
      result = await ImagePicker.launchCameraAsync(pickerOpts);
    } else {
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!lib.granted) {
        Alert.alert('אין הרשאה', 'צריך גישה לגלריה כדי להעלות');
        setPendingKind(null);
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync(pickerOpts);
    }

    if (result.canceled || !result.assets[0]) {
      setPendingKind(null);
      return;
    }
    const asset = result.assets[0];
    setPendingReel({
      kind,
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      apartmentId,
      apartmentLabel,
    });
    setPendingKind(null);
    router.push('/reel/compose');
  };

  const renderItem = ({ item, index: i }: { item: Reel; index: number }) => {
    const isLiked = liked.has(item.id);
    const name = item.author?.full_name ?? 'משתמש';
    const letter = name.slice(0, 1);
    const apt = item.apartment;
    const price = apt?.price;

    const bottomPad = 28;

    return (
      <View style={[styles.card, { height: pageH, width: screenW }]}>
        <View style={styles.bg}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => onDoubleTap(item.id)}>
            <ReelMedia
              uri={item.media_url}
              kind={item.kind}
              active={isFocused && index === i}
              poster={item.thumbnail_url}
            />
            <View style={styles.dim} />
          </Pressable>

          {item.kind === 'apartment_tour' ? (
            <View style={[styles.tourBadge, { top: insets.top + 16 }]} pointerEvents="none">
              <Text style={styles.tourBadgeT}>🏠 סיור בדירה</Text>
            </View>
          ) : item.kind === 'video' ? (
            <View style={[styles.kindBadge, { top: insets.top + 16 }]} pointerEvents="none">
              <Text style={styles.kindBadgeT}>🎬 סרטון</Text>
            </View>
          ) : (
            <View style={[styles.kindBadge, { top: insets.top + 16 }]} pointerEvents="none">
              <Text style={styles.kindBadgeT}>📷 תמונה</Text>
            </View>
          )}

          <View style={[styles.actions, { bottom: bottomPad }]} pointerEvents="box-none">
            <Pressable
              style={styles.act}
              hitSlop={12}
              onPress={() => requireAuth(() => toggleLike(item.id))}
            >
              <Text style={styles.actIcon}>{isLiked ? '❤️' : '🤍'}</Text>
              <Text style={styles.actLbl}>{item.likes_count}</Text>
            </Pressable>
            <Pressable style={styles.act} hitSlop={12} onPress={() => openComments(item)}>
              <Text style={styles.actIcon}>💬</Text>
              <Text style={styles.actLbl}>{item.comments_count}</Text>
            </Pressable>
            {item.kind === 'apartment_tour' && item.apartment_id ? (
              <Pressable
                style={styles.act}
                hitSlop={12}
                onPress={() => router.push(`/apartment/${item.apartment_id}`)}
              >
                <Text style={styles.actIcon}>🏠</Text>
                <Text style={styles.actLbl}>דירה</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={[styles.info, { bottom: bottomPad }]} pointerEvents="none">
            <View style={styles.userRow}>
              <View style={styles.av}>
                <Text style={styles.avT}>{letter}</Text>
              </View>
              <Text style={styles.userNm}>{name}</Text>
            </View>
            {price != null ? (
              <Text style={styles.price}>
                ₪{price.toLocaleString('he-IL')} <Text style={styles.priceSm}>/חודש</Text>
              </Text>
            ) : null}
            {item.caption && item.kind !== 'apartment_tour' ? (
              <Text style={styles.caption}>{item.caption}</Text>
            ) : null}
            {item.kind === 'apartment_tour' ? (
              <Text style={styles.caption}>סיור מודרך — לחץ על דירה לפרטים</Text>
            ) : null}
          </View>

          <Text style={[styles.counter, { top: insets.top + 16, start: 16 }]} pointerEvents="none">
            {i + 1}/{reels.length}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.or} size="large" />
      </View>
    );
  }

  return (
    <View
      style={styles.root}
      onLayout={(e) => {
        const h = Math.round(e.nativeEvent.layout.height);
        if (h > 0 && h !== pageH) setPageH(h);
      }}
    >
      {reels.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>אין רילס עדיין — היה הראשון להעלות</Text>
        </View>
      ) : pageH <= 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.or} size="large" />
        </View>
      ) : (
        <FlatList
          key={`reels-${pageH}`}
          data={reels}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          disableIntervalMomentum
          snapToInterval={pageH}
          snapToAlignment="start"
          decelerationRate="fast"
          removeClippedSubviews
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, i) => ({ length: pageH, offset: pageH * i, index: i })}
          style={{ height: pageH }}
        />
      )}

      <Pressable
        style={[styles.uploadBtn, { top: insets.top + 12 }]}
        onPress={() => requireAuth(() => setUploadOpen(true))}
      >
        <Text style={styles.uploadPlus}>+</Text>
      </Pressable>

      <BottomSheet visible={uploadOpen} onClose={() => setUploadOpen(false)} animationType="fade">
        <View style={styles.uploadHead}>
          <Text style={styles.uploadTitle}>העלאת תוכן</Text>
          <Pressable onPress={() => setUploadOpen(false)}>
            <Text style={{ color: colors.textFaint }}>✕</Text>
          </Pressable>
        </View>
        <View style={styles.uploadOpts}>
          {uploadKinds.map((kind) => {
            const o = KIND_META[kind];
            return (
              <Pressable key={kind} style={styles.uploadOpt} onPress={() => startUpload(kind)}>
                <Text style={{ fontSize: 28 }}>{o.icon}</Text>
                <Text style={styles.uploadOptT}>{o.title}</Text>
                <Text style={styles.uploadOptS}>{o.subtitle}</Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={pickAptOpen}
        scrollable={false}
        onClose={() => {
          setPickAptOpen(false);
          setPendingKind(null);
        }}
      >
        <View style={styles.uploadHead}>
          <Text style={styles.uploadTitle}>בחר דירה שלך לסיור</Text>
          <Pressable
            onPress={() => {
              setPickAptOpen(false);
              setPendingKind(null);
            }}
          >
            <Text>✕</Text>
          </Pressable>
        </View>
        <ScrollView>
          {apartments.map((a) => (
            <Pressable
              key={a.id}
              style={styles.aptRow}
              onPress={() => {
                setPickAptOpen(false);
                const label = a.title ?? a.address;
                askSourceThenPick(pendingKind ?? 'apartment_tour', a.id, label);
              }}
            >
              <Text style={styles.aptRowT}>{a.title ?? a.address}</Text>
              <Text style={styles.aptRowS}>
                {a.neighborhood ?? a.city} · ₪{a.price.toLocaleString('he-IL')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </BottomSheet>

      <BottomSheet
        visible={sourceOpen}
        onClose={() => {
          setSourceOpen(false);
          setSourceCtx(null);
          setPendingKind(null);
        }}
      >
        <View style={styles.uploadHead}>
          <Text style={styles.uploadTitle}>איך להעלות?</Text>
          <Pressable
            onPress={() => {
              setSourceOpen(false);
              setSourceCtx(null);
              setPendingKind(null);
            }}
          >
            <Text style={{ color: colors.textFaint }}>✕</Text>
          </Pressable>
        </View>
        <Text style={styles.sourceHint}>
          {sourceCtx && (sourceCtx.kind === 'video' || sourceCtx.kind === 'apartment_tour')
            ? 'בחר מהגלריה או צלם סרטון עכשיו'
            : 'בחר מהגלריה או צלם תמונה עכשיו'}
        </Text>
        <Pressable
          style={styles.sourceBtn}
          onPress={() => {
            if (!sourceCtx) return;
            setSourceOpen(false);
            pickThenCompose(
              sourceCtx.kind,
              sourceCtx.apartmentId,
              sourceCtx.apartmentLabel,
              'gallery'
            );
          }}
        >
          <Text style={styles.sourceBtnT}>🖼️ מהגלריה</Text>
        </Pressable>
        <Pressable
          style={styles.sourceBtn}
          onPress={() => {
            if (!sourceCtx) return;
            setSourceOpen(false);
            pickThenCompose(
              sourceCtx.kind,
              sourceCtx.apartmentId,
              sourceCtx.apartmentLabel,
              'camera'
            );
          }}
        >
          <Text style={styles.sourceBtnT}>
            {sourceCtx && (sourceCtx.kind === 'video' || sourceCtx.kind === 'apartment_tour')
              ? '🎥 צלם וידאו'
              : '📷 צלם תמונה'}
          </Text>
        </Pressable>
      </BottomSheet>

      <Modal
        visible={commentsOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeComments}
      >
        <View style={styles.cmtRoot} pointerEvents="box-none">
          <Pressable style={styles.cmtBackdrop} onPress={closeComments} />
          <View
            style={[
              styles.comments,
              {
                marginBottom: keyboardBottom,
                paddingBottom: keyboardBottom > 0 ? 10 : bottomInset,
                maxHeight: Math.max(240, screenH * 0.55),
              },
            ]}
          >
            <View style={styles.uploadHead}>
              <Text style={styles.uploadTitle}>תגובות</Text>
              <Pressable onPress={closeComments} hitSlop={12}>
                <Text>✕</Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.cmtScroll}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {comments.length === 0 ? (
                <Text style={{ textAlign: 'center', color: colors.textMuted, paddingVertical: 20 }}>
                  אין תגובות עדיין
                </Text>
              ) : (
                comments.map((c) => (
                  <View key={c.id} style={styles.cmt}>
                    <View style={styles.av}>
                      <Text style={styles.avT}>
                        {(c.author?.full_name ?? '?').slice(0, 1)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cmtNm}>{c.author?.full_name ?? 'משתמש'}</Text>
                      <Text style={styles.cmtTxt}>{c.body}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            <View style={styles.cmtComposer}>
              <TextInput
                style={styles.cmtInput}
                placeholder="הוסף תגובה..."
                placeholderTextColor={colors.textFaint}
                value={commentText}
                onChangeText={setCommentText}
                textAlign="right"
                onSubmitEditing={sendComment}
                returnKeyType="send"
                blurOnSubmit={false}
              />
              <Pressable style={styles.cmtSend} onPress={sendComment} hitSlop={8}>
                <Text style={{ color: '#fff' }}>↑</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  empty: { color: '#fff', fontSize: fontSize.md, textAlign: 'center' },
  card: { overflow: 'hidden' },
  bg: { flex: 1, justifyContent: 'flex-end', overflow: 'hidden' },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.25)' },
  tourBadge: {
    position: 'absolute',
    start: 70,
    backgroundColor: colors.or,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    zIndex: 6,
  },
  tourBadgeT: { color: '#fff', fontWeight: '700', fontSize: 12 },
  kindBadge: {
    position: 'absolute',
    start: 70,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    zIndex: 6,
  },
  kindBadgeT: { color: '#fff', fontWeight: '600', fontSize: 11 },
  actions: {
    position: 'absolute',
    end: 12,
    gap: 18,
    alignItems: 'center',
    zIndex: 20,
    elevation: 20,
  },
  act: { alignItems: 'center', minWidth: 48 },
  actIcon: { fontSize: 28 },
  actLbl: { color: '#fff', fontSize: 12, marginTop: 2, fontWeight: '600' },
  info: { position: 'absolute', start: 16, end: 70, zIndex: 4 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  av: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.or,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avT: { color: '#fff', fontWeight: '700' },
  userNm: { color: '#fff', fontWeight: '700', fontSize: 14 },
  price: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'left' },
  priceSm: { fontSize: 13, fontWeight: '400', opacity: 0.8 },
  caption: { color: 'rgba(255,255,255,0.95)', marginTop: 8, textAlign: 'left', fontSize: 13 },
  counter: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    zIndex: 5,
  },
  uploadBtn: {
    position: 'absolute',
    end: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.or,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  uploadPlus: { color: '#fff', fontSize: 24, fontWeight: '300', lineHeight: 26 },
  modalOv: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  cmtRoot: { flex: 1, justifyContent: 'flex-end' },
  cmtBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  uploadHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  uploadTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  uploadOpts: { flexDirection: 'row', gap: 10 },
  uploadOpt: {
    flex: 1,
    paddingVertical: 20,
    backgroundColor: colors.bg,
    borderRadius: 12,
    alignItems: 'center',
  },
  uploadOptT: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 6 },
  uploadOptS: { fontSize: 10, color: colors.textFaint, marginTop: 2, textAlign: 'center' },
  sourceHint: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'left',
    marginBottom: 12,
  },
  sourceBtn: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  sourceBtnT: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 15,
    textAlign: 'center',
  },
  comments: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    width: '100%',
  },
  cmtScroll: { maxHeight: 220, flexGrow: 0 },
  aptRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  aptRowT: { fontWeight: '700', color: colors.text, textAlign: 'left' },
  aptRowS: { marginTop: 4, color: colors.textMuted, fontSize: 12, textAlign: 'left' },
  cmt: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  cmtNm: { fontWeight: '700', textAlign: 'left', color: colors.text, fontSize: 13 },
  cmtTxt: { textAlign: 'left', color: colors.textMuted, marginTop: 2, fontSize: 13 },
  cmtComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cmtInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 12,
  },
  cmtSend: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.or,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
