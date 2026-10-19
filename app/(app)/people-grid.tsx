"use client";

import { useState } from "react";
import Link from "next/link";
import type { Person } from "@/lib/people";
import { Avatar, personRing } from "@/app/ui/avatar";
import { PersonSheet } from "./person-sheet";

const AVATAR = 72;

// Everyone, then the Add card.
export function PeopleGrid({ people }: { people: Person[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {people.map((person) => (
          <li key={person.id}>
            <Link
              href={`/people/${person.id}`}
              className="group flex h-full flex-col items-center gap-3 px-2 text-center text-ink"
            >
              <Avatar name={person.name} photo={person.photo} size={AVATAR} className={`${personRing} sm:[--av:96px]`} />
              <span className="font-semibold break-words group-hover:underline group-focus-visible:underline">{person.name}</span>
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
            className="group flex h-full w-full flex-col items-center gap-3 px-2 text-ink"
          >
            <span
              aria-hidden
              className="box-border flex size-[72px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-ink text-4xl leading-none text-ink sm:size-24"
            >
              +
            </span>
            <span className="font-semibold group-hover:underline group-focus-visible:underline">Add</span>
          </button>
        </li>
      </ul>
      <PersonSheet open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
