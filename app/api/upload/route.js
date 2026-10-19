import { safe } from "@/lib/route";
import crypto from "node:crypto";
import sharp from "sharp";
import { guard } from "@/lib/auth";
import { BUCKET, supabase } from "@/lib/supabase";

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_SIDE = 2400;

// SVG is intentionally not accepted: uploaded SVG can carry scripts.
const FORMATS = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};
const EXT = { jpeg: "jpg", png: "png", webp: "webp", avif: "avif", gif: "gif" };
const MIME = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", gif: "image/gif" };

async function handlePOST(request) {
  const blocked = await guard();
  if (blocked) return blocked;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return Response.json({ error: "File tidak ditemukan" }, { status: 400 });
  }
  const format = FORMATS[file.type];
  if (!format) {
    return Response.json({ error: "Format harus JPG, PNG, WebP, AVIF atau GIF" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Ukuran maksimal 15 MB" }, { status: 413 });
  }

  const input = Buffer.from(await file.arrayBuffer());
  let output = input;
  let width = 0;
  let height = 0;

  try {
    if (format === "gif") {
      const meta = await sharp(input).metadata(); // keep animation untouched
      width = meta.width || 0;
      height = meta.height || 0;
    } else {
      // Auto-rotate from EXIF, cap the longest side, strip metadata.
      const { data, info } = await sharp(input)
        .rotate()
        .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
        .toFormat(format, { quality: 85 })
        .toBuffer({ resolveWithObject: true });
      output = data;
      width = info.width;
      height = info.height;
    }
  } catch {
    return Response.json({ error: "Gambar tidak bisa dibaca" }, { status: 422 });
  }

  const name = `${crypto.randomUUID()}.${EXT[format]}`;
  const bucket = supabase().storage.from(BUCKET);
  const { error } = await bucket.upload(name, output, {
    contentType: MIME[format],
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    return Response.json({ error: `Gagal menyimpan ke Supabase Storage: ${error.message}` }, { status: 502 });
  }
  return Response.json({ url: bucket.getPublicUrl(name).data.publicUrl, width, height });
}

export const POST = safe(handlePOST);
