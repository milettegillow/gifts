// What the person page hands its client components about each gift.

export type StockStatus = "in_stock" | "low" | "out" | "unavailable";

export type GiftEdit = {
  id: string;
  kind: "link" | "idea";
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
};

export type GiftCardData = {
  id: string;
  title: string;
  url: string | null;
  image: string | null;
  price: string | null;
  shipping: string | null;
  stock: { text: string; gone: boolean } | null;
  edit: GiftEdit;
};

export const PRESENT_IMAGE = "/present.svg";
