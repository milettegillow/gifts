import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { supportedCurrencies } from "@/lib/currencies";
import { giftImageSrc, listGifts, type GiftRow } from "@/lib/gifts";
import { generateInsights, getInsights, MIN_ITEMS, sourceHash } from "@/lib/insights";
import { listNotes } from "@/lib/notes";
import { getPerson } from "@/lib/people";
import { isStoredImage, isVideoStill } from "@/lib/photos";
import { pricing } from "@/lib/rates";
import { recheckStock } from "@/lib/stock";
import { getUserSettings, requireUser } from "@/lib/users";
import type { Metadata } from "next";
import { Avatar, personRing } from "@/app/ui/avatar";
import { PersonSkeleton } from "@/app/ui/skeletons";
import { linkButtonClass } from "@/app/ui/styles";
import { EditPerson } from "./edit-person";
import type { GiftCardData } from "./gift-types";
import { PersonGifts } from "./person-gifts";

// "Mum - Giftbook" (the layout's title template adds the suffix).
export async function generateMetadata({ params }: PageProps<"/people/[id]">): Promise<Metadata> {
  const { id } = await params;
  const userId = await requireUser();
  const person = await getPerson(id, userId);
  return { title: person?.name ?? "Not found" };
}

export default function PersonPage({ params }: PageProps<"/people/[id]">) {
  return (
    <Suspense fallback={<PersonSkeleton />}>
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

// "Birthday, Oct 2026"; just the month and year without an occasion.
function occasionLabel(g: GiftRow): string | null {
  const when = g.giftedOn
    ? new Date(`${g.giftedOn}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })
    : null;
  return [g.occasion, when].filter(Boolean).join(", ") || null;
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
  // Refresh prices and stock for links not checked in a day; shows next load.
  after(() => recheckStock(person.id, userId).catch((err) => console.error("Stock re-check failed", err)));
  const [gifts, notes, prices, insights] = await Promise.all([
    listGifts(person.id, userId),
    listNotes(person.id, userId),
    pricing(settings.currency),
    getInsights(person.id, userId),
  ]);
  // Themes and places to look, for people with enough gifts. When the gifts
  // have changed since they were worked out, redo them after responding and
  // show the old ones meanwhile.
  const hasInsights = gifts.length + notes.length >= MIN_ITEMS;
  const hash = sourceHash(gifts, notes);
  const stale = hasInsights && insights?.sourceHash !== hash;
  if (stale) {
    after(() => generateInsights(person.id, userId));
  }

  const context = { personId: person.id, currencies, defaultCurrency: settings.currency ?? "USD" };
  const cards: GiftCardData[] = gifts.map((g) => ({
    id: g.id,
    title: g.title,
    url: g.url,
    image: giftImageSrc(g),
    kind: g.kind,
    status: g.status,
    price: prices.format(g.priceAmount, g.priceCurrency),
    shipping: shippingTag(g),
    stock: stockTag(g),
    sortPrice: prices.convert(g.priceAmount, g.priceCurrency),
    shippingMax: g.shippingDaysMax ?? g.shippingDaysMin,
    createdAt: g.createdAt,
    giftedOn: g.giftedOn,
    occasionLabel: occasionLabel(g),
    rating: g.rating,
    declinedReason: g.declinedReason,
    edit: {
      id: g.id,
      kind: g.kind,
      status: g.status,
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
      stockManual: g.stockManual,
    },
  }));

  return (
    <div className="flex flex-col gap-8 pt-2">
      <Link href="/" className={`${linkButtonClass} self-start`}>
        All people
      </Link>
      <div className="flex items-center gap-4">
        <Avatar name={person.name} photo={person.photo} size={72} className={personRing} />
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <h1 className="min-w-0 font-display text-3xl break-words text-ink">{person.name}</h1>
          <EditPerson person={{ id: person.id, name: person.name, photo: person.photo }} />
        </div>
      </div>
      <PersonGifts
        gifts={cards}
        context={context}
        budget={person.budget}
        notes={notes}
        insights={
          hasInsights
            ? { themes: insights?.themes ?? [], suggestions: insights?.suggestions ?? [], refreshing: stale, expectedHash: hash }
            : null
        }
      />
    </div>
  );
}
