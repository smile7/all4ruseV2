import { NextResponse } from "next/server";

import { z } from "zod";

import { placeAutocomplete } from "~/lib/geocode/google";
import {
  enforceGeocodeQuota,
  requireGeocodeUser,
} from "~/lib/geocode/rate-limit";

const querySchema = z.object({
  q: z.string().trim().max(200),
  sessionToken: z.string().trim().min(1).max(36).optional(),
});

export async function GET(request: Request) {
  const auth = await requireGeocodeUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: searchParams.get("q") ?? "",
    sessionToken: searchParams.get("sessionToken") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const quota = await enforceGeocodeQuota(auth.userId);
  if (quota) return quota;

  const suggestions = await placeAutocomplete(
    parsed.data.q,
    parsed.data.sessionToken,
  );
  return NextResponse.json({ suggestions });
}
