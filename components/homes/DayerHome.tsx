import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import FeedApartmentCard from '@/components/FeedApartmentCard';
import Loading from '@/components/Loading';
import ProfileProgressBar from '@/components/ProfileProgressBar';
import Screen from '@/components/Screen';
import StoryViewer from '@/components/StoryViewer';
import { useAuth } from '@/contexts/AuthContext';
import { useGuest } from '@/contexts/GuestContext';
import { useTasks } from '@/contexts/TasksContext';
import {
  fetchApartments,
  fetchFriendApartments,
  fetchMyFavoriteIds,
  fetchReels,
  toggleFavorite,
} from '@/lib/api';
import {
  neighborhoodsFromApartments,
  storiesFromTourReels,
  type StoryItem,
} from '@/lib/feed';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import type { Apartment, Reel } from '@/lib/types';

const BADGES = [
  { text: 'חדש!', color: colors.success },
  { text: 'מומלץ', color: '#1976D2' },
  { text: 'פופולרי', color: colors.or },
  { text: 'VIP', color: '#9C27B0' },
];

export default function DayerHome() {
  const { session, profile } = useAuth();
  const { isGuest } = useGuest();
  const { completeTask } = useTasks();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [tourReels, setTourReels] = useState<Reel[]>([]);
  const [friendApts, setFriendApts] = useState<Apartment[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const [viewedCount, setViewedCount] = useState(0);

  const stories = useMemo(() => storiesFromTourReels(tourReels), [tourReels]);
  const neighborhoods = useMemo(() => neighborhoodsFromApartments(apartments), [apartments]);

  const load = useCallback(async () => {
    try {
      const [data, reels] = await Promise.all([
        fetchApartments(),
        fetchReels().catch(() => [] as Reel[]),
      ]);
      setApartments(data);
      setTourReels(reels.filter((r) => r.kind === 'apartment_tour'));
      if (session?.user?.id) {
        const [favs, friends] = await Promise.all([
          fetchMyFavoriteIds(session.user.id),
          fetchFriendApartments().catch(() => [] as Apartment[]),
        ]);
        setFavoriteIds(favs);
        setFriendApts(friends);
      } else {
        setFriendApts([]);
      }
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'טעינת דירות נכשלה');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onToggleFavorite = async (apartmentId: string) => {
    if (!session?.user?.id) {
      Alert.alert('צריך חשבון', 'הירשם כדי לשמור מועדפים');
      return;
    }
    const isFav = favoriteIds.includes(apartmentId);
    await toggleFavorite(session.user.id, apartmentId, isFav);
    setFavoriteIds((prev) =>
      isFav ? prev.filter((id) => id !== apartmentId) : [...prev, apartmentId]
    );
    if (!isFav) completeTask('fav');
  };

  const openStory = (idx: number) => {
    setStoryIndex(idx);
    setStoryOpen(true);
    const next = viewedCount + 1;
    setViewedCount(next);
    if (next >= 5) completeTask('browse');
  };

  const helloName = isGuest ? 'אורח 👋' : `${profile?.full_name ?? 'חבר/ה'} 👋`;

  if (loading) return <Loading label="טוען דירות..." />;

  const listHeader = (
    <View>
      <ProfileProgressBar hidden={isGuest} />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.hello}>שלום,</Text>
            <Text style={styles.name}>{helloName}</Text>
          </View>
          <Pressable
            style={styles.avatar}
            onPress={() => {
              if (isGuest) router.push('/(auth)/path');
              else router.push('/(tabs)/profile');
            }}
          >
            <Text style={styles.avatarText}>
              {isGuest ? '👤' : (profile?.full_name ?? '?').slice(0, 1)}
            </Text>
          </Pressable>
        </View>
        <Pressable style={styles.search} onPress={() => router.push('/(tabs)/map')}>
          <Ionicons name="search" size={18} color="#999" />
          <Text style={styles.searchText}>חפש דירה, שכונה, שותף...</Text>
        </Pressable>
      </View>

      {/* Hot Now = apartment tour reels from Reels */}
      <View style={styles.sec}>
        <View style={styles.secH}>
          <Text style={styles.secT}>🔥 חם עכשיו</Text>
          <Pressable onPress={() => router.push('/(tabs)/reels')}>
            <Text style={styles.secL}>רילס ←</Text>
          </Pressable>
        </View>
        {stories.length === 0 ? (
          <Text style={styles.emptyHint}>אין סיורי דירה עדיין — העלה סיור ברילס</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hsc}>
            {stories.map((s: StoryItem, i: number) => (
              <Pressable key={s.id} style={styles.hot} onPress={() => openStory(i)}>
                <View style={styles.hotRing}>
                  {s.image ? (
                    <Image source={{ uri: s.image }} style={styles.hotImg} />
                  ) : (
                    <View style={[styles.hotImg, styles.hotPlaceholder]}>
                      <Text style={{ fontSize: 22 }}>🏠</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.hotNm} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={styles.hotPr}>{s.price || 'סיור'}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Friends apartments */}
      <View style={styles.sec}>
        <View style={styles.secH}>
          <Text style={styles.secT}>👥 דירות של חברים</Text>
          <Pressable onPress={() => (isGuest ? router.push('/(auth)/path') : router.push('/friends'))}>
            <Text style={styles.secL}>הכל ←</Text>
          </Pressable>
        </View>
        {friendApts.length === 0 ? (
          <Text style={styles.emptyHint}>
            {isGuest ? 'הירשם כדי לראות דירות של חברים' : 'אין עדיין דירות מחברים — הוסף חברים'}
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hsc}>
            {friendApts.map((fa) => (
              <Pressable
                key={fa.id}
                style={styles.frCard}
                onPress={() => router.push(`/apartment/${fa.id}`)}
              >
                {fa.image_urls?.[0] ? (
                  <Image source={{ uri: fa.image_urls[0] }} style={styles.frImg} />
                ) : (
                  <View style={[styles.frImg, { backgroundColor: colors.orLight }]} />
                )}
                <View style={styles.frBadge}>
                  <Text style={styles.frBadgeText}>{fa.owner?.full_name?.split(' ')[0] ?? 'חבר'}</Text>
                </View>
                <View style={styles.frInf}>
                  <Text style={styles.frPrc}>₪{fa.price.toLocaleString('he-IL')}</Text>
                  <Text style={styles.frAddr} numberOfLines={1}>
                    {fa.address}
                  </Text>
                  <Text style={styles.frWho}>👤 {fa.owner?.full_name ?? 'שותף/ה'}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Neighborhoods from live listings */}
      <View style={styles.sec}>
        <View style={styles.secH}>
          <Text style={styles.secT}>📍 לפי שכונות</Text>
          <Pressable onPress={() => router.push('/(tabs)/map')}>
            <Text style={styles.secL}>מפה ←</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hsc}>
          {neighborhoods.map((n) => (
            <Pressable
              key={n.id}
              style={styles.nb}
              onPress={() => router.push({ pathname: '/(tabs)/map', params: { neighborhood: n.name } })}
            >
              {n.image ? (
                <Image source={{ uri: n.image }} style={styles.nbImg} />
              ) : (
                <View style={[styles.nbImg, { backgroundColor: colors.orLight }]} />
              )}
              <View style={styles.nbOverlay}>
                <Text style={styles.nbNm}>{n.name}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.sec, { paddingBottom: 0 }]}>
        <Text style={styles.secT}>🏠 דירות בשבילך</Text>
      </View>
    </View>
  );

  return (
    <Screen edges={['top', 'left', 'right']}>
      <FlatList
        data={apartments}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.or}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>אין דירות עדיין</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const badge = item.status === 'full' ? undefined : BADGES[index % BADGES.length];
          return (
            <FeedApartmentCard
              apartment={item}
              isFavorite={favoriteIds.includes(item.id)}
              onToggleFavorite={() => onToggleFavorite(item.id)}
              badge={badge?.text}
              badgeColor={badge?.color}
            />
          );
        }}
      />

      <StoryViewer
        visible={storyOpen}
        stories={stories}
        startIndex={storyIndex}
        onClose={() => setStoryOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.card,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hello: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'left' },
  name: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, textAlign: 'left' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.orLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.or },
  search: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  searchText: { color: '#999', fontSize: fontSize.sm },
  sec: { paddingTop: spacing.lg, paddingHorizontal: spacing.lg },
  secH: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  secT: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  secL: { fontSize: fontSize.sm, color: colors.or, fontWeight: '600' },
  hsc: { gap: 12, paddingStart: 4, flexDirection: 'row' },
  hot: { width: 72, alignItems: 'center' },
  hotRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: colors.or,
    padding: 2,
    marginBottom: 6,
  },
  hotImg: { width: '100%', height: '100%', borderRadius: 28 },
  hotPlaceholder: {
    backgroundColor: colors.orLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotNm: { fontSize: 11, fontWeight: '500', color: colors.text, textAlign: 'center' },
  hotPr: { fontSize: 10, fontWeight: '600', color: colors.or, textAlign: 'center' },
  frCard: {
    width: 160,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  frImg: { width: '100%', height: 90 },
  frBadge: {
    position: 'absolute',
    top: 8,
    start: 8,
    backgroundColor: colors.or,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  frBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  frInf: { padding: 10 },
  frPrc: { fontWeight: '700', fontSize: 14, textAlign: 'left', color: colors.text },
  frAddr: { fontSize: 12, color: colors.textMuted, textAlign: 'left', marginTop: 2 },
  frWho: { fontSize: 11, color: colors.or, textAlign: 'left', marginTop: 4 },
  nb: { width: 120, height: 80, borderRadius: radius.md, overflow: 'hidden' },
  nbImg: { width: '100%', height: '100%' },
  nbOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nbNm: { color: '#fff', fontWeight: '700', fontSize: 13 },
  list: { paddingBottom: 100 },
  empty: { padding: spacing.xxl, alignItems: 'center' },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  emptyHint: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'left',
    paddingVertical: spacing.sm,
  },
});
