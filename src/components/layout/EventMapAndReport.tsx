import { getTranslations } from "next-intl/server";

import { EventReportAction } from "~/components/EventUserActions";

type Props = {
  locale: string;
  mapsEmbedUrl: string | null;
  eventId: number;
  createdBy: string | null;
  mapHeight?: number;
  mapRounded?: "xl" | "lg";
};

export async function EventMapAndReport({
  locale,
  mapsEmbedUrl,
  eventId,
  createdBy,
  mapHeight = 180,
  mapRounded = "xl",
}: Props) {
  const t = await getTranslations({ locale, namespace: "SingleEvent" });
  const mapRoundedClass = mapRounded === "lg" ? "rounded-lg" : "rounded-xl";

  return (
    <>
      {mapsEmbedUrl && (
        <div className={`overflow-hidden border ${mapRoundedClass}`}>
          <iframe
            src={mapsEmbedUrl}
            title={t("place")}
            width="100%"
            height={mapHeight}
            className="block"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
      <EventReportAction eventId={eventId} createdBy={createdBy} />
    </>
  );
}
