"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent, type TouchEvent } from "react";
import { requestJson } from "@/lib/client";
import { fieldClass, linkButtonClass } from "@/app/ui/styles";

export type NoteData = { id: string; text: string; done: boolean; doneAt: string | null; createdAt: string };

const VISIBLE = 6;
const MAX_LENGTH = 200;
const SWIPE_OPEN = 88;

// Open notes newest first, then done ones, most recently done first.
function sorted(notes: NoteData[]) {
  return [...notes].sort((a, b) =>
    a.done !== b.done
      ? Number(a.done) - Number(b.done)
      : a.done
        ? (b.doneAt ?? "").localeCompare(a.doneAt ?? "")
        : b.createdAt.localeCompare(a.createdAt),
  );
}

// Things they like and loose ideas: add, tick off, edit, delete. Changes
// show straight away and save in the background.
export function NotesSection({ personId, initial }: { personId: string; initial: NoteData[] }) {
  const [notes, setNotes] = useState(() => sorted(initial));
  const [draft, setDraft] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save<T>(attempt: () => Promise<T>, undo: () => void) {
    setError(null);
    try {
      return await attempt();
    } catch (err) {
      undo();
      setError(err instanceof Error ? err.message : "Couldn't save. Try again.");
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const temp: NoteData = { id: `new-${Date.now()}`, text, done: false, doneAt: null, createdAt: new Date().toISOString() };
    setNotes((n) => sorted([temp, ...n]));
    setDraft("");
    const saved = await save(
      () => requestJson<NoteData>(`/api/people/${personId}/notes`, { body: { text } }),
      () => {
        setNotes((n) => n.filter((x) => x.id !== temp.id));
        setDraft(text);
      },
    );
    if (saved) setNotes((n) => n.map((x) => (x.id === temp.id ? saved : x)));
  }

  async function change(note: NoteData, changes: { text?: string; done?: boolean }) {
    const before = notes;
    const next = { ...note, ...changes };
    if (changes.done !== undefined) next.doneAt = changes.done ? new Date().toISOString() : null;
    setNotes((n) => sorted(n.map((x) => (x.id === note.id ? next : x))));
    await save(
      () => requestJson(`/api/notes/${note.id}`, { method: "PATCH", body: changes }),
      () => setNotes(before),
    );
  }

  async function remove(note: NoteData) {
    const before = notes;
    setNotes((n) => n.filter((x) => x.id !== note.id));
    await save(
      () => requestJson(`/api/notes/${note.id}`, { method: "DELETE" }),
      () => setNotes(before),
    );
  }

  const shown = showAll ? notes : notes.slice(0, VISIBLE);

  return (
    <section aria-labelledby="notes-heading" className="flex flex-col gap-3">
      <h2 id="notes-heading" className="font-display text-2xl text-ink">
        Notes
      </h2>
      <form onSubmit={add} className="flex items-center gap-2">
        <input
          type="text"
          aria-label="Add a note"
          placeholder="Add a note"
          maxLength={MAX_LENGTH}
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={fieldClass}
        />
        <button
          type="submit"
          aria-label="Add note"
          disabled={!draft.trim()}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-2xl leading-none text-gold-text transition-colors hover:bg-ink-hover disabled:opacity-40 disabled:hover:bg-ink"
        >
          +
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {notes.length > 0 && (
        <ul className="flex flex-col">
          {shown.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              onToggle={() => change(note, { done: !note.done })}
              onEdit={(text) => change(note, { text })}
              onDelete={() => remove(note)}
            />
          ))}
        </ul>
      )}
      {!showAll && notes.length > VISIBLE && (
        <button type="button" onClick={() => setShowAll(true)} className={`${linkButtonClass} self-start`}>
          Show all
        </button>
      )}
    </section>
  );
}

function NoteRow({
  note,
  onToggle,
  onEdit,
  onDelete,
}: {
  note: NoteData;
  onToggle: () => void;
  onEdit: (text: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.text);
  // Swipe left (phones) to reveal Delete.
  const [offset, setOffset] = useState(0);
  const touch = useRef<{ x: number; y: number; start: number; horizontal: boolean | null } | null>(null);
  const saving = note.id.startsWith("new-");

  function finishEdit() {
    setEditing(false);
    const next = text.trim();
    if (next && next !== note.text) onEdit(next);
    else setText(note.text);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") e.currentTarget.blur();
    if (e.key === "Escape") {
      setText(note.text);
      setEditing(false);
    }
  }

  function onTouchStart(e: TouchEvent) {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, start: offset, horizontal: null };
  }

  function onTouchMove(e: TouchEvent) {
    const t = touch.current;
    if (!t) return;
    const dx = e.touches[0].clientX - t.x;
    const dy = e.touches[0].clientY - t.y;
    if (t.horizontal === null && Math.abs(dx) + Math.abs(dy) > 8) t.horizontal = Math.abs(dx) > Math.abs(dy);
    if (t.horizontal) setOffset(Math.min(0, Math.max(-SWIPE_OPEN, t.start + dx)));
  }

  function onTouchEnd() {
    if (touch.current?.horizontal) setOffset((o) => (o < -SWIPE_OPEN / 2 ? -SWIPE_OPEN : 0));
    touch.current = null;
  }

  return (
    <li className="relative overflow-hidden" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {offset < 0 && (
        <button
          type="button"
          onClick={onDelete}
          className="absolute inset-y-0 right-0 flex items-center justify-center bg-ink text-gold-text"
          style={{ width: SWIPE_OPEN }}
        >
          Delete
        </button>
      )}
      <div
        className="group/row relative flex items-start gap-1 rounded-[10px] transition-[transform,translate,background-color] duration-150 hover:bg-ink/6 focus-within:bg-ink/6"
        style={{ transform: offset ? `translateX(${offset}px)` : undefined }}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={note.done}
          aria-label={note.done ? `Untick ${note.text}` : `Tick ${note.text}`}
          disabled={saving}
          onClick={onToggle}
          className="group/tick flex size-11 shrink-0 items-center justify-center"
        >
          {/* 20px ring, centred on the text's first line. Hover shows a faint
              check; done is filled ink with a gold check. */}
          <span
            aria-hidden
            className={`flex size-5 items-center justify-center rounded-full text-xs leading-none shadow-[inset_0_0_0_1.5px_var(--color-ink)] ${
              note.done ? "bg-ink text-gold-text" : "text-transparent group-hover/tick:text-ink/40 group-focus-visible/tick:text-ink/40"
            }`}
          >
            ✓
          </span>
        </button>
        {editing ? (
          <input
            type="text"
            aria-label="Edit note"
            autoFocus
            maxLength={MAX_LENGTH}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={finishEdit}
            onKeyDown={onKeyDown}
            className={`${fieldClass} py-1.5`}
          />
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={() => (offset < 0 ? setOffset(0) : setEditing(true))}
            className={`min-h-11 flex-1 py-2.5 text-left leading-6 break-words ${note.done ? "line-through opacity-55" : ""}`}
          >
            {note.text}
          </button>
        )}
        <button
          type="button"
          aria-label={`Delete ${note.text}`}
          disabled={saving}
          onClick={onDelete}
          // Always there on phones; on desktop, shown when the row is hovered or focused.
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-2xl leading-none text-ink transition-opacity hover:bg-ink hover:text-gold-text sm:opacity-0 sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100"
        >
          ×
        </button>
      </div>
    </li>
  );
}
