import "server-only";
import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";

// Photos live in a private Blob store and are only served through
// /api/people/[id]/photo, after an ownership check. On Vercel the SDK signs in
// with the deployment's OIDC token and BLOB_STORE_ID (no read-write token).

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export async function storePhoto(userId: string, personId: string, photo: File): Promise<string> {
  const blob = await put(`people/${userId}/${personId}/${randomUUID()}.jpg`, photo, {
    access: "private",
    contentType: "image/jpeg",
  });
  return blob.url;
}

// Best effort: a leftover file is harmless, so this never fails the request.
export async function removePhoto(url: string | null) {
  if (!url) return;
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
