import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'roomate_session';

export interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: {
    id: string;
    email?: string | null;
  };
}

export async function getStoredSession(): Promise<StoredSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export async function saveStoredSession(session: StoredSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearStoredSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getStoredSession();
  return session?.access_token ?? null;
}

export function sessionFromAuthResponse(payload: {
  session: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    user: { id: string; email?: string | null };
  } | null;
  user: { id: string; email?: string | null } | null;
}): StoredSession | null {
  if (!payload.session?.access_token) return null;
  return {
    access_token: payload.session.access_token,
    refresh_token: payload.session.refresh_token,
    expires_at: payload.session.expires_at,
    user: {
      id: payload.session.user?.id ?? payload.user?.id ?? '',
      email: payload.session.user?.email ?? payload.user?.email,
    },
  };
}
