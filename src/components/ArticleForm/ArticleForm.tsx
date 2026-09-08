"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import NextImage from "next/image";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ArticleBodyEditor } from "~/components/ArticleForm/ArticleBodyEditor";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { DEBOUNCE_MS, DEFAULT_ARTICLE_AUTHOR, LOCALES } from "~/constants";
import { useDebounce } from "~/hooks/useDebounce";
import { Link, useRouter } from "~/i18n/navigation";
import type { ArticleGroupOption } from "~/lib/api";
import { buildArticleSlugFromTitle } from "~/lib/article-slug";
import { ARTICLES_PATH } from "~/lib/seo";
import {
  type Article,
  ARTICLE_CATEGORIES,
  type ArticleFormValues,
  articleSchema,
} from "~/types";

const NONE_VALUE = "__none__";

type Props = {
  initialData: Article | null;
  groups: ArticleGroupOption[];
};

function toFormValues(article: Article | null): ArticleFormValues {
  return {
    locale: (article?.locale ?? "bg") as ArticleFormValues["locale"],
    group_id: article?.group_id ?? "",
    title: article?.title ?? "",
    slug: article?.slug ?? "",
    excerpt: article?.excerpt ?? "",
    meta_description: article?.meta_description ?? "",
    body_html: article?.body_html ?? "",
    hero_image: article?.hero_image ?? "",
    hero_image_alt: article?.hero_image_alt ?? "",
    category: (article?.category ?? "") as ArticleFormValues["category"],
    author_name: article?.author_name ?? DEFAULT_ARTICLE_AUTHOR,
    is_sponsored: article?.is_sponsored ?? false,
    sponsor_name: article?.sponsor_name ?? "",
    sponsor_url: article?.sponsor_url ?? "",
    status: (article?.status ?? "draft") as ArticleFormValues["status"],
  };
}

export function ArticleForm({ initialData, groups }: Props) {
  const t = useTranslations("MoreFromRuse.admin");
  const tCategories = useTranslations("MoreFromRuse.categories");
  const router = useRouter();

  const isPublished = initialData?.status === "published";
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slugTaken, setSlugTaken] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: toFormValues(initialData),
    mode: "onBlur",
  });

  const title = form.watch("title");
  const slug = form.watch("slug");
  const locale = form.watch("locale");
  const excerpt = form.watch("excerpt");
  const metaDescription = form.watch("meta_description") ?? "";
  const heroImage = form.watch("hero_image");
  const isSponsored = form.watch("is_sponsored");

  // Derive the slug from the title until the article is published, after which
  // the URL is frozen.
  const slugTouched = useRef(Boolean(initialData));
  useEffect(() => {
    if (isPublished || slugTouched.current || !title) return;
    form.setValue("slug", buildArticleSlugFromTitle(title));
  }, [title, isPublished, form]);

  const debouncedSlug = useDebounce(slug, DEBOUNCE_MS);
  useEffect(() => {
    if (!debouncedSlug || isPublished) {
      setSlugTaken(false);
      return;
    }

    let active = true;
    const params = new URLSearchParams({ locale, slug: debouncedSlug });
    if (initialData?.id) params.set("excludeId", initialData.id);

    fetch(`/api/articles/slug-available?${params}`)
      .then((response) => (response.ok ? response.json() : { available: true }))
      .then((data: { available: boolean }) => {
        if (active) setSlugTaken(!data.available);
      })
      .catch(() => {
        if (active) setSlugTaken(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedSlug, locale, initialData?.id, isPublished]);

  async function uploadHeroImage(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/articles/image", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("upload_failed");

      const { url } = (await response.json()) as { url: string };
      form.setValue("hero_image", url, { shouldDirty: true });
    } catch {
      toast.error(t("uploadError"));
    } finally {
      setUploading(false);
    }
  }

  async function submit(
    values: ArticleFormValues,
    status: "draft" | "published",
  ) {
    setSubmitting(true);
    try {
      const payload = { ...values, status };
      const response = await fetch(
        initialData ? `/api/articles/${initialData.id}` : "/api/articles",
        {
          method: initialData ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const { error } = (await response.json()) as { error?: string };
        toast.error(error === "slug_taken" ? t("slugTaken") : t("saveError"));
        return;
      }

      const { article } = (await response.json()) as { article: Article };
      form.reset(toFormValues(article));
      slugTouched.current = true;

      if (status === "published") {
        router.push(`${ARTICLES_PATH}/${article.slug}`);
        return;
      }
      router.push(`/create-article?editId=${article.id}`);
      router.refresh();
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initialData) return;
    if (!window.confirm(t("deleteConfirm"))) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/articles/${initialData.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("delete_failed");
      router.push(ARTICLES_PATH);
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || uploading;

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="locale"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("localeLabel")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LOCALES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="group_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("translationOfLabel")}</FormLabel>
                <Select
                  value={field.value || NONE_VALUE}
                  onValueChange={(value) =>
                    field.onChange(value === NONE_VALUE ? "" : value)
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>
                      {t("translationOfNone")}
                    </SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.group_id} value={group.group_id}>
                        {group.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("titleLabel")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                {t("charactersUsed", { count: field.value.length })} / 110
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("slugLabel")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={isPublished}
                  onChange={(event) => {
                    slugTouched.current = true;
                    field.onChange(event);
                  }}
                />
              </FormControl>
              <FormDescription>
                {isPublished
                  ? t("slugLockedHint")
                  : `/${locale}${ARTICLES_PATH}/${slug}`}
              </FormDescription>
              {slugTaken && (
                <p className="text-destructive text-sm">{t("slugTaken")}</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="excerpt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("excerptLabel")}</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormDescription>
                {t("excerptHint")} —{" "}
                {t("charactersUsed", { count: excerpt.length })}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="meta_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("metaDescriptionLabel")}</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} value={field.value ?? ""} />
              </FormControl>
              <FormDescription>
                {t("metaDescriptionHint")} —{" "}
                {t("charactersUsed", { count: metaDescription.length })} / 160
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border-border/60 bg-muted/30 rounded-lg border p-4">
          <p className="mb-2 text-xs font-semibold tracking-wide uppercase">
            {t("serpPreview")}
          </p>
          <p className="text-primary text-base leading-snug">
            {title || t("titleLabel")}
          </p>
          <p className="text-muted-foreground text-xs">
            all4ruse.com/{locale}
            {ARTICLES_PATH}/{slug}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {metaDescription || excerpt}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("categoryLabel")}</FormLabel>
                <Select
                  value={field.value || NONE_VALUE}
                  onValueChange={(value) =>
                    field.onChange(value === NONE_VALUE ? "" : value)
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>
                      {t("categoryNone")}
                    </SelectItem>
                    {ARTICLE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {tCategories(category)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="author_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("authorLabel")}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormItem>
          <FormLabel>{t("heroImageLabel")}</FormLabel>
          <div className="flex items-center gap-4">
            {heroImage ? (
              <div className="bg-muted relative aspect-16/9 w-48 overflow-hidden rounded-md">
                <NextImage
                  src={heroImage}
                  alt=""
                  fill
                  sizes="192px"
                  className="object-cover"
                />
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => heroInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImagePlus className="size-4" />
              )}
              {t("heroImageLabel")}
            </Button>
            <input
              ref={heroInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void uploadHeroImage(file);
              }}
            />
          </div>
        </FormItem>

        <FormField
          control={form.control}
          name="hero_image_alt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("heroImageAltLabel")}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
              <FormDescription>{t("heroImageAltHint")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body_html"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("bodyLabel")}</FormLabel>
              <FormControl>
                <ArticleBodyEditor
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={submitting}
                  onUploadError={(message) => toast.error(message)}
                />
              </FormControl>
              <FormDescription>{t("editorScheduleLinkHint")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border-border/60 space-y-4 rounded-lg border p-4">
          <FormField
            control={form.control}
            name="is_sponsored"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4">
                <div>
                  <FormLabel>{t("sponsoredLabel")}</FormLabel>
                  <FormDescription>{t("sponsoredHint")}</FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {isSponsored && (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="sponsor_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("sponsorNameLabel")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sponsor_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("sponsorUrlLabel")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Hidden once published: "Save draft" would silently unpublish a live
              URL, which is not what that label leads anyone to expect. */}
          {!isPublished && (
            <Button
              type="button"
              variant="outline"
              disabled={busy || slugTaken}
              onClick={form.handleSubmit((values) => submit(values, "draft"))}
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {submitting ? t("saving") : t("saveDraft")}
            </Button>
          )}

          <Button
            type="button"
            disabled={busy || slugTaken}
            onClick={form.handleSubmit((values) => submit(values, "published"))}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {isPublished ? t("update") : t("publish")}
          </Button>

          {isPublished && initialData && (
            <Button asChild variant="ghost">
              <Link href={`${ARTICLES_PATH}/${initialData.slug}`}>
                {t("preview")}
              </Link>
            </Button>
          )}

          {initialData && (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive ml-auto"
              disabled={busy}
              onClick={handleDelete}
            >
              <Trash2 className="size-4" />
              {t("delete")}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
