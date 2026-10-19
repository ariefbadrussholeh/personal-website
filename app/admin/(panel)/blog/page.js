import { listEntries } from "@/lib/db";
import EntryList from "@/components/admin/EntryList";
import NewButton from "@/components/admin/NewButton";

export const metadata = { title: "Blog" };

export default async function Page() {
  const items = await listEntries("posts");
  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tighter">Blog</h1>
        <NewButton kind="posts" editBase="/admin/blog" label="Tulisan baru" />
      </div>
      <EntryList
        kind="posts"
        items={items}
        editBase="/admin/blog"
        publicBase="/blog"
        emptyText="Klik Tulisan baru untuk mulai menulis."
      />
    </>
  );
}
