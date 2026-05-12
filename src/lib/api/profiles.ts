import type { SupabaseClient } from "@supabase/supabase-js";

import type { Profile, UpdateProfileInput } from "~/types";
import type { Database } from "~/types/database";

type Client = SupabaseClient<Database>;

export type ProfileUpdatePayload = UpdateProfileInput & { avatar_url?: string | null };

export const profilesApi = {
  async getProfile(client: Client, userId: string) {
    return client.from("profiles").select("*").eq("id", userId).single();
  },

  async updateProfile(client: Client, userId: string, values: ProfileUpdatePayload) {
    return client
      .from("profiles")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .single<Profile>();
  },
};
