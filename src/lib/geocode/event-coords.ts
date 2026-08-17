import type { CoordsSource } from "~/lib/geocode/types";

export type EventCoordsWrite = {
  lat: number | null;
  lng: number | null;
  coords_source: CoordsSource | null;
};

export type LocationFields = {
  address: string;
  place?: string | null;
  town: string;
};

/** Set when the user picks a Places suggestion this session (wired in 21.4). */
export type StashedPlacesCoords = {
  lat: number;
  lng: number;
};

export type StoredEventLocation = LocationFields & {
  lat: number | null;
  lng: number | null;
  coords_source: string | null;
};

const NULL_COORDS: EventCoordsWrite = {
  lat: null,
  lng: null,
  coords_source: null,
};

function normalizePart(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function hasLocationChanged(
  current: LocationFields,
  initial: LocationFields,
): boolean {
  return (
    normalizePart(current.address) !== normalizePart(initial.address) ||
    normalizePart(current.place) !== normalizePart(initial.place) ||
    normalizePart(current.town) !== normalizePart(initial.town)
  );
}

function parseCoordsSource(value: string | null): CoordsSource | null {
  if (value === "geocode" || value === "places" || value === "manual") {
    return value;
  }
  return null;
}

export function coordsFromStoredEvent(event: {
  lat: number | null;
  lng: number | null;
  coords_source: string | null;
}): EventCoordsWrite {
  const source = parseCoordsSource(event.coords_source);
  if (event.lat != null && event.lng != null && source) {
    return { lat: event.lat, lng: event.lng, coords_source: source };
  }
  return NULL_COORDS;
}

function parseGeocodeResponse(body: unknown): EventCoordsWrite {
  if (typeof body !== "object" || body === null) return NULL_COORDS;
  const record = body as Record<string, unknown>;
  const lat =
    typeof record.lat === "number" && Number.isFinite(record.lat)
      ? record.lat
      : null;
  const lng =
    typeof record.lng === "number" && Number.isFinite(record.lng)
      ? record.lng
      : null;
  if (lat === null || lng === null) return NULL_COORDS;
  return { lat, lng, coords_source: "geocode" };
}

export async function geocodeLocation(
  fields: LocationFields,
): Promise<EventCoordsWrite> {
  try {
    const response = await fetch("/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: fields.address,
        place: fields.place ?? null,
        town: fields.town,
      }),
    });
    if (!response.ok) return NULL_COORDS;
    return parseGeocodeResponse(await response.json());
  } catch {
    return NULL_COORDS;
  }
}

/**
 * Resolves map coords for create / update / recurring. Never throws —
 * publish proceeds with null coords if Google is down or the address fails.
 */
export async function resolveEventCoords(options: {
  fields: LocationFields;
  placesPick: StashedPlacesCoords | null;
  isEdit: boolean;
  initial: StoredEventLocation | null;
  /** In-session pin from Retry or a dragged manual pin. */
  draftCoords?: EventCoordsWrite | null;
}): Promise<EventCoordsWrite> {
  if (options.placesPick) {
    return {
      lat: options.placesPick.lat,
      lng: options.placesPick.lng,
      coords_source: "places",
    };
  }

  if (
    options.isEdit &&
    options.initial &&
    !hasLocationChanged(options.fields, options.initial)
  ) {
    if (options.draftCoords && options.draftCoords.lat != null) {
      return options.draftCoords;
    }
    return coordsFromStoredEvent(options.initial);
  }

  return geocodeLocation(options.fields);
}
