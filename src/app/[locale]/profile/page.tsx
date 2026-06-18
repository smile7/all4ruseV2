import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { Typography } from "~/components/layout/Typography";
import { eventsApi, profilesApi } from "~/lib/api";
import { createSupabaseServerClient } from "~/lib/supabase/server";

import { ProfileForm } from "./ProfileForm";

/**
 * Derive a valid username from an email address.
 * e.g. "silvena.miteva@gmail.com" → "silvena-miteva"
 */
function deriveUsername(email: string): string {
  const prefix = email.split("@")[0] ?? email;
  const cleaned = prefix
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // replace non-alphanum runs with dash
    .replace(/^-+|-+$/g, "")     // trim leading/trailing dashes
    .slice(0, 30);
  return cleaned.length >= 3 ? cleaned : cleaned.padEnd(3, "0");
}

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/auth/login`);
  }

  const [{ data: rawProfile }, myEvents] = await Promise.all([
    profilesApi.getProfile(supabase, user.id),
    eventsApi.getMyEvents(supabase, user.id),
  ]);
  const hasCreatedEvents = (myEvents?.length ?? 0) > 0;

  // ── Fix invalid username on first profile visit ────────────────────────────
  // Some DB triggers set username to the full email address. Detect and fix it.
  let profile = rawProfile ?? null;
  const usernameIsInvalid =
    !profile?.username || profile.username.includes("@");

  if (usernameIsInvalid && user.email) {
    const { data: updated } = await supabase
      .from("profiles")
      .update({ username: deriveUsername(user.email) })
      .eq("id", user.id)
      .select()
      .single();
    if (updated) profile = updated;
  }

  const t = await getTranslations("Profile");

  // An OAuth-only user (Google/Facebook) has no 'email' identity and cannot
  // set a password via the normal flow.
  const hasEmailAuth =
    user.identities?.some((id) => id.provider === "email") ?? false;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <div className="mb-8">
        <Typography.H1 className="tracking-tight">{t("accountSettings")}</Typography.H1>
      </div>
      <ProfileForm
        key={`${user.id}:${profile?.updated_at ?? "none"}:${profile?.avatar_url ?? ""}`}
        profile={profile ?? null}
        userEmail={user.email ?? ""}
        userId={user.id}
        hasEmailAuth={hasEmailAuth}
        hasCreatedEvents={hasCreatedEvents}
      />
    </div>
  );
}
