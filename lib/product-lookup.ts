import "server-only";
import { productFromText, productViaWebFetch, type ClaudeProduct } from "./claude";
import type { ProductInfo } from "./product-page";
import { scrapePage } from "./scrape";

export type Source = "page" | "claude-text" | "claude-fetch";
export type ProductLookup = ProductInfo & { url: string; sources: Partial<Record<keyof ProductInfo, Source>> };

const EMPTY: ProductInfo = {
  title: null,
  image: null,
  price: null,
  currency: null,
  shippingText: null,
  shippingDaysMin: null,
  shippingDaysMax: null,
  stockStatus: null,
  stockCount: null,
};

function fromClaude(c: ClaudeProduct): Partial<ProductInfo> {
  return {
    title: c.title,
    image: c.image_url,
    price: c.price_amount,
    currency: c.price_currency,
    shippingText: c.shipping_text,
    shippingDaysMin: c.shipping_days_min,
    shippingDaysMax: c.shipping_days_max,
    stockStatus: c.stock_status,
    stockCount: c.stock_count,
  };
}

// Fills only what's still missing, never overwriting what the page gave us.
function fillGaps(target: ProductLookup, extra: Partial<ProductInfo>, source: Source) {
  for (const key of Object.keys(EMPTY) as (keyof ProductInfo)[]) {
    const value = extra[key];
    if (target[key] == null && value != null) {
      (target as Record<string, unknown>)[key] = value;
      target.sources[key] = source;
    }
  }
}

const MAX_TEXT = 15_000;

// Reads a product page: plain scraping first, then Claude for the gaps.
// Null when nothing usable came back.
export async function lookupProduct(url: string, userId: string): Promise<ProductLookup | null> {
  const page = await scrapePage(url);
  let result: ProductLookup;

  if (page.kind === "read") {
    result = { ...EMPTY, url: page.url, sources: {} };
    fillGaps(result, page.info, "page");
    if (result.title == null || result.price == null) {
      const claude = await productFromText(userId, page.url, page.text.slice(0, MAX_TEXT));
      if (claude) fillGaps(result, fromClaude(claude), "claude-text");
    }
  } else if (page.kind === "blocked" || (page.kind === "error" && !page.reason.startsWith("unsafe"))) {
    // We couldn't read it ourselves; Claude's web fetch may be able to.
    result = { ...EMPTY, url, sources: {} };
    const claude = await productViaWebFetch(userId, url);
    if (claude) fillGaps(result, fromClaude(claude), "claude-fetch");
  } else {
    return null;
  }

  // Keep the days in order whichever step filled them.
  if (result.shippingDaysMin != null && result.shippingDaysMax == null) result.shippingDaysMax = result.shippingDaysMin;
  if (result.shippingDaysMin != null && result.shippingDaysMax != null && result.shippingDaysMax < result.shippingDaysMin) {
    [result.shippingDaysMin, result.shippingDaysMax] = [result.shippingDaysMax, result.shippingDaysMin];
  }
  return result.title == null && result.price == null && result.image == null ? null : result;
}
