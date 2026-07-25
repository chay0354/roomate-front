import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomSheet from '@/components/BottomSheet';
import Loading from '@/components/Loading';
import Screen from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/contexts/TasksContext';
import {
  createMeeting,
  fetchConversation,
  fetchMeetings,
  fetchMessages,
  respondToMeeting,
  sendMessage,
} from '@/lib/api';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import type { Conversation, Meeting, Message } from '@/lib/types';

function formatMeetingWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('he-IL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { completeTask } = useTasks();
  const insets = useSafeAreaInsets();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [keyboardPad, setKeyboardPad] = useState(0);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('18:00');
  const [note, setNote] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const me = session?.user?.id;
  const other = conversation?.other_member;
  const otherName = other?.full_name ?? 'שיחה';
  const otherLetter = otherName.slice(0, 1);
  const apartmentId = conversation?.apartment_id ?? conversation?.apartment?.id ?? null;

  const pendingMeeting = useMemo(
    () => meetings.find((m) => m.status === 'proposed') ?? null,
    [meetings]
  );
  const confirmedMeeting = useMemo(
    () =>
      meetings.find(
        (m) => m.status === 'scheduled' && new Date(m.starts_at).getTime() > Date.now() - 3600_000
      ) ?? null,
    [meetings]
  );

  const load = useCallback(async () => {
    if (!id || !me) return;
    try {
      const [conv, msgs, meets] = await Promise.all([
        fetchConversation(id),
        fetchMessages(id),
        fetchMeetings(me, { conversationId: id }).catch(() => [] as Meeting[]),
      ]);
      setConversation(conv);
      setMessages(msgs);
      setMeetings(meets);
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'טעינת השיחה נכשלה');
    } finally {
      setLoading(false);
    }
  }, [id, me]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    // Android uses softwareKeyboardLayoutMode=resize — extra pad double-counts and fights inputs.
    if (Platform.OS === 'android') return;
    const onShow = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardPad(Math.max(0, e.endCoordinates.height - insets.bottom));
    });
    const onHide = Keyboard.addListener('keyboardWillHide', () => setKeyboardPad(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [insets.bottom]);

  const onSend = async () => {
    if (!text.trim() || !me || !id) return;
    const body = text.trim();
    setText('');
    await sendMessage(id, me, body);
    completeTask('chat');
    load();
  };

  const openSchedule = () => {
    if (!apartmentId || !other?.id) {
      Alert.alert('חסר מידע', 'אפשר לקבוע פגישה רק בשיחה שמקושרת לדירה');
      return;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().slice(0, 10));
    setTime('18:00');
    setNote('');
    setScheduleOpen(true);
  };

  const proposeMeeting = async () => {
    if (!me || !id || !apartmentId || !other?.id) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      Alert.alert('בדוק תאריך ושעה', 'השתמש בפורמט YYYY-MM-DD ו-HH:MM');
      return;
    }
    const starts = new Date(`${date}T${time}:00`);
    if (Number.isNaN(starts.getTime()) || starts.getTime() <= Date.now()) {
      Alert.alert('תאריך לא תקין', 'בחר זמן בעתיד');
      return;
    }

    setScheduling(true);
    try {
      const meeting = await createMeeting({
        apartment_id: apartmentId,
        with_user_id: other.id,
        starts_at: starts.toISOString(),
        notes: note.trim() || undefined,
        conversation_id: id,
      });
      const when = formatMeetingWhen(meeting.starts_at);
      await sendMessage(
        id,
        me,
        `📅 הצעתי פגישה ל־${when}${note.trim() ? `\n💬 ${note.trim()}` : ''}\nממתין לאישור שלך כדי שהפגישה תיקבע`
      );
      completeTask('meet');
      setScheduleOpen(false);
      Alert.alert('נשלחה הצעה', 'הפגישה תיקבע רק אחרי שהצד השני יאשר');
      await load();
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'קביעת הפגישה נכשלה');
    } finally {
      setScheduling(false);
    }
  };

  const onRespond = async (meeting: Meeting, accepted: boolean) => {
    setRespondingId(meeting.id);
    try {
      const updated = await respondToMeeting(meeting.id, accepted);
      if (accepted && updated.status === 'scheduled' && me) {
        await sendMessage(
          id!,
          me,
          `✅ אישרתי את הפגישה ל־${formatMeetingWhen(updated.starts_at)} — נתראה!`
        );
      } else if (!accepted && me) {
        await sendMessage(id!, me, '✕ דחיתי את הצעת הפגישה');
      }
      await load();
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'העדכון נכשל');
    } finally {
      setRespondingId(null);
    }
  };

  if (loading) return <Loading label="טוען שיחה..." />;

  const iAmInvitee = pendingMeeting?.with_user_id === me;
  const iAmOrganizer = pendingMeeting?.organizer_id === me;

  return (
    <Screen edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Text style={styles.back}>→</Text>
          </Pressable>

          <View style={styles.person}>
            {/* Same letter avatar as the chats list (no remote/default photo) */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{otherLetter}</Text>
            </View>
            <View style={styles.personText}>
              <Text style={styles.name} numberOfLines={1}>
                {otherName}
              </Text>
              {conversation?.apartment?.address ? (
                <Text style={styles.sub} numberOfLines={1}>
                  {conversation.apartment.address}
                </Text>
              ) : (
                <Text style={styles.sub}>צ׳אט ב־RooMate</Text>
              )}
            </View>
          </View>

          <Pressable
            style={[styles.meetBtn, (!apartmentId || !other?.id) && styles.meetBtnDisabled]}
            onPress={openSchedule}
          >
            <Text style={styles.meetBtnIcon}>📅</Text>
            <Text style={styles.meetBtnT}>פגישה</Text>
          </Pressable>
        </View>

        {pendingMeeting ? (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>הצעת פגישה ממתינה</Text>
            <Text style={styles.bannerWhen}>{formatMeetingWhen(pendingMeeting.starts_at)}</Text>
            {pendingMeeting.notes ? (
              <Text style={styles.bannerNotes}>{pendingMeeting.notes}</Text>
            ) : null}
            <Text style={styles.bannerHint}>
              הפגישה תיקבע ביומן רק אחרי ששני הצדדים מאשרים
            </Text>
            {iAmInvitee ? (
              <View style={styles.bannerActions}>
                <Pressable
                  style={[styles.acceptBtn, respondingId === pendingMeeting.id && styles.btnBusy]}
                  disabled={!!respondingId}
                  onPress={() => onRespond(pendingMeeting, true)}
                >
                  {respondingId === pendingMeeting.id ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.acceptT}>✓ מאשר/ת</Text>
                  )}
                </Pressable>
                <Pressable
                  style={styles.declineBtn}
                  disabled={!!respondingId}
                  onPress={() => onRespond(pendingMeeting, false)}
                >
                  <Text style={styles.declineT}>✕ דוחה</Text>
                </Pressable>
              </View>
            ) : iAmOrganizer ? (
              <Text style={styles.waiting}>ממתין לאישור של {otherName}…</Text>
            ) : null}
          </View>
        ) : confirmedMeeting ? (
          <Pressable style={styles.confirmedBanner} onPress={() => router.push('/(tabs)/meetings')}>
            <Text style={styles.confirmedT}>
              ✅ פגישה מאושרת · {formatMeetingWhen(confirmedMeeting.starts_at)}
            </Text>
            <Text style={styles.confirmedLink}>ליומן ←</Text>
          </Pressable>
        ) : null}

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          renderItem={({ item }) => {
            const mine = item.sender_id === me;
            return (
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={[styles.body, mine && styles.mineText]}>{item.body}</Text>
              </View>
            );
          }}
        />

        <View
          style={[
            styles.inputRow,
            { paddingBottom: spacing.md + (keyboardPad > 0 ? 0 : insets.bottom) },
            keyboardPad > 0 ? { marginBottom: keyboardPad } : null,
          ]}
        >
          <Pressable style={styles.sendBtn} onPress={onSend}>
            <Text style={styles.sendText}>↑</Text>
          </Pressable>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="כתוב הודעה..."
            placeholderTextColor={colors.textFaint}
          />
        </View>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={scheduleOpen}
        onClose={() => !scheduling && setScheduleOpen(false)}
      >
        <View style={styles.panelHandle} />
        <Text style={styles.panelTitle}>הצעת פגישה עם {otherName}</Text>
        <Text style={styles.panelSub}>
          הפגישה תישמר ביומן רק אחרי שגם {otherName} יאשר/תאשר
        </Text>

        <Text style={styles.fieldLbl}>תאריך</Text>
        <TextInput
          style={styles.inp}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textFaint}
          value={date}
          onChangeText={setDate}
          textAlign="right"
        />
        <Text style={styles.fieldLbl}>שעה</Text>
        <TextInput
          style={styles.inp}
          placeholder="HH:MM"
          placeholderTextColor={colors.textFaint}
          value={time}
          onChangeText={setTime}
          textAlign="right"
        />
        <Text style={styles.fieldLbl}>הערה (אופציונלי)</Text>
        <TextInput
          style={[styles.inp, styles.inpMulti]}
          placeholder="למשל: נתראה בכניסה לבניין"
          placeholderTextColor={colors.textFaint}
          value={note}
          onChangeText={setNote}
          multiline
          textAlign="right"
        />

        <Pressable
          style={[styles.save, scheduling && styles.btnBusy]}
          disabled={scheduling}
          onPress={proposeMeeting}
        >
          {scheduling ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveT}>שלח הצעת פגישה</Text>
          )}
        </Pressable>
        <Pressable disabled={scheduling} onPress={() => setScheduleOpen(false)}>
          <Text style={styles.cancel}>ביטול</Text>
        </Pressable>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.or,
  },
  backBtn: { padding: 4 },
  back: { color: colors.white, fontSize: 22 },
  person: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.orLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '700', color: colors.or, fontSize: fontSize.lg },
  personText: { flex: 1 },
  name: { color: '#fff', fontWeight: '700', fontSize: fontSize.md, textAlign: 'left' },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2, textAlign: 'left' },
  meetBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 56,
  },
  meetBtnDisabled: { opacity: 0.45 },
  meetBtnIcon: { fontSize: 16 },
  meetBtnT: { color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 1 },
  banner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.orLight,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#ffd19a',
  },
  bannerTitle: { fontWeight: '800', color: colors.text, textAlign: 'left', fontSize: fontSize.sm },
  bannerWhen: { marginTop: 4, color: colors.orDark, fontWeight: '700', textAlign: 'left' },
  bannerNotes: { marginTop: 4, color: colors.textMuted, textAlign: 'left', fontSize: 12 },
  bannerHint: { marginTop: 8, color: colors.textMuted, fontSize: 11, textAlign: 'left' },
  bannerActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  acceptBtn: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  acceptT: { color: '#fff', fontWeight: '700' },
  declineBtn: {
    flex: 1,
    backgroundColor: colors.dangerBg,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  declineT: { color: colors.danger, fontWeight: '700' },
  waiting: { marginTop: 10, color: colors.orDark, fontWeight: '600', textAlign: 'left' },
  confirmedBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.successBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmedT: { color: colors.success, fontWeight: '700', fontSize: 12, flex: 1, textAlign: 'left' },
  confirmedLink: { color: colors.or, fontWeight: '700', fontSize: 12 },
  // Force LTR so mine=visual left, theirs=visual right (screen root is RTL)
  messagesList: { flex: 1, direction: 'ltr' },
  list: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  bubble: {
    maxWidth: '78%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 6,
  },
  mine: {
    alignSelf: 'flex-start',
    backgroundColor: colors.or,
    borderBottomLeftRadius: 4,
  },
  theirs: {
    alignSelf: 'flex-end',
    backgroundColor: colors.card,
    borderBottomRightRadius: 4,
  },
  body: {
    fontSize: fontSize.sm,
    color: colors.text,
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  mineText: { color: colors.white },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: colors.text,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.or,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: colors.white, fontWeight: '700' },
  ov: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  panelHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  panelTitle: {
    fontWeight: '800',
    fontSize: fontSize.lg,
    textAlign: 'left',
    color: colors.text,
  },
  panelSub: {
    marginTop: 6,
    marginBottom: spacing.lg,
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'left',
    lineHeight: 20,
  },
  fieldLbl: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'left',
    fontSize: 13,
  },
  inp: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: spacing.md,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: fontSize.md,
  },
  inpMulti: { minHeight: 72, textAlignVertical: 'top' },
  save: {
    backgroundColor: colors.or,
    padding: spacing.lg,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveT: { color: '#fff', fontWeight: '700', fontSize: fontSize.md },
  cancel: {
    marginTop: spacing.md,
    textAlign: 'center',
    color: colors.textMuted,
    fontWeight: '600',
  },
  btnBusy: { opacity: 0.7 },
});
