import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { getSettings, listEntries } from "@/lib/db";
import { parseStack } from "@/lib/icons";
import { entryDate } from "@/lib/format";
import Reveal from "@/components/site/Reveal";
import Cover from "@/components/site/Cover";
import TechIcon from "@/components/site/TechIcon";
import ScrollRow from "@/components/site/ScrollRow";

const PORTRAIT_FALLBACK = "/samples/portrait.jpg";

/* Bento placement for 1 to 4 featured projects. Every cell holds a project. */
const BENTO = {
  1: ["md:col-span-6"],
  2: ["md:col-span-3", "md:col-span-3"],
  3: ["md:col-span-4 md:row-span-2", "md:col-span-2", "md:col-span-2"],
  4: ["md:col-span-4", "md:col-span-2", "md:col-span-2", "md:col-span-4"],
};

export default async function HomePage() {
  const s = await getSettings();
  const featured = await listEntries("projects", { onlyPublished: true, featured: true, limit: 4 });
  const projects = featured.length ? featured : await listEntries("projects", { onlyPublished: true, limit: 4 });
  const posts = await listEntries("posts", { onlyPublished: true, limit: 4 });
  const albums = await listEntries("albums", { onlyPublished: true, limit: 8 });
  const stack = parseStack(s.stack);
  const cells = BENTO[projects.length] || [];

  return (
    <>
      {/* Hero: asymmetric split, copy left and portrait right */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-20 pt-12 md:px-8 md:pt-16 lg:grid-cols-[1.3fr_1fr] lg:gap-16 lg:pt-20">
        <div className="rise-in">
          <p className="font-mono text-sm text-accent">{s.role}</p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tighter md:text-5xl lg:text-6xl">
            {s.headline}
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">{s.tagline}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/projects" className="btn btn-primary">
              See projects <ArrowRight size={16} />
            </Link>
            <Link href="/blog" className="btn">
              Read the blog
            </Link>
          </div>
        </div>

        <div className="rise-in relative mx-auto w-full max-w-sm lg:ml-auto lg:mr-0" style={{ animationDelay: "0.12s" }}>
          <div
            className="absolute inset-0 translate-x-3 translate-y-3 rounded-[10px] border border-accent/30"
            aria-hidden
          />
          <Cover
            src={s.avatar || PORTRAIT_FALLBACK}
            alt={`Portrait of ${s.name}`}
            className="relative aspect-[4/5] rounded-[10px] border border-line-strong"
          />
        </div>
      </section>

      {/* Selected projects: bento grid */}
      {projects.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-5 py-20 md:px-8 md:py-24">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">Selected projects</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-6 md:[grid-auto-rows:minmax(17rem,auto)]">
            {projects.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.06} className={`${cells[i]} min-h-[17rem]`}>
                <Link
                  href={`/projects/${p.slug}`}
                  className="group relative block h-full min-h-[17rem] overflow-hidden rounded-[10px] border border-line bg-surface-2 transition-colors hover:border-line-strong"
                >
                  {p.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.cover}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-transparent" aria-hidden />
                  <div className="relative flex h-full min-h-[17rem] flex-col justify-end p-6">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-xl font-semibold tracking-tight">{p.title || "Untitled"}</h3>
                      <ArrowUpRight
                        size={20}
                        className="mt-1 shrink-0 text-muted transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                      />
                    </div>
                    {p.summary && (
                      <p className="mt-2 line-clamp-2 max-w-md text-sm leading-relaxed text-muted">{p.summary}</p>
                    )}
                    {p.tech.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {p.tech.slice(0, 4).map((t) => (
                          <span key={t} className="chip bg-bg/60 backdrop-blur-sm">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
          <Link href="/projects" className="btn mt-8">
            All projects <ArrowRight size={16} />
          </Link>
        </section>
      )}

      {/* Latest writing: editorial list */}
      {posts.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-5 py-20 md:px-8 md:py-24">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">Latest writing</h2>
          </Reveal>
          <ul className="mt-10 divide-y divide-line border-y border-line">
            {posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group grid gap-x-10 gap-y-2 py-7 md:grid-cols-[9rem_1fr_auto] md:items-baseline"
                >
                  <time className="font-mono text-sm text-faint" dateTime={post.published_at || post.created_at}>
                    {entryDate(post)}
                  </time>
                  <div>
                    <h3 className="text-xl font-medium tracking-tight transition-colors group-hover:text-accent">
                      {post.title || "Untitled"}
                    </h3>
                    {post.excerpt && (
                      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{post.excerpt}</p>
                    )}
                  </div>
                  <ArrowUpRight
                    size={18}
                    className="hidden text-faint transition-colors group-hover:text-accent md:block"
                  />
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/blog" className="btn mt-8">
            All posts <ArrowRight size={16} />
          </Link>
        </section>
      )}

      {/* Tools: logo tiles */}
      {stack.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-5 py-20 md:px-8 md:py-24">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">Tools I use</h2>
            <ul className="mt-10 flex flex-wrap gap-3">
              {stack.map((icon) => (
                <li
                  key={icon.slug}
                  title={icon.title}
                  className="flex h-16 w-16 items-center justify-center rounded-[10px] border border-line bg-surface text-muted transition-colors hover:border-accent/50 hover:text-accent"
                >
                  <TechIcon icon={icon} size={26} />
                </li>
              ))}
            </ul>
          </Reveal>
        </section>
      )}

      {/* Albums: scroll-snap strip */}
      {albums.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-5 py-20 md:px-8 md:py-24">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">Photo albums</h2>
          </Reveal>
          <div className="mt-10">
            <ScrollRow>
              {albums.map((a) => (
                <Link
                  key={a.id}
                  href={`/album/${a.slug}`}
                  className="group w-[78%] shrink-0 snap-start sm:w-[19rem]"
                >
                  <Cover
                    src={a.cover}
                    alt=""
                    className="aspect-[4/5] rounded-[10px] border border-line"
                    imgClassName="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
                  />
                  <h3 className="mt-3 text-base font-medium tracking-tight transition-colors group-hover:text-accent">
                    {a.title || "Untitled"}
                  </h3>
                  <p className="text-sm text-faint">{a.photo_count} photos</p>
                </Link>
              ))}
            </ScrollRow>
          </div>
        </section>
      )}

      {/* Closing call to action */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-24 pt-12 md:px-8">
        <Reveal>
          <div className="rounded-[10px] border border-line bg-surface bg-[radial-gradient(60%_140%_at_100%_0%,rgba(74,130,255,0.10),transparent)] px-7 py-14 md:px-14 md:py-20">
            <h2 className="max-w-xl text-3xl font-semibold leading-tight tracking-tighter md:text-5xl">
              Have something in mind? Let&apos;s talk.
            </h2>
            <p className="mt-4 max-w-md text-muted">
              I read every message and reply within a few days.
            </p>
            <a
              href={s.email ? `mailto:${s.email}` : "/about"}
              className="btn btn-primary mt-8"
            >
              Say hello <ArrowRight size={16} />
            </a>
          </div>
        </Reveal>
      </section>
    </>
  );
}
