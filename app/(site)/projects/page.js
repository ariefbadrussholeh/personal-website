import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { listEntries } from "@/lib/db";
import PageHeader from "@/components/site/PageHeader";
import Cover from "@/components/site/Cover";

export const metadata = {
  title: "Projects",
  description: "Things I have designed, built and shipped.",
};

function Meta({ p }) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight transition-colors group-hover:text-accent">
          {p.title || "Untitled"}
        </h2>
        <ArrowUpRight size={20} className="mt-1.5 shrink-0 text-faint transition-colors group-hover:text-accent" />
      </div>
      {p.summary && <p className="mt-3 leading-relaxed text-muted">{p.summary}</p>}
      {p.tech.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {p.tech.map((t) => (
            <span key={t} className="chip">{t}</span>
          ))}
        </div>
      )}
    </>
  );
}

export default async function ProjectsIndex() {
  const projects = await listEntries("projects", { onlyPublished: true });
  const [first, ...rest] = projects;

  return (
    <>
      <PageHeader title="Projects">Things I have designed, built and shipped.</PageHeader>

      <div className="mx-auto w-full max-w-6xl px-5 pb-24 md:px-8">
        {projects.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-line-strong px-6 py-16 text-center">
            <p className="text-lg font-medium">No projects yet.</p>
            <p className="mt-2 text-muted">Published projects will show up here.</p>
          </div>
        ) : (
          <div className="grid gap-x-6 gap-y-12 md:grid-cols-2">
            {/* The newest project gets a wide horizontal layout */}
            <Link
              href={`/projects/${first.slug}`}
              className="group grid gap-6 md:col-span-2 md:grid-cols-[1.4fr_1fr] md:items-center md:gap-10"
            >
              <Cover
                src={first.cover}
                alt=""
                className="aspect-[16/10] rounded-[10px] border border-line"
                imgClassName="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
              />
              <div>
                <Meta p={first} />
              </div>
            </Link>

            {rest.map((p) => (
              <Link key={p.id} href={`/projects/${p.slug}`} className="group block">
                <Cover
                  src={p.cover}
                  alt=""
                  className="aspect-[16/10] rounded-[10px] border border-line"
                  imgClassName="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
                />
                <div className="mt-5">
                  <Meta p={p} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
