import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "vid";

function secret() {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-only-secret";
}

/** Only a hash is stored, so a leaked table cannot be used to forge a visitor cookie. */
function keyOf(raw) {
  return crypto.createHmac("sha256", secret()).update(raw).digest("hex").slice(0, 40);
}

/** For server components: the current visitor key, or "" when they have no cookie yet. */
export async function readVisitor() {
  const raw = (await cookies()).get(COOKIE)?.value;
  return raw && /^[a-f0-9-]{36}$/.test(raw) ? keyOf(raw) : "";
}

/** For route handlers: returns the visitor key, creating the cookie on first use. */
export async function ensureVisitor() {
  const jar = await cookies();
  let raw = jar.get(COOKIE)?.value;
  if (!raw || !/^[a-f0-9-]{36}$/.test(raw)) {
    raw = crypto.randomUUID();
    jar.set(COOKIE, raw, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return keyOf(raw);
}
