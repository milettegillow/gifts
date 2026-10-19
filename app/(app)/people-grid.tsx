"use client";

import { useState } from "react";
import Link from "next/link";
import type { Person } from "@/lib/people";
import { Avatar } from "@/app/ui/avatar";
import { PersonSheet } from "./person-sheet";

const AVATAR = 72;

// Everyone, then the Add card.
export function PeopleGrid({ people }: { people: Person[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {people.map((person) => (
          <li key={person.id}>
            <Link
              href={`/people/${person.id}`}
              className="flex h-full flex-col items-center gap-2 bg-cream px-3 py-5 text-center text-ink"
            >
              <Avatar name={person.name} photo={person.photo} size={AVATAR} />
              <span className="break-words">{person.name}</span>
              {person.saved > 0 && (
                <span>
                  {person.saved} {person.saved === 1 ? "idea" : "ideas"}
                </span>
              )}
            </Link>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-full w-full flex-col items-center gap-2 bg-cream/50 px-3 py-5 text-ink"
          >
            <span
              aria-hidden
              className="flex items-center justify-center rounded-full border-2 border-dashed border-deep-red text-4xl leading-none text-deep-red"
              style={{ width: AVATAR, height: AVATAR }}
            >
              +
            </span>
            <span>Add</span>
          </button>
        </li>
      </ul>
      <PersonSheet open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
