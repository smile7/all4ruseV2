"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import {
  FileImage,
  Link,
  Loader2,
  Sparkles,
  Type,
  X,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import type { EventDraft } from "~/types";

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


// ─── Component ────────────────────────────────────────────────────────────────

export function SmartFillPanel({ onApply, isAdmin = false }: Props) {
  const t = useTranslations("SmartFill");

  const [tab, setTab] = useState<Tab>("facebook");
  const [parseState, setParseState] = useState<ParseState>({ status: "idle" });

  // Per-tab input state
  const [fbUrl, setFbUrl] = useState("");
  const [promptText, setPromptText] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [graboUrl, setGraboUrl] = useState("");
  const [ruseDanubeUrl, setRuseDanubeUrl] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetState() {
    setParseState({ status: "idle" });
  }

  function handleTabChange(next: Tab) {
    setTab(next);
    resetState();
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

  async function handleParse() {
    setParseState({ status: "loading" });

    try {
      let res: Response;

      if (tab === "facebook") {
        res = await fetch("/api/smart-fill/facebook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: fbUrl }),
        });
      } else if (tab === "text") {
        res = await fetch("/api/smart-fill/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: promptText }),
        });
      } else if (tab === "photo") {
        if (!photoFile) {
          setParseState({ status: "error", message: t("errorNoPhoto") });
          return;
        }
        const form = new FormData();
        form.append("image", photoFile);
        res = await fetch("/api/smart-fill/photo", {
          method: "POST",
          body: form,
        });
      } else if (tab === "grabo") {
        res = await fetch("/api/smart-fill/admin-scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: graboUrl, source: "grabo" }),
        });
      } else {
        res = await fetch("/api/smart-fill/admin-scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: ruseDanubeUrl, source: "ruse-on-the-danube" }),
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
          json.errorCode === "quota_exceeded"
            ? t("errorQuota")
            : t("errorGeneric");
        setParseState({ status: "error", message });
        return;
      }

      // Auto-apply immediately — no confirm step needed
      onApply(json.draft);

      // A `warning` means the API applied a partial draft (e.g. image saved
      // but text extraction failed). Show a softer message instead of success.
      if (json.warning) {
        setParseState({ status: "partialApplied" });
      } else {
        setParseState({ status: "applied" });
      }
    } catch {
      setParseState({ status: "error", message: t("errorGeneric") });
    }
  }

  const isLoading = parseState.status === "loading";

  // Admin tabs — Grabo and Ruse on the Danube
  const adminTabs: Tab[] = ["grabo", "ruse-danube"];

  return (
    <div className="border-border bg-muted/20 rounded-lg border">
      {/* Header — always visible, no toggle */}
      <div className="flex items-center gap-2 px-4 py-3">
        <Sparkles className="text-primary size-4 shrink-0" />
        <span className="text-sm font-medium">{t("toggleLabel")}</span>
      </div>

      <div className="px-4 pb-4">
        <Separator className="mb-4" />

        {/* Tabs */}
        <div className="mb-4 flex gap-4 flex-wrap">
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
                label={adminTab === "grabo" ? t("tabGrabo") : t("tabRuseDanube")}
              />
            ))}
        </div>

        {/* Tab content */}
        {tab === "facebook" && (
          <UrlInput
            placeholder={t("fbPlaceholder")}
            value={fbUrl}
            onChange={setFbUrl}
            disabled={isLoading}
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
                  className="bg-background/80 absolute right-1 top-1 rounded-full p-0.5"
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
                className="border-input bg-muted/30 hover:bg-muted/50 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed py-6 text-sm transition-colors"
              >
                <FileImage className="text-muted-foreground size-5" />
                <span className="text-muted-foreground">{t("photoDropZone")}</span>
              </button>
            )}
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

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleParse}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                {t("parsing")}
              </>
            ) : (
              t("parseButton")
            )}
          </Button>
          {isLoading && (
            <span className="text-muted-foreground text-xs">{t("parsingHint")}</span>
          )}
        </div>

        {/* Error */}
        {parseState.status === "error" && (
          <p className="text-destructive mt-2 text-xs">{parseState.message}</p>
        )}

        {/* Applied confirmation */}
        {parseState.status === "applied" && (
          <p className="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            ✓ {t("applied")}
          </p>
        )}

        {/* Partial success — image saved but text extraction failed */}
        {parseState.status === "partialApplied" && (
          <p className="text-muted-foreground mt-2 text-xs">
            {t("appliedImageOnly")}
          </p>
        )}
      </div>
    </div>
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
    <input
      type="url"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
    />
  );
}

