import { safe } from "@/lib/route";
import { clean, clientIp } from "@/lib/request";
import { limited } from "@/lib/ratelimit";
import { notifyOwner } from "@/lib/notify";
import { countRecentMessages, createMessage } from "@/lib/db";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function handlePOST(request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  // Honeypot: real people never see or fill this field. Pretend it worked.
  if (body.website) return Response.json({ ok: true });

  const name = clean(body.name, 100);
  const email = clean(body.email, 200).toLowerCase();
  const subject = clean(body.subject, 150);
  const message = String(body.message ?? "").replace(/\r\n/g, "\n").trim();

  const fields = {};
  if (!name) fields.name = "Please enter your name.";
  if (!EMAIL.test(email)) fields.email = "Please enter a valid email address.";
  if (message.length < 10) fields.message = "Your message is a bit short. Please write at least 10 characters.";
  if (message.length > 3000) fields.message = "Your message is too long (3000 characters maximum).";
  if (Object.keys(fields).length) {
    return Response.json({ error: "Please check the highlighted fields.", fields }, { status: 422 });
  }

  const tooMany = { error: "Too many messages in a short time. Please try again later." };
  if (limited(`contact:${clientIp(request)}`, 5, 10 * 60_000)) return Response.json(tooMany, { status: 429 });
  if ((await countRecentMessages(email, new Date(Date.now() - 3_600_000).toISOString())) >= 5) {
    return Response.json(tooMany, { status: 429 });
  }

  await createMessage({ name, email, subject, message });
  await notifyOwner({
    subject: `New message from ${name}${subject ? `: ${subject}` : ""}`,
    text: `${name} <${email}>\n\n${message}`,
    replyTo: email,
  });
  return Response.json({ ok: true }, { status: 201 });
}

export const POST = safe(handlePOST);
