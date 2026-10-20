import { getSettings } from "@/lib/db";

export default async function manifest() {
  const s = await getSettings();
  return {
    name: `${s.name} | ${s.role}`,
    short_name: s.name,
    description: s.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0b0d",
    theme_color: "#0a0b0d",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

