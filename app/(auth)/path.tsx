import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Button from '@/components/Button';
import Screen from '@/components/Screen';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import type { UserPath } from '@/lib/types';

export default function PathScreen() {
  const [path, setPath] = useState<UserPath | null>(null);

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>מה מתאר אותך? 🤔</Text>
      <Text style={styles.subtitle}>נתאים לך את החוויה</Text>

      <Pressable
        style={[styles.card, path === 'dayer' && styles.cardSelected]}
        onPress={() => setPath('dayer')}
      >
        <Text style={styles.icon}>🔍</Text>
        <Text style={styles.cardTitle}>מחפש/ת דירה</Text>
        <Text style={styles.cardDesc}>אני רוצה להצטרף לדירת שותפים</Text>
      </Pressable>

      <Pressable
        style={[styles.card, path === 'dira' && styles.cardSelected]}
        onPress={() => setPath('dira')}
      >
        <Text style={styles.icon}>🏡</Text>
        <Text style={styles.cardTitle}>יש לי דירה</Text>
        <Text style={styles.cardDesc}>אני מחפש/ת שותף/ה לדירה שלי</Text>
      </Pressable>

      <Button
        title="המשך ←"
        disabled={!path}
        onPress={() => router.push({ pathname: '/(auth)/register', params: { path: path! } })}
        style={{ marginTop: 'auto' }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'left',
  },
  subtitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'left',
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  cardSelected: {
    borderColor: colors.or,
    backgroundColor: '#FFF8F0',
  },
  icon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  cardDesc: {
    marginTop: 4,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
