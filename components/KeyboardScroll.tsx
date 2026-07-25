import { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useKeyboardHeight } from '@/lib/keyboard';
import { useBottomInset } from '@/lib/safe-area';

type Props = ScrollViewProps & {
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Extra space under the last field when keyboard is closed */
  bottomExtra?: number;
};

/**
 * ScrollView that keeps focused inputs above the keyboard (iOS + Android).
 * Android uses window resize — we only add a small scroll buffer, not full keyboard height.
 */
const KeyboardScroll = forwardRef<ScrollView, Props>(function KeyboardScroll(
  { style, contentContainerStyle, bottomExtra = 24, children, ...rest },
  ref
) {
  const innerRef = useRef<ScrollView>(null);
  const kb = useKeyboardHeight();
  const bottom = useBottomInset(8);

  useImperativeHandle(ref, () => innerRef.current as ScrollView);

  // Android resize already shortens the window — only add a small focus buffer.
  // iOS needs a bit more so the last field clears the keyboard accessory area.
  const padBottom =
    bottom + bottomExtra + (kb > 0 ? (Platform.OS === 'ios' ? 24 : 48) : 0);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScrollView
        ref={innerRef}
        style={styles.flex}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        contentContainerStyle={[{ paddingBottom: padBottom }, contentContainerStyle]}
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

export default KeyboardScroll;

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
