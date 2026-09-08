import type { SupabaseClient } from "@supabase/supabase-js";

import type { Locale } from "~/constants";
import type { Database, Tables } from "~/types/database";

type Client = SupabaseClient<Database>;

export type AdvertiseInquiry = Tables<"advertise_inquiries">;

export type AdvertiseInquiryInsert = {
  email: string;
  name: string;
  businessName: string;
  message: string;
  locale?: Locale;
};

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_PER_EMAIL = 3;

export class AdvertiseInquiryRateLimitError extends Error {
  constructor() {
    super("advertise_inquiry_rate_limited");
    this.name = "AdvertiseInquiryRateLimitError";
  }
}

async function countRecentByEmail(
  client: Client,
  email: string,
): Promise<number> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count, error } = await client
    .from("advertise_inquiries")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", since);

  if (error) throw error;
  return count ?? 0;
}

async function createAdvertiseInquiry(
  client: Client,
  input: AdvertiseInquiryInsert,
): Promise<AdvertiseInquiry> {
  const email = input.email.trim().toLowerCase();
  const recent = await countRecentByEmail(client, email);
  if (recent >= RATE_LIMIT_PER_EMAIL) {
    throw new AdvertiseInquiryRateLimitError();
  }

  const { data, error } = await client
    .from("advertise_inquiries")
    .insert({
      email,
      name: input.name,
      business_name: input.businessName,
      message: input.message,
      locale: input.locale ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export const advertiseInquiriesApi = {
  createAdvertiseInquiry,
};
