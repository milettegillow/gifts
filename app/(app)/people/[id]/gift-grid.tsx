"use client";

import { useState } from "react";
import { buttonClass } from "@/app/ui/styles";
import { GiftSheet, type SheetContext } from "./gift-sheet";

// The header's Add button: a new idea for this person.
export function AddGift({ context }: { context: SheetContext }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${buttonClass} shrink-0 px-5`}>
        Add
      </button>
      <GiftSheet open={open} onClose={() => setOpen(false)} context={context} />
    </>
  );
}
