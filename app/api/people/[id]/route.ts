import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { errorResponse, fail } from "@/lib/http";
import { deletePerson, getPhotoUrl, updatePerson } from "@/lib/people";
import { removePhoto, storePhoto } from "@/lib/photos";
import { readPersonForm } from "../form";

// Rename, and change or remove the photo.
export async function PATCH(request: Request, ctx: RouteContext<"/api/people/[id]">) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Log in first.", 401);
    const { id } = await ctx.params;
    const current = await getPhotoUrl(id, userId);
    if (!current) return fail("Person not found.", 404);
    const form = await readPersonForm(request);
    if (typeof form === "string") return fail(form, 400);

    let photoUrl: string | null | undefined;
    if (form.photo instanceof File) photoUrl = await storePhoto(userId, id, form.photo);
    else if (form.photo === "remove") photoUrl = null;

    if (!(await updatePerson(id, userId, { name: form.name, photoUrl }))) {
      if (photoUrl) await removePhoto(photoUrl);
      return fail("Person not found.", 404);
    }
    if (photoUrl !== undefined) await removePhoto(current.url);
    return NextResponse.json({ id });
  } catch (err) {
    return errorResponse("Couldn't save your changes", err);
  }
}

// Deletes the person and, with them, their gifts.
export async function DELETE(_req: Request, ctx: RouteContext<"/api/people/[id]">) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Log in first.", 401);
    const { id } = await ctx.params;
    const deleted = await deletePerson(id, userId);
    if (!deleted) return fail("Person not found.", 404);
    await removePhoto(deleted.photoUrl);
    return NextResponse.json({ id });
  } catch (err) {
    return errorResponse("Couldn't delete them", err);
  }
}
