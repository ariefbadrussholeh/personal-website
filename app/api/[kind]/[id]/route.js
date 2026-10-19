import { safe } from "@/lib/route";
import { guard } from "@/lib/auth";
import { KINDS, deleteEntry, getEntry, updateEntry } from "@/lib/db";

async function resolve(params) {
  const { kind, id } = await params;
  const num = Number(id);
  if (!KINDS[kind] || !Number.isInteger(num)) return null;
  return { kind, id: num };
}

async function handleGET(_req, { params }) {
  const blocked = await guard();
  if (blocked) return blocked;
  const ref = await resolve(params);
  const entry = ref && await getEntry(ref.kind, ref.id);
  if (!entry) return Response.json({ error: "Tidak ditemukan" }, { status: 404 });
  return Response.json(entry);
}

async function handlePATCH(request, { params }) {
  const blocked = await guard();
  if (blocked) return blocked;
  const ref = await resolve(params);
  if (!ref) return Response.json({ error: "Tidak ditemukan" }, { status: 404 });
  const patch = await request.json().catch(() => null);
  if (!patch || typeof patch !== "object") {
    return Response.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const entry = await updateEntry(ref.kind, ref.id, patch);
  if (!entry) return Response.json({ error: "Tidak ditemukan" }, { status: 404 });
  return Response.json(entry);
}

async function handleDELETE(_req, { params }) {
  const blocked = await guard();
  if (blocked) return blocked;
  const ref = await resolve(params);
  if (!ref || !await deleteEntry(ref.kind, ref.id)) {
    return Response.json({ error: "Tidak ditemukan" }, { status: 404 });
  }
  return Response.json({ ok: true });
}

export const GET = safe(handleGET);
export const PATCH = safe(handlePATCH);
export const DELETE = safe(handleDELETE);
