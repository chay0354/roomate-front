import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import Loading from '@/components/Loading';
import Screen from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMeetings, respondToMeeting } from '@/lib/api';
import { colors, fontSize, spacing } from '@/lib/theme';
import type { Meeting } from '@/lib/types';

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('he-IL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MeetingsTab() {
  const { session } = useAuth();
  const [items, setItems] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchMeetings(session.user.id);
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

  const onRespond = async (meeting: Meeting, accepted: boolean) => {
    setRespondingId(meeting.id);
    try {
      await respondToMeeting(meeting.id, accepted);
      await load();
      Alert.alert(
        accepted ? 'אושר!' : 'נדחה',
        accepted ? 'הפגישה נכנסה ליומן (שני הצדדים אישרו)' : 'הצעת הפגישה נדחתה'
      );
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'העדכון נכשל');
    } finally {
      setRespondingId(null);
    }
  };

  if (loading) return <Loading label="טוען פגישות..." />;

  const me = session?.user?.id;
  const proposed = items.filter((m) => m.status === 'proposed');
  const upcoming = items.filter((m) => m.status === 'scheduled');
  const past = items.filter((m) => m.status !== 'scheduled' && m.status !== 'proposed');

  type Row =
    | { type: 'h'; id: string; title: string }
    | ({ type: 'm' } & Meeting);

  const rows: Row[] = [
    ...(proposed.length ? [{ type: 'h' as const, id: 'prop', title: 'ממתינות לאישור' }] : []),
    ...proposed.map((m) => ({ type: 'm' as const, ...m })),
    { type: 'h', id: 'up', title: 'מאושרות' },
    ...upcoming.map((m) => ({ type: 'm' as const, ...m })),
    { type: 'h', id: 'past', title: 'היסטוריה' },
    ...past.map((m) => ({ type: 'm' as const, ...m })),
  ];

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.hdr}>
        <Text style={styles.title}>הפגישות שלי</Text>
        <Text style={styles.hint}>קבע פגישה מצ׳אט עם מישהו</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            אין פגישות עדיין. פתח צ׳אט עם בעל/ת דירה ולחץ 📅 פגישה
          </Text>
        }
        renderItem={({ item }) => {
          if (item.type === 'h') {
            return <Text style={styles.sec}>{item.title}</Text>;
          }
          const dateObj = new Date(item.starts_at);
          const other =
            item.organizer_id === me ? item.with_user?.full_name : item.organizer?.full_name;
          const needsMyAccept =
            item.status === 'proposed' &&
            ((item.with_user_id === me && !item.invitee_accepted) ||
              (item.organizer_id === me && !item.organizer_accepted));
          const waitingOther = item.status === 'proposed' && !needsMyAccept;

          return (
            <View style={[styles.card, item.status === 'proposed' && styles.cardProposed]}>
              <View style={styles.dateBox}>
                <Text style={styles.day}>{dateObj.getDate()}</Text>
                <Text style={styles.month}>
                  {dateObj.toLocaleDateString('he-IL', { month: 'short' })}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.apartment?.address ?? other ?? 'פגישה'}</Text>
                <Text style={styles.time}>
                  {formatWhen(item.starts_at)}
                  {other ? ` · עם ${other}` : ''}
                </Text>
                <Text style={styles.notes}>
                  {item.status === 'proposed'
                    ? 'ממתין לאישור שני הצדדים'
                    : item.status === 'declined'
                      ? 'נדחה'
                      : item.notes ?? item.status}
                </Text>

                {needsMyAccept ? (
                  <View style={styles.rsvp}>
                    <Pressable
                      style={[styles.rsvpBtn, styles.yes]}
                      disabled={!!respondingId}
                      onPress={() => onRespond(item, true)}
                    >
                      {respondingId === item.id ? (
                        <ActivityIndicator color={colors.success} />
                      ) : (
                        <Text style={styles.rsvpT}>✓ מאשר/ת</Text>
                      )}
                    </Pressable>
                    <Pressable
                      style={[styles.rsvpBtn, styles.no]}
                      disabled={!!respondingId}
                      onPress={() => onRespond(item, false)}
                    >
                      <Text style={styles.rsvpT}>✕ דוחה</Text>
                    </Pressable>
                  </View>
                ) : null}

                {waitingOther ? (
                  <Text style={styles.wait}>ממתין לאישור הצד השני…</Text>
                ) : null}

                {item.status === 'scheduled' && item.conversation_id ? (
                  <Pressable onPress={() => router.push(`/chat/${item.conversation_id}`)}>
                    <Text style={styles.chatLink}>פתח צ׳אט ←</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hdr: {
    padding: spacing.lg,
    backgroundColor: colors.or,
  },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.white, textAlign: 'left' },
  hint: { marginTop: 4, color: 'rgba(255,255,255,0.85)', fontSize: 12, textAlign: 'left' },
  empty: { padding: spacing.xl, textAlign: 'center', color: colors.textMuted },
  sec: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    fontWeight: '700',
    textAlign: 'left',
    color: colors.textMuted,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    margin: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: 14,
  },
  cardProposed: {
    borderWidth: 1,
    borderColor: '#ffd19a',
    backgroundColor: '#fffaf3',
  },
  dateBox: { alignItems: 'center', minWidth: 48 },
  day: { fontSize: fontSize.xl, fontWeight: '700', color: colors.or },
  month: { fontSize: fontSize.xs, color: colors.textMuted },
  info: { flex: 1 },
  name: { fontSize: fontSize.md, fontWeight: '600', textAlign: 'left', color: colors.text },
  time: { marginTop: 4, fontSize: fontSize.sm, color: colors.or, textAlign: 'left' },
  notes: { marginTop: 2, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'left' },
  rsvp: { flexDirection: 'row', gap: 8, marginTop: 10 },
  rsvpBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  yes: { backgroundColor: colors.successBg },
  no: { backgroundColor: colors.dangerBg },
  rsvpT: { fontSize: 12, fontWeight: '600', color: colors.text },
  wait: { marginTop: 8, fontSize: 12, color: colors.or, textAlign: 'left', fontWeight: '600' },
  chatLink: { marginTop: 8, color: colors.or, fontWeight: '700', textAlign: 'left' },
});
