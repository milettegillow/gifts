"use client";

import { useState } from "react";
import Image from "next/image";
import { LinkIcon } from "@/app/ui/icons";
import { PRESENT_IMAGE, type GiftCardData } from "./gift-types";

export function GiftCard({ gift, onOpen }: { gift: GiftCardData; onOpen: () => void }) {
  const [broken, setBroken] = useState(false);
  const gone = gift.stock?.gone ?? false;
  return (
    <li className={`relative bg-cream text-ink ${gone ? "opacity-55" : ""}`}>
      <button type="button" onClick={onOpen} className="flex h-full w-full flex-col text-left">
        <span className="relative block aspect-square w-full overflow-hidden">
          <Image
            src={!gift.image || broken ? PRESENT_IMAGE : gift.image}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 1024px) 160px, (min-width: 640px) 200px, 50vw"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
            className={`object-cover ${gone ? "grayscale" : ""}`}
          />
        </span>
        <span className="flex flex-col gap-2 p-3">
          <span className="line-clamp-2 break-words">{gift.title}</span>
          {(gift.price || gift.shipping || gift.stock) && (
            <span className="flex flex-wrap gap-1">
              {gift.price && <span className="bg-gold-light px-1.5">{gift.price}</span>}
              {gift.shipping && <span className="border border-gold-mid px-1.5">{gift.shipping}</span>}
              {gift.stock && (
                <span className={`px-1.5 ${gift.stock.gone ? "bg-ink text-cream" : "bg-ribbon text-gold-light"}`}>
                  {gift.stock.text}
                </span>
              )}
            </span>
          )}
        </span>
      </button>
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
    </li>
  );
}
