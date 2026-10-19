// Reads what we can about a product from a page's HTML: JSON-LD first, then
// Open Graph and product meta tags, then twitter:image and itemprop price.
// Pure functions, no network.

export type StockStatus = "in_stock" | "low" | "out" | "unavailable";

export type ProductInfo = {
  title: string | null;
  image: string | null;
  price: number | null;
  currency: string | null;
  shippingText: string | null;
  shippingDaysMin: number | null;
  shippingDaysMax: number | null;
  stockStatus: StockStatus | null;
  stockCount: number | null;
};

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", pound: "£", euro: "€",
  ndash: "–", mdash: "-", hellip: "…", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

function clean(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const out = decodeEntities(text).replace(/\s+/g, " ").trim();
  return out || null;
}

function attributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return attrs;
}

// <meta> content by property, name or itemprop; the first one wins.
function metaTags(html: string): Map<string, string> {
  const meta = new Map<string, string>();
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attributes(m[0]);
    const key = (a.property ?? a.name ?? a.itemprop)?.toLowerCase();
    if (key && a.content != null && !meta.has(key)) meta.set(key, a.content);
  }
  return meta;
}

// "£1,299.00", "1.299,00 €", 12.5 -> a number.
export function parsePrice(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== "string") return null;
  let s = value.replace(/[^\d.,]/g, "");
  if (!s) return null;
  const lastDot = s.lastIndexOf("."), lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    s = /,\d{2}$/.test(s) ? s.replace(/,(?=\d{2}$)/, ".").replace(/,/g, "") : s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function currencyCode(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z]{3}$/.test(value.trim()) ? value.trim().toUpperCase() : null;
}

function firstImage(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const v of value) {
      const found = firstImage(v);
      if (found) return found;
    }
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return firstImage(o.url ?? o.contentUrl);
  }
  return null;
}

const AVAILABILITY: Record<string, StockStatus> = {
  instock: "in_stock",
  instoreonly: "in_stock",
  onlineonly: "in_stock",
  limitedavailability: "low",
  outofstock: "out",
  soldout: "out",
  discontinued: "unavailable",
};

function availability(value: unknown): StockStatus | null {
  if (typeof value !== "string") return null;
  const key = value.split("/").pop()?.toLowerCase() ?? "";
  return AVAILABILITY[key] ?? null;
}

function* walk(value: unknown, depth = 0): Generator<Record<string, unknown>> {
  if (depth > 8 || !value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const v of value) yield* walk(v, depth + 1);
    return;
  }
  const o = value as Record<string, unknown>;
  yield o;
  for (const v of Object.values(o)) if (v && typeof v === "object") yield* walk(v, depth + 1);
}

function isType(o: Record<string, unknown>, name: string) {
  const t = o["@type"];
  return t === name || (Array.isArray(t) && t.includes(name));
}

type Offer = { price: number | null; currency: string | null; stock: StockStatus | null };

// The product's stock across all its offers and variants: in stock if ANY
// offer is in stock (or limited), out or unavailable only if every offer
// that says anything agrees. Null if no offer says.
export function combinedStock(statuses: (StockStatus | null)[]): StockStatus | null {
  const known = statuses.filter((s): s is StockStatus => s != null);
  if (known.length === 0) return null;
  if (known.includes("in_stock")) return "in_stock";
  if (known.includes("low")) return "low";
  return known.every((s) => s === "unavailable") ? "unavailable" : "out";
}

function readOffer(offers: unknown[]): Offer {
  let price: number | null = null;
  let currency: string | null = null;
  const stock: (StockStatus | null)[] = [];
  for (const group of offers) {
    for (const o of walk(group)) {
      if (o.availability !== undefined) stock.push(availability(o.availability));
      if (price != null) continue;
      const spec = (o.priceSpecification ?? null) as Record<string, unknown> | Record<string, unknown>[] | null;
      const specOne = Array.isArray(spec) ? spec[0] : spec;
      price = parsePrice(o.price ?? o.lowPrice ?? specOne?.price);
      if (price != null) currency = currencyCode(o.priceCurrency ?? specOne?.priceCurrency);
    }
  }
  return { price, currency, stock: combinedStock(stock) };
}

function jsonLdProduct(html: string) {
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim().replace(/[\u0000-\u001f]+/g, " "));
    } catch {
      continue;
    }
    for (const o of walk(data)) {
      if (!isType(o, "Product") && !isType(o, "ProductGroup")) continue;
      // The main product's own offers, and every variant's.
      const variants = Array.isArray(o.hasVariant) ? (o.hasVariant as Record<string, unknown>[]) : [];
      const variant = variants[0] ?? null;
      const offer = readOffer([o.offers, ...variants.map((v) => v?.offers)].filter((x) => x != null));
      return {
        title: clean(o.name),
        image: firstImage(o.image ?? variant?.image),
        ...offer,
      };
    }
  }
  return null;
}

// The page's readable text, roughly: no scripts, styles or tags.
export function visibleText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

// Page text can only ever say "low", and only with a number ("only 3 left").
// It never says out of stock: pages carry that wording for other products,
// sizes, recommendations and hidden templates.
export function parseLowStock(text: string): { count: number } | null {
  const only = text.match(/\bonly\s+(\d{1,3})\s+(?:left|remaining)\b/i) ?? text.match(/\b(\d{1,3})\s+left\s+in\s+stock\b/i);
  return only ? { count: Number(only[1]) } : null;
}

function toDays(n: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith("h")) return Math.max(1, Math.ceil(n / 24));
  if (u.startsWith("week")) return n * 7;
  return n; // days, working days, business days
}

const UNIT = String.raw`(working\s+days?|business\s+days?|days?|hours?|hrs?|weeks?)`;
const RANGE = String.raw`(\d{1,3})(?:\s*(?:-|–|to)\s*(\d{1,3}))?\s*`;
const VERB = String.raw`(?:delivery|delivered|deliver|arrives?|ships?|shipped|shipping|dispatch(?:ed|es)?|despatch(?:ed|es)?)`;

// "delivery in 3-5 working days", "ships in 2 days", "dispatched within 24 hours".
export function findShipping(text: string) {
  const patterns = [
    new RegExp(String.raw`\b${VERB}\s+(?:in|within)\s+${RANGE}${UNIT}`, "i"),
    new RegExp(String.raw`\b${VERB}\b[^.\d]{0,25}?${RANGE}${UNIT}`, "i"),
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const min = toDays(Number(m[1]), m[3]);
      const max = m[2] ? toDays(Number(m[2]), m[3]) : min;
      return { text: m[0].trim(), min: Math.min(min, max), max: Math.max(min, max) };
    }
  }
  const nextDay = text.match(/\bnext[\s-]day\s+(?:delivery|shipping|dispatch)\b/i);
  return nextDay ? { text: nextDay[0], min: 1, max: 1 } : null;
}

// Days from something a person typed: "3-5 days", "2 weeks", "next day".
export function parseShippingDays(text: string): { min: number; max: number } | null {
  const m = text.match(new RegExp(RANGE + UNIT, "i"));
  if (m) {
    const min = toDays(Number(m[1]), m[3]);
    const max = m[2] ? toDays(Number(m[2]), m[3]) : min;
    return { min: Math.min(min, max), max: Math.max(min, max) };
  }
  return /\bnext[\s-]day\b/i.test(text) ? { min: 1, max: 1 } : null;
}

export function readProductPage(html: string, pageUrl: string): ProductInfo {
  const meta = metaTags(html);
  const ld = jsonLdProduct(html);
  const titleTag = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];

  const itempropPriceTag = html.match(/<[^>]*\bitemprop\s*=\s*["']price["'][^>]*>([^<]*)/i);
  const itempropPrice = itempropPriceTag
    ? parsePrice(attributes(itempropPriceTag[0]).content ?? itempropPriceTag[1])
    : null;

  let image = ld?.image ?? meta.get("og:image") ?? meta.get("og:image:url") ?? meta.get("og:image:secure_url") ?? meta.get("twitter:image") ?? meta.get("twitter:image:src") ?? null;
  if (image) {
    try {
      const u = new URL(decodeEntities(image), pageUrl);
      // Shopify serves thumbnails (width=100) in JSON-LD; ask for the full size.
      if (u.pathname.includes("/cdn/shop/") && Number(u.searchParams.get("width")) < 600) {
        u.searchParams.delete("width");
      }
      image = u.toString();
    } catch {
      image = null;
    }
  }

  const price =
    ld?.price ??
    parsePrice(meta.get("product:price:amount") ?? meta.get("og:price:amount")) ??
    parsePrice(meta.get("price")) ??
    itempropPrice;
  const currency =
    ld?.currency ??
    currencyCode(meta.get("product:price:currency") ?? meta.get("og:price:currency")) ??
    currencyCode(meta.get("pricecurrency")) ??
    null;

  const text = visibleText(html);
  // Out or unavailable only ever comes from the main product's structured data.
  let stockStatus = ld?.stock ?? null;
  let stockCount: number | null = null;
  const low = stockStatus === "out" || stockStatus === "unavailable" ? null : parseLowStock(text);
  if (low) {
    stockStatus = "low";
    stockCount = low.count;
  }
  const shipping = findShipping(text);

  return {
    title: ld?.title ?? clean(meta.get("og:title")) ?? clean(meta.get("twitter:title")) ?? clean(titleTag),
    image,
    price,
    currency,
    shippingText: shipping?.text ?? null,
    shippingDaysMin: shipping?.min ?? null,
    shippingDaysMax: shipping?.max ?? null,
    stockStatus,
    stockCount,
  };
}
