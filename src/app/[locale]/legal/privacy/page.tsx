import type { Metadata } from "next";

import { Typography } from "~/components/layout";
import { ObfuscatedEmail } from "~/components/ui/obfuscated-email";

export const metadata: Metadata = {
  title: "Политика за поверителност",
  description:
    "Политика за поверителност и защита на личните данни (GDPR) на All4Ruse — информационна платформа за събития в Русе.",
};

export default function PrivacyPage() {
  return (
    <article
      lang="bg"
      className="prose prose-slate dark:prose-invert prose-headings:text-balance prose-p:text-pretty prose-ul:list-disc prose-ul:pl-6 prose-a:text-primary max-w-none"
    >
      <Typography.H1>
        ПОЛИТИКА ЗА ПОВЕРИТЕЛНОСТ И ЗАЩИТА НА ЛИЧНИТЕ ДАННИ (GDPR)
      </Typography.H1>
      <Typography.P>
        <strong>Последна актуализация: Юли 2026 г.</strong>
      </Typography.P>
      <Typography.P>
        All4Ruse зачита Вашата поверителност и гарантира защитата на личните Ви
        данни в пълно съответствие с Регламент (ЕС) 2016/679 (Общ регламент
        относно защитата на данните — GDPR) и Закона за защита на личните данни
        (ЗЗЛД).
      </Typography.P>

      <Typography.H3>1. АДМИНИСТРАТОР НА ЛИЧНИ ДАННИ</Typography.H3>
      <Typography.P>
        Администратор на личните данни, събирани чрез платформата, е:
        <br />
        <strong>ЕС ТИ ЕС 2017 ЕООД</strong>, ЕИК: 204412131
        <br />
        Електронен адрес:{" "}
        <a
          href="mailto:silvena.miteva.007@gmail.com"
          className="text-primary text-base font-medium underline"
          aria-label="Имейл за контакт: silvena.miteva.007 at gmail dot com"
        >
          <ObfuscatedEmail email="silvena.miteva.007@gmail.com" />
        </a>
        <br />
        Телефон: +359 883 472 597
      </Typography.P>

      <Typography.H3>
        2. КАТЕГОРИИ ЛИЧНИ ДАННИ, КОИТО СЪБИРАМЕ, И ЦЕЛИ НА ОБРАБОТКАТА
      </Typography.H3>
      <Typography.P>
        Ние събираме и обработваме само минимално необходимия обем данни за
        осигуряване на функционалността на уебсайта:
      </Typography.P>
      <Typography.P>
        <strong>2.1. Данни за регистрация и профил (Задължителни):</strong>{" "}
        Имейл адрес, име на профила и профилна снимка (ако се вписвате чрез
        Facebook или Google login).
      </Typography.P>
      <Typography.P>
        Цел: Създаване, поддръжка и администриране на Вашия профил на Домакин
        или Посетител, както и идентификацията Ви в системата.
      </Typography.P>
      <Typography.P>
        <strong>2.2. Доброволно предоставени данни:</strong> Данни като текущо
        местоположение (локация), специфични телефони или имейли за фактуриране
        не се събират автоматично. Ние обработваме тези данни единствено и само
        ако Вие изрично, съзнателно и по свое желание изберете да ги попълните в
        профила си или в описанието на Вашите събития.
      </Typography.P>
      <Typography.P>
        <strong>2.3. Публично потребителско съдържание:</strong> Всяка лична
        информация (имена, телефони, профили), която съзнателно изпишете в
        публичното описание на едно събитие, става достъпна за трети лица в
        интернет. Препоръчваме да не публикувате чувствителни лични данни в
        полетата за описание.
      </Typography.P>
      <Typography.P>
        <strong>2.4. Технически и аналитични данни:</strong> IP адрес, тип
        браузър, операционна система, история на посетените страници в сайта и
        време на престой.
      </Typography.P>
      <Typography.P>
        Цел: Осигуряване на киберсигурност на платформата и анализ на
        потребителския трафик с цел оптимизация.
      </Typography.P>

      <Typography.H3>3. ПРАВНО ОСНОВАНИЕ ЗА ОБРАБОТВАНЕТО</Typography.H3>
      <Typography.P>
        Ние обработваме Вашите данни на следните основания:
      </Typography.P>
      <ul className="not-prose mb-6 list-disc pl-6 [li]:mt-1">
        <li>
          <strong>Изпълнение на договор</strong> (Чл. 6, ал. 1, б. „б" от
          GDPR): За предоставяне на услугите и поддържане на профила Ви съгласно
          Общите условия.
        </li>
        <li>
          <strong>Изрично съгласие</strong> (Чл. 6, ал. 1, б. „а" от GDPR):
          При регистрация и вход чрез външни доставчици (Google, Facebook) или
          при доброволно попълване на незадължителни данни.
        </li>
        <li>
          <strong>Легитимен интерес</strong> (Чл. 6, ал. 1, б. „ф" от GDPR):
          За защита на сайта от хакерски атаки и за статистически анализи на
          трафика.
        </li>
      </ul>

      <Typography.H3>
        4. ПОЛУЧАТЕЛИ НА ДАННИТЕ И ИНСТРУМЕНТИ НА ТРЕТИ СТРАНИ
      </Typography.H3>
      <Typography.P>
        За целите на поддръжката и анализа на All4Ruse, ние споделяме данни със
        следните сертифицирани доставчици на услуги:
      </Typography.P>
      <ul className="not-prose mb-6 list-disc pl-6 [li]:mt-1">
        <li>
          <strong>Vercel:</strong> Платформата се хоства на инфраструктурата на
          Vercel, като се използват и вградените инструменти на Vercel Analytics
          за следене на производителността на кода.
        </li>
        <li>
          <strong>Google Analytics:</strong> Използва се за събиране на
          деперсонализирана и анонимна статистика за посещаемостта на уебсайта.
        </li>
        <li>
          <strong>Supabase:</strong> Нашата сигурна облачна база данни, където
          се съхраняват криптираните потребителски профили, текстове и линкове
          към изображения.
        </li>
        <li>
          <strong>Facebook &amp; Google OAuth:</strong> Външни услуги за
          автентификация, които потвърждават Вашата самоличност, без да ни
          предоставят достъп до Вашите лични пароли в тези социални мрежи.
        </li>
      </ul>

      <Typography.H3>5. СРОК НА СЪХРАНЕНИЕ НА ДАННИТЕ</Typography.H3>
      <Typography.P>
        Личните данни, свързани с Вашия профил, се съхраняват за целия период,
        в който профилът Ви е активен. Вие имате възможност да изтриете профила
        си по всяко време. При изтриване на профила, личните Ви данни се
        заличават перманентно от нашите активни бази данни в Supabase в рамките
        на 30 дни.
      </Typography.P>

      <Typography.H3>6. ВАШИТЕ ПРАВА СЪГЛАСНО GDPR</Typography.H3>
      <Typography.P>
        Като субект на данните, Вие разполагате със следните неотменими права:
      </Typography.P>
      <ul className="not-prose mb-6 list-disc pl-6 [li]:mt-1">
        <li>Право на достъп до личните Ви данни.</li>
        <li>Право на коригиране при неточност на данните.</li>
        <li>
          Право на изтриване („Право да бъдете забравен") – чрез изтриване на
          профила или искане по имейл.
        </li>
        <li>Право на ограничаване на обработването.</li>
        <li>Право на преносимост на данните.</li>
        <li>
          Право на възражение срещу обработването на база легитимен интерес.
        </li>
        <li>
          Право на оттегляне на съгласието по всяко време (без това да засяга
          законосъобразността на обработването преди оттеглянето).
        </li>
      </ul>
      <Typography.P>
        За да упражните което и да е от тези права, можете да се свържете с нас
        на имейл:{" "}
        <a
          href="mailto:silvena.miteva.007@gmail.com"
          className="text-primary text-base font-medium underline"
          aria-label="Имейл за контакт: silvena.miteva.007 at gmail dot com"
        >
          <ObfuscatedEmail email="silvena.miteva.007@gmail.com" />
        </a>
        .
      </Typography.P>

      <Typography.H3>7. НАДЗОРЕН ОРГАН</Typography.H3>
      <Typography.P>
        Ако смятате, че Вашите права по отношение на защитата на данните са
        нарушени, имате право да подадете жалба до националния надзорен орган:
      </Typography.P>
      <Typography.P>
        <strong>Комисия за защита на личните данни (КЗЛД)</strong>
        <br />
        Адрес: гр. София 1592, бул. „Проф. Цветан Лазаров" № 2
        <br />
        Имейл:{" "}
        <a
          href="mailto:kzld@cpdp.bg"
          className="text-primary font-medium underline"
          aria-label="Имейл на КЗЛД: kzld at cpdp dot bg"
        >
          <ObfuscatedEmail email="kzld@cpdp.bg" />
        </a>{" "}
        | Уебсайт:{" "}
        <a
          href="https://www.cpdp.bg"
          target="_blank"
          rel="noopener noreferrer"
        >
          www.cpdp.bg
        </a>
      </Typography.P>
      <Typography.P>
        <strong>Дата на последна актуализация: Юли 2026 г.</strong>
      </Typography.P>
    </article>
  );
}
