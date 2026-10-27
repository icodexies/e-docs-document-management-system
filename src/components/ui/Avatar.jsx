import { useState } from "react";
import { FALLBACK_AVATAR } from "../../data/profileAvatars.js";

const SIZES = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-24 w-24 text-xl",
};

function initials(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "ED";
  return `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ""}`.toUpperCase();
}

export default function Avatar({
  name,
  src,
  alt,
  size = "sm",
  decorative = false,
  className = "",
}) {
  const source = String(src ?? "").trim() || FALLBACK_AVATAR;
  const [imageState, setImageState] = useState({
    source: "",
    failed: "",
    loaded: "",
  });

  const failedSrc = imageState.source === source ? imageState.failed : "";
  const loadedSrc = imageState.source === source ? imageState.loaded : "";
  const fallbackFailed = failedSrc === FALLBACK_AVATAR;
  const resolved =
    failedSrc === source && source !== FALLBACK_AVATAR
      ? FALLBACK_AVATAR
      : source;
  const loaded = loadedSrc === resolved;

  return (
    <span
      aria-hidden={decorative ? "true" : undefined}
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-slate-200 bg-tint ring-2 ring-white/60 ${SIZES[size] ?? SIZES.sm} ${className}`}
    >
      {!loaded && (
        <span
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center font-bold text-accent"
        >
          {initials(name)}
        </span>
      )}
      {!fallbackFailed && (
        <img
          src={resolved}
          alt={alt ?? (name ? `${name} profile photo` : "Profile photo")}
          loading="lazy"
          decoding="async"
          onLoad={() =>
            setImageState({
              source,
              failed: failedSrc,
              loaded: resolved,
            })
          }
          onError={() =>
            setImageState({
              source,
              failed: resolved,
              loaded: "",
            })
          }
          className={`relative h-full w-full object-cover transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </span>
  );
}
