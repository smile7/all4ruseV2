export const THEME_STORAGE_KEY = "theme";
export const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

/**
 * Runs before paint so the first screen matches localStorage. Next.js client
 * navigations rewrite `html.className` from the server layout (no `.dark`),
 * which is why ThemeProvider also re-applies on pathname changes.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var m=window.matchMedia(${JSON.stringify(THEME_MEDIA_QUERY)}).matches;var d=t==="dark"||((t==="system"||!t)&&m);if(t==="light")d=false;document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light"}catch(e){}})();`;
