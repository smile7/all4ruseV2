/** Service-role / server routes (create-event page, API guards). */
export function getEventBotUserId(): string {
  return process.env.EVENT_BOT_USER_ID?.trim() ?? "";
}

/** Client components (EventForm). */
export function getPublicEventBotUserId(): string {
  return process.env.NEXT_PUBLIC_EVENT_BOT_USER_ID?.trim() ?? "";
}

export function resolveEventBotUserId(): string {
  return getPublicEventBotUserId() || getEventBotUserId();
}

export function isEventBotUserId(userId: string | null | undefined): boolean {
  const botId = resolveEventBotUserId();
  return Boolean(botId && userId && userId === botId);
}

/**
 * Events created by the admin import account or the entry bot are not tied to
 * a real member profile for the „organizer“ link — use `host_id` instead.
 */
export function isOrganizerProxyUserId(
  userId: string | null | undefined,
  adminUserId: string,
): boolean {
  if (!userId) return false;
  if (adminUserId !== "" && userId === adminUserId) return true;
  return isEventBotUserId(userId);
}

/** Admin or the automated entry bot (events, hosts, articles). */
export function isAdminOrEventBotUserId(userId: string): boolean {
  const adminUserId = process.env.ADMIN_USER_ID?.trim() ?? "";
  if (adminUserId !== "" && userId === adminUserId) return true;
  return isEventBotUserId(userId);
}

export function canAssignEventHost(userId: string): boolean {
  return isAdminOrEventBotUserId(userId);
}

export function canManageArticles(userId: string): boolean {
  return isAdminOrEventBotUserId(userId);
}