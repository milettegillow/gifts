import "server-only";
import { shippingViaWebSearch } from "./claude";
import { sql } from "./db";
import { isUuid } from "./people";

// Fills in delivery times for a saved link that doesn't have them, from what
// we know about the shop: cached per (shop, country) for 30 days, otherwise
// looked up once with Claude's web search. Runs after the response is sent.

export function shopDomain(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

type Cached = { days_min: number | null; days_max: number | null; text: string | null };

export async function fillShipping(giftId: string, userId: string): Promise<void> {
  if (!isUuid(giftId)) return;
  const rows = await sql`
    select g.url, g.shipping_days_min, u.country
    from gifts g join users u on u.clerk_id = g.user_id
    where g.id = ${giftId} and g.user_id = ${userId} and g.kind = 'link'
  `;
  const gift = rows[0];
  if (!gift || gift.shipping_days_min != null || !gift.url || !gift.country) return;
  const domain = shopDomain(gift.url as string);
  const country = gift.country as string;
  if (!domain) return;

  // Unknown answers are cached too, so a shop we can't find isn't searched again for 30 days.
  const cached = await sql`
    select days_min, days_max, text from shipping_cache
    where shop_domain = ${domain} and country = ${country} and fetched_at > now() - interval '30 days'
  `;
  let info = cached[0] as Cached | undefined;
  if (!info) {
    const name = new Intl.DisplayNames(["en-GB"], { type: "region" }).of(country) ?? country;
    const found = await shippingViaWebSearch(userId, domain, { code: country, name });
    if (!found) return; // over the cap, no key, or the call failed: try again next time
    info = { days_min: found.days_min ?? null, days_max: found.days_max ?? found.days_min ?? null, text: found.text ?? null };
    await sql`
      insert into shipping_cache (shop_domain, country, days_min, days_max, text, fetched_at)
      values (${domain}, ${country}, ${info.days_min}, ${info.days_max}, ${info.text}, now())
      on conflict (shop_domain, country) do update set
        days_min = excluded.days_min, days_max = excluded.days_max, text = excluded.text, fetched_at = excluded.fetched_at
    `;
  }
  if (info.days_min == null) return;
  await sql`
    update gifts set
      shipping_days_min = ${info.days_min},
      shipping_days_max = ${info.days_max ?? info.days_min},
      shipping_text = coalesce(shipping_text, ${info.text})
    where id = ${giftId} and user_id = ${userId} and shipping_days_min is null
  `;
}
