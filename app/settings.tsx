import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import Button from '@/components/Button';
import Screen from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useGuest } from '@/contexts/GuestContext';
import { colors, fontSize, spacing } from '@/lib/theme';

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { setGuest } = useGuest();
  const [push, setPush] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [showOnline, setShowOnline] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.hdr}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>→</Text>
        </Pressable>
        <Text style={styles.hdrTitle}>הגדרות</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.group}>חשבון</Text>
        <Text style={styles.item}>✉️ אימייל וסיסמה</Text>
        <Text style={styles.item}>📱 מספר טלפון</Text>
        <Pressable onPress={() => router.push('/(auth)/social')}>
          <Text style={styles.item}>🔗 רשתות חברתיות</Text>
        </Pressable>

        <Text style={styles.group}>התראות</Text>
        <View style={styles.row}>
          <Switch value={push} onValueChange={setPush} trackColor={{ true: colors.or }} />
          <Text style={styles.rowT}>התראות Push</Text>
        </View>
        <View style={styles.row}>
          <Switch value={emailNotif} onValueChange={setEmailNotif} trackColor={{ true: colors.or }} />
          <Text style={styles.rowT}>מיילים</Text>
        </View>

        <Text style={styles.group}>העדפות</Text>
        <Text style={styles.item}>🌐 שפה: עברית</Text>
        <Text style={styles.item}>📍 אזור חיפוש: תל אביב</Text>

        <Text style={styles.group}>פרטיות</Text>
        <View style={styles.row}>
          <Switch value={showOnline} onValueChange={setShowOnline} trackColor={{ true: colors.or }} />
          <Text style={styles.rowT}>הצג סטטוס מחובר</Text>
        </View>
        <View style={styles.row}>
          <Switch
            value={privateProfile}
            onValueChange={setPrivateProfile}
            trackColor={{ true: colors.or }}
          />
          <Text style={styles.rowT}>פרופיל פרטי</Text>
        </View>
        <Pressable onPress={() => Alert.alert('בקרוב', 'ניהול משתמשים חסומים')}>
          <Text style={styles.item}>🚫 משתמשים חסומים</Text>
        </Pressable>
        <Pressable onPress={() => Alert.alert('בקרוב', 'אימות דו-שלבי')}>
          <Text style={styles.item}>🔐 אימות דו-שלבי</Text>
        </Pressable>

        <Button
          title="התנתק"
          variant="secondary"
          onPress={async () => {
            await signOut();
            await setGuest(false);
            router.replace('/(auth)/welcome');
          }}
          style={{ marginTop: spacing.xl }}
        />
        <Pressable
          onPress={() =>
            Alert.alert('מחק חשבון', 'פעולה זו בלתי הפיכה', [
              { text: 'ביטול', style: 'cancel' },
              { text: 'מחק', style: 'destructive' },
            ])
          }
        >
          <Text style={styles.delete}>מחק חשבון</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.or,
    padding: spacing.lg,
  },
  back: { color: '#fff', fontSize: 22 },
  hdrTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  scroll: { padding: spacing.xl, paddingBottom: 60 },
  group: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.or,
    textAlign: 'left',
  },
  item: {
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    fontSize: fontSize.md,
    textAlign: 'left',
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowT: { fontSize: fontSize.md, color: colors.text, flex: 1, textAlign: 'left' },
  delete: {
    marginTop: spacing.xl,
    textAlign: 'center',
    color: colors.danger,
    fontWeight: '600',
  },
});
