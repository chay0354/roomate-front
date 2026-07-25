import { useAuth } from '@/contexts/AuthContext';
import { useGuest } from '@/contexts/GuestContext';

import DayerHome from '@/components/homes/DayerHome';
import DiraHome from '@/components/homes/DiraHome';

export default function HomeTab() {
  const { profile } = useAuth();
  const { isGuest } = useGuest();

  if (!isGuest && profile?.user_path === 'dira') {
    return <DiraHome />;
  }

  return <DayerHome />;
}
