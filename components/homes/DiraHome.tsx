import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
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
import {
  fetchApartmentMembers,
  fetchApplicationsForOwner,
  fetchFriends,
  fetchFriendSuggestions,
  fetchMeetings,
  fetchMyApartments,
  inviteRoommate,
  type FriendRow,
} from '@/lib/api';
import { useBottomInset } from '@/lib/safe-area';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import type { Apartment, ApartmentMember, Application, Meeting, Profile } from '@/lib/types';

const ROLE_LABEL: Record<string, string> = {
  owner: 'מנהל דירה',
  roommate: 'שותף/ה',
  pending_roommate: 'ממתין לאישור',
};

export default function DiraHome() {
  const bottomInset = useBottomInset(8);
  const { session, profile } = useAuth();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<ApartmentMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const [mine, apps, meets] = await Promise.all([
        fetchMyApartments(),
        fetchApplicationsForOwner(session.user.id),
        fetchMeetings(session.user.id),
      ]);
      setApartments(mine);
      setApplications(apps.filter((a) => a.status === 'pending'));
      setMeetings(meets.filter((m) => m.status === 'scheduled').slice(0, 3));

      const aptId = mine[0]?.id;
      if (aptId) {
        const mems = await fetchApartmentMembers(aptId).catch(() => [] as ApartmentMember[]);
        setMembers(mems);
      } else {
        setMembers([]);
      }
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'טעינה נכשלה');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const myApt = apartments[0];
  const image = myApt?.image_urls?.[0];
  const memberIds = useMemo(() => new Set(members.map((m) => m.profile_id)), [members]);

  const roommates = useMemo(
    () =>
      members.filter(
        (m) =>
          m.profile_id !== session?.user?.id &&
          (m.role === 'roommate' || m.role === 'pending_roommate' || m.role === 'owner')
      ),
    [members, session?.user?.id]
  );

  const openSlots = Math.max(0, (myApt?.roommate_slots ?? 1) - roommates.filter((m) => m.role === 'roommate').length);

  const openInvite = async () => {
    if (!myApt) {
      Alert.alert('אין דירה', 'קודם צריך לרשום דירה כדי להזמין שותפים');
      return;
    }
    setInviteOpen(true);
    setInviteLoading(true);
    try {
      const [f, s] = await Promise.all([fetchFriends(), fetchFriendSuggestions()]);
      setFriends(f);
      setSuggestions(s);
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'טעינת משתמשים נכשלה');
    } finally {
      setInviteLoading(false);
    }
  };

  const inviteCandidates = useMemo(() => {
    const me = session?.user?.id;
    const q = inviteQuery.trim();
    const friendProfiles = friends
      .map((f) => f.profile)
      .filter((p) => p?.id && p.id !== me && !memberIds.has(p.id));
    const otherProfiles = suggestions.filter(
      (p) => p.id !== me && !memberIds.has(p.id) && !friendProfiles.some((f) => f.id === p.id)
    );

    const match = (p: Profile) =>
      !q || (p.full_name ?? p.username ?? '').toLowerCase().includes(q.toLowerCase());

    return {
      friends: friendProfiles.filter(match),
      others: otherProfiles.filter(match),
    };
  }, [friends, suggestions, inviteQuery, memberIds, session?.user?.id]);

  const onInvite = async (user: Profile) => {
    if (!myApt) return;
    try {
      setInvitingId(user.id);
      await inviteRoommate(myApt.id, user.id);
      Alert.alert('נשלח', `נשלחה הזמנה ל${user.full_name ?? 'משתמש/ת'}`);
      setMembers((prev) => [
        ...prev,
        {
          apartment_id: myApt.id,
          profile_id: user.id,
          role: 'pending_roommate',
          profile: user,
        },
      ]);
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'שליחת ההזמנה נכשלה');
    } finally {
      setInvitingId(null);
    }
  };

  if (loading) return <Loading label="טוען דירה..." />;

  return (
    <Screen edges={['top', 'left', 'right']} background={colors.bg}>
      <ScrollView
        contentContainerStyle={styles.scroll}
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
      >
        <View style={styles.top}>
          <Text style={styles.hello}>שלום,</Text>
          <Text style={styles.name}>{profile?.full_name ?? 'שותף/ה'} 👋</Text>
        </View>

        {myApt ? (
          <Pressable
            style={styles.aptCard}
            onPress={() => router.push(`/apartment/${myApt.id}`)}
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.aptImg} />
            ) : (
              <View style={[styles.aptImg, { backgroundColor: colors.orLight }]} />
            )}
            <View style={styles.aptInf}>
              <Text style={styles.aptNm}>{myApt.title ?? myApt.address}</Text>
              <Text style={styles.aptAd}>
                {myApt.neighborhood ? `${myApt.neighborhood}, ` : ''}
                {myApt.city}
              </Text>
              <View style={styles.sts}>
                <View style={[styles.st, { backgroundColor: colors.successBg }]}>
                  <Text style={[styles.stT, { color: colors.success }]}>
                    {myApt.status === 'open' ? 'פעילה' : 'מלאה'}
                  </Text>
                </View>
                <View style={[styles.st, { backgroundColor: colors.orLight }]}>
                  <Text style={[styles.stT, { color: colors.or }]}>
                    {applications.length} פניות
                  </Text>
                </View>
                <View style={[styles.st, { backgroundColor: '#e3f2fd' }]}>
                  <Text style={[styles.stT, { color: '#1976D2' }]}>
                    ₪{myApt.price.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        ) : (
          <View style={styles.emptyApt}>
            <Text style={styles.emptyAptT}>עדיין אין דירה רשומה</Text>
            <Text style={styles.emptyAptS}>העלה סיור בדירה מהכפתור +</Text>
          </View>
        )}

        <View style={styles.sec}>
          <View style={styles.secH}>
            <Text style={styles.secT}>השותפים בדירה</Text>
            <Pressable onPress={openInvite} hitSlop={10}>
              <Text style={styles.secL}>+ הוסף</Text>
            </Pressable>
          </View>

          <View style={styles.rm}>
            <View style={[styles.rmAv, { backgroundColor: colors.or }]}>
              <Text style={styles.rmAvT}>{(profile?.full_name ?? 'א').slice(0, 1)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rmNm}>{profile?.full_name ?? 'אני'} (אני)</Text>
              <Text style={styles.rmRl}>מנהל דירה</Text>
            </View>
            <Text style={styles.rmBdg}>מנהל 👑</Text>
          </View>

          {roommates.map((m) => {
            const name = m.profile?.full_name ?? m.profile?.username ?? 'משתמש';
            const pending = m.role === 'pending_roommate';
            return (
              <Pressable
                key={`${m.apartment_id}-${m.profile_id}`}
                style={[styles.rm, pending && { opacity: 0.75 }]}
                onPress={() => router.push(`/user/${m.profile_id}`)}
              >
                <View style={[styles.rmAv, { backgroundColor: pending ? '#bbb' : colors.orLight }]}>
                  <Text style={[styles.rmAvT, { color: pending ? '#fff' : colors.or }]}>
                    {name.slice(0, 1)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rmNm}>{name}</Text>
                  <Text style={styles.rmRl}>{ROLE_LABEL[m.role] ?? m.role}</Text>
                </View>
                {pending ? (
                  <Text style={styles.pendingChip}>ממתין</Text>
                ) : (
                  <Text style={styles.rmBdg}>שותף</Text>
                )}
              </Pressable>
            );
          })}

          {openSlots > 0
            ? Array.from({ length: openSlots }).map((_, i) => (
                <Pressable key={`slot-${i}`} style={[styles.rm, { opacity: 0.5 }]} onPress={openInvite}>
                  <View style={[styles.rmAv, { backgroundColor: '#eee' }]}>
                    <Text style={{ color: '#bbb', fontSize: 18 }}>?</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rmNm, { color: '#bbb' }]}>חדר פנוי</Text>
                    <Text style={styles.rmRl}>לחץ להזמין שותף/ה</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: colors.or, fontWeight: '600' }}>הוסף</Text>
                </Pressable>
              ))
            : null}
        </View>

        <View style={styles.sec}>
          <View style={styles.secH}>
            <Text style={styles.secT}>פניות אחרונות</Text>
            <Pressable onPress={() => router.push('/(tabs)/applications')}>
              <Text style={styles.secL}>ראה הכל ←</Text>
            </Pressable>
          </View>
          {applications.length === 0 ? (
            <Text style={styles.empty}>אין פניות ממתינות</Text>
          ) : (
            applications.slice(0, 3).map((app) => (
              <Pressable
                key={app.id}
                style={styles.appRow}
                onPress={() => router.push('/(tabs)/applications')}
              >
                <View style={[styles.rmAv, { backgroundColor: colors.orLight }]}>
                  <Text style={[styles.rmAvT, { color: colors.or }]}>
                    {(app.applicant?.full_name ?? '?').slice(0, 1)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rmNm}>{app.applicant?.full_name ?? 'מועמד/ת'}</Text>
                  <Text style={styles.rmRl} numberOfLines={1}>
                    {app.message ?? 'רוצה להצטרף לדירה'}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>

        <View style={styles.sec}>
          <View style={styles.secH}>
            <Text style={styles.secT}>פגישות קרובות</Text>
            <Pressable onPress={() => router.push('/(tabs)/meetings')}>
              <Text style={styles.secL}>יומן ←</Text>
            </Pressable>
          </View>
          {meetings.length === 0 ? (
            <Text style={styles.empty}>אין פגישות קרובות</Text>
          ) : (
            meetings.map((m) => {
              const d = new Date(m.starts_at);
              return (
                <View key={m.id} style={styles.meetRow}>
                  <View style={styles.meetDate}>
                    <Text style={styles.meetDay}>{d.getDate()}</Text>
                    <Text style={styles.meetMon}>
                      {d.toLocaleDateString('he-IL', { month: 'short' })}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rmNm}>
                      {d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={styles.rmRl} numberOfLines={1}>
                      {m.notes ?? 'פגישה בדירה'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>סטטוס דירה</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusBox}>
              <Text style={styles.statusVal}>{applications.length}</Text>
              <Text style={styles.statusLbl}>פניות</Text>
            </View>
            <View style={styles.statusBox}>
              <Text style={styles.statusVal}>{roommates.filter((m) => m.role === 'roommate').length}</Text>
              <Text style={styles.statusLbl}>שותפים</Text>
            </View>
            <View style={styles.statusBox}>
              <Text style={styles.statusVal}>{openSlots}</Text>
              <Text style={styles.statusLbl}>חדרים פנויים</Text>
            </View>
          </View>
        </View>

        {myApt ? (
          <Pressable
            style={styles.sec}
            onPress={() =>
              router.push({ pathname: '/apartment/expenses', params: { id: myApt.id } })
            }
          >
            <View style={styles.secH}>
              <Text style={styles.secT}>הוצאות משותפות</Text>
              <Text style={styles.secL}>פתח ←</Text>
            </View>
            <View style={styles.expRow}>
              <Text style={styles.expLbl}>שכירות</Text>
              <Text style={styles.expVal}>₪{(myApt.price ?? 0).toLocaleString()}</Text>
            </View>
            <View style={styles.expRow}>
              <Text style={styles.expLbl}>ארנונה</Text>
              <Text style={styles.expVal}>₪{(myApt.arnona ?? 0).toLocaleString()}</Text>
            </View>
            <View style={styles.expRow}>
              <Text style={styles.expLbl}>ועד בית</Text>
              <Text style={styles.expVal}>₪{(myApt.vaad ?? 0).toLocaleString()}</Text>
            </View>
            <View style={styles.expRow}>
              <Text style={styles.expLbl}>חשמל / מים</Text>
              <Text style={styles.expVal}>₪{(myApt.utilities ?? 0).toLocaleString()}</Text>
            </View>
            <Text style={styles.expHint}>לחץ לראות חלוקה שווה בין כל הדיירים</Text>
          </Pressable>
        ) : null}

        <View style={styles.sec}>
          <Text style={styles.secT}>קישורים מהירים</Text>
          <View style={styles.quick}>
            {[
              { label: 'חברים', icon: '👥', href: '/friends' as const },
              { label: 'Reels', icon: '🎬', href: '/(tabs)/reels' as const },
              { label: 'מועדפים', icon: '❤️', href: '/favorites' as const },
              { label: 'הגדרות', icon: '⚙️', href: '/settings' as const },
            ].map((q) => (
              <Pressable key={q.label} style={styles.quickItem} onPress={() => router.push(q.href)}>
                <Text style={styles.quickIcon}>{q.icon}</Text>
                <Text style={styles.quickLbl}>{q.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: 24 + bottomInset }]}
        onPress={() =>
          router.push({ pathname: '/(tabs)/reels', params: { uploadTour: '1' } })
        }
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <BottomSheet
        visible={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          setInviteQuery('');
        }}
        scrollable={false}
      >
        <View style={styles.inviteHead}>
          <Text style={styles.inviteTitle}>הזמן שותף/ה לדירה</Text>
          <Pressable
            onPress={() => {
              setInviteOpen(false);
              setInviteQuery('');
            }}
          >
            <Text style={{ color: colors.textFaint }}>✕</Text>
          </Pressable>
        </View>
        <Text style={styles.inviteHint}>בחר מחברים או ממשתמשי המערכת</Text>
        <TextInput
          style={styles.inviteSearch}
          placeholder="חיפוש לפי שם..."
          placeholderTextColor={colors.textFaint}
          value={inviteQuery}
          onChangeText={setInviteQuery}
          textAlign="right"
        />
        {inviteLoading ? (
          <Text style={styles.empty}>טוען...</Text>
        ) : (
          <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.inviteSec}>החברים שלי</Text>
            {inviteCandidates.friends.length === 0 ? (
              <Text style={styles.emptyMini}>אין חברים פנויים להזמנה</Text>
            ) : (
              inviteCandidates.friends.map((p) => (
                <View key={p.id} style={styles.inviteRow}>
                  <Pressable style={styles.inviteInfo} onPress={() => router.push(`/user/${p.id}`)}>
                    <View style={[styles.rmAv, { backgroundColor: colors.or }]}>
                      <Text style={styles.rmAvT}>
                        {(p.full_name ?? p.username ?? '?').slice(0, 1)}
                      </Text>
                    </View>
                    <Text style={styles.rmNm}>{p.full_name ?? p.username ?? 'משתמש'}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.inviteBtn, invitingId === p.id && styles.inviteBtnBusy]}
                    disabled={!!invitingId}
                    onPress={() => onInvite(p)}
                  >
                    <Text style={styles.inviteBtnT}>
                      {invitingId === p.id ? '...' : 'הזמן'}
                    </Text>
                  </Pressable>
                </View>
              ))
            )}

            <Text style={[styles.inviteSec, { marginTop: spacing.md }]}>משתמשי המערכת</Text>
            {inviteCandidates.others.length === 0 ? (
              <Text style={styles.emptyMini}>אין משתמשים נוספים</Text>
            ) : (
              inviteCandidates.others.map((p) => (
                <View key={p.id} style={styles.inviteRow}>
                  <Pressable style={styles.inviteInfo} onPress={() => router.push(`/user/${p.id}`)}>
                    <View style={[styles.rmAv, { backgroundColor: colors.orLight }]}>
                      <Text style={[styles.rmAvT, { color: colors.or }]}>
                        {(p.full_name ?? p.username ?? '?').slice(0, 1)}
                      </Text>
                    </View>
                    <Text style={styles.rmNm}>{p.full_name ?? p.username ?? 'משתמש'}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.inviteBtn, invitingId === p.id && styles.inviteBtnBusy]}
                    disabled={!!invitingId}
                    onPress={() => onInvite(p)}
                  >
                    <Text style={styles.inviteBtnT}>
                      {invitingId === p.id ? '...' : 'הזמן'}
                    </Text>
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 120 },
  top: {
    backgroundColor: colors.or,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  hello: { color: 'rgba(255,255,255,0.8)', fontSize: 12, textAlign: 'left' },
  name: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'left' },
  aptCard: {
    flexDirection: 'row',
    margin: spacing.lg,
    marginTop: -20,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  aptImg: { width: 90, height: 90 },
  aptInf: { flex: 1, padding: spacing.md },
  aptNm: { fontWeight: '700', fontSize: fontSize.md, textAlign: 'left', color: colors.text },
  aptAd: { fontSize: 12, color: colors.textMuted, textAlign: 'left', marginTop: 2 },
  sts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  st: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  stT: { fontSize: 11, fontWeight: '600' },
  emptyApt: {
    margin: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  emptyAptT: { fontWeight: '700', fontSize: fontSize.md, color: colors.text },
  emptyAptS: { marginTop: 4, color: colors.textMuted, fontSize: fontSize.sm },
  sec: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  secH: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  secT: { fontSize: 15, fontWeight: '700', color: colors.text },
  secL: { fontSize: 12, color: colors.or, fontWeight: '600' },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
  emptyMini: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    fontSize: 12,
  },
  rm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f3f3',
  },
  rmAv: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rmAvT: { color: '#fff', fontWeight: '700', fontSize: 16 },
  rmNm: { fontWeight: '600', fontSize: fontSize.sm, textAlign: 'left', color: colors.text },
  rmRl: { fontSize: 12, color: colors.textMuted, textAlign: 'left', marginTop: 2 },
  rmBdg: { fontSize: 11, color: colors.or },
  pendingChip: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    backgroundColor: colors.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  meetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  meetDate: { alignItems: 'center', minWidth: 40 },
  meetDay: { fontSize: 18, fontWeight: '700', color: colors.or },
  meetMon: { fontSize: 11, color: colors.textMuted },
  statusCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.orLight,
    borderRadius: radius.lg,
  },
  statusTitle: { fontWeight: '700', textAlign: 'left', marginBottom: spacing.md, color: colors.text },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statusBox: { alignItems: 'center', flex: 1 },
  statusVal: { fontWeight: '700', fontSize: fontSize.md, color: colors.or },
  statusLbl: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  expRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f3f3',
  },
  expLbl: { color: colors.textMuted, fontSize: fontSize.sm },
  expVal: { fontWeight: '600', color: colors.text },
  expHint: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.or,
    fontWeight: '600',
    textAlign: 'left',
  },
  quick: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  quickItem: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: colors.bg,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickIcon: { fontSize: 20, marginBottom: 4 },
  quickLbl: { fontSize: 11, fontWeight: '600', color: colors.text },
  fab: {
    position: 'absolute',
    end: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.or,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 30 },
  inviteHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  inviteTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  inviteHint: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.md, textAlign: 'left' },
  inviteSearch: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: spacing.md,
    color: colors.text,
    fontSize: fontSize.sm,
  },
  inviteSec: {
    fontWeight: '700',
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'left',
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  inviteInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  inviteBtn: {
    backgroundColor: colors.or,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  inviteBtnBusy: { opacity: 0.6 },
  inviteBtnT: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
