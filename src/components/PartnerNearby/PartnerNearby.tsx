import Image from "next/image";

import { Coffee, Footprints } from "lucide-react";

import { Separator } from "~/components/ui/separator";
import { distanceKm } from "~/lib/geocode/ruse";

import {
  NEARBY_PARTNER,
  PARTNER_COPY,
  PARTNER_MAP_TYPE,
  PARTNER_MAP_ZOOM,
  PARTNER_ONLY_EVENT_SLUGS,
  PARTNER_RADIUS_KM,
  walkingMinutes,
} from "./partner-config";

type PartnerNearbyProps = {
  eventSlug: string | null;
  eventLat: number | null;
  eventLng: number | null;
  eventPlace: string;
  mapsApiKey?: string;
};

export function PartnerNearby({
  eventSlug,
  eventLat,
  eventLng,
  eventPlace,
  mapsApiKey,
}: PartnerNearbyProps) {
  if (
    PARTNER_ONLY_EVENT_SLUGS.length > 0 &&
    (eventSlug == null || !PARTNER_ONLY_EVENT_SLUGS.includes(eventSlug))
  ) {
    return null;
  }

  if (eventLat == null || eventLng == null) return null;

  const km = distanceKm(
    eventLat,
    eventLng,
    NEARBY_PARTNER.lat,
    NEARBY_PARTNER.lng,
  );
  if (km > PARTNER_RADIUS_KM) return null;

  const mapUrl = mapsApiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${NEARBY_PARTNER.lat},${NEARBY_PARTNER.lng}&zoom=${PARTNER_MAP_ZOOM}&maptype=${PARTNER_MAP_TYPE}`
    : null;

  return (
    <section
      aria-label={PARTNER_COPY.heading}
      className="bg-card overflow-hidden rounded-xl border"
    >
      <div className="flex items-start gap-2 px-4 pt-4">
        <Coffee className="text-primary mt-0.5 size-4 shrink-0" />
        <h3 className="text-sm leading-snug font-medium sm:text-base">
          {PARTNER_COPY.heading}
        </h3>
      </div>

      {/* Row 1 — photo left, map right, each half the row. */}
      <div className="flex gap-3 px-4 pt-3 sm:gap-4">
        <div className="bg-muted relative h-56 w-1/2 overflow-hidden rounded-lg md:h-72">
          {NEARBY_PARTNER.image ? (
            <Image
              src={NEARBY_PARTNER.image}
              alt={NEARBY_PARTNER.imageAlt}
              fill
              sizes="(max-width: 768px) 50vw, 340px"
              className="object-cover object-top"
            />
          ) : (
            <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-1">
              <Coffee className="size-6" />
              <span className="px-2 text-center text-[11px] leading-tight">
                {PARTNER_COPY.photoPending}
              </span>
            </div>
          )}
        </div>

        {mapUrl && (
          <div className="h-56 w-1/2 overflow-hidden rounded-lg border md:h-72">
            <iframe
              src={mapUrl}
              title={NEARBY_PARTNER.name}
              width="100%"
              height="100%"
              className="block size-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
      </div>

      {/* Row 2 — venue details. */}
      <div className="flex flex-col gap-1 px-4 pt-3 pb-3">
        <p className="font-semibold sm:text-lg">{NEARBY_PARTNER.name}</p>
        {NEARBY_PARTNER.address && (
          <p className="text-muted-foreground text-xs">
            {NEARBY_PARTNER.address}
          </p>
        )}
        <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
          <Footprints className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {PARTNER_COPY.walkingFrom(walkingMinutes(km), eventPlace)}
          </span>
        </p>
      </div>

      <Separator />

      <div className="px-4 py-2.5">
        <p className="text-xs font-medium">{PARTNER_COPY.support}</p>
      </div>
    </section>
  );
}
