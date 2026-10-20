"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestJson } from "@/lib/client";

// The header pill: the user's currency, saved as soon as it changes.
export function CurrencyPicker({ value, options }: { value: string; options: string[] }) {
  const router = useRouter();
  const [currency, setCurrency] = useState(value);
  const [saving, setSaving] = useState(false);

  async function change(next: string) {
    const previous = currency;
    setCurrency(next);
    setSaving(true);
    try {
      await requestJson("/api/me", { method: "PATCH", body: { currency: next } });
      router.refresh();
    } catch (err) {
      console.error("Changing currency failed", err);
      setCurrency(previous);
    } finally {
      setSaving(false);
    }
  }

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Currency</span>
      <select
        value={currency}
        disabled={saving}
        onChange={(e) => change(e.target.value)}
        className="min-h-11 cursor-pointer appearance-none rounded-full bg-ink py-1 pr-8 pl-4 text-gold-text transition-colors hover:bg-ink-hover disabled:opacity-80"
      >
        {options.map((code) => (
          <option key={code} value={code} className="bg-cream text-ink">
            {code}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 10 6"
        className="pointer-events-none absolute right-3.5 h-1.5 w-2.5 fill-gold-text"
      >
        <path d="M0 0h10L5 6z" />
      </svg>
    </label>
  );
}
