import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "portfolio_admin";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

function secret() {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-only-secret";
}

function sign(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function adminPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  // Without an env var we only allow a throwaway password during development.
  return process.env.NODE_ENV === "production" ? null : "admin";
}

export function checkPassword(input) {
  const expected = adminPassword();
  if (!expected) return false;
  return safeEqual(input, expected);
}

export async function startSession() {
  const expires = Date.now() + MAX_AGE * 1000;
  const payload = String(expires);
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function isAdmin() {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return false;
  const [payload, mac] = raw.split(".");
  if (!payload || !mac) return false;
  if (!safeEqual(mac, sign(payload))) return false;
  return Number(payload) > Date.now();
}

/** Use at the top of route handlers. Returns a Response when blocked. */
export async function guard() {
  if (await isAdmin()) return null;
  return Response.json({ error: "Tidak diizinkan. Silakan login lagi." }, { status: 401 });
}
