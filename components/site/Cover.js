import { isVideoUrl } from "@/lib/format";

/** Image or short video with a quiet placeholder when there is no source yet. */
export default function Cover({ src, alt = "", className = "", imgClassName = "" }) {
  const isVideo = isVideoUrl(src);

  return (
    <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
      {src ? (
        isVideo ? (
          <video
            src={src}
            muted
            loop
            autoPlay
            playsInline
            className={`absolute inset-0 h-full w-full object-cover ${imgClassName}`}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover ${imgClassName}`}
          />
        )
      ) : null}
    </div>
  );
}
