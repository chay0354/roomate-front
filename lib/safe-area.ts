import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Minimum gap above Android system nav / gesture bar */
const ANDROID_MIN_BOTTOM = 16;

/**
 * Bottom inset for content, modals, and FABs so Android nav buttons never cover UI.
 */
export function useBottomInset(min = 0): number {
  const insets = useSafeAreaInsets();
  const platformMin = Platform.OS === 'android' ? ANDROID_MIN_BOTTOM : 0;
  return Math.max(insets.bottom, platformMin, min);
}
