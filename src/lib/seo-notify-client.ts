/** Fire-and-forget: tell search engines a public event URL changed. */
export function notifyEventIndexed(slug: string | null | undefined) {
  const trimmed = slug?.trim();
  if (!trimmed) return;

  void fetch("/api/seo/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: trimmed }),
  });
}
