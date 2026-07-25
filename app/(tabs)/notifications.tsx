import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import Loading from '@/components/Loading';
import Screen from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/api';
import { colors, fontSize, spacing } from '@/lib/theme';
import type { Notification } from '@/lib/types';

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'היום';
  if (d.toDateString() === yest.toDateString()) return 'אתמול';
  return 'מוקדם יותר';
}

type Row =
  | { kind: 'h'; id: string; title: string }
  | ({ kind: 'n' } & Notification);

export default function NotificationsTab() {
  const { session } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchNotifications(session.user.id)
      .then((data) => setItems(data as Notification[]))
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  const grouped = useMemo(() => {
    const rows: Row[] = [];
    const map = new Map<string, Notification[]>();
    for (const n of items) {
      const key = dayLabel(n.created_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    }
    for (const title of ['היום', 'אתמול', 'מוקדם יותר']) {
      const data = map.get(title);
      if (data?.length) {
        rows.push({ kind: 'h', id: `h-${title}`, title });
        for (const n of data) rows.push({ kind: 'n', ...n });
      }
    }
    return rows;
  }, [items]);

  const openNotif = async (item: Notification) => {
    if (!item.read) {
      await markNotificationRead(item.id);
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    }
    const data = item.data ?? {};
    if (typeof data.conversation_id === 'string') {
      router.push(`/chat/${data.conversation_id}`);
      return;
    }
    if (typeof data.apartment_id === 'string') {
      router.push(`/apartment/${data.apartment_id}`);
      return;
    }
    if (item.type?.includes('application')) {
      router.push('/(tabs)/applications');
      return;
    }
    if (item.type?.includes('meet')) {
      router.push('/(tabs)/meetings');
    }
  };

  if (loading) return <Loading label="טוען התראות..." />;

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.hdr}>
        <Text style={styles.title}>התראות</Text>
        <Pressable
          onPress={async () => {
            if (!session?.user?.id) return;
            await markAllNotificationsRead(session.user.id);
            setItems((prev) => prev.map((n) => ({ ...n, read: true })));
          }}
        >
          <Text style={styles.markAll}>סמן הכל כנקרא</Text>
        </Pressable>
      </View>
      <FlatList
        data={grouped}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>אין התראות</Text>}
        renderItem={({ item }) => {
          if (item.kind === 'h') {
            return <Text style={styles.sec}>{item.title}</Text>;
          }
          return (
            <Pressable
              style={[styles.row, !item.read && styles.unread]}
              onPress={() => openNotif(item)}
            >
              <Text style={styles.rowTitle}>{item.title ?? item.type}</Text>
              <Text style={styles.rowBody}>{item.body}</Text>
              <Text style={styles.time}>
                {new Date(item.created_at).toLocaleTimeString('he-IL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hdr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.or,
  },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.white },
  markAll: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  empty: { padding: spacing.xl, textAlign: 'center', color: colors.textMuted },
  sec: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    fontWeight: '700',
    textAlign: 'left',
    color: colors.textMuted,
    backgroundColor: colors.bg,
  },
  row: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  unread: { backgroundColor: colors.orLight },
  rowTitle: { fontSize: fontSize.md, fontWeight: '600', textAlign: 'left', color: colors.text },
  rowBody: { marginTop: 4, fontSize: fontSize.sm, textAlign: 'left', color: colors.textMuted },
  time: { marginTop: 4, fontSize: 11, textAlign: 'left', color: colors.textFaint },
});
