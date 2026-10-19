"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { requestJson, resizePhoto } from "@/lib/client";
import { Sheet } from "@/app/ui/sheet";
import { buttonClass, fieldClass, linkButtonClass } from "@/app/ui/styles";
import { PRESENT_IMAGE, type GiftEdit, type StockStatus } from "./gift-types";

type Kind = "link" | "idea";

type Scraped = {
  url: string;
  title: string | null;
  image: string | null;
  price: number | null;
  currency: string | null;
  shippingText: string | null;
  stockStatus: StockStatus | null;
  stockCount: number | null;
};

export type SheetContext = { personId: string; currencies: string[]; defaultCurrency: string };

// Add a gift (a link to fetch, or an idea of your own), or edit one.
export function GiftSheet({
  open,
  onClose,
  context,
  gift,
}: {
  open: boolean;
  onClose: () => void;
  context: SheetContext;
  gift?: GiftEdit;
}) {
  return (
    <Sheet open={open} onClose={onClose} label={gift ? "Edit gift" : "Add a gift"}>
      <GiftForm onClose={onClose} context={context} gift={gift} />
    </Sheet>
  );
}

// "£1,299.50" -> 1299.5; "" -> null; nonsense -> NaN.
function readPrice(text: string): number | null {
  const s = text.replace(/[^\d.,]/g, "");
  if (!text.trim()) return null;
  if (!s) return NaN;
  const n = parseFloat(/,\d{2}$/.test(s) && !s.includes(".") ? s.replace(",", ".") : s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function priceText(n: number | null) {
  return n == null ? "" : String(Math.round(n * 100) / 100);
}

function GiftForm({ onClose, context, gift }: { onClose: () => void; context: SheetContext; gift?: GiftEdit }) {
  const router = useRouter();
  const editing = !!gift;
  const [kind, setKind] = useState<Kind>(gift?.kind ?? "link");

  // Shared fields
  const [title, setTitle] = useState(gift?.title ?? "");
  const [url, setUrl] = useState(gift?.url ?? "");
  const [price, setPrice] = useState(gift?.price ?? "");
  const [currency, setCurrency] = useState(gift?.currency || context.defaultCurrency);
  // Link fields
  const [image, setImage] = useState(gift?.image ?? "");
  const [shipping, setShipping] = useState(gift?.shipping ?? "");
  const [stock, setStock] = useState<{ status: StockStatus | null; count: number | null }>({
    status: gift?.stockStatus ?? null,
    count: gift?.stockCount ?? null,
  });
  const [showFields, setShowFields] = useState(editing);
  const [fetching, setFetching] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [checked, setChecked] = useState(false);
  // Idea fields
  const [notes, setNotes] = useState(gift?.notes ?? "");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const currencies = context.currencies.includes(currency) ? context.currencies : [...context.currencies, currency].sort();
  const shownPhoto = preview ?? (removed ? null : (gift?.photo ?? null));

  async function fetchPage() {
    if (!url.trim() || fetching) return;
    setFetching(true);
    setFetchFailed(false);
    setError(null);
    try {
      const r = await requestJson<Scraped>("/api/scrape", { body: { url: url.trim() } });
      setUrl(r.url);
      setTitle(r.title ?? "");
      setImage(r.image ?? "");
      setPrice(priceText(r.price));
      setCurrency(r.currency ?? context.defaultCurrency);
      setShipping(r.shippingText ?? "");
      setStock({ status: r.stockStatus, count: r.stockCount });
      setChecked(true);
    } catch {
      setFetchFailed(true);
      if (!editing) {
        setTitle("");
        setImage("");
        setPrice("");
        setShipping("");
        setStock({ status: null, count: null });
      }
    } finally {
      setShowFields(true);
      setFetching(false);
    }
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    const resized = await resizePhoto(file);
    if (!resized) {
      setError("That photo couldn't be read. Try another.");
      return;
    }
    setPhoto(resized);
    setPreview(URL.createObjectURL(resized));
    setRemoved(false);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const amount = readPrice(price);
    if (Number.isNaN(amount)) {
      setError("That price doesn't look right.");
      return;
    }
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set(
      "data",
      JSON.stringify({
        kind,
        title: title.trim(),
        url: url.trim() || null,
        image: kind === "link" ? image.trim() || null : null,
        price: amount,
        currency: amount == null ? null : currency,
        shipping: kind === "link" ? shipping.trim() || null : null,
        notes: kind === "idea" ? notes.trim() || null : null,
        stockStatus: kind === "link" ? stock.status : null,
        stockCount: kind === "link" ? stock.count : null,
        checked,
        removePhoto: removed && !photo,
      }),
    );
    if (kind === "idea" && photo) form.set("photo", new File([photo], "photo.jpg", { type: "image/jpeg" }));
    try {
      if (gift) await requestJson(`/api/gifts/${gift.id}`, { method: "PATCH", body: form });
      else await requestJson(`/api/people/${context.personId}/gifts`, { method: "POST", body: form });
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save. Try again.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!gift) return;
    setBusy(true);
    setError(null);
    try {
      await requestJson(`/api/gifts/${gift.id}`, { method: "DELETE" });
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete. Try again.");
      setBusy(false);
    }
  }

  if (gift && confirming) {
    return (
      <div className="flex flex-col gap-5">
        <h2 className="font-display text-2xl text-deep-red">Delete this gift?</h2>
        {error && <p role="alert" className="text-deep-red">{error}</p>}
        <div className="flex items-center gap-5">
          <button type="button" onClick={remove} disabled={busy} className={buttonClass}>
            {busy ? "Deleting…" : "Delete"}
          </button>
          <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={linkButtonClass}>
            Keep
          </button>
        </div>
      </div>
    );
  }

  const priceRow = (label: string) => (
    <div className="flex flex-col gap-2">
      <label htmlFor="gift-price">{label}</label>
      <div className="flex gap-2">
        <input
          id="gift-price"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={fieldClass}
        />
        <select
          aria-label="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className={`${fieldClass} w-auto`}
        >
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <h2 className="font-display text-2xl text-deep-red">{editing ? "Edit gift" : "Add a gift"}</h2>

      {!editing && (
        <div role="radiogroup" aria-label="Kind of gift" className="grid grid-cols-2 border border-deep-red">
          {(["link", "idea"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => {
                setKind(k);
                setError(null);
              }}
              className={`py-2.5 ${kind === k ? "bg-deep-red text-gold-light" : "text-deep-red"}`}
            >
              {k === "link" ? "Link" : "Own idea"}
            </button>
          ))}
        </div>
      )}

      {kind === "link" ? (
        <>
          <Field label="Link" htmlFor="gift-url">
            <div className="flex gap-2">
              <input
                id="gift-url"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !showFields) {
                    e.preventDefault();
                    void fetchPage();
                  }
                }}
                className={fieldClass}
              />
              <button
                type="button"
                onClick={fetchPage}
                disabled={!url.trim() || fetching}
                className={`${buttonClass} shrink-0 px-4`}
              >
                {fetching ? "Fetching…" : "Fetch"}
              </button>
            </div>
          </Field>
          {fetchFailed && <p className="text-deep-red">Couldn&apos;t read that page</p>}
          {showFields && (
            <>
              <Field label="Title" htmlFor="gift-title">
                <input id="gift-title" type="text" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
              </Field>
              <Field label="Image" htmlFor="gift-image">
                <div className="flex items-center gap-3">
                  <ImagePreview src={image.trim() || null} />
                  <input id="gift-image" type="url" inputMode="url" autoComplete="off" value={image} onChange={(e) => setImage(e.target.value)} className={fieldClass} />
                </div>
              </Field>
              {priceRow("Price")}
              <Field label="Delivery" htmlFor="gift-shipping">
                <input id="gift-shipping" type="text" maxLength={200} value={shipping} onChange={(e) => setShipping(e.target.value)} className={fieldClass} />
              </Field>
            </>
          )}
        </>
      ) : (
        <>
          <Field label="Title" htmlFor="gift-title">
            <input id="gift-title" type="text" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
          </Field>
          <div className="flex items-center gap-4">
            <ImagePreview src={shownPhoto} />
            <div className="flex flex-col items-start gap-1">
              <label className={`${linkButtonClass} cursor-pointer`}>
                {shownPhoto ? "Change photo" : "Add photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    void pickPhoto(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              {shownPhoto && (
                <button
                  type="button"
                  onClick={() => {
                    setPhoto(null);
                    setPreview(null);
                    setRemoved(true);
                  }}
                  className={linkButtonClass}
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
          <Field label="Link" htmlFor="gift-url">
            <input id="gift-url" type="url" inputMode="url" autoComplete="off" value={url} onChange={(e) => setUrl(e.target.value)} className={fieldClass} />
          </Field>
          {priceRow("Estimated price")}
          <Field label="Notes" htmlFor="gift-notes">
            <textarea id="gift-notes" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${fieldClass} resize-y`} />
          </Field>
        </>
      )}

      {error && <p role="alert" className="text-deep-red">{error}</p>}

      {(kind === "idea" || showFields) && (
        <div className="flex items-center gap-5">
          <button type="submit" disabled={busy || !title.trim()} className={buttonClass}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onClose} disabled={busy} className={linkButtonClass}>
            Cancel
          </button>
          {gift && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={busy}
              className="ml-auto text-deep-red underline disabled:opacity-60"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

// A small square preview that falls back to the present.
function ImagePreview({ src }: { src: string | null }) {
  const [broken, setBroken] = useState<string | null>(null);
  return (
    <span className="relative block size-16 shrink-0 overflow-hidden bg-cream">
      <Image
        src={src && broken !== src ? src : PRESENT_IMAGE}
        alt=""
        fill
        unoptimized
        sizes="64px"
        referrerPolicy="no-referrer"
        onError={() => setBroken(src)}
        className="object-cover"
      />
    </span>
  );
}
