"use client";

import { useTransition } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { type Locale, LOCALES } from "~/constants";
import { usePathname, useRouter } from "~/i18n/navigation";

const FLAG_FILE: Record<Locale, string> = {
  bg: "bg.svg",
  en: "en.svg",
  ua: "ua.svg",
  ro: "ro.svg",
};

const LOCALE_LABEL: Record<Locale, string> = {
  bg: "Български",
  en: "English",
  ua: "Українська",
  ro: "Română",
};

type Props = {
  variant?: "ghost" | "outline";
};

export function LocaleSwitcher({ variant = "ghost" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  const currentLocale = (params.locale as Locale) ?? "bg";

  function switchLocale(locale: Locale) {
    startTransition(() => {
      router.replace(pathname, { locale });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isPending}>
        <Button
          type="button"
          variant={variant}
          size="icon"
          className="size-9"
          aria-label="Change language"
        >
          <Image
            src={`/flags/${FLAG_FILE[currentLocale]}`}
            alt={LOCALE_LABEL[currentLocale]}
            width={20}
            height={20}
            className="rounded-sm object-cover"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {LOCALES.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => switchLocale(locale)}
            className="gap-2.5"
            aria-current={locale === currentLocale ? "true" : undefined}
          >
            <Image
              src={`/flags/${FLAG_FILE[locale]}`}
              alt=""
              width={20}
              height={20}
              className="rounded-sm object-cover"
            />
            <span className={locale === currentLocale ? "font-semibold" : ""}>
              {LOCALE_LABEL[locale]}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
