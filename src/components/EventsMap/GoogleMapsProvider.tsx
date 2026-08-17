"use client";

import { createContext, type ReactNode, useContext } from "react";
import { useLocale } from "next-intl";

import { useJsApiLoader } from "@react-google-maps/api";

const GOOGLE_MAPS_LOADER_ID = "all4ruse-google-maps";

type GoogleMapsLoaderValue = {
  isLoaded: boolean;
  loadError: Error | undefined;
};

const GoogleMapsContext = createContext<GoogleMapsLoaderValue | null>(null);

type Props = {
  children: ReactNode;
};

/**
 * Single `useJsApiLoader` mount. Listing map and the form pin preview (21.7)
 * must share this — two loaders crash at runtime.
 */
export function GoogleMapsProvider({ children }: Props) {
  const locale = useLocale();
  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    language: locale,
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
