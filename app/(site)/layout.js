import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import { getSettings } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export default async function SiteLayout({ children }) {
  const settings = await getSettings();
  const admin = await isAdmin();
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[10px] focus:bg-accent-solid focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Nav name={settings.name} github={settings.github} admin={admin} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer settings={settings} />
    </>
  );
}
