import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { fail } from "@/lib/http";
import { scrapeProduct } from "@/lib/scrape";

const ScrapeSchema = z.object({ url: z.string().trim().max(2048) });

// Reads a product page. Any failure is the same short message; the form then
// shows empty fields with the URL kept.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return fail("Log in first.", 401);
  const parsed = ScrapeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Couldn't read that page", 422);
  try {
    return NextResponse.json(await scrapeProduct(withScheme(parsed.data.url)));
  } catch (err) {
    console.error("Reading a product page failed", parsed.data.url, err instanceof Error ? err.message : err);
    return fail("Couldn't read that page", 422);
  }
}

function withScheme(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
