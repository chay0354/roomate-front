import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import BottomSheet from '@/components/BottomSheet';
import { useTasks } from '@/contexts/TasksContext';
import { colors, fontSize, radius, spacing } from '@/lib/theme';

interface ProfileProgressBarProps {
  hidden?: boolean;
}

export default function ProfileProgressBar({ hidden }: ProfileProgressBarProps) {
  const { percent, remaining, nextTask, tasks, completeTask } = useTasks();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (hidden || dismissed || percent >= 100) return null;

  const ringPct = Math.max(0, Math.min(100, percent));

  return (
    <>
      <Pressable style={styles.bar} onPress={() => setOpen(true)}>
        <View style={styles.ringWrap}>
          <View style={styles.ringOuter}>
            <View style={[styles.ringInner, { height: `${ringPct}%` }]} />
          </View>
          <Text style={styles.pct}>{percent}%</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.msg}>
            {nextTask ? `משימה הבאה: ${nextTask.name}` : 'השלם את הפרופיל'}
          </Text>
          <Text style={styles.hint}>
            {percent}% הושלם · {remaining} משימות נותרו
          </Text>
        </View>
        <Pressable
          hitSlop={10}
          onPress={(e) => {
            e.stopPropagation?.();
            setDismissed(true);
          }}
        >
          <Text style={styles.x}>✕</Text>
        </Pressable>
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)} scrollable={false}>
        <View style={styles.panelHead}>
          <Text style={styles.panelTitle}>המשימות שלך</Text>
          <Text style={styles.panelPct}>{percent}%</Text>
        </View>
        <View style={styles.pbTrack}>
          <View style={[styles.pbFill, { width: `${percent}%` }]} />
        </View>
        <ScrollView style={{ maxHeight: 360 }}>
          {tasks.map((t) => (
            <Pressable
              key={t.id}
              style={[styles.task, t.done && styles.taskDone]}
              onPress={() => {
                if (!t.done) completeTask(t.id);
              }}
            >
              <View style={[styles.check, t.done && styles.checkDone]}>
                <Text style={styles.checkText}>{t.done ? '✓' : ''}</Text>
              </View>
              <View style={styles.taskInfo}>
                <Text style={[styles.taskName, t.done && styles.taskNameDone]}>{t.name}</Text>
                <Text style={styles.taskPts}>+{t.pts}%</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ringWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  ringOuter: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#e8e8e8',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  ringInner: {
    width: '100%',
    backgroundColor: colors.or,
  },
  pct: { fontSize: 10, fontWeight: '700', color: colors.or },
  info: { flex: 1 },
  msg: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, textAlign: 'left' },
  hint: { marginTop: 2, fontSize: 11, color: colors.textMuted, textAlign: 'left' },
  x: { color: colors.textFaint, fontSize: 16, padding: 4 },
  panelHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  panelTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  panelPct: { fontSize: 13, fontWeight: '600', color: colors.or },
  pbTrack: {
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  pbFill: { height: '100%', backgroundColor: colors.or },
  task: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  taskDone: { opacity: 0.55 },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.success, borderColor: colors.success },
  checkText: { color: '#fff', fontWeight: '700' },
  taskInfo: { flex: 1 },
  taskName: { fontSize: fontSize.md, color: colors.text, textAlign: 'left' },
  taskNameDone: { textDecorationLine: 'line-through' },
  taskPts: { fontSize: 12, color: colors.or, textAlign: 'left', marginTop: 2 },
});
