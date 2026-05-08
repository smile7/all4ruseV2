import type { Metadata } from "next";

import { Typography } from "~/components/layout";
import { Link } from "~/i18n/navigation";

export const metadata: Metadata = {
  title: "GDPR",
  description:
    "Информация за обработката на лични данни по GDPR на all4ruse.com — пълни правила в Политиката за поверителност.",
};

export default function GdprPage() {
  return (
    <article
      lang="bg"
      className="prose prose-slate max-w-none dark:prose-invert prose-headings:text-balance prose-p:text-pretty prose-a:text-primary"
    >
      <Typography.H1>Лични данни и GDPR</Typography.H1>
      <Typography.P>
        All4Ruse обработва лични данни в съответствие с Регламент (ЕС) 2016/679
        (GDPR) и българското законодателство. Пълното описание на категориите
        данни, целите и правните основания, сроковете, правата ви като субект
        на данни, трансферите извън ЕС и контактите е публикувано в нашата{" "}
        <Link href="/legal/privacy" className="font-semibold underline">
          Политика за поверителност
        </Link>
        .
      </Typography.P>
      <Typography.P>
        Ако желаете да упражните права по GDPR или имате въпроси, следвайте
        разделите „Права на субектите на данни“ и „Контакт“ в същата политика.
      </Typography.P>
    </article>
  );
}
