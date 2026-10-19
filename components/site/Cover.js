/** Image with a quiet placeholder when there is no source yet. */
export default function Cover({ src, alt = "", className = "", imgClassName = "" }) {
  return (
    <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-cover ${imgClassName}`}
        />
      ) : null}
    </div>
  );
}
