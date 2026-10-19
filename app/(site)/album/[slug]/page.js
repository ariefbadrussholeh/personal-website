import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { getEntryBySlug } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { entryDate } from "@/lib/format";
import Gallery from "@/components/site/Gallery";
import EditLink from "@/components/site/EditLink";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const a = await getEntryBySlug("albums", slug);
  if (!a) return {};
  return {
    title: a.title,
    description: a.description,
    openGraph: { title: a.title, description: a.description, images: a.cover ? [a.cover] : undefined },
  };
}

export default async function AlbumPage({ params }) {
  const { slug } = await params;
  const admin = await isAdmin();
  const album = await getEntryBySlug("albums", slug, { onlyPublished: !admin });
  if (!album) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10 md:px-8 md:pt-14">
      {admin && <EditLink href={`/admin/album/${album.id}`} draft={!album.published} />}

      <Link href="/album" className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink">
        <ArrowLeft size={14} /> Album
      </Link>

      <header className="mb-12 mt-8 max-w-3xl">
        <h1 className="text-4xl font-semibold leading-[1.08] tracking-tighter md:text-5xl">
          {album.title || "Untitled"}
        </h1>
        {album.description && (
          <p className="mt-5 text-lg leading-relaxed text-muted">{album.description}</p>
        )}
        <p className="mt-5 font-mono text-sm text-faint">
          {album.photos.length} photos, {entryDate(album)}
        </p>
      </header>

      <Gallery photos={album.photos} />
    </div>
  );
}
