import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { getEntryBySlug, readingMinutes } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { entryDate } from "@/lib/format";
import { extractHeadings } from "@/lib/headings";
import Markdown from "@/components/site/Markdown";
import Toc from "@/components/site/Toc";
import EditLink from "@/components/site/EditLink";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getEntryBySlug("posts", slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.published_at || undefined,
      images: post.cover ? [post.cover] : undefined,
    },
  };
}

export default async function PostPage({ params }) {
  const { slug } = await params;
  const admin = await isAdmin();
  const post = await getEntryBySlug("posts", slug, { onlyPublished: !admin });
  if (!post) notFound();
  const headings = extractHeadings(post.content);

  return (
    <article className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10 md:px-8 md:pt-14">
      {admin && <EditLink href={`/admin/blog/${post.id}`} draft={!post.published} />}

      <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink">
        <ArrowLeft size={14} /> Blog
      </Link>

      <header className="mt-8 max-w-3xl">
        <h1 className="text-4xl font-semibold leading-[1.08] tracking-tighter md:text-5xl">
          {post.title || "Untitled"}
        </h1>
        {post.excerpt && <p className="mt-5 text-xl leading-relaxed text-muted">{post.excerpt}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 font-mono text-sm text-faint">
          <time dateTime={post.published_at || post.created_at}>{entryDate(post)}</time>
          <span>{readingMinutes(post.content)} min read</span>
          {post.tags.map((t) => (
            <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className="chip hover:text-ink">
              {t}
            </Link>
          ))}
        </div>
      </header>

      {post.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.cover}
          alt=""
          className="mt-10 aspect-[16/9] w-full rounded-[10px] border border-line object-cover"
        />
      )}

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <Markdown>{post.content}</Markdown>
        <aside className="hidden lg:block">
          <Toc headings={headings} />
        </aside>
      </div>
    </article>
  );
}
