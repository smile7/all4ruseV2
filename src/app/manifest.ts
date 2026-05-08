import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "All4Ruse",
    short_name: "All4Ruse",
    description: "Всички събития в Русе на едно място.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#e06830",
    orientation: "portrait",
    categories: ["entertainment", "lifestyle", "social"],
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
