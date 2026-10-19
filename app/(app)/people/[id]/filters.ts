import type { GiftCardData } from "./gift-types";

// Filters and sort for the Ideas tab, kept in the URL.

export type Sort = "newest" | "price-asc" | "price-desc" | "fastest";
export type Filters = {
  min: number | null;
  max: number | null;
  delivery: 3 | 7 | 14 | null;
  type: "link" | "idea" | null;
  sort: Sort;
};

const SORTS: Sort[] = ["newest", "price-asc", "price-desc", "fastest"];

function amount(value: string | null): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function readFilters(params: URLSearchParams): Filters {
  const delivery = Number(params.get("delivery"));
  const type = params.get("type");
  const sort = params.get("sort") as Sort;
  return {
    min: amount(params.get("min")),
    max: amount(params.get("max")),
    delivery: delivery === 3 || delivery === 7 || delivery === 14 ? delivery : null,
    type: type === "link" || type === "idea" ? type : null,
    sort: SORTS.includes(sort) ? sort : "newest",
  };
}

// The query values for each filter; null removes it.
export function filterParams(f: Filters): Record<string, string | null> {
  return {
    min: f.min == null ? null : String(f.min),
    max: f.max == null ? null : String(f.max),
    delivery: f.delivery == null ? null : String(f.delivery),
    low: null, // a retired filter; dropped from old links
    type: f.type,
    sort: f.sort === "newest" ? null : f.sort,
  };
}

export function activeFilterCount(f: Filters): number {
  return [f.min != null || f.max != null, f.delivery != null, f.type != null].filter(Boolean).length;
}

// Unknown values go last whichever way the sort runs.
function byKnown(a: number | null, b: number | null, dir: 1 | -1): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return (a - b) * dir;
}

const newest = (a: GiftCardData, b: GiftCardData) => b.createdAt.localeCompare(a.createdAt);

export function applyFilters(gifts: GiftCardData[], f: Filters): GiftCardData[] {
  const kept = gifts.filter((g) => {
    // A gift with an unknown price or delivery only drops out when that filter is on.
    if (f.min != null || f.max != null) {
      if (g.sortPrice == null) return false;
      if (f.min != null && g.sortPrice < f.min) return false;
      if (f.max != null && g.sortPrice > f.max) return false;
    }
    if (f.delivery != null && (g.shippingMax == null || g.shippingMax > f.delivery)) return false;
    if (f.type && g.kind !== f.type) return false;
    return true;
  });
  const compare = {
    newest,
    "price-asc": (a: GiftCardData, b: GiftCardData) => byKnown(a.sortPrice, b.sortPrice, 1) || newest(a, b),
    "price-desc": (a: GiftCardData, b: GiftCardData) => byKnown(a.sortPrice, b.sortPrice, -1) || newest(a, b),
    fastest: (a: GiftCardData, b: GiftCardData) => byKnown(a.shippingMax, b.shippingMax, 1) || newest(a, b),
  }[f.sort];
  const sorted = [...kept].sort(compare);
  // Out of stock and unavailable always sink to the bottom.
  return [...sorted.filter((g) => !g.stock?.gone), ...sorted.filter((g) => g.stock?.gone)];
}

// Gifted tab: most recently given first.
export function byGiftedDate(gifts: GiftCardData[]): GiftCardData[] {
  return [...gifts].sort((a, b) => byKnown(a.giftedOn ? Date.parse(a.giftedOn) : null, b.giftedOn ? Date.parse(b.giftedOn) : null, -1) || newest(a, b));
}
