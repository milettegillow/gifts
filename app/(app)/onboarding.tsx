"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Country } from "@/lib/countries";
import { requestJson } from "@/lib/client";
import { CountryPicker } from "@/app/ui/country-picker";
import { buttonClass } from "@/app/ui/styles";

// First sign-in only: where the user is, which sets their currency.
export function Onboarding({ countries, initial }: { countries: Country[]; initial: string | null }) {
  const router = useRouter();
  const [country, setCountry] = useState<string | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!country || busy) return;
    setBusy(true);
    setError(null);
    try {
      await requestJson("/api/onboarding", { body: { country } });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-[400px] flex-col gap-5 pt-6">
      <h1 className="font-display text-3xl text-deep-red">Where are you?</h1>
      <CountryPicker countries={countries} value={country} onChange={setCountry} label="Country" />
      {error && <p role="alert" className="text-deep-red">{error}</p>}
      <button type="submit" disabled={!country || busy} className={`${buttonClass} w-full`}>
        {busy ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
