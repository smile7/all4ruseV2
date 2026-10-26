"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Link } from "~/i18n/navigation";
import { hostPath } from "~/lib/seo";
import type { EventHost } from "~/types";

import { HostFormDialog } from "./HostFormDialog";

type Props = {
  initialHosts: EventHost[];
};

function sortByName(hosts: EventHost[]) {
  return [...hosts].sort((a, b) => a.name.localeCompare(b.name, "bg"));
}

export function HostAdminList({ initialHosts }: Props) {
  const t = useTranslations("Hosts");
  const [hosts, setHosts] = useState(initialHosts);
  const [editing, setEditing] = useState<EventHost | "new" | null>(null);
  const [deleting, setDeleting] = useState<EventHost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function upsert(saved: EventHost) {
    setHosts((prev) =>
      sortByName([...prev.filter((host) => host.id !== saved.id), saved]),
    );
  }

  async function confirmDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/hosts/${deleting.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(String(response.status));
      setHosts((prev) => prev.filter((host) => host.id !== deleting.id));
      toast.success(t("deleted"));
      setDeleting(null);
    } catch {
      toast.error(t("saveError"));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Button type="button" onClick={() => setEditing("new")}>
        <Plus className="mr-1 size-4" />
        {t("newHost")}
      </Button>

      {hosts.length === 0 ? (
        <p className="text-muted-foreground">{t("adminEmpty")}</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {hosts.map((host) => (
            <li
              key={host.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold">{host.name}</p>
                <p className="text-muted-foreground truncate text-sm">
                  {[host.place, host.address].filter(Boolean).join(" · ") ||
                    hostPath(host.slug)}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={hostPath(host.slug)} target="_blank">
                    <ExternalLink className="mr-1 size-4" />
                    {t("viewPage")}
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(host)}
                >
                  <Pencil className="mr-1 size-4" />
                  {t("edit")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleting(host)}
                >
                  <Trash2 className="mr-1 size-4" />
                  {t("delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <HostFormDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        host={editing === "new" ? null : editing}
        onSaved={upsert}
      />

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirmDescription", { name: deleting?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={isDeleting}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={isDeleting}
            >
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
