import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { useKeyboardHeight } from '@/lib/keyboard';
import { useBottomInset } from '@/lib/safe-area';
import { colors, radius } from '@/lib/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Extra padding inside the sheet above the nav bar */
  contentStyle?: ViewStyle;
  animationType?: 'none' | 'slide' | 'fade';
  /** Skip inner scroll (e.g. sheet already has its own list) */
  scrollable?: boolean;
};

/**
 * Full-screen dimmed overlay with a bottom sheet that clears the Android nav bar
 * and lifts above the keyboard when typing.
 *
 * Modals on Android often ignore activity soft-input resize, so we lift manually
 * and keep form fields in a ScrollView.
 */
export default function BottomSheet({
  visible,
  onClose,
  children,
  contentStyle,
  animationType = 'slide',
  scrollable = true,
}: Props) {
  const bottom = useBottomInset(12);
  const kb = useKeyboardHeight();
  const lift = kb > 0 ? kb : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[
            styles.sheet,
            {
              paddingBottom: kb > 0 ? 12 : bottom + 12,
              marginBottom: lift,
              maxHeight: kb > 0 ? '68%' : '85%',
            },
            contentStyle,
          ]}
        >
          {scrollable ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              bounces={false}
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
            >
              {children}
            </ScrollView>
          ) : (
            children
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: 16,
    paddingTop: 16,
    width: '100%',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 8,
  },
});
