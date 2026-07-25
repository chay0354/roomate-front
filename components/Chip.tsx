import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSize, radius } from '@/lib/theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export default function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.text, selected && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    margin: 4,
  },
  selected: {
    borderColor: colors.or,
    backgroundColor: colors.orLight,
  },
  text: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  selectedText: {
    color: colors.or,
    fontWeight: '600',
  },
});
