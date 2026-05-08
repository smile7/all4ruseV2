import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { profilesApi } from "~/lib/api";
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

  const { data: profile } = await profilesApi.getProfile(supabase, user.id);
  const t = await getTranslations("Profile");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t("account")}</h1>
      <ProfileForm
        profile={profile ?? null}
        userEmail={user.email ?? ""}
        userId={user.id}
      />
    </div>
  );
}
