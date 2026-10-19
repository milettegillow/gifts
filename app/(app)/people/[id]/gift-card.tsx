"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { requestJson } from "@/lib/client";
import { LinkIcon } from "@/app/ui/icons";
import { PRESENT_IMAGE, type GiftCardData } from "./gift-types";
import { Stars } from "./stars";

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
    <li className={`relative flex flex-col bg-cream text-ink ${faded}`}>
      <button type="button" onClick={onOpen} className="flex flex-1 flex-col text-left">
        <span className="relative block aspect-square w-full overflow-hidden">
          <Image
            src={!gift.image || broken ? PRESENT_IMAGE : gift.image}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 1024px) 160px, (min-width: 640px) 200px, 50vw"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
            className={`object-cover ${grey}`}
          />
        </span>
        <span className="flex flex-col gap-2 p-3">
          <span className="line-clamp-2 break-words">{gift.title}</span>
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
          className="absolute top-2 right-2 bg-cream/90 p-1.5 text-ink hover:bg-cream"
        >
          <LinkIcon className="size-5" />
        </a>
      )}
      {planning && (
        <label className="absolute top-2 left-2 flex cursor-pointer bg-cream/90 p-1.5">
          <input
            type="checkbox"
            checked={!!ticked}
            onChange={(e) => onTick?.(e.target.checked)}
            aria-label={`Include ${gift.title}`}
            className="size-5 cursor-pointer accent-ribbon"
          />
        </label>
      )}
    </li>
  );
}

function Tags({ gift }: { gift: GiftCardData }) {
  const ideas = gift.status === "saved";
  const shipping = ideas ? gift.shipping : null;
  const stock = ideas ? gift.stock : null;
  if (!gift.price && !shipping && !stock) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {gift.price && <span className="bg-gold-light px-1.5">{gift.price}</span>}
      {shipping && <span className="border border-gold-mid px-1.5">{shipping}</span>}
      {stock && (
        <span className={`px-1.5 ${stock.gone ? "bg-ink text-cream" : "bg-ribbon text-gold-light"}`}>{stock.text}</span>
      )}
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
