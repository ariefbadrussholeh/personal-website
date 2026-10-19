import { listEntries } from "@/lib/db";
import EntryList from "@/components/admin/EntryList";
import NewButton from "@/components/admin/NewButton";

export const metadata = { title: "Project" };

export default async function Page() {
  const items = await listEntries("projects");
  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tighter">Project</h1>
        <NewButton kind="projects" editBase="/admin/projects" label="Project baru" />
      </div>
      <EntryList
        kind="projects"
        items={items}
        editBase="/admin/projects"
        publicBase="/projects"
        emptyText="Klik Project baru untuk menambahkan project pertamamu."
      />
    </>
  );
}
