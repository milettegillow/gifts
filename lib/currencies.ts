import "server-only";
import { cacheLife } from "next/cache";

// The currencies Frankfurter has rates for, fetched at most once a day.
async function fetchSupportedCurrencies(): Promise<string[]> {
  "use cache";
  cacheLife("days");
  const res = await fetch("https://api.frankfurter.app/currencies", {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Frankfurter currencies: ${res.status}`);
  const data: unknown = await res.json();
  if (!data || typeof data !== "object") throw new Error("Frankfurter currencies: bad response");
  return Object.keys(data).filter((code) => /^[A-Z]{3}$/.test(code)).sort();
}

// A failed fetch isn't cached; fall back to the ones we always want.
export async function supportedCurrencies(): Promise<string[]> {
  try {
    return await fetchSupportedCurrencies();
  } catch (err) {
    console.error("Fetching supported currencies failed", err);
    return ["EUR", "GBP", "USD"];
  }
}

// The country's currency if Frankfurter supports it, otherwise USD.
export function pickCurrency(countryCurrency: string | undefined, supported: string[]): string {
  return countryCurrency && supported.includes(countryCurrency) ? countryCurrency : "USD";
}
