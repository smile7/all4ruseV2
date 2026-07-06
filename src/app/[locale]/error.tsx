"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { AlertCircle } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Link } from "~/i18n/navigation";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: Props) {
  const t = useTranslations("ErrorPage");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="bg-destructive/10 flex size-20 items-center justify-center rounded-full">
        <AlertCircle className="text-destructive size-10" aria-hidden />
      </div>

      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-base">{t("description")}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>{t("retry")}</Button>
        <Button asChild variant="outline">
          <Link href="/">{t("home")}</Link>
        </Button>
      </div>
    </div>
  );
}
