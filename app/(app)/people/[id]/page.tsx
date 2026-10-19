import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supportedCurrencies } from "@/lib/currencies";
import { giftImageSrc, listSavedGifts, type GiftRow } from "@/lib/gifts";
import { getPerson } from "@/lib/people";
import { isStoredImage, isVideoStill } from "@/lib/photos";
import { priceFormatter } from "@/lib/rates";
import { getUserSettings, requireUser } from "@/lib/users";
import { Avatar } from "@/app/ui/avatar";
import { EditPerson } from "./edit-person";
import { AddGift, GiftGrid } from "./gift-grid";
import type { GiftCardData } from "./gift-types";

export default function PersonPage({ params }: PageProps<"/people/[id]">) {
  return (
    <Suspense>
      <PersonView params={params} />
    </Suspense>
  );
}

function shippingTag(g: GiftRow): string | null {
  if (g.shippingDaysMin == null) return null;
  const max = g.shippingDaysMax ?? g.shippingDaysMin;
  if (max === g.shippingDaysMin) return `${max} ${max === 1 ? "day" : "days"}`;
  return `${g.shippingDaysMin}-${max} days`;
}

function stockTag(g: GiftRow): GiftCardData["stock"] {
  switch (g.stockStatus) {
    case "low":
      return { text: g.stockCount ? `Only ${g.stockCount} left` : "Low stock", gone: false };
    case "out":
      return { text: "Out of stock", gone: true };
    case "unavailable":
      return { text: "No longer available", gone: true };
    default:
      return null;
  }
}

async function PersonView({ params }: { params: PageProps<"/people/[id]">["params"] }) {
  const { id } = await params;
  const userId = await requireUser();
  const [person, settings, currencies] = await Promise.all([
    getPerson(id, userId),
    getUserSettings(userId),
    supportedCurrencies(),
  ]);
  if (!person) notFound();
  const [gifts, format] = await Promise.all([listSavedGifts(person.id, userId), priceFormatter(settings.currency)]);

  const context = { personId: person.id, currencies, defaultCurrency: settings.currency ?? "USD" };
  const cards: GiftCardData[] = gifts.map((g) => ({
    id: g.id,
    title: g.title,
    url: g.url,
    image: giftImageSrc(g),
    price: format(g.priceAmount, g.priceCurrency),
    shipping: shippingTag(g),
    stock: stockTag(g),
    edit: {
      id: g.id,
      kind: g.kind,
      title: g.title,
      url: g.url ?? "",
      image: g.kind === "link" ? (g.imageUrl ?? "") : "",
      photo: g.kind === "idea" && isStoredImage(g.imageUrl) && !isVideoStill(g.imageUrl) ? giftImageSrc(g) : null,
      price: g.priceAmount == null ? "" : String(g.priceAmount),
      currency: g.priceCurrency ?? "",
      shipping: g.shippingText ?? "",
      notes: g.notes ?? "",
      stockStatus: g.stockStatus,
      stockCount: g.stockCount,
    },
  }));

  return (
    <div className="flex flex-col gap-8 pt-2">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-ink underline">
          All people
        </Link>
        <EditPerson person={{ id: person.id, name: person.name, photo: person.photo }} />
      </div>
      <div className="flex items-center gap-4">
        <Avatar name={person.name} photo={person.photo} size={72} />
        <h1 className="min-w-0 flex-1 font-display text-3xl break-words text-deep-red">{person.name}</h1>
        <AddGift context={context} />
      </div>
      <GiftGrid gifts={cards} context={context} />
    </div>
  );
}
