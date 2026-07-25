import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { colors, fontSize, radius, shadow, spacing } from '@/lib/theme';
import type { Apartment } from '@/lib/types';

interface FeedApartmentCardProps {
  apartment: Apartment;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  badge?: string;
  badgeColor?: string;
}

export default function FeedApartmentCard({
  apartment,
  isFavorite,
  onToggleFavorite,
  badge,
  badgeColor,
}: FeedApartmentCardProps) {
  const image = apartment.image_urls?.[0];
  const isFull = apartment.status === 'full';
  const ownerName = apartment.owner?.full_name ?? 'בעל/ת דירה';
  const ownerLetter = ownerName.slice(0, 1);

  return (
    <Pressable
      style={[styles.card, isFull && styles.cardFull]}
      onPress={() => router.push(`/apartment/${apartment.id}`)}
    >
      <View style={styles.imageWrap}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View style={[styles.image, { backgroundColor: colors.orLight }]} />
        )}
        {badge ? (
          <View style={[styles.badge, { backgroundColor: badgeColor ?? colors.success }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
        {isFull ? (
          <View style={styles.fullOverlay}>
            <Text style={styles.fullText}>🔒 דירה מלאה</Text>
          </View>
        ) : null}
        {onToggleFavorite ? (
          <Pressable style={styles.heart} onPress={onToggleFavorite}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={colors.or}
            />
          </Pressable>
        ) : null}
        <View style={styles.roommates}>
          <View style={[styles.rm, { backgroundColor: colors.or }]}>
            <Text style={styles.rmText}>{ownerLetter}</Text>
          </View>
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.price}>₪{apartment.price.toLocaleString()}</Text>
          <Text style={styles.perMonth}> /חודש</Text>
          {isFull ? (
            <View style={styles.fullChip}>
              <Text style={styles.fullChipText}>דירה מלאה</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.address}>
          {apartment.address}
          {apartment.neighborhood ? `, ${apartment.neighborhood}` : ''}
        </Text>
        <View style={styles.tags}>
          {(apartment.tags ?? []).slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        <View style={styles.who}>
          <View style={[styles.whoAv, { backgroundColor: colors.orLight }]}>
            <Text style={styles.whoAvText}>{ownerLetter}</Text>
          </View>
          <Text style={styles.whoText}>
            {ownerName} · {isFull ? 'מלא' : 'מחפש/ת שותף/ה'}
          </Text>
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
  cardFull: { opacity: 0.75 },
  imageWrap: { height: 180, position: 'relative' },
  image: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: 12,
    start: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  fullOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullText: { color: '#fff', fontWeight: '700', fontSize: 16 },
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
  roommates: {
    position: 'absolute',
    bottom: 10,
    start: 10,
    flexDirection: 'row',
  },
  rm: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rmText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  body: { padding: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  price: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  perMonth: { fontSize: fontSize.sm, color: colors.textMuted },
  fullChip: {
    marginEnd: 'auto',
    backgroundColor: colors.dangerBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  fullChipText: { fontSize: 10, color: colors.danger, fontWeight: '600' },
  address: {
    marginTop: 4,
    fontSize: fontSize.md,
    color: colors.textMuted,
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
  tagText: { fontSize: fontSize.xs, color: colors.or, fontWeight: '500' },
  who: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
  },
  whoAv: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whoAvText: { fontSize: 11, fontWeight: '700', color: colors.or },
  whoText: { fontSize: fontSize.sm, color: colors.textMuted },
});
