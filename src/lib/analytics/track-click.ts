import type { TrackedEventKey } from "./tracked-events";

/**
 * Fire-and-forget click ping. Uses keepalive so the request can outlive
 * a navigation (advertise CTAs, hash jumps).
 */
export function trackClick(eventKey: TrackedEventKey): void {
  const body = JSON.stringify({ eventKey });

  void fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Tracking must never surface to the user.
  });
}
