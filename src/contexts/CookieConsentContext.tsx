"use client";

import {
  createContext,
  type SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useTranslations } from "next-intl";

import { DrawerDialog } from "~/components/layout/DrawerDialog";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { useCookieConsent } from "~/hooks/useCookieConsent";
import {
  createCookieConsent,
  hasAnalyticsConsent,
  hasMarketingConsent,
} from "~/lib/cookie-consent";
import { cn } from "~/lib/utils";

const hasGoogleAnalytics = Boolean(process.env.NEXT_PUBLIC_GA_ID);
const hasMetaPixel = Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID);
export const canManageCookies = hasGoogleAnalytics || hasMetaPixel;

type CookieConsentContextValue = {
  openSettings: () => void;
  canManageCookies: boolean;
};

type PreferenceDraft = {
  analytics: boolean;
  marketing: boolean;
};

type PreferenceRowProps = {
  title: string;
  description: string;
  control: React.ReactNode;
  className?: string;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(
  null,
);

function PreferenceRow({
  title,
  description,
  control,
  className,
}: PreferenceRowProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 rounded-xl border p-4 text-left",
        className,
      )}
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export function useCookieSettings() {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error("useCookieSettings must be used within CookieConsentProvider.");
  }
  return context;
}

export function CookieConsentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("General");
  const [consent, setConsent] = useCookieConsent();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<PreferenceDraft | null>(null);

  const savedPreferences: PreferenceDraft = {
    analytics: hasGoogleAnalytics && hasAnalyticsConsent(consent),
    marketing: hasMetaPixel && hasMarketingConsent(consent),
  };

  const analyticsEnabled = draft?.analytics ?? savedPreferences.analytics;
  const marketingEnabled = draft?.marketing ?? savedPreferences.marketing;

  const resetDraft = useCallback(() => setDraft(null), []);

  const hasChoice = consent !== null;
  const isOpen = canManageCookies && (!hasChoice || isSettingsOpen);

  const openSettings = useCallback(() => {
    resetDraft();
    setIsSettingsOpen(true);
  }, [resetDraft]);

  const contextValue = useMemo(
    () => ({
      openSettings,
      canManageCookies,
    }),
    [openSettings],
  );

  function savePreferences(next: PreferenceDraft) {
    setConsent(createCookieConsent(next));
    resetDraft();
    setIsSettingsOpen(false);
  }

  function acceptAll() {
    savePreferences({
      analytics: hasGoogleAnalytics,
      marketing: hasMetaPixel,
    });
  }

  function acceptNecessaryOnly() {
    savePreferences({ analytics: false, marketing: false });
  }

  function handleOpenChange(next: SetStateAction<boolean>) {
    const open = typeof next === "function" ? next(isOpen) : next;
    if (!hasChoice && !open) return;
    if (open) resetDraft();
    setIsSettingsOpen(open);
  }

  return (
    <CookieConsentContext.Provider value={contextValue}>
      {children}

      {canManageCookies && (
        <DrawerDialog
          open={isOpen}
          setOpen={handleOpenChange}
          title={t("cookieSettingsTitle")}
          description={t("cookieSettingsDescription")}
          contentClassName="pb-6"
        >
          <div className="flex flex-col gap-5 pb-2">

            <div className="space-y-3">
              <PreferenceRow
                title={t("necessaryCookiesTitle")}
                description={t("necessaryCookiesDescription")}
                control={
                  <span className="text-muted-foreground text-xs font-semibold uppercase">
                    {t("alwaysActive")}
                  </span>
                }
              />

              {hasGoogleAnalytics && (
                <PreferenceRow
                  title={t("analyticsCookiesTitle")}
                  description={t("analyticsCookiesDescription")}
                  control={
                    <div className="flex items-center gap-2">
                      <Label htmlFor="analytics-consent" className="sr-only">
                        {t("analyticsCookiesTitle")}
                      </Label>
                      <Switch
                        id="analytics-consent"
                        checked={analyticsEnabled}
                        onCheckedChange={(analytics) =>
                          setDraft({
                            analytics,
                            marketing:
                              draft?.marketing ?? savedPreferences.marketing,
                          })
                        }
                        aria-label={t("analyticsCookiesTitle")}
                      />
                    </div>
                  }
                />
              )}

              {hasMetaPixel && (
                <PreferenceRow
                  title={t("marketingCookiesTitle")}
                  description={t("marketingCookiesDescription")}
                  control={
                    <div className="flex items-center gap-2">
                      <Label htmlFor="marketing-consent" className="sr-only">
                        {t("marketingCookiesTitle")}
                      </Label>
                      <Switch
                        id="marketing-consent"
                        checked={marketingEnabled}
                        onCheckedChange={(marketing) =>
                          setDraft({
                            analytics:
                              draft?.analytics ?? savedPreferences.analytics,
                            marketing,
                          })
                        }
                        aria-label={t("marketingCookiesTitle")}
                      />
                    </div>
                  }
                />
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button type="button" variant="outline" onClick={acceptNecessaryOnly}>
                {t("onlyNecessary")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  savePreferences({
                    analytics: hasGoogleAnalytics ? analyticsEnabled : false,
                    marketing: hasMetaPixel ? marketingEnabled : false,
                  })
                }
              >
                {t("saveCookiePreferences")}
              </Button>
              <Button type="button" onClick={acceptAll}>
                {t("acceptCookies")}
              </Button>
            </div>
          </div>
        </DrawerDialog>
      )}
    </CookieConsentContext.Provider>
  );
}
