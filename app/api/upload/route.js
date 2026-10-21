import { safe } from "@/lib/route";
import crypto from "node:crypto";
import sharp from "sharp";
import { guard } from "@/lib/auth";
import { BUCKET, supabase } from "@/lib/supabase";

const MAX_BYTES = 40 * 1024 * 1024;
const MAX_SIDE = 2400;

// SVG is intentionally not accepted: uploaded SVG can carry scripts.
const FORMATS = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};
const EXT = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  avif: "avif",
  gif: "gif",
  mp4: "mp4",
  webm: "webm",
  mov: "mov",
};
const MIME = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

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
    return Response.json({ error: "Format harus JPG, PNG, WebP, AVIF, GIF, MP4, WebM atau MOV" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Ukuran maksimal 40 MB" }, { status: 413 });
  }

  const input = Buffer.from(await file.arrayBuffer());
  const isVideo = file.type.startsWith("video/");
  let output = input;
  let width = Number(form?.get("width")) || 0;
  let height = Number(form?.get("height")) || 0;

  if (!isVideo) {
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
  }

  const name = `${crypto.randomUUID()}.${EXT[format]}`;
  const bucket = supabase().storage.from(BUCKET);
  const { error } = await bucket.upload(name, output, {
    contentType: MIME[format] || file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    return Response.json({ error: `Gagal menyimpan ke Supabase Storage: ${error.message}` }, { status: 502 });
  }
  return Response.json({
    url: bucket.getPublicUrl(name).data.publicUrl,
    width,
    height,
    media_type: isVideo ? "video" : "image",
  });
}

export const POST = safe(handlePOST);
