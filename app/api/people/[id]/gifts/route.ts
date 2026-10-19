import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createGift } from "@/lib/gifts";
import { errorResponse, fail } from "@/lib/http";
import { getPerson } from "@/lib/people";
import { removePhoto } from "@/lib/photos";
import { giftFields, readGiftForm } from "@/app/api/gifts/form";

// Saves a gift to one of the user's people.
export async function POST(request: Request, ctx: RouteContext<"/api/people/[id]/gifts">) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Log in first.", 401);
    const { id: personId } = await ctx.params;
    if (!(await getPerson(personId, userId))) return fail("Person not found.", 404);
    const form = await readGiftForm(request);
    if (typeof form === "string") return fail(form, 400);

    const id = randomUUID();
    const { fields } = await giftFields(userId, id, form.kind, form, null);
    if (!(await createGift(id, personId, userId, fields))) {
      await removePhoto(fields.imageUrl);
      return fail("Person not found.", 404);
    }
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return errorResponse("Couldn't save the gift", err);
  }
}
