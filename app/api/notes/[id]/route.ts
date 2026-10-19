import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { errorResponse, fail } from "@/lib/http";
import { deleteNote, MAX_NOTE_LENGTH, updateNote } from "@/lib/notes";

const ChangeSchema = z
  .object({ text: z.string().trim().min(1).max(MAX_NOTE_LENGTH).optional(), done: z.boolean().optional() })
  .refine((c) => c.text !== undefined || c.done !== undefined);

// Edit the text, or tick it off (or back on).
export async function PATCH(request: Request, ctx: RouteContext<"/api/notes/[id]">) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Log in first.", 401);
    const { id } = await ctx.params;
    const parsed = ChangeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail("Write a short note.", 400);
    const note = await updateNote(id, userId, parsed.data);
    if (!note) return fail("Note not found.", 404);
    return NextResponse.json(note);
  } catch (err) {
    return errorResponse("Couldn't save the note", err);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/notes/[id]">) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Log in first.", 401);
    const { id } = await ctx.params;
    if (!(await deleteNote(id, userId))) return fail("Note not found.", 404);
    return NextResponse.json({ id });
  } catch (err) {
    return errorResponse("Couldn't delete the note", err);
  }
}
