import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { sql } from "./db";

// Claude helps where plain scraping can't: reading a page's text, reading a
// page we were blocked from, and looking up a shop's delivery times. Server
// only; the key never reaches the browser. Every call counts towards a daily
// cap per user and is logged with its token usage.

const MODEL = "claude-haiku-5-5";
export const DAILY_CAP = 50;

let client: Anthropic | null = null;
export function anthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic();
  return client;
}

// Takes one call from today's allowance. False when the key is missing or
// the user is over the cap, in which case the Claude step is skipped.
// Counting happens before the call, in one statement, so parallel requests
// can't slip past the cap.
export async function takeCall(userId: string): Promise<boolean> {
  if (!anthropic()) return false;
  try {
    const rows = await sql`
      insert into claude_usage (user_id, day, count) values (${userId}, current_date, 1)
      on conflict (user_id, day) do update set count = claude_usage.count + 1
        where claude_usage.count < ${DAILY_CAP}
      returning count
    `;
    return rows.length > 0;
  } catch (err) {
    console.error("[claude] counting a call failed; skipping", err);
    return false;
  }
}

type Usage = {
  input_tokens: number;
  output_tokens: number;
  server_tool_use?: { web_fetch_requests?: number | null; web_search_requests?: number | null } | null;
};

export function logUsage(purpose: string, userId: string, message: { model: string; stop_reason: string | null; usage: Usage }) {
  const u = message.usage;
  const tools = u.server_tool_use
    ? ` web_fetch=${u.server_tool_use.web_fetch_requests ?? 0} web_search=${u.server_tool_use.web_search_requests ?? 0}`
    : "";
  console.log(
    `[claude] ${purpose} user=${userId} model=${message.model} stop=${message.stop_reason} input=${u.input_tokens} output=${u.output_tokens}${tools}`,
  );
}

// ---------- Product details ----------

const STOCK = ["in_stock", "low", "out", "unavailable"] as const;

// Each field is checked on its own, so one bad value is dropped rather than
// losing the lot.
const PRODUCT_FIELDS = {
  title: z.string().trim().min(1).max(200),
  price_amount: z.number().nonnegative().max(10_000_000),
  price_currency: z.string().regex(/^[A-Z]{3}$/),
  image_url: z.string().url().max(2048).refine((s) => /^https?:\/\//i.test(s)),
  stock_status: z.enum(STOCK),
  stock_count: z.number().int().nonnegative().max(100_000),
  shipping_text: z.string().trim().min(1).max(200),
  shipping_days_min: z.number().int().nonnegative().max(365),
  shipping_days_max: z.number().int().nonnegative().max(365),
};

export type ClaudeProduct = Partial<{ [K in keyof typeof PRODUCT_FIELDS]: z.infer<(typeof PRODUCT_FIELDS)[K]> }>;

function keepValid<T extends Record<string, z.ZodType>>(fields: T, data: unknown) {
  const out: Partial<{ [K in keyof T]: z.infer<T[K]> }> = {};
  if (!data || typeof data !== "object") return out;
  for (const key of Object.keys(fields) as (keyof T)[]) {
    const value = (data as Record<string, unknown>)[key as string];
    if (value == null) continue;
    // A number sent as a string ("24.99") still counts for number fields.
    const numeric = fields[key] instanceof z.ZodNumber && typeof value === "string" && /^\d+(\.\d+)?$/.test(value);
    const parsed = fields[key].safeParse(numeric ? Number(value) : value);
    if (parsed.success) out[key] = parsed.data;
  }
  return out;
}

// "Out" and "unavailable" are only kept when Claude quotes the page saying so
// about the product; anything weaker leaves the stock unknown.
function trustedStock(product: ClaudeProduct, raw: unknown): ClaudeProduct {
  const evidence = raw && typeof raw === "object" ? (raw as Record<string, unknown>).stock_evidence : null;
  if ((product.stock_status === "out" || product.stock_status === "unavailable") && !(typeof evidence === "string" && evidence.trim())) {
    delete product.stock_status;
    delete product.stock_count;
  }
  return product;
}

// Structured output for the text call: every field present, null if unknown.
const ProductOutput = z.object({
  title: z.string().nullable(),
  price_amount: z.number().nullable(),
  price_currency: z.string().nullable(),
  image_url: z.string().nullable(),
  stock_status: z.enum(STOCK).nullable(),
  stock_count: z.number().nullable(),
  stock_evidence: z.string().nullable(),
  shipping_text: z.string().nullable(),
  shipping_days_min: z.number().nullable(),
  shipping_days_max: z.number().nullable(),
});

const PRODUCT_INSTRUCTIONS = `You read product pages for a gift list. Report only what the page states about the main product; use null for anything it doesn't say.
- title: the product's name as the shop gives it.
- price_amount and price_currency (ISO 4217, e.g. GBP): the current selling price.
- image_url: the main product image, as an absolute URL.
- stock_status: in_stock, low (only a few left), out (sold out), unavailable (discontinued / no longer sold), or null. Pages often contain "Out of stock" or "Sold out" text that isn't about this product right now - hidden button states and templates, other sizes or colours, recommended products, back-in-stock sign-up forms. Only say out or unavailable when the page clearly says the main product as a whole can't be bought; if there's an "Add to bag" / "Add to basket" button for it, or any doubt, use in_stock or null.
- stock_evidence: the exact words on the page your stock_status is based on, or null.
- stock_count: the number left, only if the page says one.
- shipping_text: the standard delivery estimate in a few words, e.g. "3-5 working days"; shipping_days_min/max: that estimate in days (24 hours = 1).`;

// The page's visible text, for when plain scraping missed the title or price.
export async function productFromText(userId: string, url: string, text: string): Promise<ClaudeProduct | null> {
  const api = anthropic();
  if (!api || !(await takeCall(userId))) return null;
  try {
    const message = await api.messages.parse({
      model: MODEL,
      max_tokens: 2048,
      system: PRODUCT_INSTRUCTIONS,
      output_config: { effort: "low", format: zodOutputFormat(ProductOutput) },
      messages: [{ role: "user", content: `Page URL: ${url}\n\nVisible text of the page:\n${text}` }],
    });
    logUsage("scrape-text", userId, message);
    if (message.stop_reason === "refusal") return null;
    return trustedStock(keepValid(PRODUCT_FIELDS, message.parsed_output), message.parsed_output);
  } catch (err) {
    console.error("[claude] scrape-text failed", err instanceof Error ? err.message : err);
    return null;
  }
}

// The last JSON object in the response's text.
function jsonFrom(message: Anthropic.Message): unknown {
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const match = text.match(/\{[\s\S]*\}/g)?.pop();
  if (!match) return null;
  try {
    return JSON.parse(match);
  } catch {
    return null;
  }
}

// Runs a request with server tools, continuing if the API pauses the turn.
async function runWithServerTools(
  api: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  const messages = [...params.messages];
  let message = await api.messages.create({ ...params, messages });
  for (let i = 0; i < 3 && message.stop_reason === "pause_turn"; i++) {
    messages.push({ role: "assistant", content: message.content });
    message = await api.messages.create({ ...params, messages });
  }
  return message;
}

const JSON_ONLY = `Reply with only a JSON object with these keys: title, price_amount, price_currency, image_url, stock_status, stock_count, stock_evidence, shipping_text, shipping_days_min, shipping_days_max. Use null for anything unknown. No other text.`;

// When we couldn't fetch the page ourselves (blocked), Claude's web fetch can.
export async function productViaWebFetch(userId: string, url: string): Promise<ClaudeProduct | null> {
  const api = anthropic();
  if (!api || !(await takeCall(userId))) return null;
  try {
    const message = await runWithServerTools(api, {
      model: MODEL,
      max_tokens: 4096,
      system: PRODUCT_INSTRUCTIONS,
      output_config: { effort: "low" },
      tools: [{ type: "web_fetch_20250910", name: "web_fetch", max_uses: 2, max_content_tokens: 20000 }],
      messages: [{ role: "user", content: `Fetch this product page and read it: ${url}\n\n${JSON_ONLY}` }],
    });
    logUsage("scrape-web-fetch", userId, message);
    if (message.stop_reason === "refusal") return null;
    const raw = jsonFrom(message);
    return trustedStock(keepValid(PRODUCT_FIELDS, raw), raw);
  } catch (err) {
    console.error("[claude] scrape-web-fetch failed", err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------- Delivery times ----------

const SHIPPING_FIELDS = {
  days_min: z.number().int().nonnegative().max(365),
  days_max: z.number().int().nonnegative().max(365),
  text: z.string().trim().min(1).max(60),
};

export type ClaudeShipping = Partial<{ days_min: number; days_max: number; text: string }>;

// How long standard delivery takes from a shop to a country, from a search.
export async function shippingViaWebSearch(
  userId: string,
  domain: string,
  country: { code: string; name: string },
): Promise<ClaudeShipping | null> {
  const api = anthropic();
  if (!api || !(await takeCall(userId))) return null;
  try {
    const message = await runWithServerTools(api, {
      model: MODEL,
      max_tokens: 4096,
      output_config: { effort: "low" },
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 3,
          user_location: { type: "approximate", country: country.code },
        },
      ],
      messages: [
        {
          role: "user",
          content: `How long does standard delivery take from ${domain} to ${country.name}? Reply with only a JSON object: {"days_min": number, "days_max": number, "text": short estimate such as "3-5 days"}. Count working days as days. Use null for anything you can't find. No other text.`,
        },
      ],
    });
    logUsage("shipping-web-search", userId, message);
    if (message.stop_reason === "refusal") return null;
    const result = keepValid(SHIPPING_FIELDS, jsonFrom(message));
    if (result.days_min != null && result.days_max != null && result.days_max < result.days_min) {
      [result.days_min, result.days_max] = [result.days_max, result.days_min];
    }
    return result;
  } catch (err) {
    console.error("[claude] shipping-web-search failed", err instanceof Error ? err.message : err);
    return null;
  }
}
