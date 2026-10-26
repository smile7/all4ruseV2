"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Building2, ExternalLink, Pencil, Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Link } from "~/i18n/navigation";
import { hostPath } from "~/lib/seo";
import type { EventHost } from "~/types";

import { HostFormDialog, type HostFormValues } from "./HostFormDialog";

const NONE = "__none__";

type Props = {
  hosts: EventHost[];
  selectedId: string | null;
  /** `null` unlinks the event; the form fields are left as they are. */
  onSelect: (host: EventHost | null) => void;
  /** Called after a create/edit so the parent can update its list. */
  onHostSaved: (host: EventHost) => void;
  /** Current event-form values, used to prefill „Запази като нов организатор“. */
  getDraft: () => Partial<HostFormValues>;
};

/** Admin-only: link the event to a host page and prefill its details. */
export function HostPicker({
  hosts,
  selectedId,
  onSelect,
  onHostSaved,
  getDraft,
}: Props) {
  const t = useTranslations("Hosts");
  const [dialog, setDialog] = useState<
    | { mode: "create"; draft: Partial<HostFormValues> }
    | { mode: "edit"; host: EventHost }
    | null
  >(null);

  const selected = hosts.find((host) => host.id === selectedId) ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="text-primary size-5" />
          {t("pickerTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent variant="section" className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={selectedId ?? NONE}
            onValueChange={(value) =>
              onSelect(hosts.find((host) => host.id === value) ?? null)
            }
          >
            <SelectTrigger
              className="w-full sm:max-w-sm"
              aria-label={t("pickerLabel")}
            >
              <SelectValue placeholder={t("pickerNone")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("pickerNone")}</SelectItem>
              {hosts.map((host) => (
                <SelectItem key={host.id} value={host.id}>
                  {host.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-wrap gap-2">
            {selected && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDialog({ mode: "edit", host: selected })}
                >
                  <Pencil className="mr-1 size-4" />
                  {t("edit")}
                </Button>
                <Button type="button" variant="ghost" size="sm" asChild>
                  <Link href={hostPath(selected.slug)} target="_blank">
                    <ExternalLink className="mr-1 size-4" />
                    {t("viewPage")}
                  </Link>
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialog({ mode: "create", draft: getDraft() })}
            >
              <Plus className="mr-1 size-4" />
              {t("saveAsNew")}
            </Button>
          </div>
        </div>

        <p className="text-muted-foreground text-sm">{t("pickerHint")}</p>
        <Link
          href="/admin/hosts"
          target="_blank"
          className="text-muted-foreground hover:text-foreground text-xs underline"
        >
          {t("manageAll")}
        </Link>
      </CardContent>

      <HostFormDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        host={dialog?.mode === "edit" ? dialog.host : null}
        draft={dialog?.mode === "create" ? dialog.draft : undefined}
        onSaved={(host) => {
          onHostSaved(host);
          onSelect(host);
        }}
      />
    </Card>
  );
}
