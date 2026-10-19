import { notFound } from "next/navigation";
import { getEntry } from "@/lib/db";
import EntryEditor from "@/components/admin/EntryEditor";

export default async function EditPage({ params }) {
  const { id } = await params;
  const entry = Number.isInteger(Number(id)) ? await getEntry("posts", Number(id)) : null;
  if (!entry) notFound();
  return <EntryEditor kind="posts" initial={entry} />;
}
