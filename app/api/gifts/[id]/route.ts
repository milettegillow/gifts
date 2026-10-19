import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteGift, getGift, updateGift } from "@/lib/gifts";
import { errorResponse, fail } from "@/lib/http";
import { removePhoto } from "@/lib/photos";
import { giftFields, readGiftForm } from "../form";

export async function PATCH(request: Request, ctx: RouteContext<"/api/gifts/[id]">) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Log in first.", 401);
    const { id } = await ctx.params;
    const existing = await getGift(id, userId);
    if (!existing) return fail("Gift not found.", 404);
    const form = await readGiftForm(request);
    if (typeof form === "string") return fail(form, 400);

    // The kind stays as it was saved.
    const { fields, replaced } = await giftFields(userId, id, existing.kind, form, existing);
    if (!(await updateGift(id, userId, fields))) {
      if (fields.imageUrl !== existing.imageUrl) await removePhoto(fields.imageUrl);
      return fail("Gift not found.", 404);
    }
    await removePhoto(replaced);
    return NextResponse.json({ id });
  } catch (err) {
    return errorResponse("Couldn't save your changes", err);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/gifts/[id]">) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Log in first.", 401);
    const { id } = await ctx.params;
    const deleted = await deleteGift(id, userId);
    if (!deleted) return fail("Gift not found.", 404);
    await removePhoto(deleted.imageUrl);
    return NextResponse.json({ id });
  } catch (err) {
    return errorResponse("Couldn't delete the gift", err);
  }
}
