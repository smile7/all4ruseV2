"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Pencil } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Link } from "~/i18n/navigation";
import { getSupabaseBrowserClient } from "~/lib/supabase/client";

type Props = {
  articleId: string;
};

/**
 * Shown only after mount, so ISR HTML never contains an admin control and
 * never hydrates with a different tree than the public page.
 */
export function ArticleEditButton({ articleId }: Props) {
  const t = useTranslations("MoreFromRuse.admin");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const adminUserId = process.env.NEXT_PUBLIC_ADMIN_USER_ID;
    if (!adminUserId) return;

    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }) => {
      setIsAdmin(data.user?.id === adminUserId);
    });
  }, []);

  if (!isAdmin) return null;

  return (
    <Button asChild variant="outline" size="sm">
      <Link href={`/create-article?editId=${articleId}`}>
        <Pencil />
        {t("edit")}
      </Link>
    </Button>
  );
}
