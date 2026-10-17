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
