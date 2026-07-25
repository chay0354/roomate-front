import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';

import ApartmentCard from '@/components/ApartmentCard';
import Loading from '@/components/Loading';
import Screen from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { fetchFavorites } from '@/lib/api';
import { colors, fontSize, spacing } from '@/lib/theme';
import type { Favorite } from '@/lib/types';

export default function FavoritesScreen() {
  const { session } = useAuth();
  const [items, setItems] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      router.replace('/(auth)/login');
      return;
    }
    fetchFavorites(session.user.id)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  if (loading) return <Loading label="טוען מועדפים..." />;

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>מועדפים</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.apartment_id}
        ListEmptyComponent={<Text style={styles.empty}>אין דירות שמורות</Text>}
        renderItem={({ item }) =>
          item.apartment ? <ApartmentCard apartment={item.apartment} isFavorite /> : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '700', marginBottom: spacing.lg, textAlign: 'left' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xxl },
});
