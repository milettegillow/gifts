import "server-only";
import { cacheLife } from "next/cache";
import { formatMoney } from "./money";

// Rates from one currency to every other Frankfurter knows, kept for a day.
async function fetchRates(base: string): Promise<Record<string, number>> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 86400, expire: 7 * 86400 });
  const res = await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`, {
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Frankfurter latest ${base}: ${res.status}`);
  const data = (await res.json()) as { rates?: Record<string, number> };
  return data.rates ?? {};
}

// Prices for one user: converted into their currency when we have a rate.
// convert() gives the amount in their currency (null if it can't), for
// filtering, sorting and totals; format() is what the card shows - the shop's
// own currency when conversion isn't possible.
export async function pricing(userCurrency: string | null) {
  let rates: Record<string, number> | null = null;
  if (userCurrency) {
    try {
      rates = await fetchRates(userCurrency);
    } catch (err) {
      console.error("Fetching exchange rates failed", err);
    }
  }
  function convert(amount: number | null, currency: string | null): number | null {
    if (amount == null) return null;
    if (!currency || currency === userCurrency) return amount;
    // rates[X] is how many X one unit of the user's currency buys.
    const rate = rates?.[currency];
    return rate ? amount / rate : null;
  }
  function format(amount: number | null, currency: string | null): string | null {
    if (amount == null) return null;
    const converted = convert(amount, currency);
    if (converted != null && userCurrency) return formatMoney(converted, userCurrency);
    return currency ? formatMoney(amount, currency) : String(amount);
  }
  return { convert, format };
}
