const YOUTUBE_VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;

/** Extracts a YouTube video ID from a URL or bare 11-character ID. */
export function extractYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (YOUTUBE_VIDEO_ID.test(trimmed)) return trimmed;

  try {
    const url = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    );
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0] ?? "";
      return YOUTUBE_VIDEO_ID.test(id) ? id : null;
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v") ?? "";
        return YOUTUBE_VIDEO_ID.test(id) ? id : null;
      }

      const embedMatch = url.pathname.match(/^\/embed\/([^/?]+)/);
      if (embedMatch?.[1] && YOUTUBE_VIDEO_ID.test(embedMatch[1])) {
        return embedMatch[1];
      }

      const shortsMatch = url.pathname.match(/^\/shorts\/([^/?]+)/);
      if (shortsMatch?.[1] && YOUTUBE_VIDEO_ID.test(shortsMatch[1])) {
        return shortsMatch[1];
      }
    }
  } catch {
    return null;
  }

  return null;
}

/** Privacy-enhanced embed URL for event detail iframes. */
export function youtubeEmbedSrc(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function isValidYoutubeUrl(input: string): boolean {
  return extractYoutubeVideoId(input) !== null;
}
