import { listEntries } from "@/lib/db";
import EntryList from "@/components/admin/EntryList";
import NewButton from "@/components/admin/NewButton";

export const metadata = { title: "Album" };

export default async function Page() {
  const items = await listEntries("albums");
  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tighter">Album</h1>
        <NewButton kind="albums" editBase="/admin/album" label="Album baru" />
      </div>
      <EntryList
        kind="albums"
        items={items}
        editBase="/admin/album"
        publicBase="/album"
        emptyText="Klik Album baru, lalu seret foto-fotomu ke dalamnya."
      />
    </>
  );
}
