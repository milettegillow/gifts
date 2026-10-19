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

// A formatter for prices shown to a user: converted into their currency
// when we have a rate, otherwise in the shop's own currency.
export async function priceFormatter(userCurrency: string | null) {
  let rates: Record<string, number> | null = null;
  if (userCurrency) {
    try {
      rates = await fetchRates(userCurrency);
    } catch (err) {
      console.error("Fetching exchange rates failed", err);
    }
  }
  return (amount: number | null, currency: string | null): string | null => {
    if (amount == null) return null;
    if (!currency) return userCurrency ? formatMoney(amount, userCurrency) : String(amount);
    if (!userCurrency || currency === userCurrency) return formatMoney(amount, currency);
    // rates[X] is how many X one unit of the user's currency buys.
    const rate = rates?.[currency];
    return rate ? formatMoney(amount / rate, userCurrency) : formatMoney(amount, currency);
  };
}
