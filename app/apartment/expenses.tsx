import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import Button from '@/components/Button';
import Input from '@/components/Input';
import KeyboardScroll from '@/components/KeyboardScroll';
import Loading from '@/components/Loading';
import Screen from '@/components/Screen';
import {
  fetchApartmentExpenses,
  updateApartmentExpenses,
  type ApartmentExpenses,
} from '@/lib/api';
import { colors, fontSize, radius, spacing } from '@/lib/theme';

function money(n: number) {
  return `₪${Math.round(n).toLocaleString('he-IL')}`;
}

export default function ApartmentExpensesScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [data, setData] = useState<ApartmentExpenses | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rent, setRent] = useState('');
  const [arnona, setArnona] = useState('');
  const [vaad, setVaad] = useState('');
  const [utilities, setUtilities] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const next = await fetchApartmentExpenses(id);
      setData(next);
      setRent(String(next.expenses.rent));
      setArnona(String(next.expenses.arnona));
      setVaad(String(next.expenses.vaad));
      setUtilities(String(next.expenses.utilities));
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'טעינת הוצאות נכשלה');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onSave = async () => {
    if (!id) return;
    const payload = {
      rent: Number(rent),
      arnona: Number(arnona),
      vaad: Number(vaad),
      utilities: Number(utilities),
    };
    for (const [k, v] of Object.entries(payload)) {
      if (!Number.isFinite(v) || v < 0) {
        Alert.alert('שגיאה', `ערך לא תקין בשדה ${k}`);
        return;
      }
    }
    try {
      setSaving(true);
      await updateApartmentExpenses(id, payload);
      setEditing(false);
      await load();
      Alert.alert('נשמר', 'ההוצאות עודכנו');
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'שמירה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  if (!id) {
    return (
      <Screen>
        <Text style={styles.empty}>חסר מזהה דירה</Text>
      </Screen>
    );
  }

  if (loading || !data) return <Loading label="טוען הוצאות..." />;

  const aptLabel = data.apartment.title ?? data.apartment.address;
  const count = data.occupant_count;

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.hdr}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>→</Text>
        </Pressable>
        <Text style={styles.hdrTitle}>הוצאות משותפות</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardScroll contentContainerStyle={styles.scroll}>
        <Text style={styles.aptName}>{aptLabel}</Text>
        <Text style={styles.sub}>מחולק שווה בשווה בין {count} דיירים בדירה</Text>

        <View style={styles.totalCard}>
          <Text style={styles.totalLbl}>סה״כ לחודש</Text>
          <Text style={styles.totalVal}>{money(data.expenses.total)}</Text>
          <Text style={styles.perVal}>{money(data.per_person.total)} לכל דייר</Text>
        </View>

        <Text style={styles.secTitle}>פירוט הוצאות</Text>
        {(
          [
            ['שכירות', data.expenses.rent, data.per_person.rent],
            ['ארנונה', data.expenses.arnona, data.per_person.arnona],
            ['ועד בית', data.expenses.vaad, data.per_person.vaad],
            ['חשמל / מים', data.expenses.utilities, data.per_person.utilities],
          ] as const
        ).map(([label, full, each]) => (
          <View key={label} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLbl}>{label}</Text>
              <Text style={styles.rowEach}>{money(each)} לדייר</Text>
            </View>
            <Text style={styles.rowVal}>{money(full)}</Text>
          </View>
        ))}

        <Text style={styles.secTitle}>דיירים ({count})</Text>
        {data.occupants.map((o) => (
          <View key={o.id} style={styles.occRow}>
            <View style={styles.av}>
              <Text style={styles.avT}>{(o.full_name ?? o.username ?? '?').slice(0, 1)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.occNm}>{o.full_name ?? o.username ?? 'משתמש'}</Text>
              <Text style={styles.occRl}>
                {o.role === 'owner' ? 'מנהל דירה' : 'שותף/ה'} · {money(data.per_person.total)}
              </Text>
            </View>
          </View>
        ))}

        {data.can_edit ? (
          <View style={styles.editBox}>
            <View style={styles.editHead}>
              <Text style={[styles.secTitle, { marginTop: 0 }]}>עריכת הוצאות</Text>
              <Pressable
                onPress={() => {
                  if (editing && data) {
                    setRent(String(data.expenses.rent));
                    setArnona(String(data.expenses.arnona));
                    setVaad(String(data.expenses.vaad));
                    setUtilities(String(data.expenses.utilities));
                  }
                  setEditing((v) => !v);
                }}
              >
                <Text style={styles.editLink}>{editing ? 'ביטול' : 'ערוך'}</Text>
              </Pressable>
            </View>
            {editing ? (
              <>
                <Input label="שכירות" value={rent} onChangeText={setRent} keyboardType="numeric" />
                <Input
                  label="ארנונה"
                  value={arnona}
                  onChangeText={setArnona}
                  keyboardType="numeric"
                />
                <Input label="ועד בית" value={vaad} onChangeText={setVaad} keyboardType="numeric" />
                <Input
                  label="חשמל / מים"
                  value={utilities}
                  onChangeText={setUtilities}
                  keyboardType="numeric"
                />
                <Button title="שמור הוצאות" onPress={onSave} loading={saving} />
              </>
            ) : (
              <Text style={styles.hint}>לחץ ערוך כדי לעדכן סכומים — החלוקה תתעדכן אוטומטית</Text>
            )}
          </View>
        ) : (
          <Text style={styles.hint}>הסכומים נקבעים ע״י בעל הדירה</Text>
        )}
      </KeyboardScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  back: { fontSize: 22, color: colors.text },
  hdrTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  scroll: { padding: spacing.lg, paddingBottom: 40 },
  empty: { padding: spacing.xl, textAlign: 'center', color: colors.textMuted },
  aptName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'left',
  },
  sub: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'left',
    marginBottom: spacing.lg,
  },
  totalCard: {
    backgroundColor: colors.or,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  totalLbl: { color: 'rgba(255,255,255,0.85)', fontSize: 13, textAlign: 'left' },
  totalVal: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'left',
  },
  perVal: {
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '700',
    marginTop: 8,
    fontSize: fontSize.md,
    textAlign: 'left',
  },
  secTitle: {
    fontWeight: '700',
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'left',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowLbl: { fontWeight: '600', color: colors.text, textAlign: 'left' },
  rowEach: { fontSize: 12, color: colors.textMuted, marginTop: 2, textAlign: 'left' },
  rowVal: { fontWeight: '700', color: colors.or, fontSize: fontSize.md },
  occRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  av: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.orLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avT: { color: colors.or, fontWeight: '700' },
  occNm: { fontWeight: '600', color: colors.text, textAlign: 'left' },
  occRl: { fontSize: 12, color: colors.textMuted, marginTop: 2, textAlign: 'left' },
  editBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  editLink: { color: colors.or, fontWeight: '700' },
  hint: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'left',
    marginTop: spacing.md,
  },
});
