import { Card, CardContent } from "~/components/ui/card";
import { extractYoutubeVideoId, youtubeEmbedSrc } from "~/lib/youtube-url";

type Props = {
  youtubeUrl: string;
  title: string;
};

export function EventYoutubeEmbed({ youtubeUrl, title }: Props) {
  const videoId = extractYoutubeVideoId(youtubeUrl);
  if (!videoId) return null;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="aspect-video w-full overflow-hidden rounded-lg">
          <iframe
            src={youtubeEmbedSrc(videoId)}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="h-full w-full border-0"
            loading="lazy"
          />
        </div>
      </CardContent>
    </Card>
  );
}
