"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { requestJson } from "@/lib/client";
import { formatMoney } from "@/lib/money";
import { Sheet } from "@/app/ui/sheet";
import { buttonClass, fieldClass, linkButtonClass, pillClass } from "@/app/ui/styles";
import { activeFilterCount, applyFilters, byGiftedDate, filterParams, readFilters, type Filters } from "./filters";
import { GiftCard } from "./gift-card";
import { GiftSheet, type SheetContext } from "./gift-sheet";
import type { GiftCardData } from "./gift-types";
import { InsightsSection, type InsightsData } from "./insights-section";
import { NotesSection, type NoteData } from "./notes-section";

type Tab = "ideas" | "gifted" | "declined";
const TABS: { key: Tab; label: string }[] = [
  { key: "ideas", label: "Ideas" },
  { key: "gifted", label: "Gifted" },
  { key: "declined", label: "Decided against" },
];

// Tabs, filters and sort all live in the URL. They're applied here in the
// browser, and the URL is updated without a round trip to the server.
function useQueryState() {
  const params = useSearchParams();
  const pathname = usePathname();
  function update(changes: Record<string, string | null>, push = false) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value == null || value === "") next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    if (push) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }
  return { params, update };
}

export function PersonGifts({
  gifts,
  context,
  budget,
  notes,
  insights,
}: {
  gifts: GiftCardData[];
  context: SheetContext;
  budget: number | null;
  notes: NoteData[];
  // Null for people with too few gifts: the section is hidden.
  insights: InsightsData | null;
}) {
  const { params, update } = useQueryState();
  const tabParam = params.get("tab");
  const tab: Tab = tabParam === "gifted" || tabParam === "declined" ? tabParam : "ideas";
  const filters = readFilters(params);

  const [editing, setEditing] = useState<GiftCardData | null>(null);
  const [addingPast, setAddingPast] = useState(false);
  const [addingIdea, setAddingIdea] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  // A theme chip narrows the current tab to that theme's gifts.
  const [themeLabel, setThemeLabel] = useState<string | null>(null);
  const theme = insights?.themes.find((t) => t.label === themeLabel) ?? null;

  const byStatus = useMemo(
    () => ({
      ideas: gifts.filter((g) => g.status === "saved"),
      gifted: gifts.filter((g) => g.status === "gifted"),
      declined: gifts.filter((g) => g.status === "declined"),
    }),
    [gifts],
  );
  const inTab =
    tab === "ideas" ? applyFilters(byStatus.ideas, filters) : tab === "gifted" ? byGiftedDate(byStatus.gifted) : byStatus.declined;
  const shown = theme ? inTab.filter((g) => theme.giftIds.includes(g.id)) : inTab;

  const setFilters = (f: Filters) => update(filterParams(f));
  const total = byStatus.ideas.filter((g) => ticked.has(g.id)).reduce((sum, g) => sum + (g.sortPrice ?? 0), 0);

  return (
    <div className="flex flex-col gap-5">
      {insights && (
        <InsightsSection personId={context.personId} insights={insights} activeTheme={theme?.label ?? null} onTheme={setThemeLabel} />
      )}
      <NotesSection personId={context.personId} initial={notes} />
      <nav aria-label="Gifts" className="grid grid-cols-3 gap-1 rounded-full border border-ink p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-current={tab === t.key ? "page" : undefined}
            onClick={() => update({ tab: t.key === "ideas" ? null : t.key }, true)}
            className={`min-h-11 rounded-full px-1 py-1.5 leading-tight transition-colors ${tab === t.key ? "bg-ink text-gold-text" : "text-ink hover:bg-ink/8"}`}
          >
            {t.label} {byStatus[t.key].length}
          </button>
        ))}
      </nav>

      {tab === "ideas" && byStatus.ideas.length === 0 && (
        <button type="button" onClick={() => setAddingIdea(true)} className={`${buttonClass} self-start`}>
          New idea
        </button>
      )}

      {tab === "ideas" && byStatus.ideas.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setAddingIdea(true)} className={buttonClass}>
              New idea
            </button>
            <FilterSort filters={filters} onChange={setFilters} currency={context.defaultCurrency} matches={shown.length} />
            <button
              type="button"
              aria-pressed={planning}
              onClick={() => {
                setPlanning(!planning);
                setTicked(new Set());
              }}
              className={`${pillClass} ${planning ? "bg-ink text-gold-text hover:bg-ink-hover" : "text-ink"}`}
            >
              Plan
            </button>
            <BudgetField personId={context.personId} initial={budget} currency={context.defaultCurrency} />
          </div>
          <ActiveFilters filters={filters} onChange={setFilters} currency={context.defaultCurrency} />
        </>
      )}

      {tab === "gifted" && (
        <button type="button" onClick={() => setAddingPast(true)} className={`${buttonClass} self-start`}>
          Add past gift
        </button>
      )}

      {shown.length === 0 ? (
        <p>
          {theme && inTab.length > 0
            ? "No matches"
            : tab === "ideas"
              ? byStatus.ideas.length === 0
                ? "No gifts yet"
                : "No matches" : tab === "gifted" ? "Nothing gifted yet" : "Nothing here yet"}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((gift) => (
            <GiftCard
              key={gift.id}
              gift={gift}
              onOpen={() => setEditing(gift)}
              planning={tab === "ideas" && planning}
              ticked={ticked.has(gift.id)}
              onTick={(on) => {
                const next = new Set(ticked);
                if (on) next.add(gift.id);
                else next.delete(gift.id);
                setTicked(next);
              }}
            />
          ))}
        </ul>
      )}

      {tab === "ideas" && planning && <PlanTotal total={total} budget={budget} currency={context.defaultCurrency} />}

      <GiftSheet open={!!editing} onClose={() => setEditing(null)} context={context} gift={editing?.edit} />
      <GiftSheet open={addingPast} onClose={() => setAddingPast(false)} context={context} past />
      <GiftSheet open={addingIdea} onClose={() => setAddingIdea(false)} context={context} />
    </div>
  );
}

// The running total of ticked ideas against the budget.
function PlanTotal({ total, budget, currency }: { total: number; budget: number | null; currency: string }) {
  const over = budget != null && total > budget;
  return (
    <div
      role="status"
      className={`sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] self-center rounded-full px-6 py-2.5 text-lg font-semibold shadow-[0_4px_10px_rgba(61,26,0,0.35)] ${
        over ? "bg-ink text-gold-text" : "bg-cream text-ink"
      }`}
    >
      {formatMoney(total, currency)}
      {budget != null && ` of ${formatMoney(budget, currency)}`}
    </div>
  );
}

function BudgetField({ personId, initial, currency }: { personId: string; initial: number | null; currency: string }) {
  const [value, setValue] = useState(initial == null ? "" : String(initial));
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState(false);

  async function save() {
    const amount = value.trim() === "" ? null : Number(value.replace(/[^\d.]/g, ""));
    if (amount != null && !Number.isFinite(amount)) {
      setError(true);
      return;
    }
    if (amount === saved) return;
    try {
      await requestJson(`/api/people/${personId}/budget`, { method: "PATCH", body: { amount } });
      setSaved(amount);
      setError(false);
    } catch {
      setError(true);
    }
  }

  return (
    <label className="flex items-center gap-2">
      <span>Budget</span>
      <span className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          aria-invalid={error}
          className={`${fieldClass.replace("w-full", "w-28")} ${error ? "border-ink" : ""}`}
        />
        <span>{currency}</span>
      </span>
    </label>
  );
}

const SORT_LABELS: Record<Filters["sort"], string> = {
  newest: "Newest",
  "price-asc": "Price low to high",
  "price-desc": "Price high to low",
  fastest: "Fastest delivery",
};

const NO_FILTERS = { min: null, max: null, delivery: null, type: null, sort: "newest" } as const;

// "Filter and sort": one pill, on every screen size, that opens the sheet.
function FilterSort({
  filters,
  onChange,
  currency,
  matches,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  currency: string;
  matches: number;
}) {
  const [open, setOpen] = useState(false);
  const active = activeFilterCount(filters) > 0 || filters.sort !== "newest";
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${pillClass} text-ink`}>
        Filter and sort
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label="Filter and sort">
        <div className="flex flex-col gap-5">
          <h2 className="font-display text-2xl text-ink">Filter and sort</h2>
          <FilterControls filters={filters} onChange={onChange} currency={currency} />
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => setOpen(false)} className={buttonClass}>
              Show {matches} {matches === 1 ? "idea" : "ideas"}
            </button>
            {active && (
              <button type="button" onClick={() => onChange({ ...filters, ...NO_FILTERS })} className={linkButtonClass}>
                Clear
              </button>
            )}
          </div>
        </div>
      </Sheet>
    </>
  );
}

// What's applied, as chips that each remove themselves: "£20-£50 ×".
function ActiveFilters({ filters, onChange, currency }: { filters: Filters; onChange: (f: Filters) => void; currency: string }) {
  // Whole amounts stay whole ("£20", not "£20.00").
  const money = (n: number) =>
    Number.isInteger(n)
      ? new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(n)
      : formatMoney(n, currency);
  const chips: { label: string; clear: Partial<Filters> }[] = [];
  if (filters.min != null || filters.max != null) {
    const label =
      filters.min != null && filters.max != null
        ? `${money(filters.min)}-${money(filters.max)}`
        : filters.min != null
          ? `From ${money(filters.min)}`
          : `Up to ${money(filters.max!)}`;
    chips.push({ label, clear: { min: null, max: null } });
  }
  if (filters.delivery != null) chips.push({ label: `Up to ${filters.delivery} days`, clear: { delivery: null } });
  if (filters.type) chips.push({ label: filters.type === "link" ? "To buy" : "DIY", clear: { type: null } });
  if (filters.sort !== "newest") chips.push({ label: SORT_LABELS[filters.sort], clear: { sort: "newest" } });
  if (chips.length === 0) return null;
  return (
    <ul aria-label="Filters" className="-my-2 flex flex-wrap gap-x-2">
      {chips.map((c) => (
        <li key={c.label}>
          <button
            type="button"
            aria-label={`Remove ${c.label}`}
            onClick={() => onChange({ ...filters, ...c.clear })}
            className="group inline-flex min-h-11 items-center"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-gold-text transition-colors group-hover:bg-ink-hover">
              {c.label}
              <span aria-hidden>×</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function FilterControls({
  filters,
  onChange,
  currency,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  currency: string;
}) {
  // Typed text, so a half-typed number isn't lost; the URL gets the number.
  const [min, setMin] = useState(filters.min == null ? "" : String(filters.min));
  const [max, setMax] = useState(filters.max == null ? "" : String(filters.max));
  const toAmount = (s: string) => {
    const n = Number(s.replace(/[^\d.]/g, ""));
    return s.trim() === "" || !Number.isFinite(n) ? null : n;
  };
  const priceBox = `${fieldClass} min-w-0`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span id="price-range">Price ({currency})</span>
        <div role="group" aria-labelledby="price-range" className="flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            aria-label="Minimum price"
            placeholder="Min"
            value={min}
            onChange={(e) => {
              setMin(e.target.value);
              onChange({ ...filters, min: toAmount(e.target.value) });
            }}
            className={priceBox}
          />
          <span aria-hidden>-</span>
          <input
            type="text"
            inputMode="decimal"
            aria-label="Maximum price"
            placeholder="Max"
            value={max}
            onChange={(e) => {
              setMax(e.target.value);
              onChange({ ...filters, max: toAmount(e.target.value) });
            }}
            className={priceBox}
          />
        </div>
      </div>
      <label className="flex flex-col gap-1">
        <span>Delivery</span>
        <select
          value={filters.delivery ?? ""}
          onChange={(e) => onChange({ ...filters, delivery: (Number(e.target.value) || null) as Filters["delivery"] })}
          className={fieldClass}
        >
          <option value="">Any</option>
          <option value="3">Up to 3 days</option>
          <option value="7">Up to 7 days</option>
          <option value="14">Up to 14 days</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span>Type</span>
        <select
          value={filters.type ?? ""}
          onChange={(e) => onChange({ ...filters, type: (e.target.value || null) as Filters["type"] })}
          className={fieldClass}
        >
          <option value="">All</option>
          <option value="link">To buy</option>
          <option value="idea">DIY</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span>Sort</span>
        <select value={filters.sort} onChange={(e) => onChange({ ...filters, sort: e.target.value as Filters["sort"] })} className={fieldClass}>
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
