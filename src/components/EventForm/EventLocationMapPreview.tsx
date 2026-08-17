"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";

import { GoogleMap, MarkerF } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";

import {
  GoogleMapsProvider,
  useGoogleMapsLoader,
} from "~/components/EventsMap/GoogleMapsProvider";
import { googleMapStyles } from "~/components/EventsMap/map-styles";
import { useTheme } from "~/components/ThemeProvider";
import {
  isInsideRuse,
  RUSE_MAP_MAX_ZOOM,
  RUSE_MAP_MIN_ZOOM,
  ruseMapBounds,
} from "~/lib/geocode/ruse";

const PREVIEW_HEIGHT_PX = 180;
const PREVIEW_ZOOM = 15;

type Props = {
  lat: number;
  lng: number;
  onDragEnd: (lat: number, lng: number) => void;
};

function EventLocationMapPreviewCanvas({ lat, lng, onDragEnd }: Props) {
  const t = useTranslations("CreateEvent");
  const { resolvedTheme } = useTheme();
  const { isLoaded, loadError } = useGoogleMapsLoader();
  const mapRef = useRef<google.maps.Map | null>(null);
  const skipPanRef = useRef(false);

  const isDark = resolvedTheme === "dark";
  const bounds = useMemo(() => ruseMapBounds(), []);
  const position = useMemo(() => ({ lat, lng }), [lat, lng]);

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
      gestureHandling: "cooperative",
      keyboardShortcuts: false,
      minZoom: RUSE_MAP_MIN_ZOOM,
      maxZoom: RUSE_MAP_MAX_ZOOM,
      restriction: {
        latLngBounds: bounds,
        strictBounds: true,
      },
      styles: googleMapStyles(isDark),
    }),
    [bounds, isDark],
  );

  useEffect(() => {
    mapRef.current?.setOptions({
      styles: googleMapStyles(isDark),
    });
  }, [isDark]);

  useEffect(() => {
    if (skipPanRef.current) {
      skipPanRef.current = false;
      return;
    }
    mapRef.current?.panTo(position);
  }, [position]);

  function handleDragEnd(event: google.maps.MapMouseEvent) {
    const nextLat = event.latLng?.lat();
    const nextLng = event.latLng?.lng();
    if (nextLat == null || nextLng == null) return;
    if (!isInsideRuse(nextLat, nextLng)) return;
    skipPanRef.current = true;
    onDragEnd(nextLat, nextLng);
  }

  if (loadError) {
    return <p className="text-muted-foreground text-sm">{t("error")}</p>;
  }

  if (!isLoaded) {
    return (
      <div
        className="flex items-center justify-center overflow-hidden rounded-lg border"
        style={{ height: PREVIEW_HEIGHT_PX }}
      >
        <Loader2
          className="text-muted-foreground size-5 animate-spin"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{ height: PREVIEW_HEIGHT_PX }}
    >
      <GoogleMap
        mapContainerClassName="h-full w-full"
        center={position}
        zoom={PREVIEW_ZOOM}
        options={mapOptions}
        onLoad={(map) => {
          mapRef.current = map;
        }}
        onUnmount={() => {
          mapRef.current = null;
        }}
      >
        <MarkerF position={position} draggable onDragEnd={handleDragEnd} />
      </GoogleMap>
    </div>
  );
}

export function EventLocationMapPreview(props: Props) {
  return (
    <GoogleMapsProvider>
      <EventLocationMapPreviewCanvas {...props} />
    </GoogleMapsProvider>
  );
}
