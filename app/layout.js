import { Suspense } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import NavigationProgress from "@/components/site/NavigationProgress";
import { getSettings } from "@/lib/db";
import "./globals.css";

// Content comes from the database and changes at runtime.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const s = await getSettings();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title: { default: `${s.name} | ${s.role}`, template: `%s | ${s.name}` },
    description: s.tagline,
    openGraph: { siteName: s.name, type: "website" },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport = {
  themeColor: "#0a0b0d",
  colorScheme: "dark",
};

export default async function RootLayout({ children }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
