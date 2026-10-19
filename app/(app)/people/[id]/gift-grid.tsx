"use client";

import { useState } from "react";
import { GiftCard } from "./gift-card";
import { GiftSheet, type SheetContext } from "./gift-sheet";
import type { GiftCardData } from "./gift-types";

// Saved gifts, newest first. Tapping one opens it for editing.
export function GiftGrid({ gifts, context }: { gifts: GiftCardData[]; context: SheetContext }) {
  const [editing, setEditing] = useState<GiftCardData | null>(null);
  if (gifts.length === 0) return <p>No gifts yet</p>;
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {gifts.map((gift) => (
          <GiftCard key={gift.id} gift={gift} onOpen={() => setEditing(gift)} />
        ))}
      </ul>
      <GiftSheet open={!!editing} onClose={() => setEditing(null)} context={context} gift={editing?.edit} />
    </>
  );
}

export function AddGift({ context }: { context: SheetContext }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="shrink-0 bg-ribbon px-5 py-2.5 text-gold-light hover:bg-deep-red">
        Add
      </button>
      <GiftSheet open={open} onClose={() => setOpen(false)} context={context} />
    </>
  );
}
