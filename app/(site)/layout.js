import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import PointerEffects from "@/components/site/PointerEffects";
import Tracker from "@/components/site/Tracker";
import { getLikeState, getSettings } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { readVisitor } from "@/lib/visitor";

export default async function SiteLayout({ children }) {
  const settings = await getSettings();
  const admin = await isAdmin();
  const siteLike = await getLikeState("site", await readVisitor());
  return (
    <>
      <PointerEffects />
      <Tracker />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[10px] focus:bg-accent-solid focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Nav name={settings.name} github={settings.github} admin={admin} icon={settings.icon || "/icon.png"} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer settings={settings} siteLike={siteLike} />
    </>
  );
}
