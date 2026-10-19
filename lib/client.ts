// Browser-side helpers shared by client components.

export async function requestJson<T>(
  url: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const isForm = init.body instanceof FormData;
  const res = await fetch(url, {
    method: init.method ?? (init.body === undefined ? "GET" : "POST"),
    headers: init.body === undefined || isForm ? undefined : { "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : isForm ? (init.body as FormData) : JSON.stringify(init.body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (typeof data.error === "string") throw new Error(data.error);
    throw new Error(
      process.env.NODE_ENV === "development"
        ? `Request failed: ${res.status} ${res.statusText}`
        : "Something went wrong. Try again.",
    );
  }
  return data as T;
}

// Shrinks a photo to at most 800px on its long edge as a JPEG (quality 0.8),
// the right way up. Returns null if the browser can't read the image.
export async function resizePhoto(file: File, maxEdge = 800): Promise<Blob | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
}
