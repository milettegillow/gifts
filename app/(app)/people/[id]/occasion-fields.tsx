"use client";

import { fieldClass } from "@/app/ui/styles";
import { OCCASIONS } from "./gift-types";

// Occasion (free text, with quick picks) and the date it was given.
export function OccasionFields({
  occasion,
  onOccasion,
  date,
  onDate,
}: {
  occasion: string;
  onOccasion: (value: string) => void;
  date: string;
  onDate: (value: string) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor="gift-occasion">Occasion</label>
        <div className="flex flex-wrap gap-2">
          {OCCASIONS.map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={occasion === o}
              onClick={() => onOccasion(occasion === o ? "" : o)}
              className={`border border-deep-red px-3 py-1.5 ${occasion === o ? "bg-deep-red text-gold-light" : "text-deep-red"}`}
            >
              {o}
            </button>
          ))}
        </div>
        <input
          id="gift-occasion"
          type="text"
          maxLength={80}
          autoComplete="off"
          value={occasion}
          onChange={(e) => onOccasion(e.target.value)}
          className={fieldClass}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="gift-date">Date</label>
        <input id="gift-date" type="date" required value={date} onChange={(e) => onDate(e.target.value)} className={fieldClass} />
      </div>
    </>
  );
}
