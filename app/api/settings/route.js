import { safe } from "@/lib/route";
import { guard } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/db";

async function handleGET() {
  const blocked = await guard();
  if (blocked) return blocked;
  return Response.json(await getSettings());
}

async function handlePUT(request) {
  const blocked = await guard();
  if (blocked) return blocked;
  const body = await request.json().catch(() => ({}));
  return Response.json(await saveSettings(body));
}

export const GET = safe(handleGET);
export const PUT = safe(handlePUT);
