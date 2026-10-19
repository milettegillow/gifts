import "server-only";
import { createHash } from "node:crypto";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { anthropic, logUsage, takeCall } from "./claude";
import { sql } from "./db";
import { listGifts, type GiftRow } from "./gifts";
import { listNotes, type Note } from "./notes";
import { isUuid } from "./people";
import { shopDomain } from "./shipping";

// Themes ("what they like") and places to look, per person, worked out by
// Claude from everything saved, given and turned down for them, and the notes
// kept about them. Stored in
// person_insights with a hash of what they were made from, so they're redone
// only when that changes.

const MODEL = "claude-sonnet-5-5";
// Gifts and notes together.
export const MIN_ITEMS = 3;

export type Theme = { label: string; giftIds: string[] };
export type Suggestion = { name: string; reason: string; query: string };
export type Insights = { themes: Theme[]; suggestions: Suggestion[]; generatedAt: string; sourceHash: string | null };

// What the insights depend on: each gift's id, status, rating and declined
// reason, and each note's text and whether it's done.
export function sourceHash(
  gifts: Pick<GiftRow, "id" | "status" | "rating" | "declinedReason">[],
  notes: Pick<Note, "id" | "text" | "done">[],
): string {
  const lines = [
    ...gifts.map((g) => ["g", g.id, g.status, g.rating ?? "", g.declinedReason ?? ""].join("\u0001")),
    ...notes.map((n) => ["n", n.id, n.text, n.done ? "1" : "0"].join("\u0001")),
  ].sort();
  return createHash("sha256").update(lines.join("\n")).digest("hex");
}

export async function getInsights(personId: string, userId: string): Promise<Insights | null> {
  if (!isUuid(personId)) return null;
  const rows = await sql`
    select i.themes, i.suggestions, i.generated_at, i.source_hash
    from person_insights i join people p on p.id = i.person_id
    where i.person_id = ${personId} and p.user_id = ${userId}
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    themes: (row.themes as Theme[] | null) ?? [],
    suggestions: (row.suggestions as Suggestion[] | null) ?? [],
    generatedAt: new Date(row.generated_at as string).toISOString(),
    sourceHash: (row.source_hash as string | null) ?? null,
  };
}

const INSTRUCTIONS = `You help someone choose gifts for one person. From the gifts listed for that person, work out what the person likes, and where the gift-giver could look for more.

How to read the evidence:
- A gifted item rated 3 ("loved it") is strong evidence of their taste. Rated 2 is mild evidence. Rated 1 ("didn't love it") is evidence against that kind of thing.
- Gifted items without a rating are moderate evidence.
- "Decided against" items, and especially their reasons, are evidence too - usually of what to avoid or what they already have.
- Saved ideas are the gift-giver's guesses, not proof of taste, so they count for less.
- Notes are things the gift-giver has written down about the person. Open notes are current interests - good evidence. Done notes are already covered (bought, done, or no longer relevant); don't suggest them again, though they still say something about taste.

Output:
- themes: up to 6. Each has a label of 1-3 words in sentence case (e.g. "Stationery", "Birds", "Japanese ceramics") and gift_refs, the refs (like "g2") of the gifts that show it. Only themes the evidence supports; no theme built only on things they disliked.
- suggestions: up to 5 places to look - a real shop, brand, or type of place (e.g. a garden centre, a museum shop). Each has a reason (one short sentence tied to the themes) and a query (a web search that would find it). Use your own knowledge.

Write in British English.`;

const Output = z.object({
  themes: z.array(z.object({ label: z.string(), gift_refs: z.array(z.string()) })),
  suggestions: z.array(z.object({ name: z.string(), reason: z.string(), query: z.string() })),
});

const ThemeCheck = z.object({
  label: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .refine((s) => s.split(/\s+/).length <= 3),
  gift_refs: z.array(z.string()),
});
const SuggestionCheck = z.object({
  name: z.string().trim().min(1).max(80),
  reason: z.string().trim().min(1).max(240),
  query: z.string().trim().min(1).max(200),
});

function sentenceCase(s: string) {
  return s.charAt(0).toLocaleUpperCase("en-GB") + s.slice(1);
}

function describe(g: GiftRow, ref: string): string {
  const parts = [
    `${ref}: "${g.title}"`,
    g.kind === "idea" ? "DIY (made by the gift-giver)" : "something to buy",
    g.status === "saved" ? "status: saved idea" : g.status === "gifted" ? "status: gifted" : "status: decided against",
  ];
  const shop = g.url ? shopDomain(g.url) : null;
  if (shop) parts.push(`shop: ${shop}`);
  if (g.status === "gifted" && g.rating) parts.push(`rating: ${g.rating}`);
  if (g.occasion) parts.push(`occasion: ${g.occasion}`);
  if (g.declinedReason) parts.push(`declined because: ${g.declinedReason}`);
  if (g.notes) parts.push(`notes: ${g.notes.replace(/\s+/g, " ").slice(0, 300)}`);
  return parts.join("; ");
}

// People being worked on by this server right now.
const inFlight = new Set<string>();

export type GenerateResult = "done" | "too-few" | "capped" | "busy" | "failed";

// Works out and stores a person's insights. Counts towards the daily cap.
export async function generateInsights(personId: string, userId: string): Promise<GenerateResult> {
  if (!isUuid(personId)) return "failed";
  if (inFlight.has(personId)) return "busy";
  inFlight.add(personId);
  try {
    const [gifts, notes] = await Promise.all([listGifts(personId, userId), listNotes(personId, userId)]);
    if (gifts.length + notes.length < MIN_ITEMS) return "too-few";
    const api = anthropic();
    if (!api || !(await takeCall(userId))) return "capped";

    const refs = new Map(gifts.map((g, i) => [`g${i + 1}`, g.id]));
    const list = gifts.map((g, i) => describe(g, `g${i + 1}`)).join("\n") || "(none yet)";
    const noteLines = notes.map((n) => `- ${n.done ? "(done) " : ""}${n.text}`).join("\n");
    const message = await api.beta.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: INSTRUCTIONS,
      output_config: { effort: "medium", format: betaZodOutputFormat(Output) },
      messages: [
        {
          role: "user",
          content: `Gifts for this person:\n${list}${noteLines ? `\n\nNotes about them:\n${noteLines}` : ""}`,
        },
      ],
    });
    logUsage("insights", userId, message);
    if (message.stop_reason === "refusal" || !message.parsed_output) return "failed";

    // Each item is checked on its own; a bad one is dropped, not the lot.
    const themes: Theme[] = [];
    for (const raw of message.parsed_output.themes) {
      const t = ThemeCheck.safeParse(raw);
      if (!t.success) continue;
      const giftIds = [...new Set(t.data.gift_refs.map((r) => refs.get(r.trim())).filter((id): id is string => !!id))];
      if (giftIds.length > 0) themes.push({ label: sentenceCase(t.data.label), giftIds });
      if (themes.length === 6) break;
    }
    const suggestions: Suggestion[] = message.parsed_output.suggestions
      .map((s) => SuggestionCheck.safeParse(s))
      .filter((s) => s.success)
      .map((s) => s.data!)
      .slice(0, 5);

    await sql`
      insert into person_insights (person_id, themes, suggestions, generated_at, source_hash)
      select p.id, ${JSON.stringify(themes)}::jsonb, ${JSON.stringify(suggestions)}::jsonb, now(), ${sourceHash(gifts, notes)}
      from people p where p.id = ${personId} and p.user_id = ${userId}
      on conflict (person_id) do update set
        themes = excluded.themes, suggestions = excluded.suggestions,
        generated_at = excluded.generated_at, source_hash = excluded.source_hash
    `;
    return "done";
  } catch (err) {
    console.error("[claude] insights failed", err instanceof Error ? err.message : err);
    return "failed";
  } finally {
    inFlight.delete(personId);
  }
}
