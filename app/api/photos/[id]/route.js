import { safe } from "@/lib/route";
import { guard } from "@/lib/auth";
import { deletePhoto, updatePhoto } from "@/lib/db";

async function handlePATCH(request, { params }) {
  const blocked = await guard();
  if (blocked) return blocked;
  const id = Number((await params).id);
  const body = await request.json().catch(() => ({}));
  const photo = await updatePhoto(id, body);
  if (!photo) return Response.json({ error: "Tidak ditemukan" }, { status: 404 });
  return Response.json(photo);
}

async function handleDELETE(_req, { params }) {
  const blocked = await guard();
  if (blocked) return blocked;
  const id = Number((await params).id);
  if (!await deletePhoto(id)) return Response.json({ error: "Tidak ditemukan" }, { status: 404 });
  return Response.json({ ok: true });
}

export const PATCH = safe(handlePATCH);
export const DELETE = safe(handleDELETE);
