"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import {
  THEME_MEDIA_QUERY,
  THEME_STORAGE_KEY,
} from "~/lib/theme-script";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = Exclude<Theme, "system">;

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  enableSystem?: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia(THEME_MEDIA_QUERY).matches ? "dark" : "light";
}

function isTheme(value: string | null, enableSystem: boolean): value is Theme {
  if (value === "light" || value === "dark") {
    return true;
  }

  return enableSystem && value === "system";
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function readStoredTheme(enableSystem: boolean, fallback: Theme): Theme {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(storedTheme, enableSystem) ? storedTheme : fallback;
  } catch {
    return fallback;
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
}: ThemeProviderProps) {
  const pathname = usePathname();
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const [hydrated, setHydrated] = useState(false);

  const resolvedTheme =
    theme === "system" && enableSystem
      ? systemTheme
      : theme === "system"
        ? "light"
        : theme;

  useIsomorphicLayoutEffect(() => {
    setThemeState(readStoredTheme(enableSystem, defaultTheme));
    setSystemTheme(getSystemTheme());
    setHydrated(true);
  }, [defaultTheme, enableSystem]);

  useEffect(() => {
    if (!enableSystem) {
      return;
    }

    const mediaQueryList = window.matchMedia(THEME_MEDIA_QUERY);
    const handleChange = () => {
      setSystemTheme(getSystemTheme());
    };

    handleChange();
    mediaQueryList.addEventListener("change", handleChange);

    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, [enableSystem]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }

      const nextTheme = isTheme(event.newValue, enableSystem)
        ? event.newValue
        : defaultTheme;
      setThemeState(nextTheme);
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [defaultTheme, enableSystem]);

  useIsomorphicLayoutEffect(() => {
    if (!hydrated) return;
    applyTheme(resolvedTheme);
  }, [hydrated, pathname, resolvedTheme]);

  useEffect(() => {
    function handlePageShow() {
      if (!hydrated) return;
      applyTheme(resolvedTheme);
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [hydrated, resolvedTheme]);

  function setTheme(nextTheme: Theme) {
    setThemeState(nextTheme);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {}
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === null) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }

  return context;
}
