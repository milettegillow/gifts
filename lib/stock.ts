import "server-only";
import { sql } from "./db";
import { isUuid } from "./people";
import { scrapePage } from "./scrape";

// Re-reads a person's saved links that haven't been checked for a day, to
// keep prices and stock current. Plain scraping only (no Claude). Runs after
// the page is sent; results show on the next load.

const CONCURRENCY = 3;
// Gifts being checked by this server right now, so quick reloads don't
// start the same check twice.
const inFlight = new Set<string>();

async function inBatches<T>(items: T[], size: number, run: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) await run(items[next++]);
    }),
  );
}

export async function recheckStock(personId: string, userId: string): Promise<void> {
  if (!isUuid(personId)) return;
  const due = await sql`
    select id, url from gifts
    where person_id = ${personId} and user_id = ${userId} and kind = 'link' and status = 'saved'
      and url is not null and last_checked_at < now() - interval '24 hours'
  `;
  const gifts = due.map((g) => ({ id: g.id as string, url: g.url as string })).filter((g) => !inFlight.has(g.id));
  if (gifts.length === 0) return;
  for (const g of gifts) inFlight.add(g.id);
  try {
    await inBatches(gifts, CONCURRENCY, async (gift) => {
      const page = await scrapePage(gift.url);
      if (page.kind === "gone") {
        await sql`
          update gifts set stock_status = 'unavailable', stock_count = null, last_checked_at = now()
          where id = ${gift.id} and user_id = ${userId}
        `;
      } else if (page.kind === "read") {
        const { price, currency, stockStatus, stockCount } = page.info;
        // Only what the page told us changes; the rest stays as it was.
        await sql`
          update gifts set
            price_amount = coalesce(${price}, price_amount),
            price_currency = case when ${price}::numeric is not null then coalesce(${currency}, price_currency) else price_currency end,
            stock_status = coalesce(${stockStatus}, stock_status),
            stock_count = case when ${stockStatus}::text is not null then ${stockCount}::int else stock_count end,
            last_checked_at = now()
          where id = ${gift.id} and user_id = ${userId}
        `;
      }
      // Network errors and blocked pages leave the gift untouched.
    });
  } finally {
    for (const g of gifts) inFlight.delete(g.id);
  }
}
