import { useTranslations } from "next-intl";

import { Footer, Header, Logo } from "~/components/layout";

export default function HomePage() {
  const t = useTranslations("HomePage");

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="flex flex-col items-center gap-6 py-16 text-center">
          <Logo />
          <h1 className="text-4xl font-bold tracking-tight">{t("pageTitle")}</h1>
          <p className="text-muted-foreground max-w-xl text-lg">{t("pageDescription")}</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
