"use client";

import { RATING_LABELS } from "./gift-types";

// One to three stars. Tapping a star sets that rating; the label sits beside
// them once a rating is set.
export function Stars({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (rating: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2">
      <div role="radiogroup" aria-label="Rating" className="flex">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} - ${RATING_LABELS[n]}`}
            disabled={disabled}
            onClick={() => onChange(n)}
            className={`inline-flex size-11 items-center justify-center text-2xl leading-none ${value != null && n <= value ? "text-ribbon" : "text-gold-dark"}`}
          >
            {value != null && n <= value ? "★" : "☆"}
          </button>
        ))}
      </div>
      {value != null && <span className="whitespace-nowrap">{RATING_LABELS[value]}</span>}
    </div>
  );
}
