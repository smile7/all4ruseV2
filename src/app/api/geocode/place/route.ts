import { NextResponse } from "next/server";

import { z } from "zod";

import { placeDetails } from "~/lib/geocode/google";
import {
  enforceGeocodeQuota,
  requireGeocodeUser,
} from "~/lib/geocode/rate-limit";

const querySchema = z.object({
  id: z.string().trim().min(1).max(256),
  sessionToken: z.string().trim().min(1).max(36).optional(),
});

export async function GET(request: Request) {
  const auth = await requireGeocodeUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    id: searchParams.get("id") ?? "",
    sessionToken: searchParams.get("sessionToken") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const quota = await enforceGeocodeQuota(auth.userId);
  if (quota) return quota;

  const result = await placeDetails(parsed.data.id, parsed.data.sessionToken);
  return NextResponse.json(result);
}
