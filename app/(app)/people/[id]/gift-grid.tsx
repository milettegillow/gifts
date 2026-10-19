"use client";

import { useState } from "react";
import { GiftSheet, type SheetContext } from "./gift-sheet";

// The header's Add button: a new idea for this person.
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
