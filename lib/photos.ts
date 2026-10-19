import "server-only";
import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";

// Photos live in a private Blob store and are only served through our own
// routes (/api/people/[id]/photo, /api/gifts/[id]/photo), after an ownership
// check. On Vercel the SDK signs in with the deployment's OIDC token and
// BLOB_STORE_ID (no read-write token).

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

async function storeImage(pathname: string, body: Blob | Uint8Array, contentType: string) {
  const blob = await put(pathname, body instanceof Uint8Array ? Buffer.from(body) : body, {
    access: "private",
    contentType,
  });
  return blob.url;
}

export function storePhoto(userId: string, personId: string, photo: Blob) {
  return storeImage(`people/${userId}/${personId}/${randomUUID()}.jpg`, photo, "image/jpeg");
}

export function storeGiftPhoto(userId: string, giftId: string, photo: Blob) {
  return storeImage(`gifts/${userId}/${giftId}/${randomUUID()}.jpg`, photo, "image/jpeg");
}

// A video's still, copied in because the source link expires.
export function storeVideoStill(userId: string, giftId: string, bytes: Uint8Array, type: string) {
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  return storeImage(`gifts/${userId}/${giftId}/video-${randomUUID()}.${ext}`, bytes, type);
}

// True for anything in our store (as opposed to a shop's image URL).
export function isStoredImage(url: string | null): url is string {
  if (!url) return false;
  try {
    return new URL(url).hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function isVideoStill(url: string | null): boolean {
  return isStoredImage(url) && /\/video-[^/]+$/.test(new URL(url).pathname);
}

// Best effort: a leftover file is harmless, so this never fails the request.
// Only ever deletes from our own store.
export async function removePhoto(url: string | null) {
  if (!isStoredImage(url)) return;
  try {
    await del(url);
  } catch (err) {
    console.error("Deleting a photo failed", err);
  }
}

// A JPEG from the browser's resize step, within the size limit.
export function photoProblem(photo: File): string | null {
  if (photo.type !== "image/jpeg") return "That photo didn't come through. Try another.";
  if (photo.size > MAX_PHOTO_BYTES) return "That photo is too big.";
  return null;
}
