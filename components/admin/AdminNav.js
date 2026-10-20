"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight, Article, Briefcase, ChartBar, ChatCircle, EnvelopeSimple, GearSix, House, Images, SignOut, Suitcase,
} from "@phosphor-icons/react";
import { api } from "@/lib/client";

const ITEMS = [
  { href: "/admin", label: "Ringkasan", Icon: House, exact: true },
  { href: "/admin/analytics", label: "Analitik", Icon: ChartBar },
  { href: "/admin/blog", label: "Blog", Icon: Article },
  { href: "/admin/projects", label: "Project", Icon: Briefcase },
  { href: "/admin/album", label: "Album", Icon: Images },
  { href: "/admin/experience", label: "Pengalaman", Icon: Suitcase },
  { href: "/admin/messages", label: "Pesan", Icon: EnvelopeSimple, badge: true },
  { href: "/admin/comments", label: "Komentar", Icon: ChatCircle },
  { href: "/admin/settings", label: "Pengaturan", Icon: GearSix },
];

export default function AdminNav({ unread = 0 }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {ITEMS.map(({ href, label, Icon, exact, badge }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm transition-colors ${
              active ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface hover:text-ink"
            }`}
          >
            <Icon size={18} className={active ? "text-accent" : ""} />
            {label}
            {badge && unread > 0 && (
              <span className="ml-auto rounded-[6px] bg-accent px-1.5 text-xs font-medium tabular-nums text-black" aria-label={`${unread} belum dibaca`}>
                {unread}
              </span>
            )}
          </Link>
        );
      })}
      <div className="hidden h-px bg-line lg:my-3 lg:block" />
      <Link
        href="/"
        target="_blank"
        className="flex shrink-0 items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm text-muted transition-colors hover:bg-surface hover:text-ink"
      >
        <ArrowUpRight size={18} /> Lihat situs
      </Link>
      <button
        type="button"
        onClick={logout}
        className="flex shrink-0 items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface hover:text-ink"
      >
        <SignOut size={18} /> Keluar
      </button>
    </nav>
  );
}
