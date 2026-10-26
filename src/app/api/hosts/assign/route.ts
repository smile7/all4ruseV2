import { NextResponse } from "next/server";

import { hostsApi } from "~/lib/api";
import { requireAdmin } from "~/lib/auth/admin-guard";
import { notifyHostsIndexNow, revalidateHosts } from "~/lib/hosts/payload";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";
import { assignEventHostSchema } from "~/types";

/**
 * Sets events.host_id. Event rows themselves are saved from the browser, but
 * host_id is trigger-protected against user sessions, so it is written here.
 * The caller revalidates the event pages afterwards (notifyEventIndexed).
 */
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  const parsed = assignEventHostSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 422 });
  }

  const { eventIds, hostId } = parsed.data;
  const admin = createSupabaseAdminClient();

  try {
    const host = hostId ? await hostsApi.getHostById(admin, hostId) : null;
    if (hostId && !host) {
      return NextResponse.json({ error: "host_not_found" }, { status: 404 });
    }

    const { previousHostIds } = await hostsApi.assignEventsHost(
      admin,
      eventIds,
      hostId,
    );

    const previousHosts = await Promise.all(
      previousHostIds.map((id) => hostsApi.getHostById(admin, id)),
    );
    const affectedSlugs = [host, ...previousHosts]
      .filter((h) => h !== null)
      .map((h) => h.slug);
    revalidateHosts(affectedSlugs);
    await notifyHostsIndexNow(affectedSlugs);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/hosts/assign] failed:", error);
    return NextResponse.json({ error: "assign_failed" }, { status: 500 });
  }
}
