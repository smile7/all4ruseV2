import type { Metadata } from "next";

import { Typography } from "~/components/layout";
import { ObfuscatedEmail } from "~/components/ui/obfuscated-email";
import { Link } from "~/i18n/navigation";

export const metadata: Metadata = {
  title: "Политика за поверителност",
  description:
    "Политика за поверителност на all4ruse.com — GDPR, категории данни, цели на обработка и права на субектите.",
};

export default function PrivacyPage() {
  return (
    <article
      lang="bg"
      className="prose prose-slate dark:prose-invert prose-headings:text-balance prose-p:text-pretty prose-ul:list-disc prose-ul:pl-6 prose-a:text-primary max-w-none"
    >
      <Typography.H1>ПОЛИТИКА ЗА ПОВЕРИТЕЛНОСТ НА ALL4RUSE.COM</Typography.H1>
      <Typography.H3>1. Общи положения</Typography.H3>
      <Typography.P>
        1.1. Тази Политика за поверителност („Политиката“) описва как{" "}
        <strong>ЕС ТИ ЕС 2017 ЕООД</strong> (администратор на лични данни)
        обработва лични данни при използване на уебсайта all4ruse.com
        („Сайтът“).
      </Typography.P>
      <Typography.P>
        1.2. Обработката се извършва в пълно съответствие с:
      </Typography.P>
      <ul className="not-prose mb-6 list-disc pl-6 [li]:mt-1">
        <li>Регламент (ЕС) 2016/679 (GDPR);</li>
        <li>Закона за защита на личните данни (ЗЗЛД);</li>
        <li>Приложимото българско законодателство.</li>
      </ul>
      <Typography.P>
        1.3. Сайтът представлява информационна платформа за публични събития и
        не е комерсиален (без реклами, платени услуги или финансови транзакции).
      </Typography.P>
      <Typography.H3>2. Администратор на лични данни</Typography.H3>
      <Typography.P>
        <strong>ЕС ТИ ЕС 2017</strong> – Еднолично дружество с ограничена
        отговорност
        <br />
        ЕИК: 204412131
        <br />
        Седалище: гр. София 1408, р-н Триадица, ж.к. Стрелбище, бл. 88, вх. В,
        ап. 18
        <br />
        Управител: Силвена Здравкова Митева
        <br />
        Имейл за контакт по GDPR въпроси:{" "}
        <a
          href={`mailto:silvena.miteva.007@gmail.com`}
          className="text-primary text-base font-medium underline"
          aria-label="Имейл за контакт: silvena.miteva.007 at gmail dot com"
        >
          <ObfuscatedEmail email="silvena.miteva.007@gmail.com" />
        </a>
      </Typography.P>
      <Typography.H3>3. Категории на субектите на данни</Typography.H3>
      <Typography.P>Регистрирани потребители, които:</Typography.P>
      <ul className="not-prose mb-6 list-disc pl-6 [li]:mt-1">
        <li>създават потребителски профил в Сайта;</li>
        <li>подават събитие за публикуване;</li>
        <li>ползват функционалности на Сайта.</li>
      </ul>
      <Typography.P>Нерегистрирани посетители на Сайта.</Typography.P>
      <Typography.H3>4. Лични данни, които обработваме</Typography.H3>
      <Typography.P>4.1. Данни при регистрация на профил</Typography.P>
      <Typography.P>
        При създаване на профил обработваме следните лични данни:
      </Typography.P>
      <ul className="not-prose mb-6 list-disc pl-6 [li]:mt-1">
        <li>Име и фамилия;</li>
        <li>Имейл адрес;</li>
        <li>Потребителско име (незадължително);</li>
        <li>Уебсайт (незадължителен);</li>
        <li>
          Технически идентификатори (ID, време на създаване, статус на профила);
        </li>
        <li>Парола (криптирана).</li>
      </ul>
      <Typography.P>
        Всички тези данни се съхраняват в база данни, управлявана от Supabase.
      </Typography.P>
      <Typography.P>4.2. Данни при посещение на Сайта</Typography.P>
      <Typography.P>При всяко посещение могат да се обработват:</Typography.P>
      <ul className="not-prose mb-6 list-disc pl-6 [li]:mt-1">
        <li>IP адрес;</li>
        <li>Информация за браузъра и операционната система;</li>
        <li>Логове за достъп и сигурност;</li>
        <li>
          Cookie идентификатори (вижте{" "}
          <Link href="/legal/cookies" className="font-semibold underline">
            Политика за бисквитки
          </Link>
          );
        </li>
        <li>
          Обобщени аналитични данни чрез Google Analytics (при дадено съгласие).
        </li>
      </ul>
      <Typography.P>4.3. Данни от външни услуги</Typography.P>
      <Typography.P>
        Данни се обработват от следните доставчици на услуги (обработващи по
        GDPR):
      </Typography.P>
      <ul className="not-prose mb-6 list-disc pl-6 [li]:mt-1">
        <li>Vercel – хостинг услугата;</li>
        <li>Supabase – база данни и автентикация;</li>
        <li>Google Analytics – аналитичен инструмент (при съгласие);</li>
        <li>Евентуални други услуги, описани в раздел 7.</li>
      </ul>
      <Typography.P>4.4. Специални категории данни</Typography.P>
      <Typography.P>
        НЕ събираме специални категории данни (здраве, религия, политически
        убеждения, генетични данни и т.н.). При подаване на събитие потребителят
        сам решава каква информация да включи.
      </Typography.P>
      <Typography.H3>5. Цели и правни основания за обработване</Typography.H3>
      <Typography.P>5.1. Създаване и поддържане на профил</Typography.P>
      <Typography.P>
        Цел: осигуряване на функционалност за регистрация, управление на профил,
        подаване и администриране на събития.
        <br />
        Правно основание: изпълнение на договор (чл. 6, ал. 1, б. „б“ GDPR) –
        приемане на Общите условия.
      </Typography.P>
      <Typography.P>5.2. Техническо функциониране и сигурност</Typography.P>
      <Typography.P>
        Цел: осигуряване на правилно функциониране на Сайта, предотвратяване на
        злоупотреби, поддържане на логове за сигурност.
        <br />
        Правно основание: легитимен интерес на администратора (чл. 6, ал. 1, б.
        „е“ GDPR).
      </Typography.P>
      <Typography.P>5.3. Google Analytics и аналитична информация</Typography.P>
      <Typography.P>
        Цел: събиране на обобщена статистическа информация за посещенията,
        анализ на поведението на потребителите, подобряване на съдържанието и
        функционалността.
        <br />
        Правно основание: съгласие (чл. 6, ал. 1, б. „а“ GDPR) – аналитичните
        cookies се активират само след изрично съгласие през cookie банера.
      </Typography.P>
      <Typography.P>5.4. Публикуване на информация за събитие</Typography.P>
      <Typography.P>
        Цел: предоставяне на информация за публични събития в града.
        <br />
        Правно основание: съгласие (чл. 6, ал. 1, б. „а“ GDPR) – администраторът
        публикува събитие само след съгласие на организатора.
      </Typography.P>
      <Typography.P>5.5. Отговор на правни искания</Typography.P>
      <Typography.P>
        Цел: спазване на закона и правни задължения.
        <br />
        Правно основание: правно задължение (чл. 6, ал. 1, б. „в“ GDPR).
      </Typography.P>
      <Typography.H3>6. Срокове на съхранение на данните</Typography.H3>
      <Typography.P>6.1. Данни от активния профил</Typography.P>
      <Typography.P>
        Данните се съхраняват, докато профилът е активен. При изтриване на
        профил от потребителя или администратора данните се изтриват или
        анонимизират в срок до 30 дни, освен ако законът не изисква по-дълго
        съхранение.
      </Typography.P>
      <Typography.P>6.2. Логове за сигурност и достъп</Typography.P>
      <Typography.P>
        Съхраняват се за период до 6 месеца, освен ако не е необходимо по-дълго
        съхранение за защита на права или разследване на инциденти.
      </Typography.P>
      <Typography.P>6.3. Google Analytics данни</Typography.P>
      <Typography.P>
        Съхраняват се според настройките за data retention в Google Analytics
        (по подразбиране 14 месеца) в съответствие с политиките на Google.
      </Typography.P>
      <Typography.P>6.4. Технически бисквитки</Typography.P>
      <Typography.P>
        Съхраняват се докато са технически необходими (обикновено сесийни или до
        12 месеца за определени технически идентификатори).
      </Typography.P>
      <Typography.H3>7. Получатели на лични данни / Трети страни</Typography.H3>
      <Typography.P>7.1. Обработващи (външни доставчици)</Typography.P>
      <Typography.P>
        Следните лица имат достъп до вашите данни като обработващи по GDPR:
      </Typography.P>
      <ul className="not-prose mb-6 list-disc pl-6 [li]:mt-1">
        <li>Vercel (САЩ) – хостинг, физическо съхранение на данните;</li>
        <li>Supabase (САЩ) – база данни, управление на профилите;</li>
        <li>Google Analytics (САЩ) – аналитична услуга;</li>
        <li>Email услуга (при нужда от уведомления).</li>
      </ul>
      <Typography.P>
        Всички обработващи са обвързани с договори за обработка (DPA) в
        съответствие с GDPR.
      </Typography.P>
      <Typography.P>7.2. Компетентни органи</Typography.P>
      <Typography.P>
        При законно искане (съдебен акт, полицейско искане, запитване от КЗЛД и
        др.) данни могат да бъдат разкрити на публични органи.
      </Typography.P>
      <Typography.P>7.3. Организатори на събития</Typography.P>
      <Typography.P>
        Информацията, която подавате при регистрация, остава между вас и
        администратора. Администраторът не разкрива на организаторите контактни
        данни на посетителите, освен ако не дадете изрично съгласие.
      </Typography.P>
      <Typography.H3>8. Трансфер на данни извън ЕС</Typography.H3>
      <Typography.P>8.1. Трансфер в САЩ и трети държави</Typography.P>
      <Typography.P>
        При използване на Google Analytics, Vercel и Supabase е възможен
        трансфер на данни към САЩ или други трети държави.
      </Typography.P>
      <Typography.P>8.2. Защитни механизми</Typography.P>
      <Typography.P>Такъв трансфер се извършва на основание:</Typography.P>
      <ul className="not-prose mb-6 list-disc pl-6 [li]:mt-1">
        <li>Стандартни договорни клаузи (SCCs) по GDPR;</li>
        <li>Адекватни решения (където е приложимо);</li>
        <li>Механизми, предвидени в политиките на съответните доставчици.</li>
      </ul>
      <Typography.P>8.3. Отказ от аналитични данни</Typography.P>
      <Typography.P>
        Ако не желаете трансфер на данни към Google Analytics, можете да:
      </Typography.P>
      <ul className="not-prose mb-6 list-disc pl-6 [li]:mt-1">
        <li>откажете аналитични cookies през cookie банера;</li>
        <li>промените избора си по всяко време;</li>
        <li>инсталирате браузър add-on за отказ от Google Analytics.</li>
      </ul>
      <Typography.H3>9. Права на субектите на данни</Typography.H3>
      <Typography.P>
        Като субект на данни имате следните права по GDPR и ЗЗЛД:
      </Typography.P>
      <Typography.P>9.1. Право на информация и достъп</Typography.P>
      <Typography.P>
        Можете да искате достъп до вашите лични данни, които администраторът
        обработва.
      </Typography.P>
      <Typography.P>9.2. Право на коригиране</Typography.P>
      <Typography.P>
        Ако данните са неточни или непълни, можете да поискате тяхното
        коригиране.
      </Typography.P>
      <Typography.P>
        9.3. Право на изтриване („право да бъдете забравени“)
      </Typography.P>
      <Typography.P>
        Можете да поискате изтриване на вашите лични данни, като изтриете
        профила си от Сайта. Администраторът ще изтрие или анонимизира данните в
        разумен срок.
        <br />
        Има изключения, когато администраторът има законно основание да продължи
        съхранението.
      </Typography.P>
      <Typography.P>9.4. Право на ограничаване</Typography.P>
      <Typography.P>
        Можете да поискате ограничаване на обработката в определени случаи.
      </Typography.P>
      <Typography.P>9.5. Право на възражение</Typography.P>
      <Typography.P>
        Можете да възразите срещу обработване, основано на легитимен интерес.
      </Typography.P>
      <Typography.P>9.6. Право на преносимост на данните</Typography.P>
      <Typography.P>
        Можете да поискате вашите данни в машинночитаем формат и да ги
        прехвърлите на друг администратор, където е приложимо.
      </Typography.P>
      <Typography.P>9.7. Право да оттеглите съгласие</Typography.P>
      <Typography.P>
        Когато обработката се основава на съгласие (напр. Google Analytics),
        можете да оттеглите съгласието си по всяко време, без това да засяга
        законосъобразността на обработката преди оттеглянето.
      </Typography.P>
      <Typography.P>9.8. Право да подадете жалба</Typography.P>
      <Typography.P>
        Можете да подадете жалба до надзорния орган (виж раздел 10).
      </Typography.P>
      <Typography.P>
        <strong>За упражняване на правата си</strong>
        <br />
        За да упражните което и да е от горните права, моля свържете се с
        администратора на имейл:{" "}
        <a
          href={`mailto:silvena.miteva.007@gmail.com`}
          className="text-primary text-base font-medium underline"
          aria-label="Имейл за контакт: silvena.miteva.007 at gmail dot com"
        >
          <ObfuscatedEmail email="silvena.miteva.007@gmail.com" />
        </a>
        .
        <br />
        При получаване на искане администраторът ще отговори в разумен срок
        (обикновено до 30 дни).
      </Typography.P>
      <Typography.H3>10. Жалба до надзорния орган</Typography.H3>
      <Typography.P>10.1. Български надзорен орган</Typography.P>
      <Typography.P>
        Надзорен орган по защита на личните данни в България е:
      </Typography.P>
      <Typography.P>
        Комисия за защита на личните данни (КЗЛД)
        <br />
        Адрес: гр. София 1592, бул. „Проф. Цветан Лазаров“ № 2
        <br />
        Уебсайт:{" "}
        <a href="https://www.cpdp.bg" target="_blank" rel="noopener">
          https://www.cpdp.bg
        </a>
        <br />
        Телефон: +359 2 915 3420
        <br />
        Електронна поща:{" "}
        <a
          href={`mailto:kzld@cpdp.bg`}
          className="text-primary text-base font-medium underline"
          aria-label="Имейл на КЗЛД: kzld at cpdp dot bg"
        >
          <ObfuscatedEmail email="kzld@cpdp.bg" />
        </a>
      </Typography.P>
      <Typography.P>
        Имате право да подадете жалба до КЗЛД, ако смятате, че обработката на
        вашите лични данни нарушава приложимото законодателство.
      </Typography.P>
      <Typography.P>10.2. Други европейски органи</Typography.P>
      <Typography.P>
        Можете също да подадете жалба до надзорния орган в държавата членка на
        ЕС, в която обичайно пребивавате или работите.
      </Typography.P>
      <Typography.H3>11. Политика за бисквитки</Typography.H3>
      <Typography.P>
        За подробна информация относно бисквитките, които използваме, вижте
        нашата{" "}
        <Link href="/legal/cookies" className="font-semibold underline">
          Политика за бисквитки
        </Link>
        .
      </Typography.P>
      <Typography.H3>12. Свързани лица</Typography.H3>
      <Typography.P>
        При необходимост администраторът може да споделя обобщена
        (анонимизирана) информация с трети страни за статистически и научни
        цели, като тази информация не ви идентифицира лично.
      </Typography.P>
      <Typography.H3>13. Сигурност на данните</Typography.H3>
      <Typography.P>13.1. Технически и организационни мерки</Typography.P>
      <Typography.P>
        Администраторът прилага подходящи технически и организационни мерки за
        защита на личните данни от:
      </Typography.P>
      <ul className="not-prose mb-6 list-disc pl-6 [li]:mt-1">
        <li>неразрешен достъп;</li>
        <li>случайна или умишлена загуба;</li>
        <li>неправомерна обработка;</li>
        <li>унищожаване или повреда.</li>
      </ul>
      <Typography.P>13.2. Ограничена достъпност</Typography.P>
      <Typography.P>
        Достъп до личните данни имат само лица, за които това е необходимо за
        изпълнение на техните служебни задължения, при спазване на принципа
        „минимално необходим достъп“.
      </Typography.P>
      <Typography.P>13.3. Уязвимости и инциденти</Typography.P>
      <Typography.P>
        При установяване на инцидент или нарушение на сигурността
        администраторът ще уведоми засегнатите лица, когато това е законово
        изискуемо, и ще предприеме корективни мерки.
      </Typography.P>
      <Typography.H3>14. Промени в Политиката</Typography.H3>
      <Typography.P>14.1. Право на администратора</Typography.P>
      <Typography.P>
        Администраторът има право да актуализира тази Политика при промени в
        законодателството, в използваните услуги или в начина на обработване на
        личните данни.
      </Typography.P>
      <Typography.P>14.2. Уведомление</Typography.P>
      <Typography.P>
        При съществена промяна потребителите ще бъдат уведомени чрез съобщение
        на Сайта и/или по имейл, когато това е възможно.
      </Typography.P>
      <Typography.P>14.3. Приемане на промени</Typography.P>
      <Typography.P>
        Продължаването на ползване на Сайта след публикуване на изменена
        Политика означава приемане на новите правила.
      </Typography.P>
      <Typography.H3>15. Езикови версии</Typography.H3>
      <Typography.P>15.1. Официална версия</Typography.P>
      <Typography.P>
        Официалният и задължителен текст на Политиката е на български език.
      </Typography.P>
      <Typography.P>15.2. Приоритет при разминаване</Typography.P>
      <Typography.P>
        Ако съществува английски или друг превод, при разминаване между
        текстовете приоритет има българската версия.
      </Typography.P>
      <Typography.H3>16. Контакт</Typography.H3>
      <Typography.P>
        За въпроси относно обработката на вашите лични данни или за упражняване
        на правата си, моля свържете се с нас на:{" "}
        <a
          href={`mailto:silvena.miteva.007@gmail.com`}
          className="text-primary text-base font-medium underline"
          aria-label="Имейл за контакт: silvena.miteva.007 at gmail dot com"
        >
          <ObfuscatedEmail email="silvena.miteva.007@gmail.com" />
        </a>
        .
      </Typography.P>
      <Typography.P>
        <strong>Дата на последна актуализация: 26 януари 2026 г.</strong>
      </Typography.P>
    </article>
  );
}
