import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';

import { colors } from '@/lib/theme';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Defaults include bottom so Android nav never covers content. Tab screens should pass without bottom. */
  edges?: Edge[];
  background?: string;
}

export default function Screen({ children, style, edges, background }: ScreenProps) {
  return (
    <SafeAreaView
      edges={edges ?? ['top', 'left', 'right', 'bottom']}
      style={[styles.container, { backgroundColor: background ?? colors.bg }, style]}
    >
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    direction: 'rtl',
  },
  content: {
    flex: 1,
  },
});
