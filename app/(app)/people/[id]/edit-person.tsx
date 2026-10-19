"use client";

import { useState } from "react";
import { PersonSheet } from "../../person-sheet";

export function EditPerson({ person }: { person: { id: string; name: string; photo: string | null } }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-ink underline">
        Edit
      </button>
      <PersonSheet open={open} onClose={() => setOpen(false)} person={person} />
    </>
  );
}
