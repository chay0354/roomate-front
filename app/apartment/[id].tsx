import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Button from '@/components/Button';
import Loading from '@/components/Loading';
import Screen from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useGuest } from '@/contexts/GuestContext';
import { useTasks } from '@/contexts/TasksContext';
import { fetchApartmentById, sendApplication } from '@/lib/api';
import { colors, fontSize, spacing } from '@/lib/theme';
import type { Apartment } from '@/lib/types';

export default function ApartmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { isGuest } = useGuest();
  const { completeTask } = useTasks();
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchApartmentById(id)
      .then((apt) => {
        setApartment(apt);
        completeTask('browse');
      })
      .catch((e) => Alert.alert('שגיאה', e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const onApply = async () => {
    if (isGuest || !session?.user?.id) {
      Alert.alert('צריך חשבון', 'הירשם כדי לשלוח פנייה');
      router.push('/(auth)/path');
      return;
    }
    try {
      setSubmitting(true);
      const { conversation_id } = await sendApplication(
        apartment!.id,
        session.user.id,
        'היי! נראה לי שזו דירה שמתאימה לי. אשמח לדבר 🙂'
      );
      setSent(true);
      if (conversation_id) {
        router.push(`/chat/${conversation_id}`);
      } else {
        Alert.alert('נשלח!', 'הפנייה נשלחה לבעל/ת הדירה');
      }
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'שליחה נכשלה');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !apartment) return <Loading label="טוען דירה..." />;

  const images = apartment.image_urls?.length ? apartment.image_urls : [];
  const perRoommate = Math.round(apartment.price / Math.max(apartment.roommate_slots + 1, 2));
  const owner = apartment.owner;
  const isOwner = session?.user?.id === apartment.owner_id;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View>
          {images[0] ? (
            <Image source={{ uri: images[0] }} style={styles.hero} />
          ) : (
            <View style={[styles.hero, { backgroundColor: colors.orLight }]} />
          )}
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backTxt}>→</Text>
          </Pressable>
          <Pressable
            style={styles.shareBtn}
            onPress={() =>
              Share.share({
                message: `${apartment.address} · ₪${apartment.price} — RooMate`,
              })
            }
          >
            <Text>📤</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.price}>₪{apartment.price.toLocaleString()} /חודש</Text>
          <Text style={styles.address}>{apartment.address}</Text>
          <Text style={styles.neighborhood}>{apartment.neighborhood}</Text>

          {owner ? (
            <Pressable
              style={styles.ownerRow}
              onPress={() =>
                router.push(
                  isOwner ? '/(tabs)/profile' : `/user/${apartment.owner_id}`
                )
              }
            >
              <View style={styles.ownerAv}>
                <Text style={styles.ownerAvT}>{(owner.full_name ?? '?').slice(0, 1)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ownerNm}>{owner.full_name}</Text>
                <Text style={styles.ownerRl}>בעל/ת הדירה · לחץ לפרופיל</Text>
              </View>
            </Pressable>
          ) : null}

          <Text style={styles.section}>על הדירה</Text>
          <Text style={styles.desc}>{apartment.description}</Text>

          {(apartment.features?.length ?? 0) > 0 ? (
            <>
              <Text style={styles.section}>מאפיינים</Text>
              <View style={styles.tags}>
                {apartment.features.map((f) => (
                  <View key={f} style={styles.tag}>
                    <Text style={styles.tagT}>{f}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <Text style={styles.section}>חוקי הבית</Text>
          {(apartment.house_rules ?? []).map((rule) => (
            <Text key={rule} style={styles.rule}>
              ✓ {rule}
            </Text>
          ))}

          <Text style={styles.section}>חלוקת הוצאות</Text>
          <View style={styles.costs}>
            <View style={styles.costBox}>
              <Text style={styles.costVal}>₪{perRoommate.toLocaleString()}</Text>
              <Text style={styles.costLbl}>לשותף/חודש</Text>
            </View>
            <View style={styles.costBox}>
              <Text style={styles.costVal}>₪{apartment.arnona}</Text>
              <Text style={styles.costLbl}>ארנונה</Text>
            </View>
            <View style={styles.costBox}>
              <Text style={styles.costVal}>₪{apartment.vaad}</Text>
              <Text style={styles.costLbl}>ועד בית</Text>
            </View>
            <View style={styles.costBox}>
              <Text style={styles.costVal}>₪{apartment.utilities}</Text>
              <Text style={styles.costLbl}>חשמל/מים</Text>
            </View>
          </View>

          <View style={styles.mapMini}>
            <Text style={styles.mapEmoji}>🗺️</Text>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/map',
                  params: { apartmentId: apartment.id },
                })
              }
            >
              <Text style={styles.mapLink}>פתח במפה ←</Text>
            </Pressable>
          </View>

          {!isOwner ? (
            sent ? (
              <View style={styles.sentBox}>
                <Text style={styles.sentTitle}>✅ הפנייה נשלחה</Text>
                <Text style={styles.sentText}>נפתח צ׳אט עם בעל/ת הדירה</Text>
                <Button
                  title="פתח צ׳אט"
                  onPress={onApply}
                  loading={submitting}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            ) : (
              <Button
                title="📨 שלח פנייה לדירה"
                onPress={onApply}
                loading={submitting}
                style={{ marginTop: spacing.lg, backgroundColor: colors.success }}
              />
            )
          ) : (
            <View style={styles.ownerActions}>
              <Button
                title="הזמן לפגישה"
                variant="secondary"
                onPress={() => router.push('/(tabs)/meetings')}
              />
              <Button
                title="פניות לדירה"
                variant="secondary"
                onPress={() => router.push('/(tabs)/applications')}
                style={{ marginTop: spacing.md }}
              />
            </View>
          )}

          <Pressable
            onPress={() => Alert.alert('דיווח', 'הדיווח התקבל — תודה ששומרים על הקהילה')}
          >
            <Text style={styles.report}>דווח על מודעה</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  hero: { width: '100%', height: 260 },
  backBtn: {
    position: 'absolute',
    top: 48,
    start: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backTxt: { fontSize: 18 },
  shareBtn: {
    position: 'absolute',
    top: 48,
    end: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.xl,
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  price: { fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center' },
  address: { marginTop: 4, fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center' },
  neighborhood: { fontSize: fontSize.sm, color: colors.or, textAlign: 'center' },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: 12,
  },
  ownerAv: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.or,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerAvT: { color: '#fff', fontWeight: '700' },
  ownerNm: { fontWeight: '700', textAlign: 'left', color: colors.text },
  ownerRl: { fontSize: 12, color: colors.textMuted, textAlign: 'left' },
  section: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontSize: fontSize.lg,
    fontWeight: '700',
    textAlign: 'left',
    color: colors.text,
  },
  desc: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 22, textAlign: 'left' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: colors.orLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagT: { fontSize: 12, color: colors.or },
  rule: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'left', marginBottom: 4 },
  costs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  costBox: {
    width: '47%',
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  costVal: { fontWeight: '700', color: colors.or, fontSize: fontSize.lg },
  costLbl: { fontSize: fontSize.xs, color: colors.textMuted },
  mapMini: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: '#e8f5e9',
    borderRadius: 14,
    alignItems: 'center',
  },
  mapEmoji: { fontSize: 28 },
  mapLink: { marginTop: 8, color: colors.or, fontWeight: '600' },
  sentBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.successBg,
    padding: spacing.lg,
    borderRadius: 12,
  },
  sentTitle: { fontWeight: '700', color: colors.success, textAlign: 'center' },
  sentText: { marginTop: 4, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
  ownerActions: { marginTop: spacing.lg },
  report: {
    marginTop: spacing.xl,
    textAlign: 'center',
    color: colors.danger,
    fontSize: 13,
  },
});
