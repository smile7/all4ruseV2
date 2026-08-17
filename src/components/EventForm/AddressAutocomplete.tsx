"use client";

import {
  type KeyboardEvent,
  type Ref,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";

import { useFormField } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { DEBOUNCE_MS } from "~/constants";
import { useDebounce } from "~/hooks/useDebounce";
import type { PlaceDetailsResult, PlaceSuggestion } from "~/lib/geocode/types";
import { cn } from "~/lib/utils";

const MIN_QUERY_LENGTH = 2;

type AddressAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  placeholder?: string;
  inputRef?: Ref<HTMLInputElement>;
  "aria-required"?: boolean;
  onPlacesPick: (details: PlaceDetailsResult) => void;
  onUserTyped: () => void;
};

function newSessionToken(): string {
  return crypto.randomUUID();
}

export function AddressAutocomplete({
  value,
  onChange,
  onBlur,
  name,
  placeholder,
  inputRef,
  "aria-required": ariaRequired,
  onPlacesPick,
  onUserTyped,
}: AddressAutocompleteProps) {
  const t = useTranslations("CreateEvent");
  const { formItemId, error, formMessageId } = useFormField();
  const listId = useId();

  const sessionTokenRef = useRef<string>(newSessionToken());
  const typedSinceFocusRef = useRef(false);
  const ignoreBlurRef = useRef(false);

  const [isFocused, setIsFocused] = useState(false);
  const [typedSinceFocus, setTypedSinceFocus] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const debouncedQuery = useDebounce(value, DEBOUNCE_MS);
  const queryReady =
    typedSinceFocus &&
    isFocused &&
    debouncedQuery === value &&
    debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  function markTyped() {
    typedSinceFocusRef.current = true;
    setTypedSinceFocus(true);
    onUserTyped();
  }

  function resetList() {
    setSuggestions([]);
    setHighlightedIndex(-1);
    setIsLoading(false);
  }

  function dismissWithoutPick() {
    if (typedSinceFocusRef.current) {
      sessionTokenRef.current = newSessionToken();
    }
    typedSinceFocusRef.current = false;
    setTypedSinceFocus(false);
    resetList();
  }

  useEffect(() => {
    if (!queryReady) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      q: debouncedQuery.trim(),
      sessionToken: sessionTokenRef.current,
    });

    fetch(`/api/geocode/suggest?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (controller.signal.aborted) return;
        if (!response.ok) {
          setSuggestions([]);
          return;
        }
        setSuggestions(parseSuggestions(await response.json()));
        setHighlightedIndex(-1);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSuggestions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [queryReady, debouncedQuery]);

  async function selectSuggestion(suggestion: PlaceSuggestion) {
    setIsPicking(true);
    typedSinceFocusRef.current = false;
    setTypedSinceFocus(false);
    resetList();

    try {
      const params = new URLSearchParams({
        id: suggestion.placeId,
        sessionToken: sessionTokenRef.current,
      });
      const response = await fetch(`/api/geocode/place?${params.toString()}`);
      const details = response.ok
        ? parsePlaceDetails(await response.json())
        : null;

      onPlacesPick({
        lat: details?.lat ?? null,
        lng: details?.lng ?? null,
        source: details?.lat != null && details?.lng != null ? "places" : null,
        address: details?.address ?? suggestion.mainText,
        town: details?.town ?? null,
        place: details?.place ?? null,
      });
    } catch {
      onPlacesPick({
        lat: null,
        lng: null,
        source: null,
        address: suggestion.mainText,
        town: null,
        place: null,
      });
    } finally {
      sessionTokenRef.current = newSessionToken();
      setIsPicking(false);
    }
  }

  const showNoResults =
    typedSinceFocus && !isLoading && suggestions.length === 0 && queryReady;
  const showList =
    typedSinceFocus && (isLoading || suggestions.length > 0 || showNoResults);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (showList) {
        event.preventDefault();
        dismissWithoutPick();
      }
      return;
    }

    if (!showList) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((index) =>
        suggestions.length === 0 ? -1 : (index + 1) % suggestions.length,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((index) => {
        if (suggestions.length === 0) return -1;
        return index <= 0 ? suggestions.length - 1 : index - 1;
      });
      return;
    }

    if (event.key === "Enter" && highlightedIndex >= 0) {
      const suggestion = suggestions[highlightedIndex];
      if (suggestion) {
        event.preventDefault();
        void selectSuggestion(suggestion);
      }
    }
  }

  const activeOptionId =
    highlightedIndex >= 0 ? `${listId}-option-${highlightedIndex}` : undefined;

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={formItemId}
        name={name}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-required={ariaRequired}
        aria-invalid={!!error}
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={activeOptionId}
        aria-describedby={error ? formMessageId : undefined}
        role="combobox"
        disabled={isPicking}
        onChange={(event) => {
          const next = event.target.value;
          markTyped();
          onChange(next);
          if (next.trim().length < MIN_QUERY_LENGTH) {
            resetList();
          } else {
            setIsLoading(true);
          }
        }}
        onFocus={() => {
          setIsFocused(true);
        }}
        onBlur={() => {
          setIsFocused(false);
          onBlur?.();
          window.setTimeout(() => {
            if (ignoreBlurRef.current) {
              ignoreBlurRef.current = false;
              return;
            }
            dismissWithoutPick();
          }, 0);
        }}
        onKeyDown={handleKeyDown}
      />

      {showList ? (
        <div
          className="bg-popover text-popover-foreground absolute z-30 mt-1 w-full min-w-[16rem] overflow-hidden rounded-md border shadow-md"
          onMouseDown={() => {
            ignoreBlurRef.current = true;
          }}
        >
          <ul
            id={listId}
            role="listbox"
            aria-label={t("address")}
            className="max-h-60 overflow-y-auto py-1"
          >
            {isLoading ? (
              <li className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-sm">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                {t("addressSuggestLoading")}
              </li>
            ) : null}

            {!isLoading &&
              suggestions.map((suggestion, index) => {
                const isActive = index === highlightedIndex;
                return (
                  <li
                    key={suggestion.placeId}
                    id={`${listId}-option-${index}`}
                    role="option"
                    aria-selected={isActive}
                    className={cn(
                      "cursor-pointer px-3 py-2 text-sm",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/60",
                    )}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      void selectSuggestion(suggestion);
                    }}
                  >
                    <div className="font-medium">{suggestion.mainText}</div>
                    {suggestion.secondaryText ? (
                      <div className="text-muted-foreground text-xs">
                        {suggestion.secondaryText}
                      </div>
                    ) : null}
                  </li>
                );
              })}

            {showNoResults ? (
              <li className="text-muted-foreground px-3 py-2 text-sm">
                {t("addressSuggestNoResults")}
              </li>
            ) : null}
          </ul>
          <p className="text-muted-foreground border-t px-3 py-1.5 text-[10px] tracking-wide">
            Powered by Google
          </p>
        </div>
      ) : null}
    </div>
  );
}

function parseSuggestions(body: unknown): PlaceSuggestion[] {
  if (typeof body !== "object" || body === null) return [];
  const raw = (body as { suggestions?: unknown }).suggestions;
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const record = item as Record<string, unknown>;
    if (typeof record.placeId !== "string" || typeof record.text !== "string") {
      return [];
    }
    return [
      {
        placeId: record.placeId,
        text: record.text,
        mainText:
          typeof record.mainText === "string" ? record.mainText : record.text,
        secondaryText:
          typeof record.secondaryText === "string"
            ? record.secondaryText
            : null,
      },
    ];
  });
}

function parsePlaceDetails(body: unknown): PlaceDetailsResult | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  const lat =
    typeof record.lat === "number" && Number.isFinite(record.lat)
      ? record.lat
      : null;
  const lng =
    typeof record.lng === "number" && Number.isFinite(record.lng)
      ? record.lng
      : null;

  return {
    lat,
    lng,
    source: lat != null && lng != null ? "places" : null,
    address: typeof record.address === "string" ? record.address : null,
    town: typeof record.town === "string" ? record.town : null,
    place: typeof record.place === "string" ? record.place : null,
  };
}
