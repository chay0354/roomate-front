import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { fetchApartments } from '@/lib/api';
import { resolveApartmentCoords, TEL_AVIV_CENTER } from '@/lib/geo';
import { colors, fontSize, radius, shadow, spacing } from '@/lib/theme';
import type { Apartment } from '@/lib/types';

const NEIGHBORHOODS = ['הכל', 'פלורנטין', 'הצפון הישן', 'נווה צדק', 'לב העיר', 'שינקין', 'בבלי'];

type MapPin = {
  id: string;
  lat: number;
  lng: number;
  price: number;
  label: string;
};

function buildMapHtml(pins: MapPin[], selectedId: string | null) {
  const payload = JSON.stringify({ pins, selectedId, center: TEL_AVIV_CENTER });
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; height: 100%; width: 100%; background: #e8eef2; }
    .price-pin {
      background: #F57C00;
      color: #fff;
      font-weight: 800;
      font-size: 12px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 2px solid #fff;
      box-shadow: 0 4px 14px rgba(0,0,0,0.22);
      white-space: nowrap;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .price-pin.selected {
      background: #1a1a1a;
      transform: scale(1.08);
    }
    .leaflet-control-attribution { font-size: 9px !important; opacity: 0.7; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const data = ${payload};
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: true
    }).setView([data.center.lat, data.center.lng], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(map);

    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    const markers = {};

    function priceLabel(n) {
      if (n >= 1000) return '₪' + Math.round(n / 1000) + 'k';
      return '₪' + n;
    }

    function makeIcon(price, selected) {
      return L.divIcon({
        className: '',
        html: '<div class="price-pin' + (selected ? ' selected' : '') + '">' + priceLabel(price) + '</div>',
        iconSize: [64, 28],
        iconAnchor: [32, 14]
      });
    }

    function post(type, id) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type, id }));
      }
    }

    function renderPins(pins, selectedId, focusSelected) {
      Object.values(markers).forEach(function (m) { map.removeLayer(m); });
      Object.keys(markers).forEach(function (k) { delete markers[k]; });
      const bounds = [];
      pins.forEach(function (p) {
        const m = L.marker([p.lat, p.lng], {
          icon: makeIcon(p.price, p.id === selectedId)
        }).addTo(map);
        m.on('click', function () { post('select', p.id); });
        markers[p.id] = m;
        bounds.push([p.lat, p.lng]);
      });
      if (selectedId && markers[selectedId]) {
        map.setView(markers[selectedId].getLatLng(), focusSelected ? 16 : 15, { animate: true });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 15, { animate: true });
      } else if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
      }
    }

    renderPins(data.pins, data.selectedId, !!data.selectedId);

    function handleMessage(raw) {
      try {
        var msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (msg.type === 'update') {
          renderPins(msg.pins || [], msg.selectedId || null, !!msg.focus);
          if (msg.selectedId && markers[msg.selectedId] && msg.focus) {
            map.setView(markers[msg.selectedId].getLatLng(), 16, { animate: true });
          }
        }
      } catch (e) {}
    }

    document.addEventListener('message', function (e) { handleMessage(e.data); });
    window.addEventListener('message', function (e) { handleMessage(e.data); });
  </script>
</body>
</html>`;
}

export default function MapTab() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ neighborhood?: string; apartmentId?: string }>();
  const focusApartmentId =
    typeof params.apartmentId === 'string' && params.apartmentId ? params.apartmentId : null;
  const initialFilter =
    typeof params.neighborhood === 'string' && params.neighborhood
      ? params.neighborhood
      : 'הכל';

  const [filter, setFilter] = useState(initialFilter);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(focusApartmentId);
  const [mapReady, setMapReady] = useState(false);
  const webRef = useRef<WebView>(null);
  const focusHandledRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof params.neighborhood === 'string' && params.neighborhood) {
      setFilter(params.neighborhood);
    }
  }, [params.neighborhood]);

  useEffect(() => {
    if (focusApartmentId) {
      // Show all listings so the target apartment is on the map
      setFilter('הכל');
      setSelectedId(focusApartmentId);
      focusHandledRef.current = null;
    }
  }, [focusApartmentId]);

  useEffect(() => {
    setLoading(true);
    fetchApartments(filter === 'הכל' ? undefined : { neighborhood: filter })
      .then((rows) => {
        setApartments(rows);
        if (focusApartmentId && rows.some((r) => r.id === focusApartmentId)) {
          setSelectedId(focusApartmentId);
        } else if (!focusApartmentId) {
          setSelectedId(null);
        }
      })
      .catch(() => setApartments([]))
      .finally(() => setLoading(false));
  }, [filter, focusApartmentId]);

  const pins: MapPin[] = useMemo(
    () =>
      apartments
        .map((a) => {
          const coords = resolveApartmentCoords(a);
          if (!coords) return null;
          return {
            id: a.id,
            lat: coords.lat,
            lng: coords.lng,
            price: a.price,
            label: a.title ?? a.address,
          };
        })
        .filter((p): p is MapPin => p != null),
    [apartments]
  );

  const selected = useMemo(
    () => apartments.find((a) => a.id === selectedId) ?? null,
    [apartments, selectedId]
  );

  // Remount when pin set / deep-link focus changes
  const html = useMemo(
    () => buildMapHtml(pins, focusApartmentId),
    [pins, focusApartmentId]
  );

  const pushUpdate = useCallback(() => {
    if (!mapReady || !webRef.current) return;
    const shouldFocus =
      !!focusApartmentId &&
      selectedId === focusApartmentId &&
      focusHandledRef.current !== focusApartmentId;
    if (shouldFocus) focusHandledRef.current = focusApartmentId;
    webRef.current.injectJavaScript(
      `handleMessage(${JSON.stringify({
        type: 'update',
        pins,
        selectedId,
        focus: shouldFocus,
      })}); true;`
    );
  }, [mapReady, pins, selectedId, focusApartmentId]);

  useEffect(() => {
    pushUpdate();
  }, [pushUpdate]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type?: string; id?: string };
      if (msg.type === 'select' && msg.id) setSelectedId(msg.id);
    } catch {
      /* ignore */
    }
  };

  return (
    <View style={styles.root}>
      {!loading ? (
        <WebView
          key={`${filter}-${pins.length}-${focusApartmentId ?? 'all'}`}
          ref={webRef}
          originWhitelist={['*']}
          source={{ html }}
          style={styles.map}
          onMessage={onMessage}
          onLoadStart={() => setMapReady(false)}
          onLoadEnd={() => setMapReady(true)}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          mixedContentMode="always"
          allowFileAccess
        />
      ) : null}

      {(loading || !mapReady) && (
        <View style={styles.loadingOv}>
          <ActivityIndicator color={colors.or} size="large" />
          <Text style={styles.loadingT}>טוען מפה...</Text>
        </View>
      )}

      <View style={[styles.topChrome, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.titleCard}>
          <Text style={styles.title}>מפת דירות</Text>
          <Text style={styles.sub}>
            {pins.length} דירות · תל אביב
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          style={styles.filterScroll}
        >
          {NEIGHBORHOODS.map((item) => {
            const active = filter === item;
            return (
              <Pressable
                key={item}
                style={[styles.filter, active && styles.filterActive]}
                onPress={() => setFilter(item)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {selected ? (
        <Pressable
          style={[styles.sheet, { bottom: Math.max(insets.bottom, 12) + 8 }, shadow.card]}
          onPress={() => router.push(`/apartment/${selected.id}`)}
        >
          {selected.image_urls?.[0] ? (
            <Image source={{ uri: selected.image_urls[0] }} style={styles.sheetImg} />
          ) : (
            <View style={[styles.sheetImg, styles.sheetImgPh]}>
              <Text style={{ fontSize: 28 }}>🏠</Text>
            </View>
          )}
          <View style={styles.sheetBody}>
            <Text style={styles.sheetPrice}>₪{selected.price.toLocaleString('he-IL')}</Text>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {selected.title ?? selected.address}
            </Text>
            <Text style={styles.sheetMeta} numberOfLines={1}>
              {selected.rooms ?? '?'} חדרים · {selected.neighborhood ?? selected.city}
            </Text>
            <Text style={styles.sheetCta}>לפרטים ←</Text>
          </View>
          <Pressable
            hitSlop={12}
            onPress={(ev) => {
              ev.stopPropagation?.();
              setSelectedId(null);
            }}
            style={styles.sheetClose}
          >
            <Text style={styles.sheetCloseT}>✕</Text>
          </Pressable>
        </Pressable>
      ) : (
        <View style={[styles.hint, { bottom: Math.max(insets.bottom, 12) + 8 }]}>
          <Text style={styles.hintT}>לחץ על מחיר במפה כדי לראות דירה</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e8eef2' },
  map: { flex: 1, backgroundColor: '#e8eef2' },
  loadingOv: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232,238,242,0.72)',
    zIndex: 5,
  },
  loadingT: { marginTop: 10, color: colors.textMuted, fontWeight: '600' },
  topChrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: spacing.md,
    gap: 10,
  },
  titleCard: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    ...shadow.card,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'left',
  },
  sub: {
    marginTop: 2,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'left',
  },
  filterScroll: { maxHeight: 44 },
  filters: {
    gap: 8,
    paddingVertical: 2,
    flexDirection: 'row',
  },
  filter: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  filterActive: {
    borderColor: colors.or,
    backgroundColor: colors.or,
  },
  filterText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.white,
  },
  sheet: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    zIndex: 10,
  },
  sheetImg: { width: 96, height: 104 },
  sheetImgPh: {
    backgroundColor: colors.orLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sheetPrice: {
    color: colors.or,
    fontWeight: '800',
    fontSize: fontSize.lg,
    textAlign: 'left',
  },
  sheetTitle: {
    marginTop: 2,
    color: colors.text,
    fontWeight: '700',
    fontSize: fontSize.sm,
    textAlign: 'left',
  },
  sheetMeta: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'left',
  },
  sheetCta: {
    marginTop: 6,
    color: colors.orDark,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'left',
  },
  sheetClose: {
    position: 'absolute',
    top: 8,
    end: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseT: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  hint: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    zIndex: 10,
  },
  hintT: {
    backgroundColor: 'rgba(26,26,26,0.72)',
    color: '#fff',
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    fontSize: 12,
    fontWeight: '600',
  },
});
