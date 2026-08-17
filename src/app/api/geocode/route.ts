import { NextResponse } from "next/server";

import { z } from "zod";

import { geocodeAddress } from "~/lib/geocode/google";
import {
  enforceGeocodeQuota,
  requireGeocodeUser,
} from "~/lib/geocode/rate-limit";

const bodySchema = z.object({
  address: z.string().optional(),
  place: z.string().nullable().optional(),
  town: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireGeocodeUser();
  if (!auth.ok) return auth.response;

  const json: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const quota = await enforceGeocodeQuota(auth.userId);
  if (quota) return quota;

  const result = await geocodeAddress(
    parsed.data.place,
    parsed.data.address,
    parsed.data.town,
  );
  return NextResponse.json(result);
}
