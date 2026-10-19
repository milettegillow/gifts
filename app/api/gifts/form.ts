import { z } from "zod";
import type { GiftFields, GiftKind, GiftRow } from "@/lib/gifts";
import { parseShippingDays } from "@/lib/product-page";
import { isStoredImage, isVideoStill, photoProblem, storeGiftPhoto, storeVideoStill } from "@/lib/photos";
import { videoThumbnail } from "@/lib/video";

const webUrl = z
  .string()
  .trim()
  .max(2048)
  .transform((s) => (s && !/^https?:\/\//i.test(s) ? `https://${s}` : s))
  .refine((s) => {
    if (!s) return true;
    try {
      const u = new URL(s);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  });
const optionalText = (max: number) => z.string().trim().max(max).nullish().transform((s) => s || null);

const GiftSchema = z.object({
  kind: z.enum(["link", "idea"]),
  title: z.string().trim().min(1).max(200),
  url: webUrl.nullish().transform((s) => s || null),
  image: webUrl.nullish().transform((s) => s || null),
  price: z.number().min(0).max(10_000_000).nullish().transform((n) => n ?? null),
  currency: z.string().regex(/^[A-Z]{3}$/).nullish().transform((s) => s ?? null),
  shipping: optionalText(200),
  notes: optionalText(2000),
  stockStatus: z.enum(["in_stock", "low", "out", "unavailable"]).nullish().transform((s) => s ?? null),
  stockCount: z.number().int().min(0).max(100_000).nullish().transform((n) => n ?? null),
  checked: z.boolean().optional().default(false),
  removePhoto: z.boolean().optional().default(false),
  // "Add past gift": saved straight as gifted.
  past: z
    .object({
      occasion: optionalText(80),
      giftedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => !Number.isNaN(Date.parse(s))),
      rating: z.number().int().min(1).max(3).nullish().transform((n) => n ?? null),
    })
    .nullish()
    .transform((p) => p ?? null),
});

export type GiftForm = z.infer<typeof GiftSchema> & { photo: File | null };

// The add/edit gift form: JSON in "data", plus an optional resized "photo".
export async function readGiftForm(request: Request): Promise<GiftForm | string> {
  const form = await request.formData().catch(() => null);
  if (!form) return "Something's missing. Try again.";
  let data: unknown;
  try {
    data = JSON.parse(String(form.get("data") ?? ""));
  } catch {
    return "Something's missing. Try again.";
  }
  const parsed = GiftSchema.safeParse(data);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "title") return "Add a title.";
    if (field === "url" || field === "image") return "That link doesn't look right.";
    if (field === "price") return "That price doesn't look right.";
    if (field === "past") return "Check the date.";
    return "Some details don't look right.";
  }
  if (parsed.data.kind === "link" && !parsed.data.url) return "Add the link.";
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (parsed.data.kind !== "idea") return "Some details don't look right.";
    const problem = photoProblem(photo);
    if (problem) return problem;
    return { ...parsed.data, photo };
  }
  return { ...parsed.data, photo: null };
}

// The fields to save, uploading or deriving the image as needed. Returns the
// old stored image if it's being replaced, for the caller to delete after
// the save succeeds.
export async function giftFields(
  userId: string,
  giftId: string,
  kind: GiftKind,
  form: GiftForm,
  existing: GiftRow | null,
): Promise<{ fields: GiftFields; replaced: string | null }> {
  const days = form.shipping ? parseShippingDays(form.shipping) : null;
  const old = existing?.imageUrl ?? null;
  let imageUrl: string | null;

  if (kind === "link") {
    imageUrl = form.image;
  } else if (form.photo) {
    imageUrl = await storeGiftPhoto(userId, giftId, form.photo);
  } else if (isStoredImage(old) && !isVideoStill(old) && !form.removePhoto) {
    imageUrl = old; // their own photo stays
  } else if (old && existing?.url === form.url && !form.removePhoto) {
    imageUrl = old; // same video, same still
  } else {
    imageUrl = await videoStill(userId, giftId, form.url);
  }

  return {
    fields: {
      kind,
      title: form.title,
      url: form.url,
      imageUrl,
      priceAmount: form.price,
      priceCurrency: form.price == null ? null : form.currency,
      shippingText: kind === "link" ? form.shipping : null,
      shippingDaysMin: kind === "link" ? (days?.min ?? null) : null,
      shippingDaysMax: kind === "link" ? (days?.max ?? null) : null,
      stockStatus: kind === "link" ? form.stockStatus : null,
      stockCount: kind === "link" && form.stockStatus === "low" ? form.stockCount : null,
      notes: kind === "idea" ? form.notes : null,
      checked: kind === "link" && form.checked,
    },
    replaced: old && old !== imageUrl && isStoredImage(old) ? old : null,
  };
}

// YouTube: its thumbnail URL. TikTok: the still, copied into our store.
// Anything else: none (the default present image).
async function videoStill(userId: string, giftId: string, url: string | null): Promise<string | null> {
  if (!url) return null;
  const thumb = await videoThumbnail(url);
  if (!thumb) return null;
  if (thumb.kind === "url") return thumb.url;
  try {
    return await storeVideoStill(userId, giftId, thumb.bytes, thumb.type);
  } catch (err) {
    console.error("Storing a video still failed", err);
    return null;
  }
}
