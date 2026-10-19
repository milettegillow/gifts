"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { requestJson, resizePhoto } from "@/lib/client";
import { Avatar } from "@/app/ui/avatar";
import { Sheet } from "@/app/ui/sheet";
import { buttonClass, fieldClass, linkButtonClass } from "@/app/ui/styles";

type Editing = { id: string; name: string; photo: string | null };

// Add someone, or edit (rename, change or remove the photo, delete) someone.
export function PersonSheet({
  open,
  onClose,
  person,
}: {
  open: boolean;
  onClose: () => void;
  person?: Editing;
}) {
  return (
    <Sheet open={open} onClose={onClose} label={person ? `Edit ${person.name}` : "Add a person"}>
      <PersonForm onClose={onClose} person={person} />
    </Sheet>
  );
}

function PersonForm({ onClose, person }: { onClose: () => void; person?: Editing }) {
  const router = useRouter();
  const [name, setName] = useState(person?.name ?? "");
  // A resized photo waiting to upload, and its preview.
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const shownPhoto = preview ?? (removed ? null : (person?.photo ?? null));

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

  function removePhoto() {
    setPhoto(null);
    setPreview(null);
    setRemoved(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("name", name.trim());
    if (photo) form.set("photo", new File([photo], "photo.jpg", { type: "image/jpeg" }));
    else if (removed) form.set("removePhoto", "1");
    try {
      if (person) {
        await requestJson(`/api/people/${person.id}`, { method: "PATCH", body: form });
      } else {
        await requestJson("/api/people", { method: "POST", body: form });
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save. Try again.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!person) return;
    setBusy(true);
    setError(null);
    try {
      await requestJson(`/api/people/${person.id}`, { method: "DELETE" });
      onClose();
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete. Try again.");
      setBusy(false);
    }
  }

  if (person && confirming) {
    return (
      <div className="flex flex-col gap-5">
        <h2 className="font-display text-2xl text-deep-red">Delete {person.name} and their gifts?</h2>
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

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <h2 className="font-display text-2xl text-deep-red">{person ? "Edit" : "Add a person"}</h2>
      <label className="flex flex-col gap-2">
        <span>Name</span>
        <input
          type="text"
          required
          maxLength={60}
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldClass}
        />
      </label>
      <div className="flex items-center gap-4">
        <Avatar name={name || "?"} photo={shownPhoto} size={64} />
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
            <button type="button" onClick={removePhoto} className={linkButtonClass}>
              Remove photo
            </button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="text-deep-red">{error}</p>}
      <div className="flex items-center gap-5">
        <button type="submit" disabled={busy || !name.trim()} className={buttonClass}>
          {busy ? "Saving…" : person ? "Save" : "Add"}
        </button>
        <button type="button" onClick={onClose} disabled={busy} className={linkButtonClass}>
          Cancel
        </button>
        {person && (
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
    </form>
  );
}
