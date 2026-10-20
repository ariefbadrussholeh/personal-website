import { getSettings, listPublicExperiences } from "@/lib/db";
import { parseStack } from "@/lib/icons";
import { GithubLogo, LinkedinLogo, XLogo, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import PageHeader from "@/components/site/PageHeader";
import Markdown from "@/components/site/Markdown";
import Cover from "@/components/site/Cover";
import TechIcon from "@/components/site/TechIcon";
import ExperienceTimeline from "@/components/site/ExperienceTimeline";

export const metadata = { title: "About" };

const PORTRAIT_FALLBACK = "/samples/portrait.jpg";

export default async function AboutPage() {
  const s = await getSettings();
  const experiences = await listPublicExperiences();
  const stack = parseStack(s.stack);
  const links = [
    { href: s.github, label: "GitHub", Icon: GithubLogo },
    { href: s.linkedin, label: "LinkedIn", Icon: LinkedinLogo },
    { href: s.twitter, label: "X", Icon: XLogo },
    { href: s.email && `mailto:${s.email}`, label: s.email, Icon: EnvelopeSimple },
  ].filter((l) => l.href);

  return (
    <>
      <PageHeader title="About">{s.role}</PageHeader>

      <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 pb-24 md:px-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-16">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Cover
            src={s.avatar || PORTRAIT_FALLBACK}
            alt={`Portrait of ${s.name}`}
            className="aspect-[4/5] max-w-xs rounded-[10px] border border-line-strong"
          />
          <ul className="mt-6 space-y-2 text-sm">
            {links.map(({ href, label, Icon }) => (
              <li key={href}>
                <a
                  href={href}
                  target={href.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-muted transition-colors hover:text-accent"
                >
                  <Icon size={18} /> {label}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <div>
          <Markdown>{s.about}</Markdown>
          {experiences.length > 0 && (
            <section id="experience" className="mt-16 scroll-mt-24">
              <h2 className="text-2xl font-semibold tracking-tight">Experience</h2>
              <div className="mt-8">
                <ExperienceTimeline items={experiences} />
              </div>
            </section>
          )}
          {stack.length > 0 && (
            <div className="mt-14">
              <h2 className="text-2xl font-semibold tracking-tight">Tools I use</h2>
              <ul className="mt-6 flex flex-wrap gap-3">
                {stack.map((icon) => (
                  <li
                    key={icon.slug}
                    title={icon.title}
                    className="flex h-14 w-14 items-center justify-center rounded-[10px] border border-line bg-surface text-muted transition-colors hover:border-accent/50 hover:text-accent"
                  >
                    <TechIcon icon={icon} size={24} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
