import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { errorResponse, fail } from "@/lib/http";
import { addNote, MAX_NOTE_LENGTH } from "@/lib/notes";

const NoteSchema = z.object({ text: z.string().trim().min(1).max(MAX_NOTE_LENGTH) });

export async function POST(request: Request, ctx: RouteContext<"/api/people/[id]/notes">) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Log in first.", 401);
    const { id } = await ctx.params;
    const parsed = NoteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail("Write a short note.", 400);
    const note = await addNote(id, userId, parsed.data.text);
    if (!note) return fail("Person not found.", 404);
    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    return errorResponse("Couldn't add the note", err);
  }
}
