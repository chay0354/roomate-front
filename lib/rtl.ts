import { I18nManager } from 'react-native';

/** Ensure RTL is allowed and forced for this Hebrew-first app. */
export function enableRtl(): void {
  try {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  } catch {
    // ignore — some hosts lock I18nManager
  }
}

export { I18nManager };
