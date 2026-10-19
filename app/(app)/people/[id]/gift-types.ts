// What the person page hands its client components about each gift.

export type StockStatus = "in_stock" | "low" | "out" | "unavailable";
export type GiftStatus = "saved" | "gifted" | "declined";

export type GiftEdit = {
  id: string;
  kind: "link" | "idea";
  status: GiftStatus;
  title: string;
  url: string;
  // A link's image URL (editable as text).
  image: string;
  // An idea's own uploaded photo, for the preview; null if it has none.
  photo: string | null;
  price: string;
  currency: string;
  shipping: string;
  notes: string;
  stockStatus: StockStatus | null;
  stockCount: number | null;
  stockManual: boolean;
};

export type GiftCardData = {
  id: string;
  kind: "link" | "idea";
  status: GiftStatus;
  title: string;
  url: string | null;
  image: string | null;
  price: string | null;
  shipping: string | null;
  stock: { text: string; gone: boolean } | null;
  // For filtering, sorting and the plan total: the price in the user's
  // currency (null if unknown or not convertible), and delivery days.
  sortPrice: number | null;
  shippingMax: number | null;
  createdAt: string;
  giftedOn: string | null;
  // "Birthday, Oct 2026"
  occasionLabel: string | null;
  rating: number | null;
  declinedReason: string | null;
  edit: GiftEdit;
};

export const PRESENT_IMAGE = "/present.svg";

export const RATING_LABELS: Record<number, string> = { 1: "Didn't love it", 2: "Liked it", 3: "Loved it" };

export const OCCASIONS = ["Birthday", "Christmas", "Anniversary", "Just because"];
