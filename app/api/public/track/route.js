import crypto from "node:crypto";
import { isAdmin } from "@/lib/auth";
import { limited } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import { recordView } from "@/lib/db";

const BOT = /bot|crawl|spider|slurp|preview|monitor|curl|wget|python-requests|axios|node-fetch|go-http|java\//i;
// Only real public pages are counted, so the table cannot be filled with junk paths.
const PATH = /^\/(?:(?:blog|projects|album)(?:\/[a-z0-9-]+)?|about|contact)?$/;

function device(ua) {
  if (/ipad|tablet/i.test(ua)) return "Tablet";
  if (/mobi|android|iphone/i.test(ua)) return "Mobile";
  return "Desktop";
}

function browser(ua) {
  if (/edg(e|a|ios)?\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/chrome|crios|chromium/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  return "Other";
}

function referrerHost(value, ownHost) {
  try {
    const host = new URL(value).host.replace(/^www\./, "");
    return host === ownHost.replace(/^www\./, "") ? "" : host;
  } catch {
    return "";
  }
}

// Always answers 204 so tracking can never break or slow down a page.
export async function POST(request) {
  try {
    if (await isAdmin()) return new Response(null, { status: 204 });
    const ua = request.headers.get("user-agent") || "";
    if (!ua || BOT.test(ua)) return new Response(null, { status: 204 });

    const body = await request.json().catch(() => null);
    let path = String(body?.path || "").split(/[?#]/)[0];
    if (path.length > 1) path = path.replace(/\/+$/, "");
    if (!PATH.test(path)) return new Response(null, { status: 204 });

    const ip = clientIp(request);
    if (limited(`track:${ip}`, 120, 60_000)) return new Response(null, { status: 204 });

    // No cookie and no stored IP: the visitor id is a hash that changes every day.
    const day = new Date().toISOString().slice(0, 10);
    const salt = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-only-secret";
    const visitor = crypto.createHash("sha256").update(`${salt}:${day}:${ip}:${ua}`).digest("hex").slice(0, 32);

    await recordView({
      path,
      referrer: referrerHost(String(body?.referrer || ""), request.headers.get("host") || ""),
      device: device(ua),
      browser: browser(ua),
      country: (request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || "").slice(0, 2),
      visitor,
    });
  } catch (e) {
    console.error("[track]", e);
  }
  return new Response(null, { status: 204 });
}
