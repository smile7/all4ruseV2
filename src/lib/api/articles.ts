import type { SupabaseClient } from "@supabase/supabase-js";

import { ARTICLES_PAGE_SIZE } from "~/constants";
import type { Article, ArticleSibling } from "~/types";
import type { Database, TablesInsert, TablesUpdate } from "~/types/database";

type Client = SupabaseClient<Database>;

/**
 * The select policy also matches `created_by = auth.uid()`, so every public
 * query must filter on status explicitly — otherwise the admin sees their own
 * drafts mixed into the public listing.
 */
const PUBLISHED = "published";

export type ArticleSitemapEntry = {
  locale: string;
  slug: string;
  updatedAt: string;
};

/** Minimal shape for the "translation of" picker in the admin form. */
export type ArticleGroupOption = {
  group_id: string;
  locale: string;
  title: string;
};

/** Row shape for the admin's list of existing articles. */
export type AdminArticleListItem = {
  id: string;
  locale: string;
  slug: string;
  title: string;
  status: string;
  updated_at: string;
};

export const articlesApi = {
  async getPublishedArticles(
    client: Client,
    params: { locale: string; page?: number; pageSize?: number },
  ): Promise<{ articles: Article[]; total: number }> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? ARTICLES_PAGE_SIZE;
    const from = (page - 1) * pageSize;

    const { data, error, count } = await client
      .from("articles")
      .select("*", { count: "exact" })
      .eq("locale", params.locale)
      .eq("status", PUBLISHED)
      .order("published_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    return { articles: data ?? [], total: count ?? 0 };
  },

  async getPublishedArticleBySlug(
    client: Client,
    locale: string,
    slug: string,
  ): Promise<Article | null> {
    const { data, error } = await client
      .from("articles")
      .select("*")
      .eq("locale", locale)
      .eq("slug", slug)
      .eq("status", PUBLISHED)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  },

  /**
   * Published translations of the same article, excluding the current locale.
   * hreflang is built from this, so it must never include drafts.
   */
  async getTranslationSiblings(
    client: Client,
    groupId: string,
    excludeLocale?: string,
  ): Promise<ArticleSibling[]> {
    const { data, error } = await client
      .from("articles")
      .select("locale, slug")
      .eq("group_id", groupId)
      .eq("status", PUBLISHED);

    if (error) throw error;
    return (data ?? []).filter((row) => row.locale !== excludeLocale);
  },

  async getLatestArticles(
    client: Client,
    locale: string,
    limit: number,
  ): Promise<Article[]> {
    const { data, error } = await client
      .from("articles")
      .select("*")
      .eq("locale", locale)
      .eq("status", PUBLISHED)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  },

  async getRelatedArticles(
    client: Client,
    locale: string,
    excludeId: string,
    limit: number,
  ): Promise<Article[]> {
    const { data, error } = await client
      .from("articles")
      .select("*")
      .eq("locale", locale)
      .eq("status", PUBLISHED)
      .neq("id", excludeId)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  },

  /** Used by the edit form — relies on the `created_by` clause of the select policy. */
  async getArticleById(client: Client, id: string): Promise<Article | null> {
    const { data, error } = await client
      .from("articles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  },

  /**
   * Throws rather than returning an empty list: a silently empty sitemap is
   * worse than a failed build, since it de-indexes the whole section.
   */
  async getArticleSitemapEntries(
    client: Client,
  ): Promise<ArticleSitemapEntry[]> {
    const { data, error } = await client
      .from("articles")
      .select("locale, slug, updated_at")
      .eq("status", PUBLISHED);

    if (error) throw error;
    return (data ?? []).map((row) => ({
      locale: row.locale,
      slug: row.slug,
      updatedAt: row.updated_at,
    }));
  },

  async isSlugAvailable(
    client: Client,
    locale: string,
    slug: string,
    excludeId?: string,
  ): Promise<boolean> {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) return true;

    const { data, error } = await client
      .from("articles")
      .select("id")
      .eq("locale", locale)
      .eq("slug", normalized)
      .maybeSingle();

    if (error) throw error;
    if (!data) return true;
    return Boolean(excludeId && data.id === excludeId);
  },

  /**
   * Every article the caller can see — drafts included — for the admin list.
   * Ordered by last edit, which is the order an editor actually thinks in.
   */
  async getAdminArticleList(client: Client): Promise<AdminArticleListItem[]> {
    const { data, error } = await client
      .from("articles")
      .select("id, locale, slug, title, status, updated_at")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  /** Bulgarian titles of every article group, for the "translation of" picker. */
  async getArticleGroups(client: Client): Promise<ArticleGroupOption[]> {
    const { data, error } = await client
      .from("articles")
      .select("group_id, locale, title")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const byGroup = new Map<string, ArticleGroupOption>();
    for (const row of data ?? []) {
      const existing = byGroup.get(row.group_id);
      // Prefer the Bulgarian title as the group's label — it is the source copy.
      if (!existing || (row.locale === "bg" && existing.locale !== "bg")) {
        byGroup.set(row.group_id, row);
      }
    }
    return [...byGroup.values()];
  },

  // ─── Writes (service-role client only, called from admin API routes) ────────

  async createArticle(
    client: Client,
    payload: TablesInsert<"articles">,
  ): Promise<Article> {
    const { data, error } = await client
      .from("articles")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateArticle(
    client: Client,
    id: string,
    payload: TablesUpdate<"articles">,
  ): Promise<Article> {
    const { data, error } = await client
      .from("articles")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteArticle(client: Client, id: string): Promise<void> {
    const { error } = await client.from("articles").delete().eq("id", id);
    if (error) throw error;
  },
};
