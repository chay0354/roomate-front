import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { colors, fontSize, radius, shadow, spacing } from '@/lib/theme';
import type { Apartment } from '@/lib/types';

interface ApartmentCardProps {
  apartment: Apartment;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export default function ApartmentCard({
  apartment,
  isFavorite,
  onToggleFavorite,
}: ApartmentCardProps) {
  const image = apartment.image_urls?.[0];

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/apartment/${apartment.id}`)}
    >
      <View style={styles.imageWrap}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View style={[styles.image, { backgroundColor: colors.orLight }]} />
        )}
        {onToggleFavorite ? (
          <Pressable style={styles.heart} onPress={onToggleFavorite}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={colors.or}
            />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.price}>₪{apartment.price.toLocaleString()}</Text>
          <Text style={styles.perMonth}>/חודש</Text>
        </View>
        <Text style={styles.address}>{apartment.address}</Text>
        {apartment.neighborhood ? (
          <Text style={styles.neighborhood}>{apartment.neighborhood}</Text>
        ) : null}
        <View style={styles.tags}>
          {(apartment.tags ?? []).slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  imageWrap: {
    height: 180,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  heart: {
    position: 'absolute',
    top: 12,
    end: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  perMonth: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  address: {
    marginTop: 4,
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'left',
  },
  neighborhood: {
    marginTop: 2,
    fontSize: fontSize.sm,
    color: colors.or,
    textAlign: 'left',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: 6,
  },
  tag: {
    backgroundColor: colors.orLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  tagText: {
    fontSize: fontSize.xs,
    color: colors.or,
    fontWeight: '500',
  },
});
