export function localizedEventTagTitle(
  title: string | null | undefined,
  eventTags: Record<string, string> | undefined,
): string {
  const raw = title?.trim() ?? "";
  if (!raw) return "";
  const key = raw.toUpperCase();
  return eventTags?.[key] ?? raw;
}
