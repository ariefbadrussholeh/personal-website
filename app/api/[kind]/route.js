import { safe } from "@/lib/route";
import { guard } from "@/lib/auth";
import { KINDS, createEntry, listEntries } from "@/lib/db";

async function handleGET(_req, { params }) {
  const blocked = await guard();
  if (blocked) return blocked;
  const { kind } = await params;
  if (!KINDS[kind]) return Response.json({ error: "Tidak ditemukan" }, { status: 404 });
  return Response.json(await listEntries(kind));
}

// Creates an empty draft and returns it, so the editor can open straight away.
async function handlePOST(_req, { params }) {
  const blocked = await guard();
  if (blocked) return blocked;
  const { kind } = await params;
  if (!KINDS[kind]) return Response.json({ error: "Tidak ditemukan" }, { status: 404 });
  if (KINDS[kind].creatable === false) return Response.json({ error: "Tidak bisa dibuat dari admin" }, { status: 405 });
  return Response.json(await createEntry(kind), { status: 201 });
}

export const GET = safe(handleGET);
export const POST = safe(handlePOST);
