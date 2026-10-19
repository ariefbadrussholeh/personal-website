import { createClient } from "@supabase/supabase-js";

export const BUCKET = "uploads";

/**
 * Server-only client. It uses the service role key, which bypasses Row Level
 * Security, so it must never be imported from a "use client" file or exposed
 * through a NEXT_PUBLIC_ variable.
 */
export function supabase() {
  if (globalThis.__sb) return globalThis.__sb;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum diisi. Lihat README bagian Supabase."
    );
  }
  globalThis.__sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return globalThis.__sb;
}

/** Throws a readable error when a Supabase call fails, otherwise returns data. */
export function must({ data, error }) {
  if (error) throw new Error(error.message || "Kesalahan database");
  return data;
}

/** Public URL prefix for files in the uploads bucket. */
export function publicPrefix() {
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
}

/** Storage object name for one of our public URLs, or null for outside images. */
export function objectNameFromUrl(url) {
  const prefix = publicPrefix();
  return typeof url === "string" && url.startsWith(prefix) ? url.slice(prefix.length) : null;
}
