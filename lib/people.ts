import "server-only";
import { sql } from "./db";

// Every query here is scoped to the given Clerk userId.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export type Person = {
  id: string;
  name: string;
  // Where the photo is served from (it lives in a private store), or null.
  photo: string | null;
  saved: number;
  // In the user's currency.
  budget: number | null;
};

// Changes whenever the photo does, so browsers can cache each one for good.
function photoSrc(id: string, photoUrl: string | null): string | null {
  if (!photoUrl) return null;
  const version = photoUrl.split("/").pop()?.replace(/\.[a-z]+$/i, "") ?? "";
  return `/api/people/${id}/photo?v=${encodeURIComponent(version)}`;
}

function toPerson(row: Record<string, unknown>): Person {
  const id = row.id as string;
  return {
    id,
    name: row.name as string,
    photo: photoSrc(id, row.photo_url as string | null),
    saved: Number(row.saved ?? 0),
    budget: row.budget_amount == null ? null : Number(row.budget_amount),
  };
}

// Oldest first, so the grid doesn't reshuffle as people are added.
export async function listPeople(userId: string): Promise<Person[]> {
  const rows = await sql`
    select p.id, p.name, p.photo_url, p.budget_amount,
      count(g.id) filter (where g.status = 'saved') as saved
    from people p
    left join gifts g on g.person_id = p.id and g.user_id = p.user_id
    where p.user_id = ${userId}
    group by p.id
    order by p.created_at, p.id
  `;
  return rows.map(toPerson);
}

export async function getPerson(id: string, userId: string): Promise<Person | null> {
  if (!isUuid(id)) return null;
  const rows = await sql`
    select p.id, p.name, p.photo_url, p.budget_amount,
      (select count(*) from gifts g
        where g.person_id = p.id and g.user_id = p.user_id and g.status = 'saved') as saved
    from people p
    where p.id = ${id} and p.user_id = ${userId}
  `;
  return rows[0] ? toPerson(rows[0]) : null;
}

// The stored blob URL, for serving or replacing the photo. Null if the person
// isn't this user's; { url: null } if they have no photo.
export async function getPhotoUrl(id: string, userId: string): Promise<{ url: string | null } | null> {
  if (!isUuid(id)) return null;
  const rows = await sql`select photo_url from people where id = ${id} and user_id = ${userId}`;
  return rows[0] ? { url: (rows[0].photo_url as string | null) ?? null } : null;
}

export async function createPerson(
  userId: string,
  person: { id: string; name: string; photoUrl: string | null },
) {
  await sql`
    insert into people (id, user_id, name, photo_url)
    values (${person.id}, ${userId}, ${person.name}, ${person.photoUrl})
  `;
}

// `photoUrl` undefined leaves the photo as it is.
export async function updatePerson(
  id: string,
  userId: string,
  changes: { name: string; photoUrl?: string | null },
): Promise<boolean> {
  const rows =
    changes.photoUrl === undefined
      ? await sql`
          update people set name = ${changes.name}
          where id = ${id} and user_id = ${userId} returning id
        `
      : await sql`
          update people set name = ${changes.name}, photo_url = ${changes.photoUrl}
          where id = ${id} and user_id = ${userId} returning id
        `;
  return rows.length > 0;
}

// Their gifts and insights go too (on delete cascade). Returns the photo URL
// to clean up, or null if there was no such person.
export async function deletePerson(id: string, userId: string): Promise<{ photoUrl: string | null } | null> {
  if (!isUuid(id)) return null;
  const rows = await sql`
    delete from people where id = ${id} and user_id = ${userId} returning photo_url
  `;
  return rows[0] ? { photoUrl: (rows[0].photo_url as string | null) ?? null } : null;
}

export async function setBudget(id: string, userId: string, amount: number | null): Promise<boolean> {
  if (!isUuid(id)) return false;
  const rows = await sql`
    update people set budget_amount = ${amount} where id = ${id} and user_id = ${userId} returning id
  `;
  return rows.length > 0;
}
