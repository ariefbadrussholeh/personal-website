import { safe } from "@/lib/route";
import { limited } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import { ensureVisitor, readVisitor } from "@/lib/visitor";
import { addLikes, getLikeState, isValidLikeTarget } from "@/lib/db";

async function handleGET(request) {
  const target = new URL(request.url).searchParams.get("target") || "";
  if (!(await isValidLikeTarget(target))) return Response.json({ error: "Unknown target." }, { status: 404 });
  return Response.json(await getLikeState(target, await readVisitor()));
}

// Spammable likes: each request adds one or more likes without unliking.
async function handlePOST(request) {
  const body = await request.json().catch(() => null);
  const target = String(body?.target || "");
  if (!(await isValidLikeTarget(target))) return Response.json({ error: "Unknown target." }, { status: 404 });

  const visitor = await ensureVisitor();
  const count = Math.max(1, Math.min(Number(body?.count) || 1, 50));

  if (limited(`like:${visitor}:${clientIp(request)}`, 300, 60_000)) {
    return Response.json({ error: "Slow down a little." }, { status: 429 });
  }
  return Response.json(await addLikes(target, visitor, count));
}

export const GET = safe(handleGET);
export const POST = safe(handlePOST);
