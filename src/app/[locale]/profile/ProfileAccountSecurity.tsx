"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { PasswordInput } from "~/components/ui/password-input";
import { useRouter } from "~/i18n/navigation";
import { getSupabaseBrowserClient } from "~/lib/supabase/client";

const DELETE_CONFIRMATION = "DELETE" as const;

function makePasswordSchema(minLengthMsg: string, matchMsg: string) {
  return z
    .object({
      password: z.string().min(6, minLengthMsg),
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: matchMsg,
      path: ["confirmPassword"],
    });
}

type PasswordFormValues = z.infer<ReturnType<typeof makePasswordSchema>>;

type Props = {
  hasEmailAuth: boolean;
};

export function ProfileAccountSecurity({ hasEmailAuth }: Props) {
  const t = useTranslations("Profile");
  const tGeneral = useTranslations("General");
  const router = useRouter();

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deletePending, setDeletePending] = useState(false);

  const pwdSchema = makePasswordSchema(
    t("passwordLength"),
    t("passwordsDoNotMatch"),
  );

  const pwdForm = useForm<PasswordFormValues>({
    resolver: zodResolver(pwdSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  function closePasswordSection() {
    setPasswordOpen(false);
    pwdForm.reset();
  }

  async function onPasswordSubmit(values: PasswordFormValues) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      toast.error(t("errorUpdatingPassword"));
      return;
    }

    toast.success(t("passwordUpdatedSuccessfully"));
    closePasswordSection();
  }

  async function handleDeleteAccount() {
    if (deletePhrase !== DELETE_CONFIRMATION) return;

    setDeletePending(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: DELETE_CONFIRMATION }),
      });

      if (!res.ok) {
        toast.error(t("accountDeleteFailed"));
        return;
      }

      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();

      toast.success(tGeneral("accountDeletedSuccessfully"));
      setDeleteOpen(false);
      router.push("/");
      router.refresh();
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        {t("accountSecurityDescription")}
      </p>

      {hasEmailAuth ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="text-primary size-5" aria-hidden />
              {t("password")}
            </CardTitle>
          </CardHeader>
          <CardContent variant="section">
            {!passwordOpen ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordOpen(true)}
              >
                {t("changePassword")}
              </Button>
            ) : (
              <Form {...pwdForm}>
                <form
                  onSubmit={pwdForm.handleSubmit(onPasswordSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={pwdForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("newPassword")}</FormLabel>
                        <FormControl>
                          <PasswordInput
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={pwdForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("repeatPassword")}</FormLabel>
                        <FormControl>
                          <PasswordInput
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <Button
                      type="submit"
                      disabled={pwdForm.formState.isSubmitting}
                    >
                      {t("saveNewPassword")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closePasswordSection}
                    >
                      {t("cancel")}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="text-primary size-5" aria-hidden />
              {t("password")}
            </CardTitle>
          </CardHeader>
          <CardContent variant="section">
            <p className="text-muted-foreground text-sm">
              {t("oauthNoPassword")}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-destructive/35">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2 text-lg">
            <Trash2 className="size-5" aria-hidden />
            {t("deleteAccount")}
          </CardTitle>
          <CardDescription>{t("deleteAccountDescr")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setDeletePhrase("");
              setDeleteOpen(true);
            }}
          >
            {t("deleteAccount")}
          </Button>

          <Dialog
            open={deleteOpen}
            onOpenChange={(open) => {
              setDeleteOpen(open);
              if (!open) {
                setDeletePhrase("");
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("deleteAccount")}</DialogTitle>
                <DialogDescription>
                  {t("deleteAccountIrreversibleWarning")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <label
                  htmlFor="delete-confirm-input"
                  className="text-sm font-medium"
                >
                  {t("deleteTypeDeleteHint")}
                </label>
                <Input
                  id="delete-confirm-input"
                  value={deletePhrase}
                  onChange={(e) => setDeletePhrase(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="DELETE"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteOpen(false)}
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={
                    deletePhrase !== DELETE_CONFIRMATION || deletePending
                  }
                  onClick={handleDeleteAccount}
                >
                  {t("confirmDeleteAccount")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
