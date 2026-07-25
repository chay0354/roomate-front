import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Button from '@/components/Button';
import Screen from '@/components/Screen';
import { useTasks } from '@/contexts/TasksContext';
import { colors, fontSize, spacing } from '@/lib/theme';

const NETWORKS = [
  { id: 'ig', name: 'Instagram', icon: '📸', color: '#E1306C' },
  { id: 'fb', name: 'Facebook', icon: '📘', color: '#1877F2' },
  { id: 'tt', name: 'TikTok', icon: '🎵', color: '#010101' },
] as const;

export default function SocialScreen() {
  const { completeTask } = useTasks();
  const [linked, setLinked] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setLinked((p) => ({ ...p, [id]: !p[id] }));
    completeTask('social');
  };

  const finish = () => {
    if (Object.values(linked).some(Boolean)) completeTask('social');
    router.replace('/(tabs)');
  };

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>חבר רשתות חברתיות</Text>
      <Text style={styles.sub}>
        חיבור לרשתות עוזר לחברים למצוא אותך ולבנות אמון בין שותפים פוטנציאליים.
      </Text>

      {NETWORKS.map((n) => (
        <Pressable
          key={n.id}
          style={[styles.row, linked[n.id] && styles.rowOn]}
          onPress={() => toggle(n.id)}
        >
          <Text style={styles.icon}>{n.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{n.name}</Text>
            <Text style={styles.status}>{linked[n.id] ? 'מחובר ✓' : 'לא מחובר'}</Text>
          </View>
          <View style={[styles.dot, { backgroundColor: linked[n.id] ? colors.success : colors.border }]} />
        </Pressable>
      ))}

      <Button title="סיים והמשך" onPress={finish} style={{ marginTop: spacing.xl }} />
      <Button
        title="דלג בינתיים"
        variant="ghost"
        onPress={() => router.replace('/(tabs)')}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.xl },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    textAlign: 'left',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sub: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'left',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  rowOn: { borderColor: colors.or, backgroundColor: colors.orLight },
  icon: { fontSize: 28 },
  name: { fontWeight: '700', textAlign: 'left', color: colors.text },
  status: { fontSize: 12, color: colors.textMuted, textAlign: 'left', marginTop: 2 },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
