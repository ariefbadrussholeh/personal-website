import { safe } from "@/lib/route";
import { checkPassword, startSession, adminPassword } from "@/lib/auth";

// Tiny in-memory throttle: 8 attempts per minute per IP.
const attempts = new Map();

function throttled(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < 60_000);
  list.push(now);
  attempts.set(ip, list);
  return list.length > 8;
}

async function handlePOST(request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (throttled(ip)) {
    return Response.json({ error: "Terlalu banyak percobaan. Coba lagi sebentar." }, { status: 429 });
  }
  if (!adminPassword()) {
    return Response.json(
      { error: "ADMIN_PASSWORD belum diatur di environment server." },
      { status: 500 }
    );
  }
  const body = await request.json().catch(() => ({}));
  if (!checkPassword(body.password || "")) {
    return Response.json({ error: "Password salah." }, { status: 401 });
  }
  await startSession();
  return Response.json({ ok: true });
}

export const POST = safe(handlePOST);
