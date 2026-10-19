import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, GithubLogo } from "@phosphor-icons/react/dist/ssr";
import { getEntryBySlug } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import Markdown from "@/components/site/Markdown";
import EditLink from "@/components/site/EditLink";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getEntryBySlug("projects", slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.summary,
    openGraph: { title: p.title, description: p.summary, images: p.cover ? [p.cover] : undefined },
  };
}

export default async function ProjectPage({ params }) {
  const { slug } = await params;
  const admin = await isAdmin();
  const p = await getEntryBySlug("projects", slug, { onlyPublished: !admin });
  if (!p) notFound();

  const facts = [
    p.year && { label: "Year", value: p.year },
    p.role && { label: "Role", value: p.role },
  ].filter(Boolean);

  return (
    <article className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10 md:px-8 md:pt-14">
      {admin && <EditLink href={`/admin/projects/${p.id}`} draft={!p.published} />}

      <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink">
        <ArrowLeft size={14} /> Projects
      </Link>

      <header className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tighter md:text-6xl">
            {p.title || "Untitled"}
          </h1>
          {p.summary && <p className="mt-5 max-w-xl text-xl leading-relaxed text-muted">{p.summary}</p>}
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          {p.live_url && (
            <a href={p.live_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              Live site <ArrowUpRight size={16} />
            </a>
          )}
          {p.repo_url && (
            <a href={p.repo_url} target="_blank" rel="noopener noreferrer" className="btn">
              <GithubLogo size={16} /> Source code
            </a>
          )}
        </div>
      </header>

      {p.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.cover}
          alt=""
          className="mt-12 aspect-[16/9] w-full rounded-[10px] border border-line object-cover"
        />
      )}

      <div className="mt-12 grid gap-12 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="space-y-6 text-sm">
          {facts.map((f) => (
            <div key={f.label}>
              <dt className="text-faint">{f.label}</dt>
              <dd className="mt-1 text-ink">{f.value}</dd>
            </div>
          ))}
          {p.tech.length > 0 && (
            <div>
              <dt className="text-faint">Stack</dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {p.tech.map((t) => (
                  <span key={t} className="chip">{t}</span>
                ))}
              </dd>
            </div>
          )}
        </aside>
        <Markdown>{p.content}</Markdown>
      </div>
    </article>
  );
}
