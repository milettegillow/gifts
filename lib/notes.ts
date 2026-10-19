import "server-only";
import { sql } from "./db";
import { isUuid } from "./people";

// Every query here is scoped to the given Clerk userId.

export type Note = { id: string; text: string; done: boolean; doneAt: string | null; createdAt: string };

export const MAX_NOTE_LENGTH = 200;

function toNote(row: Record<string, unknown>): Note {
  return {
    id: row.id as string,
    text: row.text as string,
    done: row.done as boolean,
    doneAt: row.done_at ? new Date(row.done_at as string).toISOString() : null,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

// Open notes newest first, then done ones, most recently done first.
export async function listNotes(personId: string, userId: string): Promise<Note[]> {
  if (!isUuid(personId)) return [];
  const rows = await sql`
    select id, text, done, done_at, created_at from notes
    where person_id = ${personId} and user_id = ${userId}
    order by done, case when done then done_at end desc, created_at desc, id
  `;
  return rows.map(toNote);
}

// Null if the person isn't the user's.
export async function addNote(personId: string, userId: string, text: string): Promise<Note | null> {
  if (!isUuid(personId)) return null;
  const rows = await sql`
    insert into notes (person_id, user_id, text)
    select p.id, p.user_id, ${text} from people p where p.id = ${personId} and p.user_id = ${userId}
    returning id, text, done, done_at, created_at
  `;
  return rows[0] ? toNote(rows[0]) : null;
}

export async function updateNote(
  id: string,
  userId: string,
  changes: { text?: string; done?: boolean },
): Promise<Note | null> {
  if (!isUuid(id)) return null;
  const rows = await sql`
    update notes set
      text = coalesce(${changes.text ?? null}, text),
      done = coalesce(${changes.done ?? null}::boolean, done),
      done_at = case
        when ${changes.done ?? null}::boolean is true and not done then now()
        when ${changes.done ?? null}::boolean is false then null
        else done_at
      end
    where id = ${id} and user_id = ${userId}
    returning id, text, done, done_at, created_at
  `;
  return rows[0] ? toNote(rows[0]) : null;
}

export async function deleteNote(id: string, userId: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const rows = await sql`delete from notes where id = ${id} and user_id = ${userId} returning id`;
  return rows.length > 0;
}
