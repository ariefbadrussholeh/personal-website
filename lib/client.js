"use client";

/** Small fetch wrapper for the admin API. Throws Error with a readable message. */
export async function api(url, { method = "GET", body, keepalive } = {}) {
  const res = await fetch(url, {
    method,
    keepalive,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  // A 401 on the login endpoint just means "wrong password", not "session expired".
  if (res.status === 401 && !url.startsWith("/api/auth/")) {
    window.location.href = "/admin/login";
    throw new Error("Sesi habis, silakan login lagi.");
  }
  if (!res.ok) throw new Error(data.error || `Permintaan gagal (${res.status})`);
  return data;
}

/**
 * Large photos are shrunk in the browser first. Hosting platforms such as
 * Vercel cap request bodies at about 4.5 MB, and 2400px is plenty for the web.
 */
async function shrink(file) {
  if (file.type?.startsWith("video/") || file.type === "image/gif" || file.size < 2.5 * 1024 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    if (blob && blob.size < file.size) {
      return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
    }
  } catch {
    // fall through and send the original
  }
  return file;
}

/** Uploads one image or video and resolves to { url, width, height, media_type }. */
export async function uploadMedia(original, { width, height } = {}) {
  const file = await shrink(original);
  const form = new FormData();
  form.append("file", file);
  if (width) form.append("width", String(width));
  if (height) form.append("height", String(height));
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Sesi habis, silakan login lagi.");
  }
  if (!res.ok) throw new Error(data.error || "Upload gagal");
  return data;
}

/** Backwards-compatible alias for uploadMedia. */
export const uploadImage = uploadMedia;
