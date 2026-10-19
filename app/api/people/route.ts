import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { errorResponse, fail } from "@/lib/http";
import { createPerson } from "@/lib/people";
import { storePhoto } from "@/lib/photos";
import { readPersonForm } from "./form";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Log in first.", 401);
    const form = await readPersonForm(request);
    if (typeof form === "string") return fail(form, 400);

    const id = randomUUID();
    const photoUrl = form.photo instanceof File ? await storePhoto(userId, id, form.photo) : null;
    await createPerson(userId, { id, name: form.name, photoUrl });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return errorResponse("Couldn't add them", err);
  }
}
