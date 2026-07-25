import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { useGuest } from '@/contexts/GuestContext';
import { colors } from '@/lib/theme';

function guestGuard(isGuest: boolean, e: { preventDefault: () => void }) {
  if (isGuest) {
    e.preventDefault();
    Alert.alert('צריך חשבון', 'הירשם כדי לגשת לפיצ׳ר הזה', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'הירשם', onPress: () => router.push('/(auth)/path') },
    ]);
  }
}

export default function TabsLayout() {
  const { profile } = useAuth();
  const { isGuest } = useGuest();
  const insets = useSafeAreaInsets();
  const isDira = !isGuest && profile?.user_path === 'dira';
  // Keep tab labels clear of Android system nav / gesture bar
  const bottomPad = Math.max(insets.bottom, 16);
  const tabBarHeight = 58 + bottomPad;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.or,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          direction: 'rtl',
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: bottomPad,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.card,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', writingDirection: 'rtl' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isDira ? 'דירה' : 'דירות',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'מפה',
          tabBarIcon: ({ color, size }) => <Ionicons name="map" color={color} size={size} />,
          href: isDira ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          title: 'Reels',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play-circle" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'צ׳אט',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" color={color} size={size} />
          ),
          href: isGuest ? null : undefined,
        }}
        listeners={{
          tabPress: (e) => guestGuard(isGuest, e),
        }}
      />
      <Tabs.Screen
        name="meetings"
        options={{
          title: 'פגישות',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
          href: isGuest || isDira ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: 'פניות',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />,
          href: isGuest || !isDira ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'התראות',
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'פרופיל',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
          href: isGuest ? null : undefined,
        }}
        listeners={{
          tabPress: (e) => {
            if (isGuest) {
              guestGuard(true, e);
              return;
            }
            e.preventDefault();
            router.push('/(tabs)/profile');
          },
        }}
      />
    </Tabs>
  );
}
