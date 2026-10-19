import "server-only";
import { readProductPage, type ProductInfo } from "./product-page";
import { decodeText, safeFetch } from "./safe-fetch";

// Fetches a product page as a browser would (8s timeout) and reads it.
// Throws if the page can't be fetched or isn't HTML.
export async function scrapeProduct(url: string): Promise<ProductInfo & { url: string }> {
  const res = await safeFetch(url, { timeoutMs: 8000 });
  if (res.status >= 400) throw new Error(`Page returned ${res.status}`);
  if (res.contentType && !/html|xml/i.test(res.contentType)) throw new Error(`Not a web page: ${res.contentType}`);
  const html = decodeText(res);
  const info = readProductPage(html, res.url);
  // A tiny page with nothing product-like is a bot check ("click to continue
  // shopping"), and its title would only be the shop's name.
  if (html.length < 20_000 && info.price == null && info.image == null) {
    throw new Error("No product details (likely a bot check)");
  }
  return { url: res.url, ...info };
}
