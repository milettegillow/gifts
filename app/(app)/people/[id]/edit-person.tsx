"use client";

import { useState } from "react";
import { linkButtonClass } from "@/app/ui/styles";
import { PersonSheet } from "../../person-sheet";

export function EditPerson({ person }: { person: { id: string; name: string; photo: string | null } }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={linkButtonClass}>
        Edit
      </button>
      <PersonSheet open={open} onClose={() => setOpen(false)} person={person} />
    </>
  );
}
