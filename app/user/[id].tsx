import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import Button from '@/components/Button';
import Loading from '@/components/Loading';
import Screen from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useGuest } from '@/contexts/GuestContext';
import {
  fetchPublicProfile,
  requestFriend,
  respondFriendRequest,
  type FriendshipStatus,
} from '@/lib/api';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import type { Profile } from '@/lib/types';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { isGuest } = useGuest();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<FriendshipStatus>('none');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id || isGuest || !session) {
      setLoading(false);
      return;
    }
    if (id === session.user.id) {
      router.replace('/(tabs)/profile');
      return;
    }
    try {
      const res = await fetchPublicProfile(id);
      setProfile(res.profile);
      setStatus(res.friendship_status);
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'טעינת פרופיל נכשלה');
    } finally {
      setLoading(false);
    }
  }, [id, isGuest, session]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRequest = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await requestFriend(id);
      setStatus('pending_out');
      Alert.alert('נשלח', 'בקשת החברות נשלחה');
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'שליחת הבקשה נכשלה');
    } finally {
      setBusy(false);
    }
  };

  const onRespond = async (action: 'accept' | 'decline') => {
    if (!id) return;
    setBusy(true);
    try {
      await respondFriendRequest(id, action);
      setStatus(action === 'accept' ? 'friends' : 'none');
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'הפעולה נכשלה');
    } finally {
      setBusy(false);
    }
  };

  if (isGuest) {
    return (
      <Screen style={styles.pad}>
        <Text style={styles.title}>פרופיל</Text>
        <Text style={styles.muted}>הירשם כדי לצפות בפרופילים ולשלוח בקשות חברות.</Text>
        <Button title="הירשם" onPress={() => router.push('/(auth)/path')} />
      </Screen>
    );
  }

  if (loading) return <Loading label="טוען פרופיל..." />;
  if (!profile) {
    return (
      <Screen style={styles.pad}>
        <Text style={styles.muted}>הפרופיל לא נמצא</Text>
        <Button title="חזרה" onPress={() => router.back()} />
      </Screen>
    );
  }

  const name = profile.full_name ?? profile.username ?? 'משתמש/ת';
  const isDira = profile.user_path === 'dira';

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.hdr}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>→</Text>
        </Pressable>
        <Text style={styles.hdrTitle}>פרופיל</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            {/* Letter avatar only — remote photos flip under forceRTL (same as chat) */}
            <Text style={styles.avatarText}>{name.slice(0, 1)}</Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>
            {isDira ? '🏡 יש לי דירה' : '🔍 מחפש/ת דירה'}
            {profile.age ? ` · ${profile.age}` : ''}
            {profile.occupation ? ` · ${profile.occupation}` : ''}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.secTitle}>ביו</Text>
          <Text style={styles.bio}>{profile.bio ?? 'אין ביו עדיין'}</Text>
        </View>

        {(profile.hobbies?.length ?? 0) > 0 ? (
          <View style={styles.section}>
            <Text style={styles.secTitle}>תחביבים</Text>
            <View style={styles.chips}>
              {profile.hobbies.map((h) => (
                <View key={h} style={styles.chip}>
                  <Text style={styles.chipT}>{h}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          {status === 'none' || status === 'declined' ? (
            <Button title="שלח בקשת חברות" onPress={onRequest} loading={busy} />
          ) : null}
          {status === 'pending_out' ? (
            <View style={styles.pendingBox}>
              <Text style={styles.pendingT}>בקשת חברות ממתינה לאישור</Text>
            </View>
          ) : null}
          {status === 'pending_in' ? (
            <View style={{ gap: spacing.md }}>
              <Text style={styles.pendingT}>שלח/ה לך בקשת חברות</Text>
              <Button title="אשר חברות" onPress={() => onRespond('accept')} loading={busy} />
              <Button
                title="דחה"
                variant="secondary"
                onPress={() => onRespond('decline')}
                loading={busy}
              />
            </View>
          ) : null}
          {status === 'friends' ? (
            <View style={styles.friendsBox}>
              <Text style={styles.friendsT}>✓ חברים</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.xl },
  title: { fontSize: fontSize.xxl, fontWeight: '700', textAlign: 'left', marginBottom: spacing.lg },
  muted: { color: colors.textMuted, textAlign: 'left', marginBottom: spacing.lg, lineHeight: 22 },
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
  bio: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'left', lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.orLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  chipT: { color: colors.or, fontSize: 12, fontWeight: '500' },
  actions: { marginTop: spacing.sm },
  pendingBox: {
    backgroundColor: colors.orLight,
    borderRadius: 14,
    padding: spacing.lg,
    alignItems: 'center',
  },
  pendingT: { color: colors.orDark, fontWeight: '700', textAlign: 'center' },
  friendsBox: {
    backgroundColor: colors.successBg,
    borderRadius: 14,
    padding: spacing.lg,
    alignItems: 'center',
  },
  friendsT: { color: colors.success, fontWeight: '700' },
});
