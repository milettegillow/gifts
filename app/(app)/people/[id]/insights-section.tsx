"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requestJson } from "@/lib/client";
import { linkButtonClass } from "@/app/ui/styles";

export type InsightsData = {
  themes: { label: string; giftIds: string[] }[];
  suggestions: { name: string; reason: string; query: string }[];
  // Being worked out again in the background; expectedHash is what the new
  // ones will be made from.
  refreshing: boolean;
  expectedHash: string;
};

// "What they like" and "Where to look", above the tabs.
export function InsightsSection({
  personId,
  insights,
  activeTheme,
  onTheme,
}: {
  personId: string;
  insights: InsightsData;
  activeTheme: string | null;
  onTheme: (label: string | null) => void;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(insights.refreshing);
  const [error, setError] = useState<string | null>(null);

  // While a background refresh runs, check now and then, and reload once it's in.
  useEffect(() => {
    if (!insights.refreshing) return;
    let tries = 0;
    const timer = setInterval(async () => {
      tries++;
      try {
        const { hash } = await requestJson<{ hash: string | null }>(`/api/people/${personId}/insights`);
        if (hash === insights.expectedHash) {
          clearInterval(timer);
          router.refresh();
          return;
        }
      } catch {
        // try again on the next tick
      }
      if (tries >= 8) {
        clearInterval(timer);
        setRefreshing(false);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [insights.refreshing, insights.expectedHash, personId, router]);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      await requestJson(`/api/people/${personId}/insights`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't refresh. Try again.");
    } finally {
      setRefreshing(false);
    }
  }

  const { themes, suggestions } = insights;
  const empty = themes.length === 0 && suggestions.length === 0;

  return (
    <section aria-label="What they like" className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl text-deep-red">What they like</h2>
        <button type="button" onClick={refresh} disabled={refreshing} className={linkButtonClass}>
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {error && <p role="alert" className="text-deep-red">{error}</p>}
      {empty && refreshing && <p>Looking for themes…</p>}

      {themes.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {themes.map((t) => {
            const on = activeTheme === t.label;
            return (
              <li key={t.label}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onTheme(on ? null : t.label)}
                  className={`min-h-11 border px-3 py-1.5 ${on ? "border-deep-red bg-deep-red text-gold-light" : "border-cream bg-cream text-deep-red"}`}
                >
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {suggestions.length > 0 && (
        <>
          <h2 className="font-display text-2xl text-deep-red">Where to look</h2>
          <ul className="flex flex-col gap-4">
            {suggestions.map((s) => (
              <li key={s.name} className="flex flex-col gap-1">
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(s.query)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center self-start text-ink underline"
                >
                  {s.name}
                </a>
                <p>{s.reason}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
