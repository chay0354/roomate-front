/** Helpers that map live apartment/profile rows into feed UI models — no mock fallbacks. */

import type { Reel } from '@/lib/types';

export const AVATAR_COLORS = ['#FF8A65', '#4FC3F7', '#81C784', '#BA68C8', '#FFD54F', '#F06292'];

export interface StoryItem {
  id: string;
  name: string;
  price: string;
  address: string;
  avatarLetter: string;
  avatarColor: string;
  /** Preview for the story ring */
  image: string;
  /** Full media shown in the viewer */
  mediaUrl: string;
  isVideo: boolean;
  time: string;
  apartmentId: string;
}

function relativeTime(iso?: string): string {
  if (!iso) return 'היום';
  const hours = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 36e5));
  if (hours < 24) return `${hours} שעות`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'יום אחד' : `${days} ימים`;
}

/** "חם עכשיו" stories = apartment tour reels uploaded from the Reels tab. */
export function storiesFromTourReels(reels: Reel[]): StoryItem[] {
  return reels
    .filter((r) => r.kind === 'apartment_tour' && r.apartment_id)
    .slice(0, 12)
    .map((r, i) => {
      const apt = r.apartment;
      const name =
        apt?.title ?? apt?.address?.split(',')[0] ?? r.author?.full_name ?? 'סיור בדירה';
      const letter = (r.author?.full_name ?? name).slice(0, 1);
      const preview =
        r.thumbnail_url || apt?.image_urls?.[0] || r.media_url;
      return {
        id: r.id,
        apartmentId: r.apartment_id!,
        name,
        price: apt ? `₪${apt.price.toLocaleString('he-IL')}` : '',
        address: apt
          ? apt.neighborhood
            ? `${apt.address}, ${apt.neighborhood}`
            : apt.address
          : r.caption ?? 'סיור בדירה',
        avatarLetter: letter,
        avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
        image: preview,
        mediaUrl: r.media_url,
        isVideo: true,
        time: relativeTime(r.created_at),
      };
    });
}

export function neighborhoodsFromApartments(
  apartments: { neighborhood: string | null; image_urls: string[] }[]
): { id: string; name: string; image: string }[] {
  const seen = new Map<string, string>();
  for (const a of apartments) {
    const name = a.neighborhood?.trim();
    if (!name || seen.has(name)) continue;
    seen.set(name, a.image_urls?.[0] ?? '');
  }
  return [...seen.entries()].map(([name, image]) => ({
    id: name,
    name,
    image,
  }));
}
