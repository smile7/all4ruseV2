import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { HostAdminList } from "~/components/Hosts";
import { Typography } from "~/components/layout";
import { hostsApi } from "~/lib/api";
import { createSupabaseServerClient } from "~/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { robots: { index: false, follow: false } };
}

export default async function AdminHostsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // notFound() rather than redirect(): a non-admin should not learn the route exists.
  const adminUserId = process.env.ADMIN_USER_ID;
  if (!user || !adminUserId || user.id !== adminUserId) notFound();

  const [hosts, t] = await Promise.all([
    hostsApi.listHosts(supabase),
    getTranslations("Hosts"),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <Typography.H1 className="mb-2 tracking-tight">
        {t("adminTitle")}
      </Typography.H1>
      <p className="text-muted-foreground mb-8">{t("adminDescription")}</p>
      <HostAdminList initialHosts={hosts} />
    </div>
  );
}
