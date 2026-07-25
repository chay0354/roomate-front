import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_KEY = 'roomate_guest_mode';

interface GuestContextValue {
  isGuest: boolean;
  setGuest: (value: boolean) => Promise<void>;
  requireAuth: () => boolean;
}

const GuestContext = createContext<GuestContextValue | undefined>(undefined);

export function GuestProvider({ children }: { children: React.ReactNode }) {
  const [isGuest, setIsGuest] = useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem(GUEST_KEY).then((v) => setIsGuest(v === '1'));
  }, []);

  const setGuest = useCallback(async (value: boolean) => {
    setIsGuest(value);
    await AsyncStorage.setItem(GUEST_KEY, value ? '1' : '0');
  }, []);

  const requireAuth = useCallback(() => !isGuest, [isGuest]);

  const value = useMemo(
    () => ({ isGuest, setGuest, requireAuth }),
    [isGuest, setGuest, requireAuth]
  );

  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>;
}

export function useGuest() {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error('useGuest must be used within GuestProvider');
  return ctx;
}
