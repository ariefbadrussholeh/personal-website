"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { GithubLogo, List, X, GearSix } from "@phosphor-icons/react";
import { motion } from "motion/react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/projects", label: "Projects" },
  { href: "/album", label: "Album" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function isActive(pathname, href) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export default function Nav({ name, github, admin, icon = "/icon.png" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 md:px-8">
        <Link href="/" className="group inline-flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-ink">
          <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[7px] border border-line bg-surface transition-colors group-hover:border-line-strong">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={icon || "/icon.png"}
              alt=""
              width={20}
              height={20}
              className="h-5 w-5 object-contain"
              onError={(e) => {
                if (!e.currentTarget.dataset.fallback) {
                  e.currentTarget.dataset.fallback = "1";
                  e.currentTarget.src = "/favicon.ico";
                }
              }}
            />
          </span>
          <span>{name}</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-[10px] px-3 py-2 text-sm transition-colors ${
                  active ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {l.label}
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                    className="absolute inset-x-3 -bottom-[17px] h-px bg-accent"
                    aria-hidden
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          {admin && (
            <Link href="/admin" className="btn btn-sm hidden md:inline-flex" aria-label="Open admin panel">
              <GearSix size={16} /> Admin
            </Link>
          )}
          {github && (
            <a
              href={github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub profile"
              className="btn btn-icon border-transparent text-muted hover:text-ink"
            >
              <GithubLogo size={20} />
            </a>
          )}
          <button
            type="button"
            className="btn btn-icon border-transparent md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <List size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <nav aria-label="Mobile" className="fade-in border-t border-line bg-bg px-5 pb-4 pt-2 md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(pathname, l.href) ? "page" : undefined}
              className={`block rounded-[10px] px-3 py-3 text-base ${
                isActive(pathname, l.href) ? "text-accent" : "text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {admin && (
            <Link href="/admin" className="block rounded-[10px] px-3 py-3 text-base text-muted">
              Admin
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
