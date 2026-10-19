import type { CSSProperties } from "react";
import Image from "next/image";

// A person's photo in a circle, or their initial in Playfair on ink. The
// size is a CSS variable (--av), so a className can change it per breakpoint
// (e.g. "sm:[--av:96px]") and add a ring or shadow.
export function Avatar({
  name,
  photo,
  size,
  className = "",
}: {
  name: string;
  photo: string | null;
  size: number;
  className?: string;
}) {
  const initial = Array.from(name.trim())[0]?.toLocaleUpperCase("en-GB") ?? "";
  return (
    <span
      className={`relative inline-flex size-(--av) shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink ${className}`}
      style={{ "--av": `${size}px` } as CSSProperties}
    >
      {photo ? (
        <Image src={photo} alt={name} fill unoptimized sizes="96px" className="object-cover" />
      ) : (
        <span aria-hidden className="font-display text-[calc(var(--av)*0.42)] leading-none text-gold-text">
          {initial}
        </span>
      )}
    </span>
  );
}

// The ring and soft shadow every person circle wears.
export const personRing = "ring-2 ring-ink shadow-[0_4px_10px_rgba(61,26,0,0.35)]";
