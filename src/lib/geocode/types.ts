export type CoordsSource = "geocode" | "places" | "manual";

export type GeocodeResult = {
  lat: number | null;
  lng: number | null;
  source: "geocode" | null;
};

export type PlaceSuggestion = {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string | null;
};

export type PlaceDetailsResult = {
  lat: number | null;
  lng: number | null;
  source: "places" | null;
  address: string | null;
  town: string | null;
  place: string | null;
};
