"use client";

import { useState } from "react";
import { PersonSheet } from "../../person-sheet";

// A pencil after the person's name, opening the edit person sheet.
export function EditPerson({ person }: { person: { id: string; name: string; photo: string | null } }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${person.name}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-ink/10"
      >
        <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="size-5">
          <path d="M13.5 3.5l3 3L7 16H4v-3z" />
          <path d="M11.5 5.5l3 3" />
        </svg>
      </button>
      <PersonSheet open={open} onClose={() => setOpen(false)} person={person} />
    </>
  );
}
