import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { listEntries, listTags, readingMinutes } from "@/lib/db";
import { entryDate } from "@/lib/format";
import PageHeader from "@/components/site/PageHeader";
import Cover from "@/components/site/Cover";

export const metadata = {
  title: "Blog",
  description: "Writing about software, the tools I use, and things I learn along the way.",
};

export default async function BlogIndex({ searchParams }) {
  const { tag } = await searchParams;
  const posts = await listEntries("posts", { onlyPublished: true, tag: tag || undefined });
  const tags = await listTags();

  return (
    <>
      <PageHeader title="Blog">
        Writing about software, the tools I use, and things I learn along the way.
      </PageHeader>

      <div className="mx-auto w-full max-w-6xl px-5 pb-24 md:px-8">
        {tags.length > 0 && (
          <div className="mb-10 flex flex-wrap gap-2" aria-label="Filter by tag">
            <Link
              href="/blog"
              className={`chip transition-colors hover:text-ink ${!tag ? "border-accent/60 text-accent" : ""}`}
            >
              All
            </Link>
            {tags.map((t) => (
              <Link
                key={t.tag}
                href={`/blog?tag=${encodeURIComponent(t.tag)}`}
                className={`chip transition-colors hover:text-ink ${
                  tag === t.tag ? "border-accent/60 text-accent" : ""
                }`}
              >
                {t.tag}
              </Link>
            ))}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-line-strong px-6 py-16 text-center">
            <p className="text-lg font-medium">No posts here yet.</p>
            <p className="mt-2 text-muted">
              {tag ? "Nothing is tagged with that topic." : "Check back soon."}
            </p>
            {tag && (
              <Link href="/blog" className="btn mt-6">Show all posts</Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group grid gap-x-8 gap-y-4 py-8 md:grid-cols-[1fr_11rem] md:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-sm text-faint">
                      <time dateTime={post.published_at || post.created_at}>{entryDate(post)}</time>
                      <span>{readingMinutes(post.content)} min read</span>
                    </div>
                    <h2 className="mt-3 flex items-start gap-2 text-2xl font-medium tracking-tight transition-colors group-hover:text-accent">
                      {post.title || "Untitled"}
                      <ArrowUpRight size={18} className="mt-1.5 shrink-0 text-faint transition-colors group-hover:text-accent" />
                    </h2>
                    {post.excerpt && (
                      <p className="mt-2 max-w-2xl leading-relaxed text-muted">{post.excerpt}</p>
                    )}
                    {post.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {post.tags.map((t) => (
                          <span key={t} className="chip">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {post.cover && (
                    <Cover
                      src={post.cover}
                      alt=""
                      className="order-first aspect-[16/9] rounded-[10px] border border-line md:order-none md:aspect-[4/3]"
                      imgClassName="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
