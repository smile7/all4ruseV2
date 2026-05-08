import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { MailCheck } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SignupSuccessPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("Profile");
  const tHome = await getTranslations("HomePage");

  return (
    <div className="flex min-h-[calc(100svh-10rem)] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="items-center">
          <div className="bg-primary/10 mb-4 rounded-full p-3">
            <MailCheck className="text-primary size-8 text-center mx-auto" />
          </div>
          <CardTitle className="text-2xl">{t("thankYouForSigningUp")}</CardTitle>
          <CardDescription className="mt-1">{t("pleaseCheckEmail")}</CardDescription>
        </CardHeader>

        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/${locale}`}>{tHome("goHomePage")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
