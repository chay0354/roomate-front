import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { apiGet, apiPatch, apiPost, persistSession, restoreSession, type StoredSession } from '@/lib/api-client';
import { sessionFromAuthResponse } from '@/lib/session';
import type { Profile, UserPath } from '@/lib/types';

interface SignUpPayload {
  email: string;
  password: string;
  full_name: string;
  username: string;
  phone: string;
  user_path: UserPath;
}

interface AuthContextValue {
  session: StoredSession | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (payload: SignUpPayload) => Promise<StoredSession | null>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await apiGet<Profile>('/me/profile', true);
      setProfile(data);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const stored = await restoreSession();
      if (!mounted) return;
      setSession(stored);
      if (stored) {
        await fetchProfile();
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [fetchProfile]);

  const applyAuthResponse = useCallback(
    async (payload: {
      session: {
        access_token: string;
        refresh_token: string;
        expires_at?: number;
        user: { id: string; email?: string | null };
      } | null;
      user: { id: string; email?: string | null } | null;
    }) => {
      const next = sessionFromAuthResponse(payload);
      setSession(next);
      await persistSession(next);
      if (next) {
        await fetchProfile();
      }
    },
    [fetchProfile]
  );

  const signUp = useCallback(
    async (payload: SignUpPayload) => {
      const data = await apiPost<{
        session: {
          access_token: string;
          refresh_token: string;
          expires_at?: number;
          user: { id: string; email?: string | null };
        } | null;
        user: { id: string; email?: string | null } | null;
      }>('/auth/signup', payload);

      await applyAuthResponse(data);
      return sessionFromAuthResponse(data);
    },
    [applyAuthResponse]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const data = await apiPost<{
        session: {
          access_token: string;
          refresh_token: string;
          expires_at?: number;
          user: { id: string; email?: string | null };
        } | null;
        user: { id: string; email?: string | null } | null;
      }>('/auth/signin', { email, password });

      await applyAuthResponse(data);
    },
    [applyAuthResponse]
  );

  const signOut = useCallback(async () => {
    try {
      if (session) {
        await apiPost('/auth/signout', undefined, true);
      }
    } catch {
      // Clear local session even if server signout fails
    }
    setSession(null);
    setProfile(null);
    await persistSession(null);
  }, [session]);

  const refreshProfile = useCallback(async () => {
    if (session) {
      await fetchProfile();
    }
  }, [session, fetchProfile]);

  const updateProfile = useCallback(async (patch: Partial<Profile>) => {
    const data = await apiPatch<Profile>('/me/profile', patch, true);
    setProfile(data);
  }, []);

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      updateProfile,
    }),
    [session, profile, loading, signUp, signIn, signOut, refreshProfile, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
