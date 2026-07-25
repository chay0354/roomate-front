import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import Loading from '@/components/Loading';
import Screen from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { fetchConversations } from '@/lib/api';
import { colors, fontSize, spacing } from '@/lib/theme';
import type { Conversation } from '@/lib/types';

type SortMode = 'recent' | 'name';

export default function ChatTab() {
  const { session } = useAuth();
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('recent');

  const load = useCallback(async () => {
    if (!session?.user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchConversations(session.user.id);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    let list = items;
    if (query.trim()) {
      const q = query.trim();
      list = list.filter((c) => (c.other_member?.full_name ?? '').includes(q));
    }
    if (sort === 'name') {
      list = [...list].sort((a, b) =>
        (a.other_member?.full_name ?? '').localeCompare(b.other_member?.full_name ?? '', 'he')
      );
    }
    return list;
  }, [items, query, sort]);

  if (loading) return <Loading label="טוען צ׳אטים..." />;

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Text style={styles.title}>צ׳אט</Text>

      {items.length > 0 ? (
        <View style={styles.online}>
          <View style={styles.onlineLblWrap}>
            <Text style={styles.onlineLbl}>מחוברים עכשיו</Text>
          </View>
          {/* Force LTR + flex-end so content sits on the visual right (RTL flips native align) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.onlineScroll}
            contentContainerStyle={styles.onlineList}
          >
            {items.slice(0, 8).map((item) => (
              <Pressable
                key={item.id}
                style={styles.onlineItem}
                onPress={() => router.push(`/chat/${item.id}`)}
              >
                <View style={styles.onlineAv}>
                  <Text style={styles.onlineAvT}>
                    {(item.other_member?.full_name ?? '?').slice(0, 1)}
                  </Text>
                  <View style={styles.dot} />
                </View>
                <Text style={styles.onlineNm} numberOfLines={1}>
                  {(item.other_member?.full_name ?? '').split(' ')[0]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.tools}>
        <TextInput
          style={styles.search}
          placeholder="🔍 חפש שיחה..."
          placeholderTextColor="#000000"
          value={query}
          onChangeText={setQuery}
          textAlign="right"
        />
        <Pressable
          style={styles.sortBtn}
          onPress={() => setSort((s) => (s === 'recent' ? 'name' : 'recent'))}
        >
          <Text style={styles.sortT}>{sort === 'recent' ? 'אחרונים' : 'א-ת'}</Text>
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            אין שיחות עדיין. שלח פנייה לדירה כדי לפתוח צ׳אט.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/chat/${item.id}`)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(item.other_member?.full_name ?? '?').slice(0, 1)}
              </Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>
                {item.other_member?.full_name ?? item.apartment?.address ?? 'שיחה'}
              </Text>
              <Text style={styles.preview} numberOfLines={1}>
                {item.last_message?.body ?? 'אין הודעות'}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    padding: spacing.lg,
    textAlign: 'left',
    backgroundColor: colors.or,
    color: colors.white,
  },
  online: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  onlineLblWrap: {
    width: '100%',
    direction: 'ltr',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  onlineLbl: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    fontWeight: '600',
    writingDirection: 'rtl',
  },
  onlineScroll: {
    direction: 'ltr',
    width: '100%',
  },
  onlineList: {
    flexGrow: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    minWidth: '100%',
  },
  onlineItem: { width: 64, alignItems: 'center', marginLeft: 8 },
  onlineAv: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.orLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineAvT: { fontWeight: '700', color: colors.or },
  dot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: '#fff',
  },
  onlineNm: {
    fontSize: 11,
    marginTop: 4,
    color: colors.text,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  tools: {
    flexDirection: 'row',
    gap: 8,
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  search: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#000000',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sortBtn: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: colors.orLight,
    borderRadius: 16,
  },
  sortT: { color: colors.or, fontWeight: '600', fontSize: 12 },
  empty: { padding: spacing.xl, textAlign: 'center', color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.orLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '700', color: colors.or, fontSize: fontSize.lg },
  info: { flex: 1 },
  name: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, textAlign: 'left' },
  preview: { marginTop: 2, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'left' },
});
