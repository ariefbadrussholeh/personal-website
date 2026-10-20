import { EnvelopeSimple, GithubLogo, LinkedinLogo, XLogo } from "@phosphor-icons/react/dist/ssr";
import { getSettings } from "@/lib/db";
import ContactForm from "@/components/site/ContactForm";

export const metadata = {
  title: "Contact",
  description: "Send me a message about a project, a job, or just to say hello.",
};

export default async function ContactPage() {
  const s = await getSettings();
  const links = [
    { href: s.email && `mailto:${s.email}`, label: s.email, Icon: EnvelopeSimple },
    { href: s.github, label: "GitHub", Icon: GithubLogo },
    { href: s.linkedin, label: "LinkedIn", Icon: LinkedinLogo },
    { href: s.twitter, label: "X", Icon: XLogo },
  ].filter((l) => l.href);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 pb-24 pt-14 md:px-8 md:pt-20 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
      <div>
        <h1 className="text-4xl font-semibold tracking-tighter md:text-5xl">Contact</h1>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">
          Have a project, a role, or a question? Send a message and I will get back to you within a few days.
        </p>
        {links.length > 0 && (
          <ul className="mt-10 space-y-3 text-[15px]">
            {links.map(({ href, label, Icon }) => (
              <li key={href}>
                <a
                  href={href}
                  target={href.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 text-muted transition-colors hover:text-accent"
                >
                  <Icon size={20} /> {label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ContactForm />
    </div>
  );
}
