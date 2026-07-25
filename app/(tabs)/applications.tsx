import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import BottomSheet from '@/components/BottomSheet';
import Loading from '@/components/Loading';
import Screen from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/contexts/TasksContext';
import {
  approveApplication,
  createMeeting,
  fetchApplicationsForOwner,
  rejectApplication,
} from '@/lib/api';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import type { Application } from '@/lib/types';

const { width } = Dimensions.get('window');

export default function ApplicationsTab() {
  const { session } = useAuth();
  const { completeTask } = useTasks();
  const [items, setItems] = useState<Application[]>([]);
  const [approved, setApproved] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [meetOpen, setMeetOpen] = useState(false);
  const [meetApp, setMeetApp] = useState<Application | null>(null);
  const [meetDate, setMeetDate] = useState('');
  const [meetTime, setMeetTime] = useState('18:00');
  const [meetNote, setMeetNote] = useState('');
  const [meetPrivate, setMeetPrivate] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user?.id) return;
    const data = await fetchApplicationsForOwner(session.user.id);
    setItems(data.filter((a) => a.status === 'pending'));
    setApproved(data.filter((a) => a.status === 'approved'));
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onApprove = async (id: string) => {
    try {
      const app = items.find((a) => a.id === id) ?? null;
      await approveApplication(id);
      Alert.alert('אושר!', 'נפתחה שיחה עם המועמד/ת');
      await load();
      if (app) {
        setMeetApp(app);
        setMeetOpen(true);
      }
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'אישור נכשל');
    }
  };

  const onReject = async (id: string) => {
    try {
      await rejectApplication(id);
      load();
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'דחייה נכשלה');
    }
  };

  const scheduleMeet = async () => {
    if (!meetApp || !session?.user?.id) return;
    try {
      const dateStr = meetDate || new Date().toISOString().slice(0, 10);
      const starts = new Date(`${dateStr}T${meetTime}:00`);
      await createMeeting({
        apartment_id: meetApp.apartment_id,
        with_user_id: meetApp.applicant_id,
        starts_at: starts.toISOString(),
        notes: meetNote || (meetPrivate ? 'פגישה פרטית' : 'פגישה להכרות'),
      });
      completeTask('meet');
      setMeetOpen(false);
      Alert.alert('נקבעה!', 'הפגישה נוספה ליומן');
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'קביעת פגישה נכשלה');
    }
  };

  if (loading) return <Loading label="טוען פניות..." />;

  const current = items[0];

  return (
    <Screen edges={['top', 'left', 'right']} background={colors.bg}>
      <Text style={styles.title}>פניות לדירה</Text>

      {approved.length > 0 ? (
        <View style={styles.approvedStrip}>
          <Text style={styles.approvedTitle}>אושרו · {approved.length}</Text>
          <View style={styles.approvedRow}>
            {approved.slice(0, 5).map((a) => (
              <Pressable
                key={a.id}
                style={styles.approvedAv}
                onPress={() => router.push('/(tabs)/chat')}
              >
                <Text style={styles.approvedAvT}>
                  {(a.applicant?.full_name ?? '?').slice(0, 1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {!current ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>אין פניות ממתינות</Text>
          <Text style={styles.emptySub}>כשמישהו יגיש פנייה — תופיע כאן כרטיס להחלקה</Text>
        </View>
      ) : (
        <View style={styles.stack}>
          <View style={styles.card}>
            <View style={styles.photo}>
              <Text style={styles.photoLetter}>
                {(current.applicant?.full_name ?? '?').slice(0, 1)}
              </Text>
            </View>
            <View style={styles.grad} />
            <View style={styles.nameOverlay}>
              <Text style={styles.name}>
                {current.applicant?.full_name ?? 'מועמד/ת'}
                {current.applicant?.age ? `, ${current.applicant.age}` : ''}
              </Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.bio}>
                {current.message ?? current.applicant?.bio ?? 'רוצה להצטרף לדירה'}
              </Text>
              <View style={styles.tags}>
                {(current.applicant?.hobbies ?? []).slice(0, 4).map((h) => (
                  <View key={h} style={styles.tag}>
                    <Text style={styles.tagT}>{h}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.actions}>
              <Pressable style={[styles.act, styles.reject]} onPress={() => onReject(current.id)}>
                <Text style={styles.actIcon}>✕</Text>
              </Pressable>
              <Pressable
                style={[styles.act, styles.profile]}
                onPress={() => {
                  const uid = current.applicant_id ?? current.applicant?.id;
                  if (uid) router.push(`/user/${uid}`);
                  else Alert.alert('פרופיל', current.applicant?.full_name ?? 'מועמד/ת');
                }}
              >
                <Text style={styles.actIcon}>👤</Text>
              </Pressable>
              <Pressable style={[styles.act, styles.approve]} onPress={() => onApprove(current.id)}>
                <Text style={styles.actIcon}>✓</Text>
              </Pressable>
            </View>
          </View>
          {items.length > 1 ? (
            <Text style={styles.remaining}>עוד {items.length - 1} פניות ממתינות</Text>
          ) : null}
        </View>
      )}

      <BottomSheet visible={meetOpen} onClose={() => setMeetOpen(false)}>
        <Text style={styles.meetTitle}>קבע פגישה עם {meetApp?.applicant?.full_name}</Text>
        <Text style={styles.meetLbl}>תאריך (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.meetInp}
          value={meetDate}
          onChangeText={setMeetDate}
          placeholder={new Date().toISOString().slice(0, 10)}
          textAlign="left"
        />
        <Text style={styles.meetLbl}>שעה</Text>
        <TextInput
          style={styles.meetInp}
          value={meetTime}
          onChangeText={setMeetTime}
          placeholder="18:00"
          textAlign="left"
        />
        <Text style={styles.meetLbl}>הערה</Text>
        <TextInput
          style={[styles.meetInp, { minHeight: 70 }]}
          value={meetNote}
          onChangeText={setMeetNote}
          placeholder="פרטים לפגישה..."
          multiline
          textAlign="left"
        />
        <Pressable style={styles.privacyRow} onPress={() => setMeetPrivate((v) => !v)}>
          <Text style={styles.privacyT}>פגישה פרטית (לא נראית לאחרים)</Text>
          <View style={[styles.check, meetPrivate && styles.checkOn]}>
            <Text style={{ color: '#fff' }}>{meetPrivate ? '✓' : ''}</Text>
          </View>
        </Pressable>
        <Pressable style={styles.meetBtn} onPress={scheduleMeet}>
          <Text style={styles.meetBtnT}>קבע פגישה</Text>
        </Pressable>
        <Pressable onPress={() => setMeetOpen(false)}>
          <Text style={styles.skip}>דלג</Text>
        </Pressable>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    padding: spacing.lg,
    color: colors.white,
    textAlign: 'left',
    backgroundColor: colors.or,
  },
  approvedStrip: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  approvedTitle: { textAlign: 'left', fontWeight: '700', marginBottom: 8, color: colors.text },
  approvedRow: { flexDirection: 'row', gap: 8 },
  approvedAv: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.or,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvedAvT: { color: '#fff', fontWeight: '700' },
  emptyWrap: { padding: spacing.xxl, alignItems: 'center' },
  empty: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  emptySub: { marginTop: 8, color: colors.textMuted, textAlign: 'center' },
  stack: { flex: 1, alignItems: 'center', paddingTop: spacing.lg },
  card: {
    width: width - 40,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    paddingBottom: spacing.lg,
  },
  photo: {
    width: '100%',
    height: 280,
    backgroundColor: colors.orLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoLetter: { fontSize: 96, fontWeight: '700', color: colors.or },
  grad: {
    position: 'absolute',
    top: 200,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'transparent',
  },
  nameOverlay: {
    position: 'absolute',
    top: 230,
    start: 16,
    end: 16,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'left',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 6,
  },
  body: { padding: spacing.lg },
  bio: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'left',
    lineHeight: 20,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md },
  tag: {
    backgroundColor: colors.orLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  tagT: { fontSize: 11, color: colors.or, fontWeight: '500' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginTop: spacing.md,
  },
  act: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  actIcon: { fontSize: 22 },
  reject: { borderColor: '#ffcdd2', backgroundColor: '#fff5f5' },
  profile: { borderColor: '#e0e0e0', backgroundColor: '#fafafa' },
  approve: { borderColor: '#c8e6c9', backgroundColor: '#e8f5e9' },
  remaining: { marginTop: spacing.lg, color: colors.textMuted },
  modalOv: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  meetPanel: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    paddingBottom: 40,
  },
  meetTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    textAlign: 'left',
    marginBottom: spacing.lg,
    color: colors.text,
  },
  meetLbl: { textAlign: 'left', color: colors.textMuted, marginBottom: 6, fontSize: 12 },
  meetInp: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: spacing.md,
    backgroundColor: colors.bg,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  privacyT: { color: colors.text, fontSize: fontSize.sm },
  check: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.or, borderColor: colors.or },
  meetBtn: {
    backgroundColor: colors.or,
    padding: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  meetBtnT: { color: '#fff', fontWeight: '700' },
  skip: { textAlign: 'center', marginTop: spacing.md, color: colors.textMuted },
});
