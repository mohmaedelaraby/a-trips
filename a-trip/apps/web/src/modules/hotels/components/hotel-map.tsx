'use client';

import * as React from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import { useTranslation } from '../../../shared/i18n/use-translation';
import styles from '../styles/hotel-map.module.css';

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Stand-in coordinates per city, used while hotels are still being seeded
 * without real ones. They put the pin in the right part of the right city
 * rather than in the Gulf of Guinea, and the map says plainly when it is
 * showing one of these rather than the hotel's own position.
 */
const CITY_COORDINATES: Record<string, LatLng> = {
  cairo: { lat: 30.0444, lng: 31.2357 },
  giza: { lat: 29.9773, lng: 31.1325 },
  zamalek: { lat: 30.0614, lng: 31.2197 },
  alexandria: { lat: 31.2001, lng: 29.9187 },
  hurghada: { lat: 27.2579, lng: 33.8116 },
  'el gouna': { lat: 27.3948, lng: 33.6782 },
  'sharm el sheikh': { lat: 27.9158, lng: 34.3299 },
  dahab: { lat: 28.5091, lng: 34.5136 },
  nuweiba: { lat: 29.0316, lng: 34.6699 },
  taba: { lat: 29.4896, lng: 34.8964 },
  luxor: { lat: 25.6872, lng: 32.6396 },
  aswan: { lat: 24.0889, lng: 32.8998 },
  'marsa alam': { lat: 25.0676, lng: 34.8901 },
  'ain sokhna': { lat: 29.6002, lng: 32.3167 },
  'marsa matruh': { lat: 31.3543, lng: 27.2373 },
  'port said': { lat: 31.2653, lng: 32.3019 },
  suez: { lat: 29.9668, lng: 32.5498 },
  ismailia: { lat: 30.5965, lng: 32.2715 },
  fayoum: { lat: 29.3084, lng: 30.8428 },
  siwa: { lat: 29.2041, lng: 25.5195 },
  'sahl hasheesh': { lat: 27.0644, lng: 33.8442 },
  safaga: { lat: 26.7333, lng: 33.9333 },
  damietta: { lat: 31.4165, lng: 31.8133 },
  tanta: { lat: 30.7885, lng: 31.0019 },
};

/** The country's rough centre, for a city nobody has coordinates for yet. */
const FALLBACK: LatLng = { lat: 26.8206, lng: 30.8025 };

/**
 * A stable offset of up to ~400m from a seed string, so two hotels sharing a
 * city's stand-in coordinates do not land on exactly the same pixel.
 */
function jitter(seed: string): LatLng {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const lat = ((hash % 71) / 71 - 0.5) * 0.008;
  const lng = (((hash >> 8) % 71) / 71 - 0.5) * 0.008;
  return { lat, lng };
}

export function resolveHotelLocation(
  city: string,
  seed: string,
): { coords: LatLng; approximate: boolean } {
  const base = CITY_COORDINATES[city.trim().toLowerCase()];
  const offset = jitter(seed);
  const from = base ?? FALLBACK;
  return {
    coords: { lat: from.lat + offset.lat, lng: from.lng + offset.lng },
    approximate: true,
  };
}

export function HotelMap({
  name,
  city,
  address,
  latitude,
  longitude,
  seed,
}: {
  name: string;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  /** Stable per hotel — the slug — so the stand-in pin never moves between visits. */
  seed: string;
}) {
  const { t } = useTranslation();

  const { coords, approximate } = React.useMemo(() => {
    if (latitude !== null && longitude !== null) {
      return { coords: { lat: latitude, lng: longitude }, approximate: false };
    }
    return resolveHotelLocation(city, seed);
  }, [latitude, longitude, city, seed]);

  // A box roughly 2km across, which is the zoom at which a city street grid is
  // readable but the neighbourhood is still recognisable.
  const bbox = [coords.lng - 0.012, coords.lat - 0.008, coords.lng + 0.012, coords.lat + 0.008]
    .map((n) => n.toFixed(5))
    .join('%2C');
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${coords.lat.toFixed(5)}%2C${coords.lng.toFixed(5)}`;
  const directionsHref = `https://www.google.com/maps/search/?api=1&query=${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;

  return (
    <div className={styles.wrap}>
      <div className={styles.frame}>
        <iframe
          title={t('ui.hotels.mapTitle', { hotel: name })}
          src={embedSrc}
          className={styles.iframe}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className={styles.bar}>
        <p className={styles.address}>
          <MapPin className={styles.pinIcon} aria-hidden />
          <span>
            {address}, {city}
            {/* Said out loud rather than left for the guest to discover on
                arrival: this pin is the neighbourhood, not the front door. */}
            {approximate ? (
              <span className={styles.approxTag}>{t('ui.hotels.mapApproximate')}</span>
            ) : null}
          </span>
        </p>

        <a
          href={directionsHref}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.directions}
        >
          {t('ui.hotels.getDirections')}
          <ExternalLink className={styles.directionsIcon} aria-hidden />
        </a>
      </div>
    </div>
  );
}
