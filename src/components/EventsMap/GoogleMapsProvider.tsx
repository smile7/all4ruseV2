"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useSyncExternalStore,
} from "react";
import { useLocale } from "next-intl";

import { useJsApiLoader } from "@react-google-maps/api";

const GOOGLE_MAPS_LOADER_ID = "all4ruse-google-maps";

/**
 * Google Maps language codes. The site locale `ua` is not a BCP 47 language;
 * the Maps API expects Ukrainian as `uk`.
 */
const GOOGLE_MAPS_LANGUAGE: Record<string, string> = {
  bg: "bg",
  en: "en",
  ua: "uk",
  ro: "ro",
};

type GoogleMapsLoaderValue = {
  isLoaded: boolean;
  loadError: Error | undefined;
};

const idleLoader: GoogleMapsLoaderValue = {
  isLoaded: false,
  loadError: undefined,
};

const GoogleMapsContext = createContext<GoogleMapsLoaderValue | null>(null);

type Props = {
  children: ReactNode;
};

/**
 * `@googlemaps/js-api-loader` keeps one Loader per JavaScript realm. Calling it
 * again with a different `language` throws. Next prerenders every locale in
 * the same Node worker, so the script must not be created during SSR.
 * In the browser the first load wins; a later locale switch reuses it.
 */
let lockedMapsLanguage: string | undefined;

function mapsLanguage(locale: string): string {
  if (!lockedMapsLanguage) {
    lockedMapsLanguage = GOOGLE_MAPS_LANGUAGE[locale] ?? "en";
  }
  return lockedMapsLanguage;
}

function subscribeToNothing(): () => void {
  return () => {};
}

/**
 * False during SSR and hydration, true on the client render after that.
 * `useJsApiLoader` constructs the Maps Loader during render, so it must not
 * run while Next is prerendering locale pages in one process.
 */
function useIsClient(): boolean {
  return useSyncExternalStore(subscribeToNothing, () => true, () => false);
}

/**
 * Single `useJsApiLoader` mount. Listing map and the form pin preview (21.7)
 * must share this — two loaders crash at runtime.
 */
export function GoogleMapsProvider({ children }: Props) {
  const clientReady = useIsClient();

  if (!clientReady) {
    return (
      <GoogleMapsContext.Provider value={idleLoader}>
        {children}
      </GoogleMapsContext.Provider>
    );
  }

  return <GoogleMapsScript>{children}</GoogleMapsScript>;
}

function GoogleMapsScript({ children }: Props) {
  const locale = useLocale();
  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    language: mapsLanguage(locale),
    region: "BG",
    preventGoogleFontsLoading: true,
  });

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export function useGoogleMapsLoader(): GoogleMapsLoaderValue {
  const value = useContext(GoogleMapsContext);
  if (!value) {
    throw new Error(
      "useGoogleMapsLoader must be used within GoogleMapsProvider",
    );
  }
  return value;
}
