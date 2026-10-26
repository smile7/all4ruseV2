import { NextResponse } from "next/server";

import { hostsApi } from "~/lib/api";
import { requireAdmin } from "~/lib/auth/admin-guard";
import { buildHostFields, revalidateHosts } from "~/lib/hosts/payload";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";
import { hostApiSchema } from "~/types";

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  const parsed = hostApiSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const values = parsed.data;
  const slug = values.slug.toLowerCase();
  const admin = createSupabaseAdminClient();

  if (!(await hostsApi.isSlugAvailable(admin, slug))) {
    return NextResponse.json({ error: "slug_taken" }, { status: 409 });
  }

  try {
    const host = await hostsApi.createHost(admin, {
      ...buildHostFields(values),
      slug,
    });
    revalidateHosts([host.slug]);
    return NextResponse.json({ host }, { status: 201 });
  } catch (error) {
    // Lost a race with another create on the same slug.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json({ error: "slug_taken" }, { status: 409 });
    }
    console.error("[api/hosts] create failed:", error);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
}
