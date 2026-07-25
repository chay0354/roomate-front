import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import Loading from '@/components/Loading';
import Screen from '@/components/Screen';
import { useGuest } from '@/contexts/GuestContext';
import {
  fetchFriends,
  fetchFriendSuggestions,
  requestFriend,
  type FriendRow,
} from '@/lib/api';
import { AVATAR_COLORS } from '@/lib/feed';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import type { Profile } from '@/lib/types';

type Row =
  | { type: 'h'; id: string; title: string }
  | { type: 'sug'; id: string; profile: Profile }
  | { type: 'fr'; id: string; profile: Profile };

export default function FriendsScreen() {
  const { isGuest } = useGuest();
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [f, s] = await Promise.all([fetchFriends(), fetchFriendSuggestions()]);
      setFriends(f);
      setSuggestions(s);
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'טעינת חברים נכשלה');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isGuest) load();
  }, [isGuest, load]);

  const filteredSug = useMemo(
    () =>
      suggestions.filter(
        (p) => !query || (p.full_name ?? p.username ?? '').includes(query)
      ),
    [suggestions, query]
  );

  const filteredFriends = useMemo(
    () =>
      friends.filter(
        (f) =>
          !query ||
          (f.profile?.full_name ?? f.profile?.username ?? '').includes(query)
      ),
    [friends, query]
  );

  if (isGuest) {
    return (
      <Screen style={styles.pad}>
        <Text style={styles.title}>חברים</Text>
        <Text style={styles.guest}>הירשם כדי לסנכרן חברים ולמצוא דירות דרך קשרים.</Text>
        <Pressable style={styles.cta} onPress={() => router.push('/(auth)/path')}>
          <Text style={styles.ctaT}>הירשם עכשיו</Text>
        </Pressable>
      </Screen>
    );
  }

  if (loading) return <Loading label="טוען חברים..." />;

  const rows: Row[] = [
    { type: 'h', id: 'sug-h', title: 'הצעות חברויות' },
    ...filteredSug.map((p) => ({ type: 'sug' as const, id: p.id, profile: p })),
    { type: 'h', id: 'fr-h', title: 'החברים שלי' },
    ...filteredFriends.map((f) => ({
      type: 'fr' as const,
      id: f.profile.id,
      profile: f.profile,
    })),
  ];

  const onAdd = async (profile: Profile) => {
    try {
      await requestFriend(profile.id);
      setSuggestions((prev) => prev.filter((p) => p.id !== profile.id));
      Alert.alert('נשלח', 'בקשת החברות ממתינה לאישור');
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'שליחת הבקשה נכשלה');
    }
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.hdr}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>→</Text>
        </Pressable>
        <Text style={styles.hdrTitle}>חברים</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="🔍 חפש חברים לפי שם..."
          value={query}
          onChangeText={setQuery}
          textAlign="left"
          returnKeyType="search"
          blurOnSubmit
        />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={styles.empty}>אין משתמשים להצגה</Text>
        }
        renderItem={({ item, index }) => {
          if (item.type === 'h') {
            return <Text style={styles.secTitle}>{item.title}</Text>;
          }
          const p = item.profile;
          const name = p.full_name ?? p.username ?? 'משתמש';
          const letter = name.slice(0, 1);
          const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
          const isSug = item.type === 'sug';
          return (
            <Pressable style={styles.row} onPress={() => router.push(`/user/${p.id}`)}>
              <View style={[styles.av, { backgroundColor: color }]}>
                <Text style={styles.avT}>{letter}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nm}>{name}</Text>
                <Text style={styles.mutual}>
                  {p.occupation ?? (p.user_path === 'dira' ? 'בעל/ת דירה' : 'מחפש/ת דירה')}
                </Text>
              </View>
              {isSug ? (
                <Pressable
                  style={styles.add}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onAdd(p);
                  }}
                >
                  <Text style={styles.addT}>בקשה</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.msg}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    router.push(`/user/${p.id}`);
                  }}
                >
                  <Text style={styles.msgT}>פרופיל</Text>
                </Pressable>
              )}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.xl },
  title: { fontSize: fontSize.xxl, fontWeight: '700', textAlign: 'left', marginBottom: spacing.lg },
  guest: { textAlign: 'left', color: colors.textMuted, lineHeight: 22, marginBottom: spacing.xl },
  cta: {
    backgroundColor: colors.or,
    padding: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  ctaT: { color: '#fff', fontWeight: '700' },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.or,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  back: { color: '#fff', fontSize: 22 },
  hdrTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  searchWrap: { padding: spacing.lg },
  search: {
    backgroundColor: colors.bg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    textAlign: 'left',
  },
  secTitle: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    fontWeight: '700',
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  av: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avT: { color: '#fff', fontWeight: '700' },
  nm: { fontWeight: '600', textAlign: 'left', color: colors.text },
  mutual: { fontSize: 12, color: colors.textMuted, textAlign: 'left', marginTop: 2 },
  add: {
    backgroundColor: colors.or,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addT: { color: '#fff', fontWeight: '600', fontSize: 13 },
  msg: {
    backgroundColor: colors.orLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  msgT: { color: colors.or, fontWeight: '600', fontSize: 13 },
  empty: { textAlign: 'center', color: colors.textMuted, padding: spacing.xl },
});
