import Link from "next/link";
import { GithubLogo, LinkedinLogo, XLogo, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";

import LikeButton from "./LikeButton";

export default function Footer({ settings, siteLike }) {
  const socials = [
    { href: settings.github, label: "GitHub", Icon: GithubLogo },
    { href: settings.linkedin, label: "LinkedIn", Icon: LinkedinLogo },
    { href: settings.twitter, label: "X", Icon: XLogo },
    { href: settings.email && `mailto:${settings.email}`, label: "Email", Icon: EnvelopeSimple },
  ].filter((s) => s.href);

  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        <div>
          <p className="text-base font-semibold tracking-tight">{settings.name}</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{settings.tagline}</p>
          {siteLike && (
            <div className="mt-5">
              <LikeButton target="site" initialCount={siteLike.count} initialLiked={siteLike.liked} subject="this site" />
            </div>
          )}
        </div>

        <nav aria-label="Footer" className="grid content-start gap-2 text-sm">
          <Link href="/blog" className="text-muted transition-colors hover:text-ink">Blog</Link>
          <Link href="/projects" className="text-muted transition-colors hover:text-ink">Projects</Link>
          <Link href="/album" className="text-muted transition-colors hover:text-ink">Album</Link>
          <Link href="/about" className="text-muted transition-colors hover:text-ink">About</Link>
          <Link href="/contact" className="text-muted transition-colors hover:text-ink">Contact</Link>
        </nav>

        <div className="flex content-start gap-2 md:justify-end">
          {socials.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("mailto:") ? undefined : "_blank"}
              rel="noopener noreferrer"
              aria-label={label}
              className="btn btn-icon text-muted hover:text-ink"
            >
              <Icon size={18} />
            </a>
          ))}
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-5 pb-8 text-xs text-faint md:px-8">
        Copyright {new Date().getFullYear()} {settings.name}. All rights reserved.
      </div>
    </footer>
  );
}
