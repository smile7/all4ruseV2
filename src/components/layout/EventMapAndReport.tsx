import { getTranslations } from "next-intl/server";

import { ReportEventButton } from "~/components/ReportEvent/ReportEventButton";

type Props = {
  locale: string;
  mapsEmbedUrl: string | null;
  eventId: number;
  showReportButton: boolean;
  alreadyReported: boolean;
  mapHeight?: number;
  mapRounded?: "xl" | "lg";
};

export async function EventMapAndReport({
  locale,
  mapsEmbedUrl,
  eventId,
  showReportButton,
  alreadyReported,
  mapHeight = 180,
  mapRounded = "xl",
}: Props) {
  if (!mapsEmbedUrl && !showReportButton) {
    return null;
  }

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
      {showReportButton && (
        <ReportEventButton eventId={eventId} alreadyReported={alreadyReported} />
      )}
    </>
  );
}
