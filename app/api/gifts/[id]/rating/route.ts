import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { setRating } from "@/lib/gifts";
import { errorResponse, fail } from "@/lib/http";

const RatingSchema = z.object({ rating: z.number().int().min(1).max(3) });

export async function PATCH(request: Request, ctx: RouteContext<"/api/gifts/[id]/rating">) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Log in first.", 401);
    const { id } = await ctx.params;
    const parsed = RatingSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail("Choose one to three stars.", 400);
    if (!(await setRating(id, userId, parsed.data.rating))) return fail("Gift not found.", 404);
    return NextResponse.json({ id, rating: parsed.data.rating });
  } catch (err) {
    return errorResponse("Couldn't save the rating", err);
  }
}
