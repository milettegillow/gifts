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

// Saves what a fresh read of a gift's page says. A 404/410 means it's no
// longer available. Stock comes only from the page's structured data (or
// "only N left"), and is unknown when the page doesn't say. A stock picked by
// hand is left alone. Network errors and blocked pages change nothing.
export async function applyPage(
  gift: { id: string; manual: boolean },
  userId: string,
  page: Awaited<ReturnType<typeof scrapePage>>,
): Promise<void> {
  if (page.kind === "gone") {
    await sql`
      update gifts set
        stock_status = case when stock_manual then stock_status else 'unavailable' end,
        stock_count = case when stock_manual then stock_count else null end,
        last_checked_at = now()
      where id = ${gift.id} and user_id = ${userId}
    `;
  } else if (page.kind === "read") {
    const { price, currency, stockStatus, stockCount } = page.info;
    await sql`
      update gifts set
        price_amount = coalesce(${price}, price_amount),
        price_currency = case when ${price}::numeric is not null then coalesce(${currency}, price_currency) else price_currency end,
        stock_status = case when stock_manual then stock_status else ${stockStatus} end,
        stock_count = case when stock_manual then stock_count else ${stockStatus === "low" ? stockCount : null}::int end,
        last_checked_at = now()
      where id = ${gift.id} and user_id = ${userId}
    `;
  }
}

export async function recheckStock(personId: string, userId: string): Promise<void> {
  if (!isUuid(personId)) return;
  const due = await sql`
    select id, url, stock_manual from gifts
    where person_id = ${personId} and user_id = ${userId} and kind = 'link' and status = 'saved'
      and url is not null and last_checked_at < now() - interval '24 hours'
  `;
  const gifts = due
    .map((g) => ({ id: g.id as string, url: g.url as string, manual: g.stock_manual === true }))
    .filter((g) => !inFlight.has(g.id));
  if (gifts.length === 0) return;
  for (const g of gifts) inFlight.add(g.id);
  try {
    await inBatches(gifts, CONCURRENCY, async (gift) => {
      await applyPage(gift, userId, await scrapePage(gift.url));
    });
  } finally {
    for (const g of gifts) inFlight.delete(g.id);
  }
}
