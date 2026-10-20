import { safe } from "@/lib/route";
import { limited } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import { ensureVisitor, readVisitor } from "@/lib/visitor";
import { getLikeState, isValidLikeTarget, toggleLike } from "@/lib/db";

async function handleGET(request) {
  const target = new URL(request.url).searchParams.get("target") || "";
  if (!(await isValidLikeTarget(target))) return Response.json({ error: "Unknown target." }, { status: 404 });
  return Response.json(await getLikeState(target, await readVisitor()));
}

// Toggles: the first request likes, the next one removes the like again.
async function handlePOST(request) {
  const body = await request.json().catch(() => null);
  const target = String(body?.target || "");
  if (!(await isValidLikeTarget(target))) return Response.json({ error: "Unknown target." }, { status: 404 });

  const visitor = await ensureVisitor();
  if (limited(`like:${visitor}:${clientIp(request)}`, 40, 60_000)) {
    return Response.json({ error: "Slow down a little." }, { status: 429 });
  }
  return Response.json(await toggleLike(target, visitor));
}

export const GET = safe(handleGET);
export const POST = safe(handlePOST);
