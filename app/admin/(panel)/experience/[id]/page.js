import { notFound } from "next/navigation";
import { getEntry } from "@/lib/db";
import ExperienceEditor from "@/components/admin/ExperienceEditor";

export const metadata = { title: "Edit pengalaman" };

export default async function Page({ params }) {
  const { id } = await params;
  const entry = Number.isInteger(Number(id)) ? await getEntry("experiences", Number(id)) : null;
  if (!entry) notFound();
  return <ExperienceEditor initial={entry} />;
}
