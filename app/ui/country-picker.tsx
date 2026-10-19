"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Country } from "@/lib/countries";
import { fieldClass } from "./styles";

// Lower case, accents off, so "aland" finds Åland Islands.
function normalise(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// A searchable country list: type to filter, then tap or press Enter.
export function CountryPicker({
  countries,
  value,
  onChange,
  label,
}: {
  countries: Country[];
  value: string | null;
  onChange: (code: string | null) => void;
  label: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const selected = countries.find((c) => c.code === value) ?? null;
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const list = useRef<HTMLUListElement>(null);

  const matches = useMemo(() => {
    const q = normalise(query);
    if (!q || (selected && query === selected.name)) return countries;
    const starts: Country[] = [];
    const contains: Country[] = [];
    for (const c of countries) {
      const words = normalise(`${c.name} ${c.aliases}`);
      if (normalise(c.name).startsWith(q) || words.split(/\s+/).some((w) => w.startsWith(q))) starts.push(c);
      else if (words.includes(q)) contains.push(c);
    }
    return [...starts, ...contains];
  }, [countries, query, selected]);

  function choose(country: Country) {
    onChange(country.code);
    setQuery(country.name);
    setOpen(false);
  }

  function moveTo(index: number) {
    setActive(index);
    list.current?.children[index]?.scrollIntoView({ block: "nearest" });
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      moveTo(Math.min(Math.max(active + step, 0), matches.length - 1));
    } else if (e.key === "Enter" && open && matches[active]) {
      e.preventDefault();
      choose(matches[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  }

  // Leaving the field keeps an exact match, otherwise goes back to the choice.
  function onBlur() {
    setOpen(false);
    const exact = countries.find((c) => normalise(c.name) === normalise(query));
    if (exact) choose(exact);
    else setQuery(selected?.name ?? "");
  }

  return (
    <div className="relative">
      <input
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${id}-${matches[active].code}` : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
          if (value) onChange(null);
        }}
        onFocus={(e) => {
          e.target.select();
          setOpen(true);
        }}
        onClick={() => setOpen(true)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={fieldClass}
      />
      {open && matches.length > 0 && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-10 max-h-[min(50dvh,320px)] overflow-y-auto border border-t-0 border-gold-mid bg-white"
        >
          {matches.map((c, i) => (
            <li
              key={c.code}
              id={`${id}-${c.code}`}
              role="option"
              aria-selected={c.code === value}
              // Keep focus in the field so blur doesn't fire first.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(c)}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2.5 ${i === active ? "bg-gold-light" : ""}`}
            >
              {c.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
