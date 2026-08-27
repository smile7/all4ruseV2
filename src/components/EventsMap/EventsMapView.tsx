"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  GoogleMap,
  OverlayViewF,
  MarkerClustererF,
  MarkerF,
} from "@react-google-maps/api";
import type {
  Cluster,
  Clusterer,
  ClusterIconInfo,
} from "@react-google-maps/marker-clusterer";
import { Calendar, Loader2, LocateFixed, MapPin, Clock, ImageOff, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";

import { useTheme } from "~/components/ThemeProvider";
import { Button } from "~/components/ui/button";
import { Link } from "~/i18n/navigation";
import { formatFullDate, getEventImageUrl } from "~/lib/event-utils";
import {
  RUSE_CENTER,
  RUSE_MAP_MAX_ZOOM,
  RUSE_MAP_MIN_ZOOM,
  RUSE_MAP_ZOOM,
  ruseMapBounds,
} from "~/lib/geocode/ruse";
import { cn } from "~/lib/utils";
import type { Event } from "~/types";

import { GoogleMapsProvider, useGoogleMapsLoader } from "./GoogleMapsProvider";
import {
  eventDetailHref,
  eventListHref,
  formatMapScopeDate,
  groupEventsByCoords,
  scopeEventsForMap,
  splitEventsByCoords,
  todayInSofia,
} from "./map-scope";
import { googleMapStyles } from "./map-styles";

type LatLng = { lat: number; lng: number };

type Props = {
  events: Event[];
  from: string;
  to: string;
};

type CanvasProps = Props & {
  isLoaded: boolean;
  loadError: Error | undefined;
};

type InfoSelection = {
  events: Event[];
  position: LatLng;
};

const USER_LOCATION_Z_INDEX = 1000;
const MAP_FALLBACK_MIN_HEIGHT = 320;
/** Below this, filling the viewport would leave the map unusable — keep scrolling instead. */
const MIN_VIEWPORT_FILL_HEIGHT = 240;

/** Height of the fixed mobile nav / desktop footer that overlays the bottom of the viewport. */
function bottomChromeHeight(): number {
  const selector = window.matchMedia("(max-width: 767px)").matches
    ? "nav.fixed"
    : "footer.fixed";
  return document.querySelector<HTMLElement>(selector)?.offsetHeight ?? 0;
}

function userLocationIcon(): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 8,
    fillColor: "#2563eb",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  };
}

function EventsMapCanvas({ events, from, to, isLoaded, loadError }: CanvasProps) {
  const t = useTranslations("HomePage");
  const locale = useLocale();
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerEventsRef = useRef(new Map<google.maps.Marker, Event[]>());
  const [shellHeight, setShellHeight] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [selection, setSelection] = useState<InfoSelection | null>(null);
  const [popupAlign, setPopupAlign] = useState<"top" | "bottom">("bottom");

  const scoped = useMemo(
    () => scopeEventsForMap(events, from, to),
    [events, from, to],
  );
  const { withCoords, withoutCoords } = useMemo(
    () => splitEventsByCoords(scoped),
    [scoped],
  );
  const pins = useMemo(() => groupEventsByCoords(withCoords), [withCoords]);

  const hasDateFilter = from !== "" || to !== "";
  const scopeLabel = hasDateFilter
    ? t("mapFilteredLabel", {
        from: formatMapScopeDate(from || to, locale),
        to: formatMapScopeDate(to || from, locale),
      })
    : t("mapTodayLabel", {
        date: formatMapScopeDate(todayInSofia(), locale),
      });

  const isDark = resolvedTheme === "dark";
  const bounds = useMemo(() => ruseMapBounds(), []);

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
      gestureHandling: "greedy",
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

  // Fill the remaining viewport below the header and lock page scroll, so the
  // map gets the whole screen and the unmapped list scrolls inside its own box.
  useEffect(() => {
    let frameId = -1;
    let cancelled = false;

    function measure() {
      if (cancelled || !containerRef.current) return;

      // On iOS momentum scrolling can delay scrollTo, so retry until we're
      // truly at the top before reading the container offset.
      if (window.scrollY !== 0) {
        window.scrollTo({ top: 0 });
        frameId = requestAnimationFrame(measure);
        return;
      }

      const top = containerRef.current.getBoundingClientRect().top;
      const next = window.innerHeight - top - bottomChromeHeight();
      if (next < MIN_VIEWPORT_FILL_HEIGHT) return;

      document.documentElement.style.overflow = "hidden";
      setShellHeight(next);
    }

    window.scrollTo({ top: 0 });
    // Double-rAF: first frame lets the browser apply the scroll, second measures
    // against a settled layout.
    frameId = requestAnimationFrame(() => {
      frameId = requestAnimationFrame(measure);
    });
    window.addEventListener("resize", measure);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", measure);
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || shellHeight == null) return;
    google.maps.event.trigger(mapRef.current, "resize");
  }, [shellHeight]);

  function handleMapLoad(map: google.maps.Map) {
    mapRef.current = map;
  }

  function handleMapUnmount() {
    mapRef.current = null;
  }

  function openEvents(next: Event[], position: LatLng) {
    if (mapRef.current) {
      const bounds = mapRef.current.getBounds();
      if (bounds) {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const latSpan = ne.lat() - sw.lat();
        // If the marker is in the top 35% of the visible map, open downwards
        const topThreshold = ne.lat() - latSpan * 0.35;
        setPopupAlign(position.lat > topThreshold ? "top" : "bottom");
      }
    }
    setSelection({ events: next, position });
  }

  function eventsInCluster(cluster: Cluster): Event[] {
    return cluster
      .getMarkers()
      .flatMap((marker) => markerEventsRef.current.get(marker) ?? []);
  }

  function handleClusterClick(cluster: Cluster) {
    const clustered = eventsInCluster(cluster);
    const center = cluster.getCenter();
    if (!center || clustered.length === 0) return;
    openEvents(clustered, { lat: center.lat(), lng: center.lng() });
  }

  /** Cluster bubbles count events, not venues — a venue marker can hold many. */
  function clusterCalculator(
    markers: google.maps.Marker[],
    numStyles: number,
  ): ClusterIconInfo {
    const total = markers.reduce(
      (sum, marker) => sum + (markerEventsRef.current.get(marker)?.length ?? 0),
      0,
    );
    return {
      text: String(total),
      index: Math.min(String(total).length, numStyles),
      title: "",
    };
  }

  function handleToggleMyLocation() {
    if (userLocation) {
      setUserLocation(null);
      return;
    }
    if (!navigator.geolocation) {
      toast.error(t("mapLocationDenied"));
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        toast.error(t("mapLocationDenied"));
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  const locationLabel = userLocation
    ? t("mapHideMyLocation")
    : t("mapShowMyLocation");
  const showUnmappedList = withoutCoords.length > 0;

  return (
    <div
      ref={containerRef}
      className="flex w-full flex-col gap-2"
      style={
        shellHeight != null
          ? { height: shellHeight }
          : { minHeight: MAP_FALLBACK_MIN_HEIGHT }
      }
    >
      <div className="shrink-0">
        <h2 className="text-sm font-semibold">{scopeLabel}</h2>
        {withCoords.length > 0 && (
          <p className="text-muted-foreground text-sm">
            {t("mapEventsCount", { count: withCoords.length })}
          </p>
        )}
      </div>

      {scoped.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
          <Calendar
            className="text-muted-foreground size-10 opacity-40"
            strokeWidth={1.5}
          />
          <p className="text-muted-foreground text-sm">{t("noEvents")}</p>
        </div>
      ) : (
        <>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border">
            {loadError ? (
              <div className="flex h-full items-center justify-center p-6">
                <p className="text-muted-foreground text-sm">{t("error")}</p>
              </div>
            ) : !isLoaded ? (
              <div className="flex h-full items-center justify-center">
                <Loader2
                  className="text-muted-foreground size-6 animate-spin"
                  aria-hidden
                />
              </div>
            ) : (
              <GoogleMap
                mapContainerClassName="h-full w-full"
                center={RUSE_CENTER}
                zoom={RUSE_MAP_ZOOM}
                options={mapOptions}
                onLoad={handleMapLoad}
                onUnmount={handleMapUnmount}
                onClick={() => setSelection(null)}
              >
                <MarkerClustererF
                  averageCenter
                  minimumClusterSize={2}
                  zoomOnClick={false}
                  calculator={clusterCalculator}
                  onClick={handleClusterClick}
                >
                  {(clusterer: Clusterer) => (
                    <>
                      {pins.map((pin) => (
                        <MarkerF
                          key={pin.key}
                          position={{ lat: pin.lat, lng: pin.lng }}
                          clusterer={clusterer}
                          title={
                            pin.events.length > 1
                              ? t("mapEventsHere", { count: pin.events.length })
                              : pin.events[0].title
                          }
                          label={
                            pin.events.length > 1
                              ? {
                                  text: String(pin.events.length),
                                  color: "#ffffff",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                }
                              : undefined
                          }
                          onLoad={(marker) => {
                            markerEventsRef.current.set(marker, pin.events);
                          }}
                          onUnmount={(marker) => {
                            markerEventsRef.current.delete(marker);
                          }}
                          onClick={() =>
                            openEvents(pin.events, {
                              lat: pin.lat,
                              lng: pin.lng,
                            })
                          }
                        />
                      ))}
                    </>
                  )}
                </MarkerClustererF>

                {userLocation && (
                  <MarkerF
                    position={userLocation}
                    zIndex={USER_LOCATION_Z_INDEX}
                    icon={userLocationIcon()}
                    title={t("mapShowMyLocation")}
                    clickable={false}
                  />
                )}

                {selection && (
                  <OverlayViewF
                    position={selection.position}
                    mapPaneName="overlayMouseTarget"
                  >
                    <CustomPopup
                      events={selection.events}
                      locale={locale}
                      openLabel={t("mapOpenEvent")}
                      onClose={() => setSelection(null)}
                      verticalAlign={popupAlign}
                    />
                  </OverlayViewF>
                )}
              </GoogleMap>
            )}

            <Button
              type="button"
              size="icon"
              variant="secondary"
              aria-pressed={userLocation != null}
              aria-label={locationLabel}
              title={locationLabel}
              disabled={isLocating}
              className="absolute right-2.5 bottom-18 z-1 shadow-md"
              onClick={handleToggleMyLocation}
            >
              {isLocating ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <LocateFixed className="size-4" aria-hidden />
              )}
            </Button>
          </div>

          <div className="flex shrink-0 justify-start">
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-pressed={userLocation != null}
              disabled={isLocating}
              className="w-full sm:w-auto"
              onClick={handleToggleMyLocation}
            >
              {isLocating ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <LocateFixed className="size-4" aria-hidden />
              )}
              <span className="truncate">{locationLabel}</span>
            </Button>
          </div>

          {showUnmappedList && (
            <UnmappedEventsList events={withoutCoords} locale={locale} />
          )}
        </>
      )}
    </div>
  );
}

function CustomPopup({
  events,
  locale,
  openLabel,
  onClose,
  verticalAlign,
}: {
  events: Event[];
  locale: string;
  openLabel: string;
  onClose: () => void;
  verticalAlign: "top" | "bottom";
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        "absolute left-1/2 z-50 flex w-max -translate-x-1/2 flex-col items-center drop-shadow-2xl",
        verticalAlign === "bottom" ? "bottom-full mb-2" : "top-full mt-2"
      )}
    >
      {verticalAlign === "top" && (
        <div className="absolute top-[-9.5px] h-0 w-0 border-x-[10px] border-b-[10px] border-x-transparent border-b-border">
          <div className="absolute -left-[9px] top-[1px] h-0 w-0 border-x-[9px] border-b-[9px] border-x-transparent border-b-background" />
        </div>
      )}
      <div className="relative rounded-xl border bg-background p-1.5 shadow-lg">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className="absolute right-3 top-3 z-10 flex size-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
        <EventInfoContent events={events} locale={locale} openLabel={openLabel} />
      </div>
      {verticalAlign === "bottom" && (
        <div className="absolute bottom-[-9.5px] h-0 w-0 border-x-[10px] border-t-[10px] border-x-transparent border-t-border">
          <div className="absolute -left-[9px] bottom-[1px] h-0 w-0 border-x-[9px] border-t-[9px] border-x-transparent border-t-background" />
        </div>
      )}
    </div>
  );
}

function EventInfoContent({
  events,
  locale,
  openLabel,
}: {
  events: Event[];
  locale: string;
  openLabel: string;
}) {
  return (
    <div className="flex max-h-85 w-64 flex-col gap-4 overflow-x-hidden overflow-y-auto p-1 text-left text-sm text-popover-foreground scrollbar-thin">
      {events.map((event) => {
        const href = eventListHref(event);
        const imageUrl = getEventImageUrl(event.image);
        return (
          <div key={event.id} className="group flex flex-col gap-2.5 border-b pb-4 last:border-0 last:pb-1">
            <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-md bg-muted">
              <img
                src={imageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col gap-1.5 px-0.5">
              <h3 className="line-clamp-2 font-semibold leading-tight" title={event.title}>
                {event.title}
              </h3>
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <div className="flex items-start gap-1.5">
                  <Calendar className="mt-0.5 size-3.5 shrink-0" />
                  <span className="line-clamp-1">{formatFullDate(event.startDate, locale)}</span>
                </div>
                {event.startTime && (
                  <div className="flex items-start gap-1.5">
                    <Clock className="mt-0.5 size-3.5 shrink-0" />
                    <span className="line-clamp-1">
                      {event.startTime.slice(0, 5)} {event.endTime ? `— ${event.endTime.slice(0, 5)}` : ""}
                    </span>
                  </div>
                )}
                {event.place && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    <span className="line-clamp-1">{event.place}</span>
                  </div>
                )}
              </div>
            </div>
            {href && (
              <div className="pt-0.5 px-0.5">
                <Link
                  href={href}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  {openLabel}
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function UnmappedEventsList({
  events,
  locale,
}: {
  events: Event[];
  locale: string;
}) {
  const t = useTranslations("HomePage");

  return (
    <section className="max-h-[30%] shrink-0 overflow-auto border-t pt-2">
      <h2 className="text-muted-foreground mb-2 text-sm font-medium">
        {t("eventsWithoutLocation", { count: events.length })}
      </h2>
      <ul className="flex flex-col gap-1.5">
        {events.map((event) => {
          const href = eventListHref(event);
          const date = formatFullDate(event.startDate, locale);
          return (
            <li key={event.id} className="text-sm">
              {href ? (
                <Link href={href} className="hover:text-primary">
                  <span className="font-medium">{event.title}</span>
                  <span className="text-muted-foreground"> — {date}</span>
                </Link>
              ) : (
                <>
                  <span className="font-medium">{event.title}</span>
                  <span className="text-muted-foreground"> — {date}</span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EventsMapFromLoader(props: Props) {
  const { isLoaded, loadError } = useGoogleMapsLoader();
  return (
    <EventsMapCanvas isLoaded={isLoaded} loadError={loadError} {...props} />
  );
}

export function EventsMapView(props: Props) {
  return (
    <GoogleMapsProvider>
      <EventsMapFromLoader {...props} />
    </GoogleMapsProvider>
  );
}
