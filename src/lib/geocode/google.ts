import {
  buildGeocodeQuery,
  expandAddressAbbreviations,
} from "~/lib/geocode/query";
import {
  distanceKm,
  isInsideRuse,
  RUSE_CENTER,
  RUSE_MAX_DISTANCE_KM,
  ruseGeocodeBoundsParam,
} from "~/lib/geocode/ruse";
import type {
  GeocodeResult,
  PlaceDetailsResult,
  PlaceSuggestion,
} from "~/lib/geocode/types";

import "server-only";

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const PLACES_AUTOCOMPLETE_URL =
  "https://places.googleapis.com/v1/places:autocomplete";
const PLACES_DETAILS_URL = "https://places.googleapis.com/v1/places";
const FETCH_TIMEOUT_MS = 8000;

const NULL_GEOCODE: GeocodeResult = { lat: null, lng: null, source: null };
const NULL_PLACE_DETAILS: PlaceDetailsResult = {
  lat: null,
  lng: null,
  source: null,
  address: null,
  town: null,
  place: null,
};

const STREET_PLACE_TYPES = new Set([
  "street_address",
  "route",
  "plus_code",
  "intersection",
]);

/**
 * Google sizes each result's viewport to the feature it matched. Anything wider
 * than a small settlement means it gave up on the address and returned a
 * centroid — Ruse spans ~15 km, so pinning there would drop the marker on an
 * arbitrary street. Village centroids stay under this and are the best answer
 * available for events described only as "in village X".
 */
const MAX_RESULT_SPAN_KM = 5;

let missingKeyWarned = false;

function getApiKey(): string | null {
  const key = process.env.GOOGLE_MAPS_GEOCODING_API_KEY?.trim() ?? "";
  if (key.length > 0) return key;

  if (!missingKeyWarned) {
    missingKeyWarned = true;
    console.warn(
      "[geocode] GOOGLE_MAPS_GEOCODING_API_KEY is missing; coords will be null",
    );
  }
  return null;
}

export function hasGeocodingApiKey(): boolean {
  return (process.env.GOOGLE_MAPS_GEOCODING_API_KEY?.trim() ?? "").length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function fetchJson(
  url: string,
  init: RequestInit,
): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.warn("[geocode] Google HTTP", response.status);
      return null;
    }
    return await response.json();
  } catch (err) {
    console.warn(
      "[geocode] Google request failed",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

function acceptedRuseCoords(
  lat: number,
  lng: number,
): { lat: number; lng: number } | null {
  if (!isInsideRuse(lat, lng)) {
    console.warn("[geocode] result outside Ruse, ignoring", { lat, lng });
    return null;
  }
  return { lat, lng };
}

function isTooCoarse(viewport: unknown): boolean {
  if (!isRecord(viewport)) return false;
  const { northeast, southwest } = viewport;
  if (!isRecord(northeast) || !isRecord(southwest)) return false;

  const north = readNumber(northeast.lat);
  const east = readNumber(northeast.lng);
  const south = readNumber(southwest.lat);
  const west = readNumber(southwest.lng);
  if (north === null || east === null || south === null || west === null) {
    return false;
  }

  const span = Math.max(
    distanceKm(south, west, north, west),
    distanceKm(south, west, south, east),
  );
  return span > MAX_RESULT_SPAN_KM;
}

/** Returns null when Google fails, or when the match is unusable as a pin. */
async function lookupAddress(
  query: string,
  key: string,
): Promise<GeocodeResult | null> {
  const url = new URL(GEOCODE_URL);
  url.searchParams.set("address", query);
  url.searchParams.set("region", "bg");
  url.searchParams.set("language", "bg");
  url.searchParams.set("bounds", ruseGeocodeBoundsParam());
  url.searchParams.set("key", key);

  const body = await fetchJson(url.toString(), { method: "GET" });
  if (!isRecord(body)) return null;

  const status = readString(body.status);
  if (status === "ZERO_RESULTS") return null;
  if (status !== "OK") {
    console.warn("[geocode] Geocoding status", status ?? "unknown");
    return null;
  }

  if (!Array.isArray(body.results) || body.results.length === 0) return null;

  const first = body.results[0];
  if (!isRecord(first) || !isRecord(first.geometry)) return null;
  const geometry = first.geometry;
  if (!isRecord(geometry.location)) return null;

  const lat = readNumber(geometry.location.lat);
  const lng = readNumber(geometry.location.lng);
  if (lat === null || lng === null) return null;

  const accepted = acceptedRuseCoords(lat, lng);
  if (!accepted) return null;

  if (isTooCoarse(geometry.viewport)) {
    console.warn("[geocode] result too coarse to pin, ignoring", { query });
    return null;
  }

  return { lat: accepted.lat, lng: accepted.lng, source: "geocode" };
}

export async function geocodeAddress(
  place?: string | null,
  address?: string | null,
  town?: string | null,
): Promise<GeocodeResult> {
  const key = getApiKey();
  if (!key) return NULL_GEOCODE;

  const withPlace = buildGeocodeQuery(place, address, town);
  if (withPlace.length === 0) return NULL_GEOCODE;
  const withoutPlace = buildGeocodeQuery(null, address, town);

  // Most specific first, then drop the two things that mislead Google: unspelled
  // abbreviations, and freeform place names — "градинката пред Паметника на
  // Сръбско-българската война" matches Serbia and buries the actual address.
  const attempts = [
    withPlace,
    expandAddressAbbreviations(withPlace),
    withoutPlace,
    expandAddressAbbreviations(withoutPlace),
  ];

  const tried = new Set<string>();
  for (const query of attempts) {
    if (query.length === 0 || tried.has(query)) continue;
    tried.add(query);

    const result = await lookupAddress(query, key);
    if (result) return result;
  }

  return NULL_GEOCODE;
}

export async function placeAutocomplete(
  input: string,
  sessionToken?: string | null,
): Promise<PlaceSuggestion[]> {
  const query = input.trim();
  if (query.length === 0) return [];

  const key = getApiKey();
  if (!key) return [];

  const payload: Record<string, unknown> = {
    input: query,
    languageCode: "bg",
    regionCode: "bg",
    includedRegionCodes: ["bg"],
    locationRestriction: {
      circle: {
        center: {
          latitude: RUSE_CENTER.lat,
          longitude: RUSE_CENTER.lng,
        },
        radius: RUSE_MAX_DISTANCE_KM * 1000,
      },
    },
  };

  const token = sessionToken?.trim();
  if (token) payload.sessionToken = token;

  const body = await fetchJson(PLACES_AUTOCOMPLETE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
    },
    body: JSON.stringify(payload),
  });

  if (!isRecord(body) || !Array.isArray(body.suggestions)) return [];

  return body.suggestions.flatMap((item) => {
    const suggestion = parseSuggestion(item);
    return suggestion ? [suggestion] : [];
  });
}

function parseSuggestion(item: unknown): PlaceSuggestion | null {
  if (!isRecord(item) || !isRecord(item.placePrediction)) return null;

  const prediction = item.placePrediction;
  const placeId = readString(prediction.placeId);
  if (!placeId) return null;

  const text = isRecord(prediction.text)
    ? readString(prediction.text.text)
    : null;
  if (!text) return null;

  const structured = isRecord(prediction.structuredFormat)
    ? prediction.structuredFormat
    : null;
  const mainText =
    structured && isRecord(structured.mainText)
      ? (readString(structured.mainText.text) ?? text)
      : text;
  const secondaryText =
    structured && isRecord(structured.secondaryText)
      ? readString(structured.secondaryText.text)
      : null;

  return { placeId, text, mainText, secondaryText };
}

export async function placeDetails(
  placeId: string,
  sessionToken?: string | null,
): Promise<PlaceDetailsResult> {
  const id = normalizePlaceId(placeId);
  if (!id) return NULL_PLACE_DETAILS;

  const key = getApiKey();
  if (!key) return NULL_PLACE_DETAILS;

  const url = new URL(`${PLACES_DETAILS_URL}/${encodeURIComponent(id)}`);
  url.searchParams.set("languageCode", "bg");
  url.searchParams.set("regionCode", "bg");
  const token = sessionToken?.trim();
  if (token) url.searchParams.set("sessionToken", token);

  const body = await fetchJson(url.toString(), {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "id,displayName,formattedAddress,location,addressComponents,types",
    },
  });

  if (!isRecord(body)) return NULL_PLACE_DETAILS;

  const addressParts = parseAddressParts(body);
  const lat = isRecord(body.location)
    ? readNumber(body.location.latitude)
    : null;
  const lng = isRecord(body.location)
    ? readNumber(body.location.longitude)
    : null;

  if (lat === null || lng === null) {
    return { ...NULL_PLACE_DETAILS, ...addressParts };
  }

  const accepted = acceptedRuseCoords(lat, lng);
  if (!accepted) {
    return { ...NULL_PLACE_DETAILS, ...addressParts };
  }

  return {
    lat: accepted.lat,
    lng: accepted.lng,
    source: "places",
    ...addressParts,
  };
}

function normalizePlaceId(placeId: string): string | null {
  const trimmed = placeId.trim();
  if (trimmed.length === 0) return null;
  return trimmed.replace(/^places\//, "");
}

function parseAddressParts(body: Record<string, unknown>): {
  address: string | null;
  town: string | null;
  place: string | null;
} {
  const components = Array.isArray(body.addressComponents)
    ? body.addressComponents
    : [];
  const types = Array.isArray(body.types)
    ? body.types.filter((t): t is string => typeof t === "string")
    : [];

  const route = componentText(components, "route");
  const streetNumber = componentText(components, "street_number");
  const address =
    route && streetNumber ? `${route} ${streetNumber}` : (route ?? null);

  const town =
    componentText(components, "locality") ??
    componentText(components, "postal_town") ??
    componentText(components, "administrative_area_level_2");

  const displayName = isRecord(body.displayName)
    ? readString(body.displayName.text)
    : null;
  const isStreetOnly = types.some((t) => STREET_PLACE_TYPES.has(t));
  const place =
    displayName &&
    !isStreetOnly &&
    displayName !== address &&
    displayName !== town
      ? displayName
      : null;

  return { address, town, place };
}

function componentText(components: unknown[], type: string): string | null {
  for (const component of components) {
    if (!isRecord(component) || !Array.isArray(component.types)) continue;
    if (!component.types.includes(type)) continue;
    return readString(component.longText);
  }
  return null;
}
