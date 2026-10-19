import Image from "next/image";

// A person's photo in a circle, or their initial.
export function Avatar({ name, photo, size }: { name: string; photo: string | null; size: number }) {
  if (photo) {
    return (
      <Image
        src={photo}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const initial = Array.from(name.trim())[0]?.toLocaleUpperCase("en-GB") ?? "";
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-ribbon font-display leading-none text-gold-light"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {initial}
    </span>
  );
}
