import "server-only";
import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { sql } from "./db";

// The signed-in user's Clerk id, creating their users row on first sign-in.
// Every other query is scoped to the id this returns. Cached per request.
export const requireUser = cache(async (): Promise<string> => {
  const { userId } = await auth.protect();
  await sql`
    insert into users (clerk_id) values (${userId})
    on conflict (clerk_id) do nothing
  `;
  return userId;
});

export type UserSettings = { country: string | null; currency: string | null };

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const rows = await sql`select country, currency from users where clerk_id = ${userId}`;
  const row = rows[0];
  return {
    country: (row?.country as string | null) ?? null,
    currency: (row?.currency as string | null) ?? null,
  };
}

// Upserts, so it works even if the row was never created.
export async function saveCountry(userId: string, country: string, currency: string) {
  await sql`
    insert into users (clerk_id, country, currency) values (${userId}, ${country}, ${currency})
    on conflict (clerk_id) do update set country = excluded.country, currency = excluded.currency
  `;
}

export async function saveCurrency(userId: string, currency: string) {
  await sql`update users set currency = ${currency} where clerk_id = ${userId}`;
}
