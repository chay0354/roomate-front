import { Redirect } from 'expo-router';

import Loading from '@/components/Loading';
import { useAuth } from '@/contexts/AuthContext';
import { useGuest } from '@/contexts/GuestContext';

export default function Index() {
  const { session, profile, loading } = useAuth();
  const { isGuest } = useGuest();

  if (loading) return <Loading label="טוען..." />;

  if (session && profile) {
    return <Redirect href="/(tabs)" />;
  }

  if (isGuest) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
