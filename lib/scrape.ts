import "server-only";
import { readProductPage, visibleText, type ProductInfo } from "./product-page";
import { decodeText, safeFetch, UnsafeUrlError } from "./safe-fetch";

export type PageResult =
  | { kind: "read"; url: string; info: ProductInfo; text: string }
  // 404 or 410: the product page is gone.
  | { kind: "gone"; status: number }
  // We got an answer, but not the product (a bot check, other HTTP errors,
  // not a web page) - someone else may be able to read it.
  | { kind: "blocked"; reason: string }
  // Couldn't reach it at all (network, timeout, unsafe address).
  | { kind: "error"; reason: string };

// Fetches a product page as a browser would (8s timeout) and reads it.
export async function scrapePage(url: string): Promise<PageResult> {
  let res;
  try {
    res = await safeFetch(url, { timeoutMs: 8000 });
  } catch (err) {
    return { kind: "error", reason: err instanceof UnsafeUrlError ? `unsafe: ${err.message}` : String(err instanceof Error ? err.message : err) };
  }
  if (res.status === 404 || res.status === 410) return { kind: "gone", status: res.status };
  if (res.status >= 400) return { kind: "blocked", reason: `HTTP ${res.status}` };
  if (res.contentType && !/html|xml/i.test(res.contentType)) return { kind: "blocked", reason: `not a web page (${res.contentType})` };
  const html = decodeText(res);
  const info = readProductPage(html, res.url);
  // A tiny page with nothing product-like is a bot check ("click to continue
  // shopping"), and its title would only be the shop's name.
  if (html.length < 20_000 && info.price == null && info.image == null) {
    return { kind: "blocked", reason: "no product details (likely a bot check)" };
  }
  return { kind: "read", url: res.url, info, text: visibleText(html) };
}
