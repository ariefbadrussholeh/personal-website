import { safe } from "@/lib/route";
import crypto from "node:crypto";
import { guard } from "@/lib/auth";
import { BUCKET, supabase } from "@/lib/supabase";

const FORMATS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

async function handlePOST(request) {
  const blocked = await guard();
  if (blocked) return blocked;

  const body = await request.json().catch(() => ({}));
  const rawType = body.contentType || body.type || "";
  const cleanType = rawType.split(";")[0].trim().toLowerCase();
  const ext = FORMATS[cleanType];
  if (!ext) {
    return Response.json(
      { error: "Format harus JPG, PNG, WebP, AVIF, GIF, MP4, WebM atau MOV" },
      { status: 415 }
    );
  }

  const name = `${crypto.randomUUID()}.${ext}`;
  const bucket = supabase().storage.from(BUCKET);
  const { data, error } = await bucket.createSignedUploadUrl(name);
  if (error) {
    return Response.json(
      { error: `Gagal membuat URL upload Supabase: ${error.message}` },
      { status: 502 }
    );
  }

  const publicUrl = bucket.getPublicUrl(name).data.publicUrl;

  return Response.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: name,
    publicUrl,
  });
}

export const POST = safe(handlePOST);
