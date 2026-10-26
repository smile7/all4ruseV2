import { NextResponse } from "next/server";

import { z } from "zod";

import { hostsApi } from "~/lib/api";
import { requireAdmin } from "~/lib/auth/admin-guard";
import {
  buildHostFields,
  notifyHostsIndexNow,
  revalidateHosts,
} from "~/lib/hosts/payload";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";
import { hostApiSchema } from "~/types";

type Params = { params: Promise<{ id: string }> };

const idSchema = z.uuid();

export async function PATCH(request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  const id = idSchema.safeParse((await params).id);
  if (!id.success) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const parsed = hostApiSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const admin = createSupabaseAdminClient();
  const existing = await hostsApi.getHostById(admin, id.data);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const host = await hostsApi.updateHost(
      admin,
      id.data,
      buildHostFields(parsed.data),
    );
    revalidateHosts([host.slug]);
    await notifyHostsIndexNow([host.slug]);
    return NextResponse.json({ host });
  } catch (error) {
    console.error("[api/hosts] update failed:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  const id = idSchema.safeParse((await params).id);
  if (!id.success) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const existing = await hostsApi.getHostById(admin, id.data);
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    // events.host_id is ON DELETE SET NULL, so linked events simply fall back
    // to having no host page.
    await hostsApi.deleteHost(admin, id.data);
    revalidateHosts([existing.slug], { eventPages: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/hosts] delete failed:", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
