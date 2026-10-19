"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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

// "Where to look" starts collapsed; whether it's open is remembered per browser.
const OPEN_KEY = "giftbook:where-to-look";
const OPEN_EVENT = "giftbook:where-to-look";

function subscribeOpen(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(OPEN_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(OPEN_EVENT, onChange);
  };
}

function readOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) === "open";
  } catch {
    return false;
  }
}

function writeOpen(open: boolean) {
  try {
    localStorage.setItem(OPEN_KEY, open ? "open" : "closed");
  } catch {
    // storage unavailable; it just won't be remembered
  }
  window.dispatchEvent(new Event(OPEN_EVENT));
}

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

  const lookOpen = useSyncExternalStore(subscribeOpen, readOpen, () => false);
  const { themes, suggestions } = insights;

  return (
    <section aria-label="What they like" className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl text-ink">What they like</h2>
          {refreshing && (
            <span
              role="status"
              aria-label="Refreshing"
              className="block size-4 animate-spin rounded-full border-2 border-ink border-t-transparent motion-reduce:animate-none"
            />
          )}
        </div>
        <button type="button" onClick={refresh} disabled={refreshing} className={`${linkButtonClass} disabled:opacity-100`}>
          Refresh
        </button>
      </div>
      {error && <p role="alert" className="text-ink">{error}</p>}

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
                  className={`min-h-11 rounded-full px-4 py-1.5 ${on ? "text-ink shadow-[inset_0_0_0_2px_var(--color-ink)]" : "bg-ink text-gold-text"}`}
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
          <h2 className="font-display text-2xl text-ink">
            <button
              type="button"
              aria-expanded={lookOpen}
              aria-controls="where-to-look"
              onClick={() => writeOpen(!lookOpen)}
              className="inline-flex min-h-11 items-center gap-3 hover:underline focus-visible:underline"
            >
              Where to look
              <svg
                aria-hidden
                viewBox="0 0 12 8"
                className={`h-2 w-3 fill-none stroke-ink stroke-2 transition-transform motion-reduce:transition-none ${lookOpen ? "rotate-180" : ""}`}
              >
                <path d="M1 1.5l5 5 5-5" />
              </svg>
            </button>
          </h2>
          <ul id="where-to-look" hidden={!lookOpen} className="flex flex-col gap-4">
            {suggestions.map((s) => (
              <li key={s.name} className="flex flex-col gap-1">
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(s.query)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 min-w-11 items-center self-start font-semibold text-ink hover:underline focus-visible:underline"
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
