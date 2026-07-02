import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { Typography } from "~/components/layout/Typography";
import { eventsApi, profilesApi } from "~/lib/api";
import { isUsernameInvalid } from "~/lib/profile-username";
import { createSupabaseServerClient } from "~/lib/supabase/server";

import { ProfileForm } from "./ProfileForm";

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
  if (user.email && isUsernameInvalid(profile?.username)) {
    const fixed = await profilesApi.fixInvalidProfileUsername(
      supabase,
      user.id,
      user.email,
    );
    if (fixed) profile = fixed;
  }

  const t = await getTranslations("Profile");

  // An OAuth-only user (Google/Facebook) has no 'email' identity and cannot
  // set a password via the normal flow.
  const hasEmailAuth =
    user.identities?.some((id) => id.provider === "email") ?? false;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <div className="mb-8">
        <Typography.H1 className="tracking-tight">
          {t("accountSettings")}
        </Typography.H1>
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
