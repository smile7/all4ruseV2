import type { Metadata } from "next";

import { Typography } from "~/components/layout";
import { ObfuscatedEmail } from "~/components/ui/obfuscated-email";

export const metadata: Metadata = {
  title: "Политика за бисквитки",
  description:
    "Политика за бисквитки на all4ruse.com — необходими, аналитични и управление на съгласие.",
};

export default function CookiesPage() {
  return (
    <article
      lang="bg"
      className="prose prose-slate max-w-none dark:prose-invert prose-headings:text-balance prose-p:text-pretty prose-ul:list-disc prose-ul:pl-6 prose-a:text-primary"
    >
      <Typography.H1>
        ПОЛИТИКА ЗА БИСКВИТКИ НА УЕБСАЙТА ALL4RUSE.COM
      </Typography.H1>
      <br />
      <br />
      <Typography.H3>1. Какво представляват бисквитките</Typography.H3>
      <Typography.P>1.1. Определение</Typography.P>
      <Typography.P>
        Бисквитките („cookies“) са малки текстови файлове, които се записват в
        браузъра и устройството на потребителя при посещение на уебсайт.
      </Typography.P>

      <Typography.P>1.2. Функция</Typography.P>
      <Typography.P>Бисквитките позволяват сайтът да:</Typography.P>
      <ul className="list-disc list-inside ml-4">
        <li>разпознае устройството на потребителя;</li>
        <li>запомни определена информация;</li>
        <li>подобри потребителския опит;</li>
        <li>събира аналитична информация.</li>
      </ul>

      <Typography.P>1.3. Идентификация</Typography.P>
      <Typography.P>Всяка бисквитка съдържа:</Typography.P>
      <ul className="list-disc list-inside ml-4">
        <li>име на домейна, от който произхожда (all4ruse.com);</li>
        <li>време на създаване и изтичане (срок на валидност);</li>
        <li>уникален идентификатор;</li>
        <li>по желание – други метаданни.</li>
      </ul>

      <Typography.P>1.4. Не идентифицират лично</Typography.P>
      <Typography.P>
        Бисквитките сами по себе си не идентифицират физическо лице пряко, но в
        комбинация с други данни могат да представляват лични данни по смисъла
        на GDPR.
      </Typography.P>
      <br />
      <Typography.H3>2. Видове бисквитки, които използваме</Typography.H3>
      <Typography.P>
        На Сайта могат да се използват следните категории бисквитки:
      </Typography.P>

      <Typography.P>2.1. Строго необходими бисквитки</Typography.P>
      <Typography.P>
        <strong>Определение:</strong> бисквитки, които са технически необходими
        за функционирането на сайта.
      </Typography.P>
      <Typography.P>Примери:</Typography.P>
      <ul className="list-disc list-inside ml-4">
        <li>
          Бисквитка за запомняне на вашия избор в cookie банера
          (приемане/отказ);
        </li>
        <li>
          Бисквитка за поддържане на сесия при логин (технически идентификатор);
        </li>
        <li>Бисквитка за любими събития</li>
        <li>Бисквитка за език</li>
        <li>Бисквитка за цветова тема</li>
        <li>Бисквитки за сигурност (CSRF защита и т.н.);</li>
        <li>Бисквитки за зареждане и функциониране на страницата.</li>
      </ul>
      <Typography.P>
        <strong>Срок на съхранение:</strong> сесийни (изтриват се при затваряне
        на браузъра) или до 12 месеца за определени функционални идентификатори.
      </Typography.P>
      <Typography.P>
        <strong>Съгласие:</strong> не е необходимо съгласие за тези бисквитки,
        тъй като са строго технически необходими.
      </Typography.P>

      <Typography.P>
        2.2. Аналитични бисквитки (Google Analytics 4)
      </Typography.P>
      <Typography.P>
        <strong>Определение:</strong> бисквитки, които събират информация за
        поведението на потребителя и статистика на сайта.
      </Typography.P>
      <Typography.P>Примери:</Typography.P>
      <ul className="list-disc list-inside ml-4">
        <li>_ga – идентификатор за потребителя в GA4;</li>
        <li>
          _ga_&lt;container-id&gt; – поддържане на състоянието на сесията в GA4;
        </li>
        <li>други GA бисквитки за конверсии, демография и др.</li>
      </ul>
      <Typography.P>
        <strong>Срок на съхранение:</strong> до 2 години (по подразбиране в
        GA4).
      </Typography.P>
      <Typography.P>
        <strong>Съгласие:</strong> необходимо е изрично съгласие за поставяне на
        аналитични бисквитки. При първо посещение се показва cookie банер, който
        позволява на потребителя да:
      </Typography.P>
      <ul className="not-prose mb-6 list-disc pl-6 [li]:mt-1">
        <li>приеме аналитични бисквитки;</li>
        <li>откаже аналитични бисквитки;</li>
        <li>направи персонализиран избор.</li>
      </ul>

      <Typography.P>2.3. Маркетингови и рекламни бисквитки</Typography.P>
      <Typography.P>
        <strong>Статус:</strong> На Сайта не се използват маркетингови или
        рекламни бисквитки, тъй като сайтът е некомерсиален и няма рекламни
        партньори.
      </Typography.P>

      <Typography.P>2.4. Външни бисквитки</Typography.P>
      <Typography.P>
        <strong>Facebook:</strong> Ако има вградено Facebook събитие или линк
        към Facebook, Facebook може да задава собствени бисквитки (например
        fb-бисквитки). Вижте Политика за бисквитки на Facebook.
      </Typography.P>
      <br />
      <Typography.H3>3. Правно основание за бисквитки</Typography.H3>

      <Typography.P>3.1. Строго необходими бисквитки</Typography.P>
      <Typography.P>
        Правно основание: легитимен интерес и предоставяне на услугата (чл. 5,
        пар. 3 от ePrivacy Directive; чл. 6 GDPR).
        <br />
        Съгласие не е необходимо, тъй като са технически неизбежни.
      </Typography.P>

      <Typography.P>3.2. Аналитични бисквитки</Typography.P>
      <Typography.P>
        Правно основание: съгласие (чл. 6, ал. 1, б. „а“ GDPR; чл. 5, пар. 3 от
        ePrivacy Directive).
        <br />
        Съгласието е задължително. Google Analytics 4 не се зарежда, докато
        потребителят не даде съгласие.
      </Typography.P>
      <br />
      <Typography.H3>
        4. Google Analytics 4 – детайли за GDPR съответствие
      </Typography.H3>

      <Typography.P>4.1. Конфигурация</Typography.P>
      <Typography.P>
        На Сайта използваме Google Analytics 4 със следните GDPR-съответни
        настройки:
      </Typography.P>
      <ul className="list-disc list-inside ml-4">
        <li>
          IP анонимизиране – включено (последният октет на IP адреса се скрива);
        </li>
        <li>Data retention – 14 месеца (по подразбиране);</li>
        <li>Consent Mode – включен (GA действа само при съгласие);</li>
        <li>
          Рекламни функции – изключени (без Google Ads linking, Remarketing и
          др.);
        </li>
        <li>Демографична информация – само в обобщен, неидентифициращ вид.</li>
      </ul>

      <Typography.P>4.2. Данни, събрани от GA</Typography.P>
      <Typography.P>
        Google Analytics събира обобщена информация като:
      </Typography.P>
      <ul className="list-disc list-inside ml-4">
        <li>кои страници са посетени;</li>
        <li>време на престой на страница;</li>
        <li>тип устройство и браузър;</li>
        <li>приблизителна географска локация (по IP адрес);</li>
        <li>източник на трафик (директен, търсене, социални мрежи);</li>
        <li>дейности (клик, скрол, конверсии и др.).</li>
      </ul>

      <Typography.P>4.3. Трансфер на данни</Typography.P>
      <Typography.P>
        Google Analytics може да прехвърля данни към сървъри на Google в САЩ.
        Трансферът се извършва при спазване на:
      </Typography.P>
      <ul className="list-disc list-inside ml-4">
        <li>
          стандартни договорни клаузи (Google Ads Controller-to-Controller DPA);
        </li>
        <li>политиката за поверителност на Google;</li>
        <li>GDPR изискванията за международен трансфер.</li>
      </ul>

      <Typography.P>4.4. Отказ от GA</Typography.P>
      <Typography.P>Потребителят може да:</Typography.P>
      <ul className="list-disc list-inside ml-4">
        <li>
          откаже аналитични cookies през cookie банера при първо посещение;
        </li>
        <li>промени избора си по всяко време чрез настройките за бисквитки;</li>
        <li>
          инсталира браузър add-on за отказ от Google Analytics (
          <a
            href="https://tools.google.com/dlpage/gaoptout"
            target="_blank"
            rel="noopener"
          >
            https://tools.google.com/dlpage/gaoptout
          </a>
          );
        </li>
        <li>
          настрои браузъра си да не позволява проследяване за аналитични цели.
        </li>
      </ul>
      <br />
      <Typography.H3>5. Как управляваш бисквитките</Typography.H3>

      <Typography.P>5.1. Банер при първо посещение</Typography.P>
      <Typography.P>
        При първо посещение на Сайта се показва банер с опции:
      </Typography.P>
      <ul className="list-disc list-inside ml-4">
        <li>„приемам всички бисквитки“;</li>
        <li>„само необходими“;</li>
      </ul>
      <Typography.P>
        Потребителят трябва да направи избор, преди да може да използва сайта
        по-нататък.
      </Typography.P>

      <Typography.P>5.2. Актуализиране на избора</Typography.P>
      <Typography.P>
        Потребителят може да актуализира избора си чрез браузърни настройки (виж
        5.3).
      </Typography.P>

      <Typography.P>5.3. Управление на бисквитки чрез браузър</Typography.P>
      <Typography.P>Повечето браузъри позволяват:</Typography.P>
      <ul className="list-disc list-inside ml-4">
        <li>
          блокиране на всички бисквитки – сайтът може да не функционира
          коректно;
        </li>
        <li>
          приемане само на определени типове – например само необходими
          бисквитки;
        </li>
        <li>одобрение по домейни; </li>
        <li>изтриване на съществуващи бисквитки.</li>
      </ul>
      <br />
      <Typography.H3>6. Външни бисквитки</Typography.H3>

      <Typography.P>6.1. Facebook линкове/събития</Typography.P>
      <Typography.P>
        Ако на Сайта има вграден Facebook линк или събитие, Facebook може да
        задава собствени бисквитки, например:
      </Typography.P>
      <ul className="list-disc list-inside ml-4">
        <li>_fbp, sb и други;</li>
        <li>цел – проследяване, реклама и аналитика от страна на Facebook.</li>
      </ul>
      <Typography.P>
        Администраторът не контролира Facebook бисквитките. За повече информация
        вижте{" "}
        <a
          href="https://www.facebook.com/policies/cookies/"
          target="_blank"
          rel="noopener"
        >
          Facebook Cookie Policy
        </a>
        .
      </Typography.P>

      <Typography.P>6.2. Отговорност на администратора</Typography.P>
      <Typography.P>
        Администраторът е отговорен за собствените бисквитки на all4ruse.com, но
        не носи отговорност за бисквитките на външни партньори. Потребителят
        приема това чрез използване на Сайта.
      </Typography.P>
      <br />
      <Typography.H3>7. Промени в Политиката за бисквитки</Typography.H3>

      <Typography.P>7.1. Право на актуализиране</Typography.P>
      <Typography.P>
        Администраторът има право да актуализира тази Политика при промени в
        технологиите, законодателството или начина на използване на бисквитки.
      </Typography.P>

      <Typography.P>7.2. Уведомление</Typography.P>
      <Typography.P>
        При съществена промяна потребителите ще бъдат уведомени чрез:
      </Typography.P>
      <ul className="list-disc list-inside ml-4">
        <li>нов банер при повторно посещение;</li>
        <li>съобщение на Сайта;</li>
        <li>имейл (когато е възможно).</li>
      </ul>

      <Typography.P>7.3. Приемане</Typography.P>
      <Typography.P>
        Продължаването на ползване на Сайта означава приемане на обновената
        Политика за бисквитки.
      </Typography.P>
      <br />
      <Typography.H3>8. Езикови версии</Typography.H3>

      <Typography.P>8.1. Официален текст</Typography.P>
      <Typography.P>
        Официалният и задължителен текст на Политиката е на български език.
      </Typography.P>

      <Typography.P>8.2. Приоритет</Typography.P>
      <Typography.P>
        При разминаване между българския и английския текст, приоритет има
        българската версия.
      </Typography.P>
      <br />
      <Typography.H3>9. Контакт</Typography.H3>
      <Typography.P>
        За въпроси относно бисквитките и тяхното използване, свържете се с нас
        на имейл:{" "}
        <a href={`mailto:silvena.miteva.007@gmail.com`} className="text-primary text-base font-medium underline" aria-label="Имейл за контакт: silvena.miteva.007 at gmail dot com">
          <ObfuscatedEmail email="silvena.miteva.007@gmail.com" />
        </a>
        .
      </Typography.P>
      <br />
      <Typography.P>
        <strong>Дата на последна актуализация: 26 януари 2026 г.</strong>
      </Typography.P>
    </article>
  );
}
