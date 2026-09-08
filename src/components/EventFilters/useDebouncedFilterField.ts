"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { DEBOUNCE_MS } from "~/constants";
import { useDebounce } from "~/hooks/useDebounce";
import { type FilterValues, useFilters } from "~/hooks/useFilters";

type TextFilterKey = "search" | "host" | "place";

function patch(key: TextFilterKey, value: string): Partial<FilterValues> {
  if (key === "search") return { search: value };
  if (key === "host") return { host: value };
  return { place: value };
}

/**
 * Two-way binding between a text input and its URL search param.
 *
 * Local state drives the input so typing stays instant, debounced values are
 * written to the URL, and URL changes coming from elsewhere (browser
 * back/forward, or the same filter rendered in the filter panel) sync back.
 * `pushedRef` remembers the last value we wrote so our own echo is ignored.
 */
export function useDebouncedFilterField(key: TextFilterKey) {
  const { filters, setFilters } = useFilters();
  const urlValue = filters[key];

  const [value, setValue] = useState(urlValue);
  const pushedRef = useRef(urlValue);

  useEffect(() => {
    if (urlValue !== pushedRef.current) {
      pushedRef.current = urlValue;
      startTransition(() => setValue(urlValue));
    }
  }, [urlValue]);

  const debouncedValue = useDebounce(value, DEBOUNCE_MS);

  useEffect(() => {
    if (debouncedValue !== urlValue) {
      pushedRef.current = debouncedValue;
      setFilters(patch(key, debouncedValue));
    }
  }, [debouncedValue]);

  const clear = useCallback(() => {
    setValue("");
    pushedRef.current = "";
    setFilters(patch(key, ""));
  }, [key, setFilters]);

  return { value, setValue, clear };
}
