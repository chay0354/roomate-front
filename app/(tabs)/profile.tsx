import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Button from '@/components/Button';
import Screen from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useGuest } from '@/contexts/GuestContext';
import { useTasks } from '@/contexts/TasksContext';
import {
  fetchMyApartments,
  fetchMyMemberships,
  fetchPendingFriendRequests,
  fetchPendingRoommateInvites,
  respondFriendRequest,
  respondRoommateInvite,
  type FriendRow,
  type RoommateInvite,
} from '@/lib/api';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import type { Apartment } from '@/lib/types';

export default function ProfileTab() {
  const { profile, signOut } = useAuth();
  const { isGuest, setGuest } = useGuest();
  const { completeTask, percent } = useTasks();
  const isDira = profile?.user_path === 'dira';
  const isDayer = profile?.user_path === 'dayer';
  const [pending, setPending] = useState<FriendRow[]>([]);
  const [aptInvites, setAptInvites] = useState<RoommateInvite[]>([]);
  const [memberships, setMemberships] = useState<Apartment[]>([]);

  const loadPending = useCallback(async () => {
    if (isGuest) return;
    try {
      const [friends, invites, mems] = await Promise.all([
        fetchPendingFriendRequests(),
        fetchPendingRoommateInvites(),
        isDayer ? fetchMyMemberships().catch(() => [] as Apartment[]) : Promise.resolve([] as Apartment[]),
      ]);
      setPending(friends);
      setAptInvites(invites);
      setMemberships(mems);
    } catch {
      setPending([]);
      setAptInvites([]);
      setMemberships([]);
    }
  }, [isGuest, isDayer]);

  useFocusEffect(
    useCallback(() => {
      loadPending();
    }, [loadPending])
  );

  const onRespond = async (userId: string, action: 'accept' | 'decline') => {
    try {
      await respondFriendRequest(userId, action);
      setPending((prev) => prev.filter((p) => p.profile.id !== userId));
      if (action === 'accept') {
        Alert.alert('אושר', 'עכשיו אתם חברים');
      }
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'הפעולה נכשלה');
    }
  };

  const onRespondApt = async (apartmentId: string, action: 'accept' | 'decline') => {
    try {
      await respondRoommateInvite(apartmentId, action);
      setAptInvites((prev) => prev.filter((i) => i.apartment_id !== apartmentId));
      if (action === 'accept') {
        Alert.alert('אושר', 'הצטרפת לדירה כשותף/ה');
      }
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'הפעולה נכשלה');
    }
  };

  if (isGuest) {
    return (
      <Screen style={styles.screen}>
        <Text style={styles.title}>פרופיל</Text>
        <Text style={styles.guestText}>
          אתה במצב אורח. הירשם כדי לגשת לצ׳אט, פניות ופרופיל.
        </Text>
        <Button title="הירשם עכשיו" onPress={() => router.push('/(auth)/path')} />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Pressable
            style={styles.avatar}
            onPress={() => {
              completeTask('photo');
              Alert.alert('תמונה', 'העלאת תמונה תתווסף בקרוב');
            }}
          >
            {/* Letter avatar only — remote photos flip under forceRTL (same as chat) */}
            <Text style={styles.avatarText}>{(profile?.full_name ?? '?').slice(0, 1)}</Text>
          </Pressable>
          <Text style={styles.name}>{profile?.full_name ?? 'משתמש/ת'}</Text>
          <Text style={styles.meta}>
            {isDira ? '🏡 יש לי דירה' : '🔍 מחפש/ת דירה'}
            {profile?.age ? ` · ${profile.age}` : ''}
            {profile?.occupation ? ` · ${profile.occupation}` : ''}
          </Text>
          <View style={styles.pctBar}>
            <View style={[styles.pctFill, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.pctLbl}>פרופיל {percent}% מלא</Text>
        </View>

        {aptInvites.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.secTitle}>הזמנות לדירה ({aptInvites.length})</Text>
            {aptInvites.map((inv) => {
              const apt = inv.apartment;
              const owner = apt?.owner;
              const aptLabel = apt?.title ?? apt?.address ?? 'דירה';
              const ownerName = owner?.full_name ?? owner?.username ?? 'בעל/ת דירה';
              return (
                <View key={`${inv.apartment_id}-${inv.profile_id}`} style={styles.pendingRow}>
                  <Pressable
                    style={styles.pendingInfo}
                    onPress={() => {
                      if (owner?.id) router.push(`/user/${owner.id}`);
                    }}
                  >
                    <View style={styles.pendingAv}>
                      <Text style={styles.pendingAvT}>{ownerName.slice(0, 1)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pendingNm}>{aptLabel}</Text>
                      <Text style={styles.pendingSub}>הזמנה מ־{ownerName} להצטרף כשותף/ה</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    style={styles.acceptBtn}
                    onPress={() => onRespondApt(inv.apartment_id, 'accept')}
                  >
                    <Text style={styles.acceptT}>אשר</Text>
                  </Pressable>
                  <Pressable
                    style={styles.declineBtn}
                    onPress={() => onRespondApt(inv.apartment_id, 'decline')}
                  >
                    <Text style={styles.declineT}>דחה</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}

        {pending.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.secTitle}>בקשות חברות ({pending.length})</Text>
            {pending.map((row) => {
              const p = row.profile;
              const name = p?.full_name ?? p?.username ?? 'משתמש';
              return (
                <View key={p.id} style={styles.pendingRow}>
                  <Pressable
                    style={styles.pendingInfo}
                    onPress={() => router.push(`/user/${p.id}`)}
                  >
                    <View style={styles.pendingAv}>
                      <Text style={styles.pendingAvT}>{name.slice(0, 1)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pendingNm}>{name}</Text>
                      <Text style={styles.pendingSub}>רוצה להיות חבר/ה</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    style={styles.acceptBtn}
                    onPress={() => onRespond(p.id, 'accept')}
                  >
                    <Text style={styles.acceptT}>אשר</Text>
                  </Pressable>
                  <Pressable
                    style={styles.declineBtn}
                    onPress={() => onRespond(p.id, 'decline')}
                  >
                    <Text style={styles.declineT}>דחה</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.secTitle}>ביו</Text>
          <Text style={styles.bio}>{profile?.bio ?? 'עדיין לא הוספת ביו'}</Text>
        </View>

        {(profile?.hobbies?.length ?? 0) > 0 ? (
          <View style={styles.section}>
            <Text style={styles.secTitle}>תחביבים</Text>
            <View style={styles.chips}>
              {profile!.hobbies.map((h) => (
                <View key={h} style={styles.chip}>
                  <Text style={styles.chipT}>{h}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {isDayer && memberships.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.secTitle}>הוצאות משותפות</Text>
            <Text style={styles.bio}>
              החלק שלך בהוצאות הדירה, מחולק שווה בין כל הדיירים
            </Text>
            {memberships.map((apt) => (
              <Pressable
                key={apt.id}
                style={styles.expLink}
                onPress={() =>
                  router.push({ pathname: '/apartment/expenses', params: { id: apt.id } })
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingNm}>{apt.title ?? apt.address}</Text>
                  <Text style={styles.pendingSub}>
                    {apt.neighborhood ? `${apt.neighborhood} · ` : ''}
                    לחץ לפירוט וחלוקה
                  </Text>
                </View>
                <Text style={styles.expArrow}>←</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {isDira ? (
          <View style={styles.section}>
            <Text style={styles.secTitle}>פעולות בעל דירה</Text>
            <Button
              title="הוצאות משותפות"
              variant="secondary"
              onPress={async () => {
                try {
                  const mine = await fetchMyApartments();
                  if (!mine[0]) {
                    Alert.alert('אין דירה', 'עדיין אין דירה רשומה');
                    return;
                  }
                  router.push({ pathname: '/apartment/expenses', params: { id: mine[0].id } });
                } catch (e) {
                  Alert.alert('שגיאה', e instanceof Error ? e.message : 'טעינה נכשלה');
                }
              }}
            />
            <Button
              title="הזמן לפגישה"
              variant="secondary"
              onPress={() => router.push('/(tabs)/meetings')}
              style={{ marginTop: spacing.md }}
            />
            <Button
              title="שלח הודעה"
              variant="secondary"
              onPress={() => router.push('/(tabs)/chat')}
              style={{ marginTop: spacing.md }}
            />
          </View>
        ) : null}

        <Button title="חברים" variant="secondary" onPress={() => router.push('/friends')} />
        <Button
          title="מועדפים"
          variant="secondary"
          onPress={() => router.push('/favorites')}
          style={{ marginTop: spacing.md }}
        />
        <Button
          title="הגדרות"
          variant="secondary"
          onPress={() => router.push('/settings')}
          style={{ marginTop: spacing.md }}
        />
        <Button
          title="התנתק"
          variant="ghost"
          onPress={async () => {
            await signOut();
            await setGuest(false);
            router.replace('/(auth)/welcome');
          }}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.xl },
  scroll: { padding: spacing.xl, paddingBottom: 100 },
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.orLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  avatarText: { fontSize: 36, fontWeight: '700', color: colors.or },
  name: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  meta: { marginTop: 4, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
  pctBar: {
    width: '60%',
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  pctFill: { height: '100%', backgroundColor: colors.or },
  pctLbl: { marginTop: 6, fontSize: 11, color: colors.or, fontWeight: '600' },
  section: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  secTitle: {
    fontWeight: '700',
    fontSize: fontSize.md,
    textAlign: 'left',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pendingInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pendingAv: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.or,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingAvT: { color: '#fff', fontWeight: '700' },
  pendingNm: { fontWeight: '700', color: colors.text, textAlign: 'left' },
  pendingSub: { fontSize: 11, color: colors.textMuted, textAlign: 'left', marginTop: 2 },
  expLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  expArrow: { color: colors.or, fontWeight: '700', fontSize: 18 },
  acceptBtn: {
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  acceptT: { color: '#fff', fontWeight: '700', fontSize: 12 },
  declineBtn: {
    backgroundColor: colors.dangerBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  declineT: { color: colors.danger, fontWeight: '700', fontSize: 12 },
  bio: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'left', lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.orLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  chipT: { color: colors.or, fontSize: 12, fontWeight: '500' },
  gal: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gi: { width: '31%', aspectRatio: 1, borderRadius: 10 },
  giMore: {},
  more: {
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreT: { fontWeight: '700', color: colors.textMuted },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.lg,
    textAlign: 'left',
  },
  guestText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginBottom: spacing.xl,
    textAlign: 'left',
    lineHeight: 22,
  },
});
