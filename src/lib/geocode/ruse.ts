export const RUSE_CENTER = {
  lat: 43.8486,
  lng: 25.9536,
} as const;

/**
 * Box Google searches first. Kept tight on the city so a street lookup prefers
 * the Ruse one over a same-named street in a province village.
 */
const RUSE_GEOCODE_BIAS_KM = 15;

/**
 * Furthest accepted pin from city center. Covers province villages that host
 * events (Бръшлен and Чилнов are the furthest at ~37 km) while still rejecting
 * Бяла at 46 km, which is the town Google falls back to on ambiguous addresses.
 */
export const RUSE_MAX_DISTANCE_KM = 40;

export const RUSE_MAP_ZOOM = 13;
/** Low enough to fit the whole accepted radius on screen. */
export const RUSE_MAP_MIN_ZOOM = 10;
export const RUSE_MAP_MAX_ZOOM = 18;

const EARTH_RADIUS_KM = 6371;
const KM_PER_DEG_LAT = 110.574;

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isInsideRuse(lat: number, lng: number): boolean {
  return (
    distanceKm(RUSE_CENTER.lat, RUSE_CENTER.lng, lat, lng) <=
    RUSE_MAX_DISTANCE_KM
  );
}

function boundsAroundCenter(radiusKm: number): {
  south: number;
  west: number;
  north: number;
  east: number;
} {
  const kmPerDegLng = 111.32 * Math.cos(toRad(RUSE_CENTER.lat));
  const dLat = radiusKm / KM_PER_DEG_LAT;
  const dLng = radiusKm / kmPerDegLng;

  return {
    south: RUSE_CENTER.lat - dLat,
    west: RUSE_CENTER.lng - dLng,
    north: RUSE_CENTER.lat + dLat,
    east: RUSE_CENTER.lng + dLng,
  };
}

/** How far a map lets the user pan — matches what coords we accept. */
export function ruseMapBounds() {
  return boundsAroundCenter(RUSE_MAX_DISTANCE_KM);
}

export function ruseGeocodeBoundsParam(): string {
  const { south, west, north, east } = boundsAroundCenter(RUSE_GEOCODE_BIAS_KM);
  return `${south},${west}|${north},${east}`;
}
