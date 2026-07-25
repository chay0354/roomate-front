/** Tel Aviv neighborhood centroids for apartments missing lat/lng */
const NEIGHBORHOOD_COORDS: Record<string, { lat: number; lng: number }> = {
  פלורנטין: { lat: 32.0565, lng: 34.7678 },
  'הצפון הישן': { lat: 32.0853, lng: 34.7718 },
  'נווה צדק': { lat: 32.0614, lng: 34.7625 },
  'לב העיר': { lat: 32.0728, lng: 34.7765 },
  שינקין: { lat: 32.0719, lng: 34.7745 },
  בבלי: { lat: 32.1001, lng: 34.7912 },
  'הצפון החדש': { lat: 32.0935, lng: 34.782 },
  יפו: { lat: 32.0522, lng: 34.7518 },
};

export const TEL_AVIV_CENTER = { lat: 32.078, lng: 34.78 };

function hashJitter(id: string): { dLat: number; dLng: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const a = ((h % 1000) / 1000 - 0.5) * 0.004;
  const b = (((h >> 9) % 1000) / 1000 - 0.5) * 0.004;
  return { dLat: a, dLng: b };
}

export function resolveApartmentCoords(apt: {
  id: string;
  lat: number | null;
  lng: number | null;
  neighborhood?: string | null;
}): { lat: number; lng: number } | null {
  if (
    typeof apt.lat === 'number' &&
    typeof apt.lng === 'number' &&
    Number.isFinite(apt.lat) &&
    Number.isFinite(apt.lng)
  ) {
    return { lat: apt.lat, lng: apt.lng };
  }
  const base =
    (apt.neighborhood && NEIGHBORHOOD_COORDS[apt.neighborhood]) || TEL_AVIV_CENTER;
  const { dLat, dLng } = hashJitter(apt.id);
  return { lat: base.lat + dLat, lng: base.lng + dLng };
}
