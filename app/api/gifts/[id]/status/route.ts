import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { setStatus } from "@/lib/gifts";
import { errorResponse, fail } from "@/lib/http";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => !Number.isNaN(Date.parse(s)));
const text = (max: number) => z.string().trim().max(max).nullish().transform((s) => s || null);

const StatusSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("gifted"), occasion: text(80), giftedOn: isoDate }),
  z.object({ status: z.literal("declined"), reason: text(500) }),
  z.object({ status: z.literal("saved") }),
]);

// Mark as gifted, decided against, or back to ideas.
export async function PATCH(request: Request, ctx: RouteContext<"/api/gifts/[id]/status">) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Log in first.", 401);
    const { id } = await ctx.params;
    const parsed = StatusSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail("Some details don't look right.", 400);
    if (!(await setStatus(id, userId, parsed.data))) return fail("Gift not found.", 404);
    return NextResponse.json({ id, status: parsed.data.status });
  } catch (err) {
    return errorResponse("Couldn't save that", err);
  }
}
