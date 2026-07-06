"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import { useTranslations } from "next-intl";

import {
  FileImage,
  Link,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  Type,
  X,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { compressImageForExtraction } from "~/lib/smart-fill/compress-image-client";
import { cn } from "~/lib/utils";
import type { EventDraft } from "~/types";

import { SmartFillImportOverlay } from "./SmartFillImportOverlay";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "facebook" | "text" | "photo" | "grabo" | "ruse-danube";

type Props = {
  onApply: (draft: EventDraft) => void;
  isAdmin?: boolean;
};

type ParseState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "applied" }
  | { status: "partialApplied" }
  | { status: "error"; message: string };

type VisibilityCheckState =
  | { status: "idle" }
  | { status: "checking" }
  | {
      status: "done";
      visibility: "public" | "private" | "unknown";
      title?: string;
    }
  | { status: "error"; message: string };

// ─── Component ────────────────────────────────────────────────────────────────

export function SmartFillPanel({ onApply, isAdmin = false }: Props) {
  const t = useTranslations("SmartFill");

  const [tab, setTab] = useState<Tab>("facebook");
  const [parseState, setParseState] = useState<ParseState>({ status: "idle" });
  const [visibilityCheck, setVisibilityCheck] = useState<VisibilityCheckState>({
    status: "idle",
  });

  // Per-tab input state
  const [fbUrl, setFbUrl] = useState("");
  const [promptText, setPromptText] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoText, setPhotoText] = useState("");
  const [graboUrl, setGraboUrl] = useState("");
  const [ruseDanubeUrl, setRuseDanubeUrl] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  function resetState() {
    setParseState({ status: "idle" });
  }

  function resetVisibilityCheck() {
    setVisibilityCheck({ status: "idle" });
  }

  function cancelImport() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    resetState();
  }

  function handleTabChange(next: Tab) {
    setTab(next);
    resetState();
    resetVisibilityCheck();
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    resetState();
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  }

  async function handleCheckVisibility() {
    if (!fbUrl.trim()) {
      setVisibilityCheck({
        status: "error",
        message: t("fbCheckInvalidUrl"),
      });
      return;
    }

    setVisibilityCheck({ status: "checking" });

    try {
      const res = await fetch("/api/smart-fill/facebook/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: fbUrl }),
      });

      const json = (await res.json()) as {
        visibility?: "public" | "private" | "unknown";
        title?: string;
        error?: string;
      };

      if (!res.ok || !json.visibility) {
        setVisibilityCheck({
          status: "error",
          message: t("fbCheckError"),
        });
        return;
      }

      setVisibilityCheck({
        status: "done",
        visibility: json.visibility,
        title: json.title,
      });
    } catch {
      setVisibilityCheck({
        status: "error",
        message: t("fbCheckError"),
      });
    }
  }

  async function handleParse() {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setParseState({ status: "loading" });

    try {
      let res: Response;
      const fetchOptions = { signal: controller.signal };

      if (tab === "facebook") {
        res = await fetch("/api/smart-fill/facebook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: fbUrl }),
          ...fetchOptions,
        });
      } else if (tab === "text") {
        res = await fetch("/api/smart-fill/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: promptText }),
          ...fetchOptions,
        });
      } else if (tab === "photo") {
        if (!photoFile) {
          flushSync(() => {
            setParseState({ status: "error", message: t("errorNoPhoto") });
          });
          return;
        }
        const compressedPhoto = await compressImageForExtraction(photoFile);
        const form = new FormData();
        form.append("image", compressedPhoto);
        if (photoText.trim()) form.append("text", photoText.trim());
        res = await fetch("/api/smart-fill/photo", {
          method: "POST",
          body: form,
          ...fetchOptions,
        });
      } else if (tab === "grabo") {
        res = await fetch("/api/smart-fill/admin-scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: graboUrl, source: "grabo" }),
          ...fetchOptions,
        });
      } else {
        res = await fetch("/api/smart-fill/admin-scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: ruseDanubeUrl,
            source: "ruse-on-the-danube",
          }),
          ...fetchOptions,
        });
      }

      const json = (await res.json()) as {
        draft?: EventDraft;
        error?: string;
        errorCode?: string;
        warning?: string;
      };

      if (!res.ok || !json.draft) {
        const message =
          json.errorCode === "daily_limit_exceeded"
            ? t("errorDailyLimit")
            : json.errorCode === "quota_exceeded"
              ? t("errorQuota")
              : t("errorGeneric");
        flushSync(() => {
          setParseState({ status: "error", message });
        });
        return;
      }

      const isQuotaExceeded = json.errorCode === "quota_exceeded";
      const nextState: ParseState = json.warning
        ? isQuotaExceeded
          ? { status: "error", message: t("errorQuota") }
          : { status: "partialApplied" }
        : { status: "applied" };

      flushSync(() => {
        setParseState(nextState);
      });

      // Auto-apply immediately — image may still be saved even when text extraction fails
      onApply(json.draft);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      flushSync(() => {
        setParseState({ status: "error", message: t("errorGeneric") });
      });
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }

  const isLoading = parseState.status === "loading";
  const isCheckingVisibility = visibilityCheck.status === "checking";

  // Admin tabs — Grabo and Ruse on the Danube
  const adminTabs: Tab[] = ["grabo", "ruse-danube"];

  return (
    <>
      {isLoading && <SmartFillImportOverlay onCancel={cancelImport} />}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="text-primary size-5" />
            {t("toggleLabel")}
          </CardTitle>
        </CardHeader>

        <CardContent variant="section" className="space-y-6">
          {/* Tabs */}
          <div className="flex flex-wrap gap-4">
            <TabButton
              active={tab === "facebook"}
              onClick={() => handleTabChange("facebook")}
              icon={<Link className="size-3.5" />}
              label="Facebook"
            />
            <TabButton
              active={tab === "text"}
              onClick={() => handleTabChange("text")}
              icon={<Type className="size-3.5" />}
              label={t("tabText")}
            />
            <TabButton
              active={tab === "photo"}
              onClick={() => handleTabChange("photo")}
              icon={<FileImage className="size-3.5" />}
              label={t("tabPhoto")}
            />
            {isAdmin &&
              adminTabs.map((adminTab) => (
                <TabButton
                  key={adminTab}
                  active={tab === adminTab}
                  onClick={() => handleTabChange(adminTab)}
                  icon={<Link className="size-3.5" />}
                  label={
                    adminTab === "grabo" ? t("tabGrabo") : t("tabRuseDanube")
                  }
                />
              ))}
          </div>

          {/* Tab content */}
          {tab === "facebook" && (
            <UrlInput
              placeholder={t("fbPlaceholder")}
              value={fbUrl}
              onChange={(value) => {
                setFbUrl(value);
                resetVisibilityCheck();
              }}
              disabled={isLoading || isCheckingVisibility}
            />
          )}

          {tab === "text" && (
            <Textarea
              placeholder={t("textPlaceholder")}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              disabled={isLoading}
              rows={4}
              className="resize-none text-sm"
            />
          )}

          {tab === "photo" && (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
                disabled={isLoading}
              />
              {photoPreview ? (
                <div className="relative inline-block">
                  <Image
                    src={photoPreview}
                    alt={t("photoPreviewAlt")}
                    width={160}
                    height={120}
                    className="rounded-md object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                      resetState();
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="bg-background/80 absolute top-1 right-1 rounded-full p-0.5"
                    aria-label={t("removePhoto")}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 text-sm transition-colors"
                >
                  <FileImage className="text-muted-foreground size-5" />
                  <span className="text-muted-foreground">
                    {t("photoDropZone")}
                  </span>
                </button>
              )}
              <Textarea
                placeholder={t("photoTextPlaceholder")}
                value={photoText}
                onChange={(e) => setPhotoText(e.target.value)}
                disabled={isLoading}
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          )}

          {tab === "grabo" && (
            <UrlInput
              placeholder={t("graboPlaceholder")}
              value={graboUrl}
              onChange={setGraboUrl}
              disabled={isLoading}
            />
          )}

          {tab === "ruse-danube" && (
            <UrlInput
              placeholder={t("ruseDanubePlaceholder")}
              value={ruseDanubeUrl}
              onChange={setRuseDanubeUrl}
              disabled={isLoading}
            />
          )}

          {tab === "facebook" && (
            <p className="text-sm">{t("fbPublicRequiredHint")}</p>
          )}

          <p className="text-sm">{t("reviewRequiredHint")}</p>

          <div className="flex flex-wrap items-center gap-2">
            {tab === "facebook" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCheckVisibility}
                disabled={isLoading || isCheckingVisibility || !fbUrl.trim()}
              >
                {isCheckingVisibility
                  ? t("fbCheckChecking")
                  : t("fbCheckButton")}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handleParse}
              disabled={isLoading || isCheckingVisibility}
            >
              {isLoading ? t("parsing") : t("parseButton")}
            </Button>
          </div>

          {tab === "facebook" && visibilityCheck.status === "done" && (
            <VisibilityCheckResult
              visibility={visibilityCheck.visibility}
              title={visibilityCheck.title}
              t={t}
            />
          )}

          {tab === "facebook" && visibilityCheck.status === "error" && (
            <p className="text-destructive mt-2 text-xs">
              {visibilityCheck.message}
            </p>
          )}

          {/* Error */}
          {parseState.status === "error" && (
            <p className="text-destructive mt-2 text-xs">
              {parseState.message}
            </p>
          )}

          {/* Applied confirmation */}
          {parseState.status === "applied" && (
            <p className="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              ✓ {t("applied")}
            </p>
          )}

          {/* Partial success — image saved but text extraction failed */}
          {parseState.status === "partialApplied" && (
            <p className="text-destructive mt-2 flex items-start gap-1.5 text-xs">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>{t("appliedImageOnly")}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:cursor-pointer",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-input hover:bg-muted/40",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function VisibilityCheckResult({
  visibility,
  title,
  t,
}: {
  visibility: "public" | "private" | "unknown";
  title?: string;
  t: ReturnType<typeof useTranslations<"SmartFill">>;
}) {
  if (visibility === "public") {
    return (
      <p className="mt-2 flex items-start gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        <span>
          {title ? t("fbCheckPublicWithTitle", { title }) : t("fbCheckPublic")}
        </span>
      </p>
    );
  }

  if (visibility === "private") {
    return (
      <p className="text-destructive mt-2 flex items-start gap-1.5 text-xs">
        <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
        <span>{t("fbCheckPrivate")}</span>
      </p>
    );
  }

  return (
    <p className="text-muted-foreground mt-2 flex items-start gap-1.5 text-xs">
      <ShieldQuestion className="mt-0.5 size-3.5 shrink-0" />
      <span>{t("fbCheckUnknown")}</span>
    </p>
  );
}

function UrlInput({
  placeholder,
  value,
  onChange,
  disabled,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <Input
      type="url"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}
