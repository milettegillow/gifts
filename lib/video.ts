import "server-only";
import { safeFetch } from "./safe-fetch";

// A still for a video link, for ideas without their own photo.

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\.|^m\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function youTubeId(url: string): string | null {
  const host = hostOf(url);
  if (!host) return null;
  const u = new URL(url);
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
    id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/)?.[1] ?? null;
  }
  return id && /^[\w-]{6,20}$/.test(id) ? id : null;
}

export function isTikTok(url: string): boolean {
  const host = hostOf(url);
  return host === "tiktok.com" || !!host?.endsWith(".tiktok.com");
}

// YouTube's thumbnail URL is stable; TikTok's (from oEmbed) is a signed CDN
// link that expires, so the caller copies those bytes into our own store.
export async function videoThumbnail(url: string): Promise<{ kind: "url"; url: string } | { kind: "bytes"; bytes: Uint8Array; type: string } | null> {
  const id = youTubeId(url);
  if (id) return { kind: "url", url: `https://img.youtube.com/vi/${id}/hqdefault.jpg` };
  if (!isTikTok(url)) return null;
  try {
    const embed = await safeFetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
      timeoutMs: 6000,
      maxBytes: 256 * 1024,
      headers: { Accept: "application/json" },
    });
    if (embed.status !== 200) return null;
    const thumb = (JSON.parse(new TextDecoder().decode(embed.body)) as { thumbnail_url?: string }).thumbnail_url;
    if (!thumb) return null;
    const image = await safeFetch(thumb, { timeoutMs: 6000, maxBytes: 4 * 1024 * 1024, headers: { Accept: "image/*" } });
    if (image.status !== 200 || !image.contentType.startsWith("image/")) return null;
    return { kind: "bytes", bytes: image.body, type: image.contentType.split(";")[0] };
  } catch (err) {
    console.error("TikTok thumbnail failed", err);
    return null;
  }
}
