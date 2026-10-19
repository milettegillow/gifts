import "server-only";
import { sql } from "./db";
import { isUuid } from "./people";
import { isStoredImage } from "./photos";
import type { StockStatus } from "./product-page";

// Every query here is scoped to the given Clerk userId.

export type GiftKind = "link" | "idea";
export type GiftStatus = "saved" | "gifted" | "declined";

export type GiftRow = {
  id: string;
  personId: string;
  kind: GiftKind;
  title: string;
  url: string | null;
  imageUrl: string | null;
  priceAmount: number | null;
  priceCurrency: string | null;
  shippingText: string | null;
  shippingDaysMin: number | null;
  shippingDaysMax: number | null;
  stockStatus: StockStatus | null;
  stockCount: number | null;
  // Stock picked by hand; the daily re-check leaves it alone.
  stockManual: boolean;
  notes: string | null;
  status: GiftStatus;
  occasion: string | null;
  giftedOn: string | null; // YYYY-MM-DD
  rating: number | null;
  declinedReason: string | null;
  createdAt: string;
};

// Everything a gift can be saved with (status, occasion etc. come later).
export type GiftFields = Omit<
  GiftRow,
  "id" | "personId" | "status" | "occasion" | "giftedOn" | "rating" | "declinedReason" | "createdAt"
> & { checked: boolean };

// A gift saved straight into the Gifted tab.
export type PastGift = { occasion: string | null; giftedOn: string; rating: number | null };

function toGift(row: Record<string, unknown>): GiftRow {
  const num = (v: unknown) => (v == null ? null : Number(v));
  return {
    id: row.id as string,
    personId: row.person_id as string,
    kind: row.kind as GiftKind,
    title: row.title as string,
    url: (row.url as string | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
    priceAmount: num(row.price_amount),
    priceCurrency: (row.price_currency as string | null) ?? null,
    shippingText: (row.shipping_text as string | null) ?? null,
    shippingDaysMin: num(row.shipping_days_min),
    shippingDaysMax: num(row.shipping_days_max),
    stockStatus: (row.stock_status as StockStatus | null) ?? null,
    stockCount: num(row.stock_count),
    stockManual: row.stock_manual === true,
    notes: (row.notes as string | null) ?? null,
    status: row.status as GiftStatus,
    occasion: (row.occasion as string | null) ?? null,
    giftedOn: (row.gifted_on as string | null) ?? null,
    rating: num(row.rating),
    declinedReason: (row.declined_reason as string | null) ?? null,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

// Where the browser loads the image from: our photo route for stored images
// (versioned so it can be cached for good), the shop's URL otherwise.
export function giftImageSrc(gift: Pick<GiftRow, "id" | "imageUrl">): string | null {
  if (!gift.imageUrl) return null;
  if (!isStoredImage(gift.imageUrl)) return gift.imageUrl;
  const version = gift.imageUrl.split("/").pop()?.replace(/\.[a-z]+$/i, "") ?? "";
  return `/api/gifts/${gift.id}/photo?v=${encodeURIComponent(version)}`;
}

// All of a person's gifts, whatever their status, newest first.
export async function listGifts(personId: string, userId: string): Promise<GiftRow[]> {
  if (!isUuid(personId)) return [];
  const rows = await sql`
    select * from gifts
    where person_id = ${personId} and user_id = ${userId}
    order by created_at desc, id
  `;
  return rows.map(toGift);
}

export async function getGift(id: string, userId: string): Promise<GiftRow | null> {
  if (!isUuid(id)) return null;
  const rows = await sql`select * from gifts where id = ${id} and user_id = ${userId}`;
  return rows[0] ? toGift(rows[0]) : null;
}

// The person must be the user's own (the foreign key enforces it too).
export async function createGift(
  id: string,
  personId: string,
  userId: string,
  g: GiftFields,
  past: PastGift | null = null,
): Promise<boolean> {
  const rows = await sql`
    insert into gifts (
      id, person_id, user_id, kind, title, url, image_url, price_amount, price_currency,
      shipping_text, shipping_days_min, shipping_days_max, stock_status, stock_count, stock_manual, notes,
      last_checked_at, status, occasion, gifted_on, rating
    )
    select
      ${id}, p.id, p.user_id, ${g.kind}, ${g.title}, ${g.url}, ${g.imageUrl}, ${g.priceAmount},
      ${g.priceCurrency}, ${g.shippingText}, ${g.shippingDaysMin}, ${g.shippingDaysMax},
      ${g.stockStatus}, ${g.stockCount}, ${g.stockManual}, ${g.notes}, ${g.checked ? new Date() : null},
      ${past ? "gifted" : "saved"}, ${past?.occasion ?? null}, ${past?.giftedOn ?? null}, ${past?.rating ?? null}
    from people p
    where p.id = ${personId} and p.user_id = ${userId}
    returning id
  `;
  return rows.length > 0;
}

export async function updateGift(id: string, userId: string, g: GiftFields): Promise<boolean> {
  const rows = await sql`
    update gifts set
      title = ${g.title}, url = ${g.url}, image_url = ${g.imageUrl},
      price_amount = ${g.priceAmount}, price_currency = ${g.priceCurrency},
      shipping_text = ${g.shippingText}, shipping_days_min = ${g.shippingDaysMin},
      shipping_days_max = ${g.shippingDaysMax}, stock_status = ${g.stockStatus},
      stock_count = ${g.stockCount}, stock_manual = ${g.stockManual}, notes = ${g.notes},
      last_checked_at = case when ${g.checked} then now() else last_checked_at end
    where id = ${id} and user_id = ${userId}
    returning id
  `;
  return rows.length > 0;
}

// Returns the image URL to clean up, or null if there was no such gift.
export async function deleteGift(id: string, userId: string): Promise<{ imageUrl: string | null } | null> {
  if (!isUuid(id)) return null;
  const rows = await sql`delete from gifts where id = ${id} and user_id = ${userId} returning image_url`;
  return rows[0] ? { imageUrl: (rows[0].image_url as string | null) ?? null } : null;
}

export type StatusChange =
  | { status: "gifted"; occasion: string | null; giftedOn: string }
  | { status: "declined"; reason: string | null }
  | { status: "saved" };

// Moving between Ideas, Gifted and Decided against. Going back to ideas
// clears the gifted and declined details (and the rating).
export async function setStatus(id: string, userId: string, change: StatusChange): Promise<boolean> {
  if (!isUuid(id)) return false;
  const rows =
    change.status === "gifted"
      ? await sql`
          update gifts set status = 'gifted', occasion = ${change.occasion}, gifted_on = ${change.giftedOn},
            declined_reason = null
          where id = ${id} and user_id = ${userId} returning id
        `
      : change.status === "declined"
        ? await sql`
            update gifts set status = 'declined', declined_reason = ${change.reason},
              occasion = null, gifted_on = null, rating = null
            where id = ${id} and user_id = ${userId} returning id
          `
        : await sql`
            update gifts set status = 'saved', occasion = null, gifted_on = null, rating = null,
              declined_reason = null
            where id = ${id} and user_id = ${userId} returning id
          `;
  return rows.length > 0;
}

// Only gifted gifts have a rating.
export async function setRating(id: string, userId: string, rating: number): Promise<boolean> {
  if (!isUuid(id)) return false;
  const rows = await sql`
    update gifts set rating = ${rating}
    where id = ${id} and user_id = ${userId} and status = 'gifted' returning id
  `;
  return rows.length > 0;
}
