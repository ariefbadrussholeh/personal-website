import Link from "next/link";
import { listEntries } from "@/lib/db";
import { entryDate } from "@/lib/format";
import PageHeader from "@/components/site/PageHeader";
import Cover from "@/components/site/Cover";

export const metadata = {
  title: "Album",
  description: "Photos from trips, events and everyday moments away from the keyboard.",
};

// Varying ratios give the grid a masonry rhythm.
const RATIOS = ["aspect-[4/5]", "aspect-square", "aspect-[3/4]", "aspect-[5/4]", "aspect-[4/5]", "aspect-[3/4]"];

export default async function AlbumIndex() {
  const albums = await listEntries("albums", { onlyPublished: true });

  return (
    <>
      <PageHeader title="Album">
        Photos from trips, events and everyday moments away from the keyboard.
      </PageHeader>

      <div className="mx-auto w-full max-w-6xl px-5 pb-24 md:px-8">
        {albums.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-line-strong px-6 py-16 text-center">
            <p className="text-lg font-medium">No albums yet.</p>
            <p className="mt-2 text-muted">Published albums will show up here.</p>
          </div>
        ) : (
          <ul className="columns-1 gap-5 sm:columns-2 lg:columns-3">
            {albums.map((a, i) => (
              <li key={a.id} className="mb-5 break-inside-avoid">
                <Link href={`/album/${a.slug}`} className="group block">
                  <Cover
                    src={a.cover}
                    alt=""
                    className={`${RATIOS[i % RATIOS.length]} rounded-[10px] border border-line`}
                    imgClassName="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
                  />
                  <div className="mt-3 flex items-baseline justify-between gap-4">
                    <h2 className="text-lg font-medium tracking-tight transition-colors group-hover:text-accent">
                      {a.title || "Untitled"}
                    </h2>
                    <span className="shrink-0 font-mono text-xs text-faint">
                      {entryDate(a)} · {a.photo_count}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
