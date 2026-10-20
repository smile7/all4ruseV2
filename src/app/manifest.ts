import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://all4ruse.com";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "All4Ruse",
    short_name: "All4Ruse",
    description: "Всички събития в Русе на едно място.",
    id: "/",
    start_url: "/bg?a4r_open=icon",
    display: "standalone",
    prefer_related_applications: false,
    related_applications: [
      {
        platform: "webapp",
        url: `${siteUrl}/manifest.webmanifest`,
      },
    ],
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
