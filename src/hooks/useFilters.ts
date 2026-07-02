"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { usePathname, useRouter } from "~/i18n/navigation";

export type FilterValues = {
  search: string;
  tagIds: number[];
  from: string; // ISO date YYYY-MM-DD
  to: string; // ISO date YYYY-MM-DD
  isFree: boolean;
  host: string;
  place: string;
};

function parseTagIds(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);
}

export function useFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: FilterValues = useMemo(
    () => ({
      search: searchParams.get("search") ?? "",
      tagIds: parseTagIds(searchParams.get("tags")),
      from: searchParams.get("from") ?? "",
      to: searchParams.get("to") ?? "",
      isFree: searchParams.get("isFree") === "true",
      host: searchParams.get("host") ?? "",
      place: searchParams.get("place") ?? "",
    }),
    [searchParams],
  );

  const hasActiveFilters =
    filters.search !== "" ||
    filters.tagIds.length > 0 ||
    filters.from !== "" ||
    filters.to !== "" ||
    filters.isFree ||
    filters.host !== "" ||
    filters.place !== "";

  const activeCount = [
    filters.search !== "",
    filters.tagIds.length > 0,
    filters.from !== "" || filters.to !== "",
    filters.isFree,
    filters.host !== "",
    filters.place !== "",
  ].filter(Boolean).length;

  const buildParams = useCallback(
    (overrides: Partial<FilterValues>): URLSearchParams => {
      const merged = { ...filters, ...overrides };
      const next = new URLSearchParams();

      if (merged.search) next.set("search", merged.search);
      if (merged.tagIds.length) next.set("tags", merged.tagIds.join(","));
      if (merged.from) next.set("from", merged.from);
      if (merged.to) next.set("to", merged.to);
      if (merged.isFree) next.set("isFree", "true");
      if (merged.host) next.set("host", merged.host);
      if (merged.place) next.set("place", merged.place);

      return next;
    },
    [filters],
  );

  const setFilters = useCallback(
    (overrides: Partial<FilterValues>) => {
      const next = buildParams(overrides);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [buildParams, pathname, router],
  );

  const setDateRange = useCallback(
    (from: string, to: string) => {
      setFilters({ from, to });
    },
    [setFilters],
  );

  const toggleTag = useCallback(
    (tagId: number) => {
      const next = filters.tagIds.includes(tagId)
        ? filters.tagIds.filter((id) => id !== tagId)
        : [...filters.tagIds, tagId];
      setFilters({ tagIds: next });
    },
    [filters.tagIds, setFilters],
  );

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return {
    filters,
    setFilters,
    setDateRange,
    toggleTag,
    clearFilters,
    hasActiveFilters,
    activeCount,
  };
}
