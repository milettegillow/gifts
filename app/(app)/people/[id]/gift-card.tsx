"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { requestJson } from "@/lib/client";
import { LinkIcon } from "@/app/ui/icons";
import { PRESENT_IMAGE, type GiftCardData } from "./gift-types";
import { Stars } from "./stars";

// Rounded, with a soft shadow; lifts on hover and keyboard focus, settles a
// little when pressed. The focus ring sits on the card, since the card clips
// its corners (and anything inside it).
// (Written out in full so Tailwind sees every class.)
const cardClass =
  "relative flex cursor-pointer flex-col overflow-hidden rounded-[10px] bg-card text-ink " +
  "shadow-[0_4px_12px_rgba(61,26,0,0.25)] transition-[translate,box-shadow] duration-150 motion-reduce:transition-none " +
  "hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(61,26,0,0.35)] active:-translate-y-px " +
  "has-[>button:focus-visible]:-translate-y-0.5 has-[>button:focus-visible]:shadow-[0_10px_22px_rgba(61,26,0,0.35)] " +
  "has-[>button:focus-visible]:outline-2 has-[>button:focus-visible]:outline-offset-2 has-[>button:focus-visible]:outline-ink";

// One gift. Ideas show delivery and stock (and a tick box when planning);
// gifted ones show the occasion and a rating; declined ones are greyed with
// the reason.
export function GiftCard({
  gift,
  onOpen,
  planning,
  ticked,
  onTick,
}: {
  gift: GiftCardData;
  onOpen: () => void;
  planning?: boolean;
  ticked?: boolean;
  onTick?: (on: boolean) => void;
}) {
  const [broken, setBroken] = useState(false);
  const gone = gift.status === "saved" && (gift.stock?.gone ?? false);
  const declined = gift.status === "declined";
  const faded = gone ? "opacity-55" : declined ? "opacity-75" : "";
  const grey = gone ? "grayscale" : declined ? "grayscale-[60%]" : "";

  return (
    <li className={`${cardClass} ${faded}`}>
      <button type="button" onClick={onOpen} className="flex flex-1 flex-col text-left focus-visible:outline-none">
        <span className="relative block aspect-square w-full overflow-hidden">
          <Image
            src={!gift.image || broken ? PRESENT_IMAGE : gift.image}
            alt={gift.title}
            fill
            unoptimized
            loading="lazy"
            sizes="(min-width: 1024px) 160px, (min-width: 640px) 200px, 50vw"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
            className={`object-cover ${grey}`}
          />
        </span>
        <span className="flex flex-col gap-2 p-3">
          <span className="line-clamp-2 font-semibold break-words">{gift.title}</span>
          {gift.status === "gifted" && gift.occasionLabel && <span>{gift.occasionLabel}</span>}
          {declined && gift.declinedReason && <span className="break-words">{gift.declinedReason}</span>}
          <Tags gift={gift} />
        </span>
      </button>
      {gift.status === "gifted" && <CardRating gift={gift} />}
      {gift.url && (
        <a
          href={gift.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${gift.title}`}
          className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-full bg-cream/90 text-ink transition-colors hover:bg-ink hover:text-gold-text focus-visible:bg-ink focus-visible:text-gold-text active:bg-ink active:text-gold-text"
        >
          <LinkIcon className="size-5" />
        </a>
      )}
      {planning && (
        <label className="absolute top-1 left-1 flex size-11 cursor-pointer items-center justify-center rounded-full bg-cream/90">
          <input
            type="checkbox"
            checked={!!ticked}
            onChange={(e) => onTick?.(e.target.checked)}
            aria-label={`Include ${gift.title}`}
            className="size-5 cursor-pointer accent-ink"
          />
        </label>
      )}
    </li>
  );
}

const tag = "rounded-full px-2.5";

function Tags({ gift }: { gift: GiftCardData }) {
  const ideas = gift.status === "saved";
  const shipping = ideas ? gift.shipping : null;
  const stock = ideas ? gift.stock : null;
  const diy = gift.kind === "idea";
  if (!diy && !gift.price && !shipping && !stock) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {diy && <span className={`${tag} shadow-[inset_0_0_0_1px_var(--color-ink)]`}>DIY</span>}
      {gift.price && <span className={`${tag} bg-ink text-gold-text`}>{gift.price}</span>}
      {shipping && <span className={`${tag} shadow-[inset_0_0_0_1px_var(--color-ink)]`}>{shipping}</span>}
      {stock && <span className={`${tag} bg-ink text-gold-text`}>{stock.text}</span>}
    </span>
  );
}

// Tap a star to set or change the rating; saved straight away.
function CardRating({ gift }: { gift: GiftCardData }) {
  const router = useRouter();
  const [rating, setRating] = useState(gift.rating);
  const [saving, setSaving] = useState(false);

  async function rate(n: number) {
    const previous = rating;
    setRating(n);
    setSaving(true);
    try {
      await requestJson(`/api/gifts/${gift.id}/rating`, { method: "PATCH", body: { rating: n } });
      router.refresh();
    } catch (err) {
      console.error("Saving the rating failed", err);
      setRating(previous);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-3 pb-3">
      <Stars value={rating} onChange={rate} disabled={saving} />
    </div>
  );
}
