/**
 * PROTOTYPE — hardcoded partner data.
 *
 * Everything a real implementation would read from a `partners` table is
 * collected here so the demo can be adjusted in one file. Copy is Bulgarian-only
 * on purpose; move it to next-intl keys before this ships.
 */

export type NearbyPartner = {
  name: string;
  /** Public path (e.g. "/partners/partner-cafe.jpg") or absolute URL. */
  image: string | null;
  /** Intrinsic pixel size of `image` — the card renders at a fixed height and
   *  lets the width follow, so these must match the real file. */
  imageWidth: number;
  imageHeight: number;
  imageAlt: string;
  address: string | null;
  lat: number;
  lng: number;
};

/** Only events within this distance of the partner show the card. */
export const PARTNER_RADIUS_KM = 0.5;

/**
 * The Google Maps Embed API only offers "roadmap" and "satellite" tiles.
 * "terrain" and "hybrid" exist in the Maps JavaScript and Static Maps APIs
 * only, so switching to terrain means dropping the iframe for one of those.
 */
export const PARTNER_MAP_TYPE: "roadmap" | "satellite" = "satellite";

/** 0 = whole world, 21 = individual buildings. */
export const PARTNER_MAP_ZOOM = 17;

/** Average walking speed used to turn distance into minutes. */
const WALKING_KMH = 5;

export const NEARBY_PARTNER: NearbyPartner = {
  name: "Европа bar & kitchen",
  image: "/partners/partner-evropa.jpg",
  imageWidth: 335,
  imageHeight: 597,
  imageAlt: "Europe bar & kitchen, Русе",
  address: "пл. Свобода 4",
  lat: 43.84786934145719,
  lng: 25.953422801992808,
};

export const PARTNER_COPY = {
  heading: "Място за напитка или хапване наблизо преди или след събитието",
  walkingFrom: (minutes: number, place: string) =>
    `${minutes} мин. пеша от ${place}`,
  support: `${NEARBY_PARTNER.name} подкрепя културния живот в Русе!`,
  photoPending: "Снимка на заведението",
};

export function walkingMinutes(km: number): number {
  return Math.max(1, Math.round((km / WALKING_KMH) * 60));
}
