import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { fail } from "@/lib/http";
import { lookupProduct } from "@/lib/product-lookup";

const ScrapeSchema = z.object({ url: z.string().trim().min(1).max(2048) });

// Reads a product page: plain scraping, with Claude filling any gaps. Any
// failure is the same short message; the form then shows empty fields with
// the URL kept.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return fail("Log in first.", 401);
  const parsed = ScrapeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Couldn't read that page", 422);
  const url = /^https?:\/\//i.test(parsed.data.url) ? parsed.data.url : `https://${parsed.data.url}`;
  try {
    const product = await lookupProduct(url, userId);
    if (!product) return fail("Couldn't read that page", 422);
    console.log(`[scrape] ${url} sources ${JSON.stringify(product.sources)}`);
    return NextResponse.json(product);
  } catch (err) {
    console.error("Reading a product page failed", url, err instanceof Error ? err.message : err);
    return fail("Couldn't read that page", 422);
  }
}
