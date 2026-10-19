import { notFound } from "next/navigation";
import { getEntry } from "@/lib/db";
import AlbumEditor from "@/components/admin/AlbumEditor";

export default async function EditPage({ params }) {
  const { id } = await params;
  const entry = Number.isInteger(Number(id)) ? await getEntry("albums", Number(id)) : null;
  if (!entry) notFound();
  return <AlbumEditor initial={entry} />;
}
