import { safe } from "@/lib/route";
import { clean, clientIp } from "@/lib/request";
import { limited } from "@/lib/ratelimit";
import { ensureVisitor } from "@/lib/visitor";
import { notifyOwner } from "@/lib/notify";
import { countRecentComments, createComment, getEntry } from "@/lib/db";

async function handlePOST(request) {
  const input = await request.json().catch(() => null);
  if (!input || typeof input !== "object") {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (input.website) return Response.json({ ok: true }); // honeypot

  const postId = Number(input.postId);
  const name = clean(input.name, 60);
  const body = String(input.body ?? "").replace(/\r\n/g, "\n").trim();

  const fields = {};
  if (!name) fields.name = "Please enter your name.";
  if (body.length < 2) fields.body = "Please write a comment.";
  if (body.length > 1500) fields.body = "Comments can be 1500 characters at most.";
  if ((body.match(/https?:\/\//gi) || []).length > 2) fields.body = "Please include at most 2 links.";
  if (Object.keys(fields).length) {
    return Response.json({ error: "Please check the highlighted fields.", fields }, { status: 422 });
  }

  const post = Number.isInteger(postId) ? await getEntry("posts", postId) : null;
  if (!post || !post.published) return Response.json({ error: "Post not found." }, { status: 404 });

  const visitor = await ensureVisitor();
  const tooMany = { error: "You are commenting too fast. Please try again in a few minutes." };
  if (limited(`comment:${clientIp(request)}`, 6, 10 * 60_000)) return Response.json(tooMany, { status: 429 });
  if ((await countRecentComments(visitor, new Date(Date.now() - 10 * 60_000).toISOString())) >= 5) {
    return Response.json(tooMany, { status: 429 });
  }

  const comment = await createComment({ postId, name, body, visitor });
  await notifyOwner({
    subject: `New comment on "${post.title}"`,
    text: `${name} wrote:\n\n${body}`,
  });
  return Response.json({ comment }, { status: 201 });
}

export const POST = safe(handlePOST);
