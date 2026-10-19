import { safe } from "@/lib/route";
import { guard } from "@/lib/auth";
import { addPhotos, getEntry, reorderPhotos } from "@/lib/db";

async function handlePOST(request, { params }) {
  const blocked = await guard();
  if (blocked) return blocked;
  const id = Number((await params).id);
  if (!await getEntry("albums", id)) return Response.json({ error: "Album tidak ada" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const list = Array.isArray(body.photos) ? body.photos.filter((p) => p?.url) : [];
  if (!list.length) return Response.json({ error: "Tidak ada foto" }, { status: 400 });
  return Response.json(await addPhotos(id, list), { status: 201 });
}

async function handlePATCH(request, { params }) {
  const blocked = await guard();
  if (blocked) return blocked;
  const id = Number((await params).id);
  const body = await request.json().catch(() => ({}));
  if (!Array.isArray(body.order)) return Response.json({ error: "order wajib array" }, { status: 400 });
  return Response.json(await reorderPhotos(id, body.order));
}

export const POST = safe(handlePOST);
export const PATCH = safe(handlePATCH);
